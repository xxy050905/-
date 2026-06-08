"""Utility functions for file operations."""
import uuid
from pathlib import Path
from typing import Tuple

import numpy as np
import soundfile as sf
import librosa

from fastapi import HTTPException, UploadFile


ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac"}


async def save_upload_file(audio: UploadFile, directory: Path) -> Path:
    """Save an uploaded file to a directory with a unique filename.
    
    Returns the path to the saved file.
    """
    file_ext = Path(audio.filename).suffix.lower()
    filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = directory / filename
    
    content = await audio.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    return file_path


def load_audio_universal(file_path: str) -> Tuple[np.ndarray, int]:
    """Load audio from any format supported by the system (webm, wav, mp3, etc.)"""
    # Try librosa first (supports webm, mp3, etc.)
    try:
        signal, sr = librosa.load(file_path, sr=None)
        if signal.ndim > 1:
            signal = np.mean(signal, axis=1)
        return signal, int(sr)
    except Exception:
        pass

    # Fallback to soundfile (wav, flac, etc.)
    try:
        signal, sr = sf.read(file_path)
        if signal.ndim > 1:
            signal = np.mean(signal, axis=1)
        return signal, int(sr)
    except Exception:
        pass

    raise HTTPException(status_code=400, detail=f"无法读取音频文件: {file_path}")


def validate_audio_file(audio: UploadFile) -> None:
    """Validate that an uploaded file is an audio file."""
    file_ext = Path(audio.filename).suffix.lower()
    if file_ext not in ALLOWED_AUDIO_EXTENSIONS and not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are allowed")
