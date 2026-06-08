"""Speech processing routes: endpoint detection, preprocessing, recognition, synthesis, pipeline."""
import logging
import time
import uuid

import soundfile as sf
from fastapi import APIRouter, File, UploadFile, Form, HTTPException

from app.config import UPLOAD_DIR
from app.models.schemas import (
    EndpointDetectionResponse,
    RecognitionResponse,
    SpeechSynthesisRequest,
    SynthesisResponse,
    PipelineResponse,
)
from app.services.audio_service import load_and_resample, cleanup_temp_file
from app.services.module_loader import ModuleLoader
from app.utils.file_utils import save_upload_file

logger = logging.getLogger(__name__)

router = APIRouter(tags=["speech"])


def get_loader() -> ModuleLoader:
    """Dependency that returns the shared module loader."""
    from app.main import module_loader
    return module_loader


# ==================== Endpoint Detection ====================

@router.post("/api/speech/detect-endpoint", response_model=EndpointDetectionResponse)
async def detect_endpoint(audio: UploadFile = File(...)):
    """Detect speech endpoints and extract the valid speech segment."""
    loader = get_loader()
    temp_path = None
    try:
        temp_path = await save_upload_file(audio, UPLOAD_DIR)
        signal, sr = load_and_resample(str(temp_path))

        start_sample, end_sample = loader.vad_detector.double_threshold_detection(signal)
        extracted = signal[start_sample:end_sample]

        output_path = UPLOAD_DIR / f"extracted_{uuid.uuid4().hex}.wav"
        sf.write(output_path, extracted, 16000)

        cleanup_temp_file(temp_path)

        return EndpointDetectionResponse(
            start_sample=int(start_sample),
            end_sample=int(end_sample),
            start_time=start_sample / 16000,
            end_time=end_sample / 16000,
            duration=len(extracted) / 16000,
            original_duration=len(signal) / 16000
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Endpoint detection failed: {e}")
        if temp_path:
            cleanup_temp_file(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Preprocessing & MFCC ====================

@router.post("/api/speech/preprocess")
async def preprocess_audio(audio: UploadFile = File(...)):
    """Full preprocessing pipeline: endpoint detection, pre-emphasis, framing, MFCC extraction."""
    loader = get_loader()
    temp_path = None
    try:
        temp_path = await save_upload_file(audio, UPLOAD_DIR)
        signal, sr = load_and_resample(str(temp_path))

        start, end = loader.vad_detector.double_threshold_detection(signal)
        extracted = signal[start:end]

        loader.preprocessor.preprocess(extracted)
        mfcc_matrix = loader.mfcc_extractor.extract_mfcc_from_signal(extracted)

        cleanup_temp_file(temp_path)

        mfcc_stats = loader.mfcc_extractor.get_feature_statistics(mfcc_matrix)
        frame_stats = loader.preprocessor.get_frame_statistics(extracted)

        return {
            "preprocessing": {
                "num_frames": frame_stats["num_frames"],
                "frame_length": frame_stats["frame_length"],
                "frame_shift": frame_stats["frame_shift"],
                "total_duration": frame_stats["total_duration"],
                "avg_frame_energy": float(frame_stats["avg_frame_energy"]),
            },
            "mfcc": {
                "shape": list(mfcc_stats["shape"]),
                "overall_mean": float(mfcc_stats["overall_mean"]),
                "overall_std": float(mfcc_stats["overall_std"]),
                "num_coefficients": loader.mfcc_extractor.n_mfcc,
                "num_mel_filters": loader.mfcc_extractor.n_mels,
            },
            "speech_duration": len(extracted) / 16000,
            "speech_start_time": start / 16000,
            "speech_end_time": end / 16000,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        if temp_path:
            cleanup_temp_file(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Speech Recognition ====================

@router.post("/api/speech/recognize", response_model=RecognitionResponse)
async def recognize_speech(
    audio: UploadFile = File(...),
    language: str = Form(default="zh")
):
    """Recognize speech from uploaded audio file."""
    loader = get_loader()
    temp_path = None
    try:
        temp_path = await save_upload_file(audio, UPLOAD_DIR)
        start_time = time.time()

        result = loader.recognizer.recognize(str(temp_path), language=language)

        cleanup_temp_file(temp_path)
        elapsed = time.time() - start_time

        return RecognitionResponse(
            text=result["text"],
            confidence=1.0,
            duration=elapsed
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Speech recognition failed: {e}")
        if temp_path:
            cleanup_temp_file(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Speech Synthesis ====================

@router.post("/api/speech/synthesize", response_model=SynthesisResponse)
async def synthesize_speech(request: SpeechSynthesisRequest):
    """Synthesize speech from text."""
    loader = get_loader()
    logger.info(f"[ROUTE] Synthesize request: voice={request.voice}, speed={request.speed}, text={request.text[:50]}...")
    try:
        output_filename = f"synth_{uuid.uuid4().hex}.mp3"
        output_path = UPLOAD_DIR / output_filename

        start_time = time.time()

        loader.synthesizer.synthesize(
            text=request.text,
            output_path=str(output_path),
            voice=request.voice,
            speed=request.speed
        )

        elapsed = time.time() - start_time

        return SynthesisResponse(
            audio_url=f"/uploads/audio/{output_filename}",
            voice=request.voice,
            speed=request.speed,
            duration=elapsed
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Speech synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Full Pipeline ====================

@router.post("/api/speech/pipeline", response_model=PipelineResponse)
async def full_pipeline(
    audio: UploadFile = File(...),
    voice: str = Form(default="female_us"),
    speed: str = Form(default="normal"),
    language: str = Form(default="zh")
):
    """Full speech translation pipeline: recognition -> translation -> synthesis."""
    from app.services.pipeline_service import PipelineService

    loader = get_loader()
    temp_path = None
    try:
        temp_path = await save_upload_file(audio, UPLOAD_DIR)

        pipeline_service = PipelineService(loader)
        result = pipeline_service.run(str(temp_path), voice, speed, language)

        cleanup_temp_file(temp_path)

        if "error" in result:
            raise HTTPException(status_code=result.get("status_code", 500), detail=result["error"])

        return PipelineResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Pipeline failed: {e}")
        logger.error(f"Pipeline traceback: {tb}")
        if temp_path:
            cleanup_temp_file(temp_path)
        detail = str(e) or "未知错误，请查看服务器日志"
        raise HTTPException(status_code=500, detail=detail)
