"""Audio processing service: loading, resampling, temp file management."""
import logging
from pathlib import Path

import librosa
import numpy as np

from app.utils.file_utils import load_audio_universal

logger = logging.getLogger(__name__)


def load_and_resample(file_path: str, target_sr: int = 16000) -> tuple[np.ndarray, int]:
    """Load audio and resample to target sample rate if needed."""
    signal, sr = load_audio_universal(file_path)
    if sr != target_sr:
        signal = librosa.resample(signal, orig_sr=sr, target_sr=target_sr)
        sr = target_sr
    return signal, sr


def cleanup_temp_file(file_path: Path) -> None:
    """Safely remove a temporary file."""
    try:
        if file_path.exists():
            file_path.unlink()
    except OSError as e:
        logger.warning(f"Failed to clean up temp file {file_path}: {e}")
