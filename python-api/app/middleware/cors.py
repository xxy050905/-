"""CORS middleware configuration."""
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


def setup_cors(app):
    """Add CORS middleware to the FastAPI app."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
