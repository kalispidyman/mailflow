from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, EmailAccount, ActivityLog
from ..auth import get_current_user
from ..email_service import encrypt_value
from fastapi import BackgroundTasks
from .accounts import background_sync_worker
from ..config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GMAIL_SCOPES
import secrets

router = APIRouter(prefix="/api/auth/google", tags=["google_auth"])

import datetime
from jose import jwt
from urllib.parse import quote, urlencode
from ..config import SECRET_KEY, ALGORITHM

@router.get("/url")
def get_google_auth_url(request: Request, user: User = Depends(get_current_user)):
    # Generate stateless JWT signed state token containing user ID
    referer = request.headers.get("referer")
    if referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        origin = f"{parsed.scheme}://{parsed.netloc}"
    else:
        origin = request.headers.get("origin", "http://localhost:5173")
        
    payload = {
        "user_id": user.id,
        "origin": origin,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
        "salt": secrets.token_hex(16)
    }
    state = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        # Redirect to frontend Mock Google OAuth consent page
        mock_url = f"{origin}/mock-oauth?state={state}"
        return {"url": mock_url, "state": state, "is_mock": True}

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"url": url, "state": state, "is_mock": False}

@router.get("/callback")
def google_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    code: str = None,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db),
):
    origin = "http://localhost:5173"
    try:
        if state:
            payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
            origin = payload.get("origin", origin)
    except Exception:
        pass

    if error:
        return RedirectResponse(url=f"{origin}/accounts?status=error&message={quote(f'Google auth error: {error}')}")
    if not code or not state:
        return RedirectResponse(url=f"{origin}/accounts?status=error&message={quote('Missing code or state')}")

    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
    except Exception:
        user_id = None

    if not user_id:
        return RedirectResponse(url=f"{origin}/accounts?status=error&message={quote('Invalid or expired state parameter')}")

    # Check if we are handling a mock/sandbox authentication
    is_mock = not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or (code and code.startswith("mock_oauth_code_"))

    try:
        if is_mock:
            # Sandbox mode: retrieve custom/demo email directly and generate mock tokens
            email_address = request.query_params.get("email", "demo.user@gmail.com")
            name = email_address.split("@")[0].title()
            access_token = "mock_access_token_" + secrets.token_hex(16)
            refresh_token = "mock_refresh_token_" + secrets.token_hex(16)
            picture = f"https://ui-avatars.com/api/?name={quote(name)}&background=random&color=fff&bold=true"
        else:
            import httpx
            token_data = {
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
            resp = httpx.post("https://oauth2.googleapis.com/token", data=token_data)
            tokens = resp.json()

            if "error" in tokens:
                err_desc = tokens.get('error_description', tokens['error'])
                return RedirectResponse(url=f"{origin}/accounts?status=error&message={quote(f'Token error: {err_desc}')}")

            access_token = tokens["access_token"]
            refresh_token = tokens.get("refresh_token", "")

            user_info_resp = httpx.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_info = user_info_resp.json()
            email_address = user_info.get("email", "")
            name = user_info.get("name", email_address)
            picture = user_info.get("picture", "")

        existing_account = db.query(EmailAccount).filter(
            EmailAccount.user_id == user_id,
            EmailAccount.email_address == email_address,
            EmailAccount.provider == "gmail",
        ).first()

        if existing_account:
            existing_account.oauth_token = encrypt_value(access_token)
            if refresh_token:
                existing_account.oauth_refresh_token = encrypt_value(refresh_token)
            existing_account.is_active = True
            existing_account.profile_picture = picture
        else:
            account = EmailAccount(
                user_id=user_id,
                email_address=email_address,
                display_name=name,
                provider="gmail",
                oauth_token=encrypt_value(access_token),
                oauth_refresh_token=encrypt_value(refresh_token) if refresh_token else "",
                is_active=True,
                profile_picture=picture,
            )
            db.add(account)

        log = ActivityLog(user_id=user_id, action="google_connect", details=f"Connected {'Demo ' if is_mock else ''}Gmail: {email_address}")
        db.add(log)
        db.commit()

        # Auto-sync the newly connected account in the background
        account_id = existing_account.id if existing_account else account.id
        background_tasks.add_task(background_sync_worker, account_id)

        return RedirectResponse(url=f"{origin}/accounts?status=success&email={email_address}")

    except Exception as e:
        return RedirectResponse(url=f"{origin}/accounts?status=error&message={quote(str(e))}")

