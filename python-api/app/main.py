"""
FastAPI Backend Server for Speech Translation System
Integrates: Speech Recognition, Translation, Speech Synthesis
"""
import sys
from pathlib import Path

# Add both project root and python-api root to sys.path
# - Project root (contains 'speech_processing')
# - python-api root (contains 'app')
PY_FILE = Path(__file__).resolve()
PYTHON_API_ROOT = PY_FILE.parents[1]   # .../experiment/a/python-api/
PROJECT_ROOT = PYTHON_API_ROOT.parent  # .../experiment/a/
for p in (str(PROJECT_ROOT), str(PYTHON_API_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

import logging
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.config import settings, UPLOAD_DIR, OUTPUT_DIR
from app.middleware.cors import setup_cors
from app.routers import speech_router, translate_router, history_router, upload_router
from app.services.module_loader import ModuleLoader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Shared module loader (dependency-injected into routers)
module_loader = ModuleLoader()


def create_app() -> FastAPI:
    """Application factory."""
    app = FastAPI(
        title="Speech Translation System API",
        description="Chinese Speech Recognition, Translation, and English Speech Synthesis API",
        version="1.0.0"
    )

    # CORS
    setup_cors(app)

    # Mount static files
    app.mount("/uploads/audio", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

    # Register routers
    app.include_router(speech_router)
    app.include_router(translate_router)
    app.include_router(history_router)
    app.include_router(upload_router)

    # Health check (kept in main for simplicity)
    @app.get("/api/health")
    async def health_check():
        return {
            "status": "ok",
            "modules": module_loader.module_status,
            "timestamp": datetime.now().isoformat()
        }

    # Voice config (kept in main)
    @app.get("/api/config/voices")
    async def get_voice_config():
        return {
            "voices": {
                "female_us": {"name": "女声（美式）", "emoji": "\U0001F469"},
                "male_us": {"name": "男声（美式）", "emoji": "\U0001F468"},
                "female_uk": {"name": "女声（英式）", "emoji": "\U0001F469\u200D\U0001F9B0"},
                "male_uk": {"name": "男声（英式）", "emoji": "\U0001F468\u200D\U0001F9B0"},
                "female_us_natural": {"name": "女声（美式，自然）", "emoji": "\U0001F469\u200D\U0001F9B3"},
            },
            "speeds": {
                "slow": {"name": "慢速", "value": "0.7x"},
                "normal": {"name": "正常", "value": "1.0x"},
                "fast": {"name": "快速", "value": "1.3x"},
            }
        }

    # Startup
    @app.on_event("startup")
    async def startup_event():
        logger.info("Starting Speech Translation API server...")
        # Load lightweight modules immediately; heavy models load on first use
        module_loader.vad_detector
        module_loader.preprocessor
        module_loader.mfcc_extractor
        logger.info("Signal processing modules (VAD, Preprocessing, MFCC) loaded")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info"
    )
