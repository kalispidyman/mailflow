from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import EmailAccount, User, ActivityLog
from ..auth import get_current_user
from ..email_service import sync_account_emails
from fastapi import BackgroundTasks

def background_sync_worker(account_id: int):
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()
        if account:
            sync_account_emails(account)
    finally:
        db.close()

router = APIRouter(prefix="/api/accounts", tags=["accounts"])

@router.get("")
def list_accounts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(EmailAccount).filter(
        EmailAccount.user_id == user.id,
        EmailAccount.is_active == True
    ).all()
    return [{
        "id": a.id,
        "email_address": a.email_address,
        "display_name": a.display_name,
        "provider": a.provider,
        "is_primary": a.is_primary,
        "last_sync_at": (a.last_sync_at.isoformat() + "Z") if a.last_sync_at else None,
        "profile_picture": a.profile_picture,
        "created_at": (a.created_at.isoformat() + "Z") if a.created_at else None,
    } for a in accounts]

@router.post("/{account_id}/sync")
def sync_account(account_id: int, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(EmailAccount).filter(
        EmailAccount.id == account_id,
        EmailAccount.user_id == user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    background_tasks.add_task(background_sync_worker, account_id)
    return {"message": "Sync started in background", "status": "syncing"}

@router.post("/sync-all")
def sync_all_accounts(background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(EmailAccount).filter(
        EmailAccount.user_id == user.id,
        EmailAccount.is_active == True
    ).all()
    
    for account in accounts:
        background_tasks.add_task(background_sync_worker, account.id)
        
    return {"message": f"Sync started for {len(accounts)} accounts in background", "status": "syncing"}

@router.delete("/{account_id}")
def delete_account(account_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(EmailAccount).filter(
        EmailAccount.id == account_id,
        EmailAccount.user_id == user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.is_active = False
    log = ActivityLog(user_id=user.id, action="delete_account", details=f"Removed {account.email_address}")
    db.add(log)
    db.commit()
    return {"success": True}
