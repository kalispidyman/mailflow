from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, EmailAccount, ActivityLog
from ..auth import get_current_user
from ..email_service import encrypt_value
from fastapi import BackgroundTasks
from .accounts import background_sync_worker
from ..config import MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI, OUTLOOK_SCOPES
import secrets
import datetime
from jose import jwt
from urllib.parse import quote, urlencode
from ..config import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/api/auth/outlook", tags=["outlook_auth"])

@router.get("/url")
def get_outlook_auth_url(request: Request, user: User = Depends(get_current_user)):
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

    if not MICROSOFT_CLIENT_ID or not MICROSOFT_CLIENT_SECRET:
        mock_url = f"{origin}/mock-outlook-oauth?state={state}"
        return {"url": mock_url, "state": state, "is_mock": True}

    params = {
        "client_id": MICROSOFT_CLIENT_ID,
        "redirect_uri": MICROSOFT_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(OUTLOOK_SCOPES),
        "response_mode": "query",
        "prompt": "select_account",
        "state": state,
    }
    url = f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?{urlencode(params)}"
    return {"url": url, "state": state, "is_mock": False}

@router.get("/callback")
def outlook_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    code: str = None,
    state: str = None,
    error: str = None,
    error_description: str = None,
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
        err_msg = error_description or error
        return RedirectResponse(url=f"{origin}/accounts?status=error&message={quote(f'Outlook auth error: {err_msg}')}")
    if not code or not state:
        return RedirectResponse(url=f"{origin}/accounts?status=error&message={quote('Missing code or state')}")

    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
    except Exception:
        user_id = None

    if not user_id:
        return RedirectResponse(url=f"{origin}/accounts?status=error&message={quote('Invalid or expired state parameter')}")

    is_mock = not MICROSOFT_CLIENT_ID or not MICROSOFT_CLIENT_SECRET or (code and code.startswith("mock_oauth_code_"))

    try:
        if is_mock:
            email_address = request.query_params.get("email", "demo.user@outlook.com")
            name = email_address.split("@")[0].title()
            access_token = "mock_access_token_" + secrets.token_hex(16)
            refresh_token = "mock_refresh_token_" + secrets.token_hex(16)
            picture = f"https://ui-avatars.com/api/?name={quote(name)}&background=random&color=fff&bold=true"
        else:
            import httpx
            token_data = {
                "client_id": MICROSOFT_CLIENT_ID,
                "client_secret": MICROSOFT_CLIENT_SECRET,
                "code": code,
                "redirect_uri": MICROSOFT_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
            resp = httpx.post("https://login.microsoftonline.com/common/oauth2/v2.0/token", data=token_data)
            tokens = resp.json()

            if "error" in tokens:
                err_desc = tokens.get('error_description', tokens['error'])
                return RedirectResponse(url=f"{origin}/accounts?status=error&message={quote(f'Token error: {err_desc}')}")

            access_token = tokens["access_token"]
            refresh_token = tokens.get("refresh_token", "")

            user_info_resp = httpx.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_info = user_info_resp.json()
            email_address = user_info.get("mail") or user_info.get("userPrincipalName", "")
            name = user_info.get("displayName", email_address)
            
            picture = f"https://ui-avatars.com/api/?name={quote(name)}&background=random&color=fff&bold=true"
            try:
                pic_resp = httpx.get("https://graph.microsoft.com/v1.0/me/photo/$value", headers={"Authorization": f"Bearer {access_token}"})
                if pic_resp.status_code == 200:
                    import base64
                    b64_pic = base64.b64encode(pic_resp.content).decode()
                    picture = f"data:image/jpeg;base64,{b64_pic}"
            except Exception:
                pass

        existing_account = db.query(EmailAccount).filter(
            EmailAccount.user_id == user_id,
            EmailAccount.email_address == email_address,
            EmailAccount.provider == "outlook",
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
                provider="outlook",
                oauth_token=encrypt_value(access_token),
                oauth_refresh_token=encrypt_value(refresh_token) if refresh_token else "",
                is_active=True,
                profile_picture=picture,
            )
            db.add(account)

        log = ActivityLog(user_id=user_id, action="outlook_connect", details=f"Connected {'Demo ' if is_mock else ''}Outlook: {email_address}")
        db.add(log)
        db.commit()

        account_id = existing_account.id if existing_account else account.id
        background_tasks.add_task(background_sync_worker, account_id)

        return RedirectResponse(url=f"{origin}/accounts?status=success&email={email_address}")

    except Exception as e:
        return RedirectResponse(url=f"{origin}/accounts?status=error&message={quote(str(e))}")
