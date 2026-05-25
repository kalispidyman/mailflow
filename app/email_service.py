import imaplib
import smtplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.header import decode_header
from email import encoders
import datetime
import json
import re
import base64
import os
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session
from .models import EmailAccount, Email, SyncFolder
from .database import SessionLocal
from .config import ENCRYPTION_KEY

# Global set to track account IDs currently undergoing sync
syncing_accounts = set()

def get_cipher():
    key = ENCRYPTION_KEY.encode() if ENCRYPTION_KEY else Fernet.generate_key()
    return Fernet(key)

def decrypt_value(encrypted_text: str) -> str:
    if not encrypted_text:
        return ""
    try:
        return get_cipher().decrypt(encrypted_text.encode()).decode()
    except Exception:
        return encrypted_text

def encrypt_value(plain_text: str) -> str:
    return get_cipher().encrypt(plain_text.encode()).decode()

PROVIDER_CONFIGS = {
    "gmail": {
        "imap": ("imap.gmail.com", 993),
        "smtp": ("smtp.gmail.com", 587),
        "oauth": True,
    },
    "outlook": {
        "imap": ("outlook.office365.com", 993),
        "smtp": ("smtp.office365.com", 587),
        "oauth": True,
    },
    "yahoo": {
        "imap": ("imap.mail.yahoo.com", 993),
        "smtp": ("smtp.mail.yahoo.com", 587),
        "oauth": False,
    },
    "custom": {
        "imap": (None, 993),
        "smtp": (None, 587),
        "oauth": False,
    },
}

def decode_mime_header(header_value):
    if not header_value:
        return ""
    decoded_parts = decode_header(header_value)
    result = []
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            try:
                result.append(part.decode(encoding or "utf-8", errors="replace"))
            except LookupError:
                result.append(part.decode("utf-8", errors="replace"))
        else:
            result.append(str(part))
    return " ".join(result)

def extract_email_address(raw):
    match = re.search(r'<([^>]+)>', raw)
    if match:
        return match.group(1)
    return raw.strip()

def extract_name(raw):
    match = re.match(r'([^<]+)', raw)
    if match:
        return match.group(1).strip().strip('"')
    return raw.strip()

def analyze_email(subject: str, body: str, sender: str) -> dict:
    text = f"{subject or ''} {body or ''}".lower()
    summary = (body or "")[:200].strip()
    if len(body or "") > 200:
        summary += "..."
    category = "general"
    sentiment = "neutral"
    priority = 0.0
    needs_followup = False

    category_keywords = {
        "invoice": ["invoice", "bill", "payment", "receipt", "transaction", "paid"],
        "support": ["support", "help", "issue", "problem", "bug", "error", "urgent", "broken"],
        "meeting": ["meeting", "calendar", "schedule", "appointment", "invite", "zoom", "google meet"],
        "newsletter": ["newsletter", "unsubscribe", "weekly", "digest", "announcement"],
        "project": ["project", "task", "deliverable", "milestone", "deadline", "sprint"],
        "client": ["client", "customer", "partnership", "proposal", "contract", "quote"],
    }

    for cat, keywords in category_keywords.items():
        if any(kw in text for kw in keywords):
            category = cat
            break

    if any(kw in text for kw in ["thank", "great", "excellent", "pleased", "happy", "appreciate"]):
        sentiment = "positive"
    if any(kw in text for kw in ["unhappy", "issue", "problem", "urgent", "complaint", "frustrated", "angry", "broken"]):
        sentiment = "negative"
        priority = max(priority, 0.7)
        needs_followup = True

    if any(kw in text for kw in ["follow up", "asap", "deadline", "action required", "please respond", "waiting for", "reminder"]):
        needs_followup = True
        priority = max(priority, 0.5)

    return {
        "summary": summary,
        "category": category,
        "sentiment": sentiment,
        "priority_score": round(priority, 2),
        "needs_followup": needs_followup,
    }

