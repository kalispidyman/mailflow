import datetime
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from .database import Base

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), default="member")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    company = relationship("Company", back_populates="users")
    email_accounts = relationship("EmailAccount", back_populates="user", cascade="all, delete-orphan")

class EmailAccount(Base):
    __tablename__ = "email_accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email_address = Column(String(255), nullable=False)
    display_name = Column(String(255))
    provider = Column(String(50), default="imap")
    imap_server = Column(String(255))
    imap_port = Column(Integer, default=993)
    smtp_server = Column(String(255))
    smtp_port = Column(Integer, default=587)
    encrypted_password = Column(Text)
    oauth_token = Column(Text)
    oauth_refresh_token = Column(Text)
    oauth_state = Column(String(255))
    profile_picture = Column(Text, nullable=True)
    is_primary = Column(Boolean, default=False)
    last_sync_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    is_historical_syncing = Column(Boolean, default=False)
    sync_token = Column(Text, nullable=True) # Delta sync token for History APIs
    next_page_token = Column(Text, nullable=True) # Pagination token for initial historic sync
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user = relationship("User", back_populates="email_accounts")
    emails = relationship("Email", back_populates="account", cascade="all, delete-orphan")
    sync_folders = relationship("SyncFolder", back_populates="account", cascade="all, delete-orphan")

    @property
    def safe_display(self):
        parts = self.email_address.split("@")
        if len(parts) == 2:
            name, domain = parts
            masked = name[:3] + "***" + name[-1:] if len(name) > 4 else name[:2] + "***"
            return f"{masked}@{domain}"
        return self.email_address

class SyncFolder(Base):
    __tablename__ = "sync_folders"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("email_accounts.id"), nullable=False)
    folder_name = Column(String(255), nullable=False)
    last_uid = Column(Integer, default=0)
    account = relationship("EmailAccount", back_populates="sync_folders")

class Email(Base):
    __tablename__ = "emails"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("email_accounts.id"), nullable=False)
    message_id = Column(String(255), index=True)
    folder = Column(String(255), default="INBOX")
    subject = Column(Text)
    sender = Column(String(255))
    sender_name = Column(String(255))
    recipients = Column(Text)
    cc = Column(Text)
    bcc = Column(Text)
    body_text = Column(Text)
    body_html = Column(Text)
    received_at = Column(DateTime)
    is_read = Column(Boolean, default=False)
    is_flagged = Column(Boolean, default=False)
    is_important = Column(Boolean, default=False)
    has_attachments = Column(Boolean, default=False)
    attachments_json = Column(Text)
    ai_summary = Column(Text)
    ai_category = Column(String(100))
    ai_sentiment = Column(String(50))
    priority_score = Column(Float, default=0.0)
    needs_followup = Column(Boolean, default=False)
    followup_date = Column(DateTime)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    account = relationship("EmailAccount", back_populates="emails")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    thread_id = Column(String(255), index=True)
    labels = relationship("EmailLabel", back_populates="email", cascade="all, delete-orphan")

class EmailLabel(Base):
    __tablename__ = "email_labels"
    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.id"), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(20), default="#3B82F6")
    email = relationship("Email", back_populates="labels")

class FollowUp(Base):
    __tablename__ = "follow_ups"
    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text)
    due_date = Column(DateTime)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(255), nullable=False)
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
