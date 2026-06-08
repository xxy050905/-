"""Router registration."""
from app.routers.speech import router as speech_router
from app.routers.translate import router as translate_router
from app.routers.history import router as history_router
from app.routers.upload import router as upload_router

__all__ = ["speech_router", "translate_router", "history_router", "upload_router"]