def fetch_imap_emails(account: EmailAccount, folder: str = "INBOX", since_days: int = 30) -> dict:
    db = SessionLocal()
    try:
        password = decrypt_value(account.encrypted_password)
        if not password:
            return {"error": "No password configured"}

        cfg = PROVIDER_CONFIGS.get(account.provider, PROVIDER_CONFIGS["custom"])
        imap_host = account.imap_server or cfg["imap"][0]
        imap_port = account.imap_port or cfg["imap"][1]

        if not imap_host:
            return {"error": "IMAP server not configured"}

        mail = imaplib.IMAP4_SSL(imap_host, imap_port)
        mail.login(account.email_address, password)
        mail.select(folder)

        since_date = (datetime.datetime.utcnow() - datetime.timedelta(days=since_days)).strftime("%d-%b-%Y")
        status, messages = mail.search(None, f'(SINCE {since_date})')

        if status != "OK":
            mail.logout()
            return {"error": "No messages found"}

        uids = messages[0].split() if messages[0] else []
        total = len(uids)
        synced = 0

        for uid in uids:
            try:
                status, msg_data = mail.fetch(uid, "(RFC822)")
                if status != "OK":
                    continue
                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)

                message_id = msg.get("Message-ID", "").strip()
                existing = db.query(Email).filter(
                    Email.account_id == account.id,
                    Email.message_id == message_id
                ).first()
                if existing:
                    continue

                subject = decode_mime_header(msg.get("Subject", ""))
                sender_raw = decode_mime_header(msg.get("From", ""))
                sender_name = extract_name(sender_raw)
                sender_email = extract_email_address(sender_raw) or sender_raw
                recipients = decode_mime_header(msg.get("To", ""))
                cc = decode_mime_header(msg.get("Cc", ""))
                date_str = msg.get("Date", "")

                body_text = ""
                body_html = ""
                attachments = []
                has_attachments = False

                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        content_disposition = str(part.get("Content-Disposition", ""))
                        if "attachment" in content_disposition:
                            has_attachments = True
                            filename = part.get_filename()
                            if filename:
                                attachments.append({
                                    "filename": decode_mime_header(filename),
                                    "content_type": content_type,
                                })
                        elif content_type == "text/plain" and not body_text:
                            try:
                                body_text = part.get_payload(decode=True).decode(
                                    part.get_content_charset() or "utf-8", errors="replace"
                                )
                            except Exception:
                                pass
                        elif content_type == "text/html" and not body_html:
                            try:
                                body_html = part.get_payload(decode=True).decode(
                                    part.get_content_charset() or "utf-8", errors="replace"
                                )
                            except Exception:
                                pass
                else:
                    content_type = msg.get_content_type()
                    try:
                        payload = msg.get_payload(decode=True)
                        if payload:
                            decoded = payload.decode(msg.get_content_charset() or "utf-8", errors="replace")
                            if content_type == "text/plain":
                                body_text = decoded
                            elif content_type == "text/html":
                                body_html = decoded
                    except Exception:
                        pass

                received_at = None
                try:
                    from email.utils import parsedate_to_datetime
                    received_at = parsedate_to_datetime(date_str)
                except Exception:
                    received_at = datetime.datetime.utcnow()

                thread_id = msg.get("References", "") or msg.get("In-Reply-To", "") or message_id
                if thread_id and isinstance(thread_id, str):
                    thread_id = thread_id.split()[-1] if thread_id.split() else thread_id

                analysis = analyze_email(subject, body_text or body_html, sender_email)

                email_obj = Email(
                    account_id=account.id,
                    message_id=message_id,
                    folder=folder,
                    subject=subject[:500] if subject else "",
                    sender=sender_email,
                    sender_name=sender_name,
                    recipients=recipients[:500] if recipients else "",
                    cc=cc[:500] if cc else "",
                    body_text=body_text[:50000] if body_text else "",
                    body_html=body_html[:100000] if body_html else "",
                    received_at=received_at,
                    is_read=False,
                    has_attachments=has_attachments,
                    attachments_json=json.dumps(attachments),
                    ai_summary=analysis["summary"],
                    ai_category=analysis["category"],
                    ai_sentiment=analysis["sentiment"],
                    priority_score=analysis["priority_score"],
                    needs_followup=analysis["needs_followup"],
                    thread_id=thread_id[:255] if thread_id else None,
                )
                db.add(email_obj)
                db.commit()
                synced += 1
            except Exception:
                db.rollback()
                continue

        mail.logout()
        account.last_sync_at = datetime.datetime.utcnow()
        db.commit()
        return {"synced": synced, "total": total, "account": account.email_address}
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

def send_imap_email(account: EmailAccount, to: str, subject: str, body: str, cc: str = "") -> dict:
    try:
        password = decrypt_value(account.encrypted_password)
        if not password:
            return {"error": "No password configured"}

        cfg = PROVIDER_CONFIGS.get(account.provider, PROVIDER_CONFIGS["custom"])
        smtp_host = account.smtp_server or cfg["smtp"][0]
        smtp_port = account.smtp_port or cfg["smtp"][1]

        if not smtp_host:
            return {"error": "SMTP server not configured"}

        msg = MIMEMultipart("alternative")
        msg["From"] = f"{account.display_name or account.email_address} <{account.email_address}>"
        msg["To"] = to
        msg["Subject"] = subject
        if cc:
            msg["Cc"] = cc
        msg.attach(MIMEText(body, "plain", "utf-8"))

        all_recipients = [r.strip() for r in to.split(",") if r.strip()]
        if cc:
            all_recipients.extend([r.strip() for r in cc.split(",") if r.strip()])

        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(account.email_address, password)
        server.sendmail(account.email_address, all_recipients, msg.as_string())
        server.quit()
        return {"success": True, "to": to, "subject": subject, "account": account.email_address}
    except Exception as e:
        return {"error": str(e)}

