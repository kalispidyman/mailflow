from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, EmailAccount, ActivityLog
from ..auth import hash_password, get_current_user, require_admin

router = APIRouter(prefix="/api/team", tags=["team"])

@router.get("")
def list_team(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    members = db.query(User).filter(
        User.company_id == user.company_id, User.is_active == True
    ).all()

    account_counts = db.query(EmailAccount.user_id, EmailAccount.id).filter(
        EmailAccount.is_active == True
    ).all()
    count_map = {}
    for uid, aid in account_counts:
        count_map[uid] = count_map.get(uid, 0) + 1

    return [{
        "id": m.id,
        "username": m.username,
        "email": m.email,
        "full_name": m.full_name,
        "role": m.role,
        "account_count": count_map.get(m.id, 0),
        "created_at": m.created_at.isoformat() if m.created_at else None,
    } for m in members]

@router.post("/invite")
def invite_member(
    full_name: str = Form(...),
    email: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    role: str = Form("member"),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        company_id=user.company_id,
        email=email,
        username=username,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
    )
    db.add(new_user)
    log = ActivityLog(user_id=user.id, action="invite", details=f"Invited {full_name}")
    db.add(log)
    db.commit()
    return {"success": True, "user": {"id": new_user.id, "full_name": full_name, "email": email, "role": role}}
