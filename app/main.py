import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routes.auth import router as auth_router
from .routes.emails import router as email_router
from .routes.accounts import router as account_router
from .routes.team import router as team_router
from .routes.google_auth import router as google_auth_router
from .routes.outlook_auth import router as outlook_auth_router

app = FastAPI(title="Email Portal API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(email_router)
app.include_router(account_router)
app.include_router(team_router)
app.include_router(google_auth_router)
app.include_router(outlook_auth_router)

@app.on_event("startup")
def startup():
    init_db()
    asyncio.create_task(background_sync_task())

async def background_sync_task():
    from .database import SessionLocal
    from .models import EmailAccount
    from .email_service import sync_account_emails
    import datetime
    
    # Wait a few seconds before first sync
    await asyncio.sleep(5)
    
    while True:
        try:
            db = SessionLocal()
            try:
                accounts = db.query(EmailAccount).filter(EmailAccount.is_active == True).all()
                for account in accounts:
                    # Sync every 5 seconds — fast enough to feel instant, won't rate-limit APIs
                    now = datetime.datetime.utcnow()
                    needs_sync = (
                        account.last_sync_at is None or 
                        (now - account.last_sync_at).total_seconds() > 5
                    )
                    if needs_sync:
                        asyncio.create_task(asyncio.to_thread(sync_account_emails, account))
            finally:
                db.close()
        except Exception as e:
            print(f"Background sync error: {e}")
        
        # Check every 500ms — tight loop for fast detection
        await asyncio.sleep(0.5)

@app.get("/api/health")
def health():
    return {"status": "ok"}
