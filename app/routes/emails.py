from fastapi import APIRouter, Depends, HTTPException, Form, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import datetime
import json
from ..database import get_db
from ..models import Email, EmailAccount, User, FollowUp, ActivityLog, EmailLabel
from ..auth import get_current_user
from ..email_service import send_gmail, send_imap_email, sync_account_emails, modify_gmail_message_status, trash_gmail_message, send_outlook, modify_outlook_message_status, trash_outlook_message

router = APIRouter(prefix="/api/emails", tags=["emails"])

@router.get("")
def list_emails(
    folder: str = Query("INBOX"),
    account_id: int = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account_ids = [a.id for a in db.query(EmailAccount.id).filter(
        EmailAccount.user_id == user.id, EmailAccount.is_active == True
    ).all()]

    query = db.query(Email).filter(Email.account_id.in_(account_ids) if account_ids else False)
    if folder == "STARRED":
        query = query.filter(Email.is_flagged == True)
    else:
        query = query.filter(Email.folder == folder)

    if account_id:
        query = query.filter(Email.account_id == account_id)

    total = query.count()
    
    # Calculate counts properly across the entire folder/query, not just the limited subset
    unread_count = query.filter(Email.is_read == False).count()
    read_count = query.filter(Email.is_read == True).count()
    action_count = query.filter(Email.needs_followup == True).count()

    emails = query.order_by(desc(Email.received_at), desc(Email.id)).offset(offset).limit(limit).all()

    return {
        "total": total,
        "unread_count": unread_count,
        "read_count": read_count,
        "action_count": action_count,
        "limit": limit,
        "offset": offset,
        "emails": [format_email(e) for e in emails],
    }

@router.get("/search")
def search_emails(
    q: str = Query(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account_ids = [a.id for a in db.query(EmailAccount.id).filter(
        EmailAccount.user_id == user.id, EmailAccount.is_active == True
    ).all()]
    if not account_ids or not q:
        return {"emails": []}

    term = f"%{q}%"
    emails = db.query(Email).filter(
        Email.account_id.in_(account_ids),
        (Email.subject.ilike(term)) | (Email.sender.ilike(term)) | (Email.body_text.ilike(term))
    ).order_by(desc(Email.received_at)).limit(30).all()

    return {"emails": [format_email(e) for e in emails]}

@router.get("/{email_id}")
def get_email(email_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")
    if not email_obj.is_read:
        email_obj.is_read = True
        db.commit()

    followups = db.query(FollowUp).filter(FollowUp.email_id == email_id).order_by(desc(FollowUp.created_at)).all()
    labels = db.query(EmailLabel).filter(EmailLabel.email_id == email_id).all()

    result = format_email(email_obj)
    result["followups"] = [{
        "id": f.id,
        "note": f.note,
        "due_date": (f.due_date.isoformat() + "Z") if f.due_date else None,
        "is_completed": f.is_completed,
        "created_at": (f.created_at.isoformat() + "Z") if f.created_at else None,
    } for f in followups]
    result["labels"] = [{"id": l.id, "name": l.name, "color": l.color} for l in labels]
    return result

@router.post("/{email_id}/assign")
def assign_email(
    email_id: int,
    user_id: int = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Not found")
    email_obj.assigned_to_id = user_id
    log = ActivityLog(user_id=user.id, action="assign", details=f"Assigned email #{email_id}")
    db.add(log)
    db.commit()
    return {"success": True}

@router.post("/{email_id}/followup")
def add_followup(
    email_id: int,
    note: str = Form(""),
    due_date: str = Form(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Not found")
    due = None
    if due_date:
        try:
            due = datetime.datetime.fromisoformat(due_date)
        except:
            pass
    fu = FollowUp(email_id=email_id, user_id=user.id, note=note, due_date=due)
    db.add(fu)
    email_obj.needs_followup = True
    db.commit()
    return {"success": True}

@router.post("/{email_id}/label")
def add_label(
    email_id: int,
    name: str = Form(...),
    color: str = Form("#3B82F6"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Not found")
    label = EmailLabel(email_id=email_id, name=name, color=color)
    db.add(label)
    db.commit()
    return {"success": True, "label": {"id": label.id, "name": name, "color": color}}

@router.post("/{email_id}/read")
def set_email_read_status(
    email_id: int,
    is_read: bool = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")
        
    # Security check to ensure the user owns the account
    account = db.query(EmailAccount).filter(EmailAccount.id == email_obj.account_id, EmailAccount.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    email_obj.is_read = is_read
    db.commit()
    
    if account.provider == "gmail":
        modify_gmail_message_status(account, email_obj.message_id, is_read)
    elif account.provider == "outlook":
        modify_outlook_message_status(account, email_obj.message_id, is_read)
        
    return {"success": True, "is_read": is_read}

@router.delete("/{email_id}")
def delete_email(
    email_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")
        
    account = db.query(EmailAccount).filter(EmailAccount.id == email_obj.account_id, EmailAccount.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    message_id = email_obj.message_id
    
    if email_obj.folder == "TRASH":
        # Permanently delete
        db.query(FollowUp).filter(FollowUp.email_id == email_id).delete()
        db.query(EmailLabel).filter(EmailLabel.email_id == email_id).delete()
        db.delete(email_obj)
        db.commit()
    else:
        # Move to trash
        email_obj.folder = "TRASH"
        db.commit()
        if account.provider == "gmail":
            res = trash_gmail_message(account, message_id)
            if "error" in res:
                raise HTTPException(status_code=400, detail=res["error"])
        elif account.provider == "outlook":
            res = trash_outlook_message(account, message_id)
            if "error" in res:
                raise HTTPException(status_code=400, detail=res["error"])
                    
    return {"success": True}

@router.put("/{email_id}/restore")
def restore_email(
    email_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")
        
    account = db.query(EmailAccount).filter(EmailAccount.id == email_obj.account_id, EmailAccount.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    email_obj.folder = "INBOX"
    db.commit()
    
    return {"success": True}


@router.post("/send")
def send_email(
    account_id: int = Form(...),
    to: str = Form(...),
    cc: str = Form(""),
    subject: str = Form(...),
    body: str = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(EmailAccount).filter(
        EmailAccount.id == account_id, EmailAccount.user_id == user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if account.provider == "gmail" and account.oauth_refresh_token:
        result = send_gmail(account, to, subject, body, cc)
    elif account.provider == "outlook" and account.oauth_refresh_token:
        result = send_outlook(account, to, subject, body, cc)
    else:
        result = send_imap_email(account, to, subject, body, cc)

    log = ActivityLog(user_id=user.id, action="send_email", details=f"Sent to {to}")
    db.add(log)
    db.commit()

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/analytics/overview")
def analytics_overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account_ids = [a.id for a in db.query(EmailAccount.id).filter(
        EmailAccount.user_id == user.id, EmailAccount.is_active == True
    ).all()]
    if not account_ids:
        return {"total": 0, "unread": 0, "flagged": 0, "followup": 0, "read_pct": 0, "categories": [], "sentiments": [], "daily": [], "priority": []}

    total = db.query(func.count(Email.id)).filter(Email.account_id.in_(account_ids)).scalar() or 0
    unread = db.query(func.count(Email.id)).filter(Email.account_id.in_(account_ids), Email.is_read == False).scalar() or 0
    flagged = db.query(func.count(Email.id)).filter(Email.account_id.in_(account_ids), Email.is_flagged == True).scalar() or 0
    followup = db.query(func.count(Email.id)).filter(Email.account_id.in_(account_ids), Email.needs_followup == True).scalar() or 0
    read_pct = round((total - unread) / total * 100, 1) if total > 0 else 0

    categories = db.query(Email.ai_category, func.count(Email.id)).filter(
        Email.account_id.in_(account_ids), Email.ai_category.isnot(None)
    ).group_by(Email.ai_category).all()

    sentiments = db.query(Email.ai_sentiment, func.count(Email.id)).filter(
        Email.account_id.in_(account_ids), Email.ai_sentiment.isnot(None)
    ).group_by(Email.ai_sentiment).all()

    daily = db.query(
        func.date(Email.received_at).label("date"),
        func.count(Email.id).label("count")
    ).filter(
        Email.account_id.in_(account_ids),
        Email.received_at.isnot(None)
    ).group_by(func.date(Email.received_at)).order_by(func.date(Email.received_at).desc()).limit(30).all()

    priority = db.query(Email).filter(
        Email.account_id.in_(account_ids),
        Email.priority_score >= 0.5
    ).order_by(desc(Email.priority_score)).limit(10).all()

    return {
        "total": total,
        "unread": unread,
        "flagged": flagged,
        "followup": followup,
        "read_pct": read_pct,
        "categories": [{"name": c or "general", "count": cnt} for c, cnt in categories],
        "sentiments": [{"name": s or "neutral", "count": cnt} for s, cnt in sentiments],
        "daily": [{"date": str(d), "count": cnt} for d, cnt in daily],
        "priority": [format_email(e) for e in priority],
    }

def format_email(e: Email) -> dict:
    attachments = []
    if e.attachments_json:
        try:
            attachments = json.loads(e.attachments_json)
        except:
            pass
    return {
        "id": e.id,
        "account_id": e.account_id,
        "message_id": e.message_id,
        "folder": e.folder,
        "subject": e.subject,
        "sender": e.sender,
        "sender_name": e.sender_name or e.sender,
        "recipients": e.recipients,
        "cc": e.cc,
        "body_text": e.body_text,
        "body_html": e.body_html,
        "received_at": (e.received_at.isoformat() + "Z") if e.received_at else None,
        "is_read": e.is_read,
        "is_flagged": e.is_flagged,
        "has_attachments": e.has_attachments,
        "attachments": attachments,
        "ai_summary": e.ai_summary,
        "ai_category": e.ai_category,
        "ai_sentiment": e.ai_sentiment,
        "priority_score": e.priority_score,
        "needs_followup": e.needs_followup,
        "thread_id": e.thread_id,
        "assigned_to_id": e.assigned_to_id,
        "created_at": (e.created_at.isoformat() + "Z") if e.created_at else None,
    }