def generate_mock_gmail_emails(account: EmailAccount) -> dict:
    db = SessionLocal()
    import secrets
    try:
        existing_count = db.query(Email).filter(Email.account_id == account.id).count()
        if existing_count > 0:
            db_account = db.query(EmailAccount).filter(EmailAccount.id == account.id).first()
            if db_account:
                db_account.last_sync_at = datetime.datetime.utcnow()
                db.commit()
                account.last_sync_at = db_account.last_sync_at
            return {"synced": 0, "total": existing_count, "account": account.email_address}

        # List of high-fidelity, premium mock emails
        mock_templates = [
            {
                "subject": "URGENT: Outstanding Invoice #2024-88A - Action Required",
                "sender": "finance@billing-solutions.com",
                "sender_name": "Billing & Finance Dept",
                "recipients": account.email_address,
                "body_text": "Dear Customer,\n\nThis is a critical reminder that your invoice #2024-88A for the amount of $2,450.00 is now 7 days past due. We kindly ask you to complete the payment immediately to avoid any service disruptions.\n\nYou can pay securely using our direct portal. Let us know ASAP if you have any questions.\n\nBest regards,\nBilling Solutions Team",
                "body_html": "<p>Dear Customer,</p><p>This is a <strong>critical reminder</strong> that your invoice #2024-88A for the amount of <strong>$2,450.00</strong> is now 7 days past due. We kindly ask you to complete the payment immediately to avoid any service disruptions.</p><p>Please let us know ASAP if you have any questions.</p><p>Best regards,<br>Billing Solutions Team</p>",
                "received_hours_ago": 1,
            },
            {
                "subject": "System Outage / Fatal Error on Main Checkout Button",
                "sender": "alex.smith@gmail.com",
                "sender_name": "Alex Smith",
                "recipients": account.email_address,
                "body_text": "Hello Support Team,\n\nI was trying to purchase your Premium Freelancer Plan on the site, but the checkout button is completely broken! It keeps throwing a fatal 500 server error when I click it. This is extremely frustrating as I need to upgrade my account urgently for a project deadline today. Please look into this issue and fix the bug ASAP!",
                "body_html": "<p>Hello Support Team,</p><p>I was trying to purchase your Premium Freelancer Plan on the site, but the checkout button is <strong>completely broken!</strong> It keeps throwing a fatal 500 server error when I click it. This is extremely frustrating as I need to upgrade my account urgently for a project deadline today. Please fix this bug ASAP!</p>",
                "received_hours_ago": 3,
            },
            {
                "subject": "Project Sync and Product Roadmap Discussion invitation",
                "sender": "sarah.jenkins@company-work.com",
                "sender_name": "Sarah Jenkins (PM)",
                "recipients": account.email_address,
                "body_text": "Hi Team,\n\nI would like to schedule a calendar invite for our weekly project sync and product roadmap discussion. We will review our current task progress, sprint deadlines, and plan upcoming deliverables.\n\nLet's connect via Zoom tomorrow at 11:00 AM. Looking forward to speaking with you all.",
                "body_html": "<p>Hi Team,</p><p>I would like to schedule a calendar invite for our weekly project sync and product roadmap discussion. We will review our current task progress, sprint deadlines, and plan upcoming deliverables.</p><p>Let's connect via Zoom tomorrow at 11:00 AM.</p>",
                "received_hours_ago": 8,
            },
            {
                "subject": "Stunning design update - Kudos to the team!",
                "sender": "michael.designer@creative-hub.com",
                "sender_name": "Michael Chen",
                "recipients": account.email_address,
                "body_text": "Hi guys,\n\nJust wanted to reach out and say congratulations on the brand new UI redesign! The immersive dark mode, sleek glassmorphism, and beautiful micro-animations look absolutely amazing and feel extremely premium. Our clients are already loving it. Thank you for the incredible work!",
                "body_html": "<p>Hi guys,</p><p>Just wanted to reach out and say congratulations on the brand new UI redesign! The immersive dark mode, sleek glassmorphism, and beautiful micro-animations look absolutely amazing and feel <strong>extremely premium</strong>. Thank you for the incredible work!</p>",
                "received_hours_ago": 12,
            },
            {
                "subject": "Weekly Newsletter: AI Engineering Trends & Best Practices",
                "sender": "news@engineering-digest.com",
                "sender_name": "AI Engineering Digest",
                "recipients": account.email_address,
                "body_text": "Hello Developers,\n\nWelcome to this week's AI Engineering Digest! In this issue, we explore: \n- Best practices in building fast, scalable agentic AI coding assistants\n- Optimizing LLM routing layers for low latency\n- A deep dive into beautiful glassmorphic UI design\n\nClick unsubscribe if you no longer wish to receive this weekly digest.",
                "body_html": "<p>Hello Developers,</p><p>Welcome to this week's AI Engineering Digest! In this issue, we explore:</p><ul><li>Best practices in building fast, scalable agentic AI assistants</li><li>Optimizing LLM routing layers for low latency</li><li>A deep dive into beautiful glassmorphic UI design</li></ul>",
                "received_hours_ago": 24,
            }
        ]

        synced = 0
        for temp in mock_templates:
            msg_id = "mock_msg_" + secrets.token_hex(8)
            analysis = analyze_email(temp["subject"], temp["body_text"], temp["sender"])
            
            received_at = datetime.datetime.utcnow() - datetime.timedelta(hours=temp["received_hours_ago"])
            
            email_obj = Email(
                account_id=account.id,
                message_id=msg_id,
                folder="INBOX",
                subject=temp["subject"][:500],
                sender=temp["sender"],
                sender_name=temp["sender_name"],
                recipients=temp["recipients"][:500],
                cc="",
                body_text=temp["body_text"][:50000],
                body_html=temp["body_html"][:100000],
                received_at=received_at,
                is_read=False,
                has_attachments=False,
                attachments_json="[]",
                ai_summary=analysis["summary"],
                ai_category=analysis["category"],
                ai_sentiment=analysis["sentiment"],
                priority_score=analysis["priority_score"],
                needs_followup=analysis["needs_followup"],
                thread_id=msg_id,
            )
            db.add(email_obj)
            synced += 1

        account.last_sync_at = datetime.datetime.utcnow()
        db.commit()
        return {"synced": synced, "total": len(mock_templates), "account": account.email_address}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()

