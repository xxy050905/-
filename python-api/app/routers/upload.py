"""Audio upload route."""
import logging
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException

from app.config import UPLOAD_DIR
from app.utils.file_utils import save_upload_file, validate_audio_file

logger = logging.getLogger(__name__)

router = APIRouter(tags=["upload"])


@router.post("/api/audio/upload")
async def upload_audio(audio: UploadFile = File(...)):
    """Upload an audio file to the server."""
    try:
        validate_audio_file(audio)

        # Read content first (needed for file_size reporting)
        content = await audio.read()
        # Reset file pointer so save_upload_file can re-read
        audio.file.seek(0)

        file_path = await save_upload_file(audio, UPLOAD_DIR)

        return {
            "file_path": f"/uploads/audio/{file_path.name}",
            "file_name": audio.filename,
            "file_size": len(content),
            "message": "Audio uploaded successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
