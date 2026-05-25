from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import app.models
    Base.metadata.create_all(bind=engine)
    
    # Seed default user if none exists (for deployment persistence)
    db = SessionLocal()
    try:
        from .models import User, Company
        from .auth import hash_password
        import os
        
        # Check if database has no users
        if db.query(User).count() == 0:
            admin_username = os.environ.get("ADMIN_USERNAME", "admin")
            admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
            admin_email = os.environ.get("ADMIN_EMAIL", "admin@mailflow.internal")
            company_name = os.environ.get("ADMIN_COMPANY", "MailFlow Admin")
            
            # Create default company
            company = Company(name=company_name)
            db.add(company)
            db.flush()
            
            # Create default admin user
            admin_user = User(
                company_id=company.id,
                username=admin_username,
                hashed_password=hash_password(admin_password),
                email=admin_email,
                full_name="System Administrator",
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print(f"Database successfully seeded with admin user: {admin_username}")
    except Exception as e:
        print(f"Failed to seed database: {e}")
        db.rollback()
    finally:
        db.close()