def fetch_gmail_emails(account: EmailAccount, max_results: int = 500) -> dict:
    try:
        refresh_token = decrypt_value(account.oauth_refresh_token or "")
        if not refresh_token:
            return {"error": "No refresh token available"}

        if refresh_token.startswith("mock_refresh_token_"):
            return generate_mock_gmail_emails(account)

        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from .config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

        creds = Credentials(
            None,
            refresh_token=refresh_token,
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            token_uri="https://oauth2.googleapis.com/token",
        )

        service = build("gmail", "v1", credentials=creds)
        db = SessionLocal()

        try:
            results = service.users().messages().list(userId="me", maxResults=max_results, q="", includeSpamTrash=True).execute()
            messages = results.get("messages", [])
            total = len(messages)
            synced = 0

            oldest_fetched_date = None

            for msg_ref in messages:
                try:
                    msg_id = msg_ref["id"]
                    existing = db.query(Email).filter(
                        Email.account_id == account.id,
                        Email.message_id == msg_id
                    ).first()
                    if existing:
                        if existing.received_at:
                            if oldest_fetched_date is None or existing.received_at < oldest_fetched_date:
                                oldest_fetched_date = existing.received_at
                        continue

                    msg = service.users().messages().get(userId="me", id=msg_id, format="full").execute()
                    headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}

                    # Do not use SMTP message-id header because Google API requires the internal msg_id
                    # message_id = headers.get("message-id", msg_id)
                    subject = headers.get("subject", "")
                    sender_raw = headers.get("from", "")
                    sender_name = extract_name(sender_raw)
                    sender_email = extract_email_address(sender_raw) or sender_raw
                    recipients = headers.get("to", "")
                    cc = headers.get("cc", "")
                    date_str = headers.get("date", "")

                    label_ids = msg.get("labelIds", [])
                    is_read = "UNREAD" not in label_ids
                    is_flagged = "STARRED" in label_ids
                    
                    folder = "INBOX"
                    if "TRASH" in label_ids:
                        folder = "TRASH"
                    elif "SPAM" in label_ids:
                        folder = "SPAM"
                    elif "SENT" in label_ids:
                        folder = "SENT"

                    body_text = ""
                    body_html = ""
                    attachments = []
                    has_attachments = False

                    payload = msg.get("payload", {})
                    parts = [payload]
                    while parts:
                        part = parts.pop(0)
                        if part.get("parts"):
                            parts.extend(part["parts"])
                        filename = part.get("filename", "")
                        if filename:
                            has_attachments = True
                            attachments.append({
                                "filename": filename,
                                "content_type": part.get("mimeType", ""),
                                "attachment_id": part.get("body", {}).get("attachmentId", ""),
                            })
                        if part["mimeType"] == "text/plain" and not body_text:
                            data = part.get("body", {}).get("data", "")
                            if data:
                                body_text = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
                        elif part["mimeType"] == "text/html" and not body_html:
                            data = part.get("body", {}).get("data", "")
                            if data:
                                body_html = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

                    received_at = None
                    try:
                        from email.utils import parsedate_to_datetime
                        received_at = parsedate_to_datetime(date_str).replace(tzinfo=None)
                    except Exception:
                        received_at = datetime.datetime.utcnow()

                    if received_at:
                        if oldest_fetched_date is None or received_at < oldest_fetched_date:
                            oldest_fetched_date = received_at

                    thread_id = msg.get("threadId", msg_id)
                    analysis = analyze_email(subject, body_text or body_html, sender_email)

                    email_obj = Email(
                        account_id=account.id,
                        message_id=msg_id,
                        folder=folder,
                        subject=subject[:500],
                        sender=sender_email,
                        sender_name=sender_name,
                        recipients=recipients[:500],
                        cc=cc[:500] if cc else "",
                        body_text=body_text[:50000] if body_text else "",
                        body_html=body_html[:100000] if body_html else "",
                        received_at=received_at,
                        is_read=is_read,
                        is_flagged=is_flagged,
                        has_attachments=has_attachments,
                        attachments_json=json.dumps(attachments),
                        ai_summary=analysis["summary"],
                        ai_category=analysis["category"],
                        ai_sentiment=analysis["sentiment"],
                        priority_score=analysis["priority_score"],
                        needs_followup=analysis["needs_followup"],
                        thread_id=thread_id[:255],
                    )
                    db.add(email_obj)
                    db.commit()
                    synced += 1
                except Exception:
                    db.rollback()
                    continue

            # ── Deletion & read-status sync ──────────────────────────────
            server_msg_ids = {msg_ref["id"] for msg_ref in messages}

            if oldest_fetched_date:
                local_emails = db.query(Email).filter(
                    Email.account_id == account.id,
                    Email.received_at >= oldest_fetched_date
                ).all()
                for le in local_emails:
                    if le.message_id not in server_msg_ids:
                        from .models import FollowUp, EmailLabel
                        db.query(FollowUp).filter(FollowUp.email_id == le.id).delete()
                        db.query(EmailLabel).filter(EmailLabel.email_id == le.id).delete()
                        db.delete(le)
                try:
                    db.commit()
                except Exception:
                    db.rollback()
            # ─────────────────────────────────────────────────────────────

            db_account = db.query(EmailAccount).filter(EmailAccount.id == account.id).first()
            if db_account:
                db_account.last_sync_at = datetime.datetime.utcnow()
                db.commit()
                account.last_sync_at = db_account.last_sync_at
            return {"synced": synced, "total": total, "account": account.email_address}
        finally:
            db.close()
    except Exception as e:
        return {"error": str(e)}

