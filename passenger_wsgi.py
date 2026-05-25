import sys
import os
from a2wsgi import ASGIMiddleware

# Add the project directory to the sys.path
sys.path.insert(0, os.path.dirname(__file__))

# Import the FastAPI app
from app.main import app

# Convert ASGI (FastAPI) to WSGI (Hostinger Passenger)
application = ASGIMiddleware(app)
