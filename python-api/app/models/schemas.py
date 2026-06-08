"""Pydantic models for request/response schemas."""
from typing import Optional, Any

from pydantic import BaseModel


class TranslateTextRequest(BaseModel):
    """Request model for text translation."""
    text: str


class SpeechSynthesisRequest(BaseModel):
    """Request model for speech synthesis."""
    text: str
    voice: str = "female_us"
    speed: str = "normal"


class FullPipelineRequest(BaseModel):
    """Request model for full pipeline (audio -> translation -> synthesis)."""
    voice: str = "female_us"
    speed: str = "normal"
    language: str = "zh"


class EndpointDetectionResponse(BaseModel):
    """Response model for endpoint detection."""
    start_sample: int
    end_sample: int
    start_time: float
    end_time: float
    duration: float
    original_duration: float


class RecognitionResponse(BaseModel):
    """Response model for speech recognition."""
    text: str
    confidence: float = 1.0
    duration: float


class TranslationResponse(BaseModel):
    """Response model for text translation."""
    source: str
    translation: str
    source_length: int
    target_length: int


class SynthesisResponse(BaseModel):
    """Response model for speech synthesis."""
    audio_url: str
    voice: str
    speed: str
    duration: float


class PipelineResponse(BaseModel):
    """Response model for full pipeline."""
    recognized_text: str
    translated_text: str
    output_audio_url: str
    total_time: float
    steps: dict


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None


class HistoryRecord(BaseModel):
    """Model for a history record."""
    id: str
    user_id: str
    chinese_text: str
    english_text: str
    duration: float
    speed: str
    voice: str
    status: str
    created_at: str


class HistoryListResponse(BaseModel):
    """Response model for history list."""
    records: list
    total: int