def send_gmail(account: EmailAccount, to: str, subject: str, body: str, cc: str = "") -> dict:
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from email.mime.text import MIMEText
        import base64

        refresh_token = decrypt_value(account.oauth_refresh_token or "")
        if not refresh_token:
            return {"error": "No refresh token available"}

        from .config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

        creds = Credentials(
            None,
            refresh_token=refresh_token,
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            token_uri="https://oauth2.googleapis.com/token",
        )

        service = build("gmail", "v1", credentials=creds)

        mime_msg = MIMEText(body, "plain", "utf-8")
        mime_msg["To"] = to
        mime_msg["From"] = account.email_address
        mime_msg["Subject"] = subject
        if cc:
            mime_msg["Cc"] = cc

        raw = base64.urlsafe_b64encode(mime_msg.as_bytes()).decode()
        service.users().messages().send(userId="me", body={"raw": raw}).execute()

        return {"success": True, "to": to, "subject": subject, "account": account.email_address}
    except Exception as e:
        return {"error": str(e)}

def sync_account_emails(account: EmailAccount, max_results: int = None) -> dict:
    if account.id in syncing_accounts:
        return {"status": "already_syncing", "account": account.email_address}
        
    syncing_accounts.add(account.id)
    try:
        if max_results is None:
            max_results = 100 if account.last_sync_at is None else 5

        if account.provider == "gmail" and account.oauth_refresh_token:
            result = fetch_gmail_emails(account, max_results=max_results)
        elif account.provider == "outlook" and account.oauth_refresh_token:
            result = fetch_outlook_emails(account, max_results=max_results)
        elif account.encrypted_password:
            result = fetch_imap_emails(account)
        else:
            result = {"error": "No authentication method configured"}
        return result
    finally:
        syncing_accounts.discard(account.id)

