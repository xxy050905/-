"""Application configuration and settings."""
import os
from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parents[3]  # Project root (.../experiment/a/)
UPLOAD_DIR = BASE_DIR / "uploads" / "audio"
OUTPUT_DIR = BASE_DIR / "output_audio"
HISTORY_FILE = BASE_DIR / "translation_history.json"

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class Settings:
    """Application settings loaded from environment variables."""

    # Baidu credentials
    baidu_app_id: str = os.environ.get("BAIDU_APP_ID", "20260606002626884")
    baidu_app_key: str = os.environ.get("BAIDU_APP_KEY", "idTYtjfzyAKoY4SwqMWQ")

    # Server
    host: str = "0.0.0.0"
    port: int = 8001

    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Speech recognition
    recognizer_model_size: str = "base"

    # History
    max_history_records: int = 500


settings = Settings()