def modify_gmail_message_status(account: EmailAccount, message_id: str, is_read: bool) -> dict:
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        
        refresh_token = decrypt_value(account.oauth_refresh_token or "")
        if not refresh_token or refresh_token.startswith("mock_"):
            return {"success": True, "mock": True}
            
        from .config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
        creds = Credentials(
            None,
            refresh_token=refresh_token,
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            token_uri="https://oauth2.googleapis.com/token",
        )
        service = build("gmail", "v1", credentials=creds)
        
        body = {}
        if is_read:
            body["removeLabelIds"] = ["UNREAD"]
        else:
            body["addLabelIds"] = ["UNREAD"]
            
        service.users().messages().modify(userId="me", id=message_id, body=body).execute()
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def trash_gmail_message(account: EmailAccount, message_id: str) -> dict:
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        
        refresh_token = decrypt_value(account.oauth_refresh_token or "")
        if not refresh_token or refresh_token.startswith("mock_"):
            return {"success": True, "mock": True}
            
        from .config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
        creds = Credentials(
            None,
            refresh_token=refresh_token,
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            token_uri="https://oauth2.googleapis.com/token",
        )
        service = build("gmail", "v1", credentials=creds)
        
        try:
            service.users().messages().trash(userId="me", id=message_id).execute()
        except Exception as inner_e:
            if "already in trash" in str(inner_e).lower() or "400" in str(inner_e):
                service.users().messages().delete(userId="me", id=message_id).execute()
            else:
                raise inner_e
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

outlook_folder_cache = {}

def fetch_outlook_emails(account: EmailAccount, max_results: int = 100) -> dict:
    try:
        refresh_token = decrypt_value(account.oauth_refresh_token or "")
        if not refresh_token:
            return {"error": "No refresh token available"}

        if refresh_token.startswith("mock_refresh_token_"):
            return generate_mock_gmail_emails(account)

        import httpx
        from .config import MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI

        token_data = {
            "client_id": MICROSOFT_CLIENT_ID,
            "client_secret": MICROSOFT_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        resp = httpx.post("https://login.microsoftonline.com/common/oauth2/v2.0/token", data=token_data)
        tokens = resp.json()
        if "error" in tokens:
            return {"error": tokens.get("error_description", tokens["error"])}

        access_token = tokens["access_token"]
        new_refresh = tokens.get("refresh_token")
        
        db = SessionLocal()
        try:
            if new_refresh and new_refresh != refresh_token:
                db_account = db.query(EmailAccount).filter(EmailAccount.id == account.id).first()
                if db_account:
                    db_account.oauth_refresh_token = encrypt_value(new_refresh)
                    db.commit()

            # Cache folder map to avoid requesting it every 1.5 seconds
            global outlook_folder_cache
            if account.id not in outlook_folder_cache:
                folders_resp = httpx.get("https://graph.microsoft.com/v1.0/me/mailFolders?$select=id,displayName", headers={"Authorization": f"Bearer {access_token}"})
                folder_map = {}
                if folders_resp.status_code == 200:
                    for f in folders_resp.json().get("value", []):
                        name_upper = f.get("displayName", "").upper()
                        if name_upper == "INBOX": mapped = "INBOX"
                        elif name_upper == "SENT ITEMS": mapped = "SENT"
                        elif name_upper == "DELETED ITEMS": mapped = "TRASH"
                        elif name_upper == "JUNK EMAIL": mapped = "SPAM"
                        else: mapped = "INBOX"
                        folder_map[f.get("id")] = mapped
                outlook_folder_cache[account.id] = folder_map

            folder_map = outlook_folder_cache.get(account.id, {})

            # Fetch from ALL folders
            messages_url = f"https://graph.microsoft.com/v1.0/me/messages?$top={max_results}&$orderby=receivedDateTime DESC&$select=id,internetMessageId,conversationId,subject,bodyPreview,sender,toRecipients,ccRecipients,receivedDateTime,isRead,flag,hasAttachments,parentFolderId"
            msg_resp = httpx.get(messages_url, headers={"Authorization": f"Bearer {access_token}"})
            if msg_resp.status_code != 200:
                return {"error": f"Graph API error: {msg_resp.text}"}
                
            data = msg_resp.json()
            messages = data.get("value", [])
            total = len(messages)
            synced = 0
            
            oldest_fetched_date = None

            for msg in messages:
                try:
                    # id changes when moved across folders. internetMessageId is immutable.
                    msg_id = msg.get("internetMessageId") or msg.get("id")
                    
                    existing = db.query(Email).filter(
                        Email.account_id == account.id,
                        Email.message_id == msg_id
                    ).first()
                    
                    if not existing:
                        # Fallback check by subject and received time to avoid dupes of old emails that used `id`
                        old_date = None
                        if msg.get("receivedDateTime"):
                            old_date = datetime.datetime.fromisoformat(msg.get("receivedDateTime").replace("Z", "+00:00")).replace(tzinfo=None)
                        
                        existing = db.query(Email).filter(
                            Email.account_id == account.id,
                            Email.subject == msg.get("subject", ""),
                            Email.received_at == old_date
                        ).first()
                        
                    if existing:
                        if existing.received_at:
                            if oldest_fetched_date is None or existing.received_at < oldest_fetched_date:
                                oldest_fetched_date = existing.received_at
                        continue

                    subject = msg.get("subject", "")
                    sender_dict = msg.get("sender", {}).get("emailAddress", {})
                    sender_email = sender_dict.get("address", "")
                    sender_name = sender_dict.get("name", sender_email)
                    
                    recipients_list = [r.get("emailAddress", {}).get("address", "") for r in msg.get("toRecipients", [])]
                    recipients = ", ".join(filter(None, recipients_list))
                    
                    cc_list = [r.get("emailAddress", {}).get("address", "") for r in msg.get("ccRecipients", [])]
                    cc = ", ".join(filter(None, cc_list))

                    body_text = msg.get("bodyPreview", "")
                    
                    received_at_str = msg.get("receivedDateTime")
                    received_at = datetime.datetime.utcnow()
                    if received_at_str:
                        try:
                            # Python 3.11+ can parse ISO strings directly. Replace Z with +00:00 for older versions just in case.
                            received_at = datetime.datetime.fromisoformat(received_at_str.replace("Z", "+00:00")).replace(tzinfo=None)
                        except Exception:
                            pass
                    
                    if received_at:
                        if oldest_fetched_date is None or received_at < oldest_fetched_date:
                            oldest_fetched_date = received_at

                    is_read = msg.get("isRead", False)
                    is_flagged = msg.get("flag", {}).get("flagStatus") == "flagged"
                    has_attachments = msg.get("hasAttachments", False)
                    thread_id = msg.get("conversationId", msg_id)
                    
                    analysis = analyze_email(subject, body_text, sender_email)

                    email_obj = Email(
                        account_id=account.id,
                        message_id=msg_id,
                        folder=folder_map.get(msg.get("parentFolderId"), "INBOX"),
                        subject=subject[:500],
                        sender=sender_email,
                        sender_name=sender_name,
                        recipients=recipients[:500],
                        cc=cc[:500] if cc else "",
                        body_text=body_text[:50000] if body_text else "",
                        body_html="",
                        received_at=received_at,
                        is_read=is_read,
                        is_flagged=is_flagged,
                        has_attachments=has_attachments,
                        attachments_json="[]",
                        ai_summary=analysis["summary"],
                        ai_category=analysis["category"],
                        ai_sentiment=analysis["sentiment"],
                        priority_score=analysis["priority_score"],
                        needs_followup=analysis["needs_followup"],
                        thread_id=thread_id[:255],
                    )
                    db.add(email_obj)
                    db.commit()
                    synced += 1
                except Exception:
                    db.rollback()
                    continue

            # ── Deletion & read-status sync ──────────────────────────────
            # Build a set of all message IDs currently on the server
            server_msg_ids = set()
            server_read_map = {}   # internetMessageId -> isRead
            server_folder_map = {}  # internetMessageId -> folder
            for msg in messages:
                mid = msg.get("internetMessageId") or msg.get("id")
                server_msg_ids.add(mid)
                server_read_map[mid] = msg.get("isRead", False)
                parent = msg.get("parentFolderId", "")
                server_folder_map[mid] = folder_map.get(parent, "INBOX")

            # Remove emails that no longer exist on the server (only within the fetched date range)
            if oldest_fetched_date:
                local_emails = db.query(Email).filter(
                    Email.account_id == account.id,
                    Email.received_at >= oldest_fetched_date
                ).all()
            else:
                local_emails = []
                
            for le in local_emails:
                if le.message_id not in server_msg_ids:
                    # Email was permanently deleted on the server
                    from .models import FollowUp, EmailLabel
                    db.query(FollowUp).filter(FollowUp.email_id == le.id).delete()
                    db.query(EmailLabel).filter(EmailLabel.email_id == le.id).delete()
                    db.delete(le)
                else:
                    # Sync read status and folder from server
                    changed = False
                    new_read = server_read_map.get(le.message_id, le.is_read)
                    new_folder = server_folder_map.get(le.message_id, le.folder)
                    if le.is_read != new_read:
                        le.is_read = new_read
                        changed = True
                    if le.folder != new_folder:
                        le.folder = new_folder
                        changed = True
            try:
                db.commit()
            except Exception:
                db.rollback()
            # ─────────────────────────────────────────────────────────────

            db_account = db.query(EmailAccount).filter(EmailAccount.id == account.id).first()
            if db_account:
                db_account.last_sync_at = datetime.datetime.utcnow()
                db.commit()
                account.last_sync_at = db_account.last_sync_at
            return {"synced": synced, "total": total, "account": account.email_address}
        finally:
            db.close()
    except Exception as e:
        return {"error": str(e)}

def send_outlook(account: EmailAccount, to: str, subject: str, body: str, cc: str = "") -> dict:
    try:
        refresh_token = decrypt_value(account.oauth_refresh_token or "")
        if not refresh_token:
            return {"error": "No refresh token available"}

        import httpx
        from .config import MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET

        token_data = {
            "client_id": MICROSOFT_CLIENT_ID,
            "client_secret": MICROSOFT_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        resp = httpx.post("https://login.microsoftonline.com/common/oauth2/v2.0/token", data=token_data)
        tokens = resp.json()
        if "error" in tokens:
            return {"error": tokens.get("error_description", tokens["error"])}

        access_token = tokens["access_token"]
        
        message = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "Text",
                    "content": body
                },
                "toRecipients": [{"emailAddress": {"address": r.strip()}} for r in to.split(",") if r.strip()]
            },
            "saveToSentItems": "true"
        }
        
        if cc:
            message["message"]["ccRecipients"] = [{"emailAddress": {"address": r.strip()}} for r in cc.split(",") if r.strip()]

        send_resp = httpx.post(
            "https://graph.microsoft.com/v1.0/me/sendMail",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json=message
        )
        if send_resp.status_code != 202:
            return {"error": f"Graph API error: {send_resp.text}"}

        return {"success": True, "to": to, "subject": subject, "account": account.email_address}
    except Exception as e:
        return {"error": str(e)}

def modify_outlook_message_status(account: EmailAccount, message_id: str, is_read: bool) -> dict:
    try:
        refresh_token = decrypt_value(account.oauth_refresh_token or "")
        if not refresh_token or refresh_token.startswith("mock_"):
            return {"success": True, "mock": True}

        import httpx
        from .config import MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET

        token_data = {
            "client_id": MICROSOFT_CLIENT_ID,
            "client_secret": MICROSOFT_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        resp = httpx.post("https://login.microsoftonline.com/common/oauth2/v2.0/token", data=token_data)
        tokens = resp.json()
        if "error" in tokens:
            return {"error": tokens.get("error_description", tokens["error"])}
            
        access_token = tokens["access_token"]
        
        patch_resp = httpx.patch(
            f"https://graph.microsoft.com/v1.0/me/messages/{message_id}",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json={"isRead": is_read}
        )
        
        if patch_resp.status_code != 200:
            return {"error": f"Graph API error: {patch_resp.text}"}
            
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

def trash_outlook_message(account: EmailAccount, message_id: str) -> dict:
    try:
        refresh_token = decrypt_value(account.oauth_refresh_token or "")
        if not refresh_token or refresh_token.startswith("mock_"):
            return {"success": True, "mock": True}

        import httpx
        from .config import MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET

        token_data = {
            "client_id": MICROSOFT_CLIENT_ID,
            "client_secret": MICROSOFT_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        resp = httpx.post("https://login.microsoftonline.com/common/oauth2/v2.0/token", data=token_data)
        tokens = resp.json()
        if "error" in tokens:
            return {"error": tokens.get("error_description", tokens["error"])}
            
        access_token = tokens["access_token"]
        
        move_resp = httpx.post(
            f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/move",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json={"destinationId": "deleteditems"}
        )
        
        if move_resp.status_code not in [200, 201]:
            return {"error": f"Graph API error: {move_resp.text}"}
            
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}


