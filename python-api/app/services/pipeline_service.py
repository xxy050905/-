"""Pipeline service: orchestrates recognition -> translation -> synthesis."""
import logging
import time
import uuid

from app.config import OUTPUT_DIR
from app.services.module_loader import ModuleLoader

logger = logging.getLogger(__name__)


class PipelineService:
    """Orchestrates the full speech-to-speech translation pipeline."""

    def __init__(self, loader: ModuleLoader):
        self.loader = loader

    def run(self, audio_path: str, voice: str, speed: str, language: str) -> dict:
        """Run the full pipeline: recognition -> translation -> synthesis.

        Returns a dict with results from each step.
        """
        steps_result = {}
        total_start = time.time()

        # Step 1: Speech Recognition
        logger.info("Pipeline Step 1: Speech Recognition")
        step_start = time.time()

        result = self.loader.recognizer.recognize(audio_path, language=language)
        recognized_text = result["text"]
        steps_result["recognition"] = {
            "time": time.time() - step_start,
            "text": recognized_text,
            "success": True
        }
        logger.info(f"Recognized: {recognized_text}")

        if not recognized_text.strip():
            return {
                "error": "未识别到语音内容",
                "status_code": 400,
                "steps": steps_result,
            }

        # Step 2: Translation
        logger.info("Pipeline Step 2: Translation")
        step_start = time.time()

        trans_result = self.loader.translator.translate_with_quality(recognized_text)
        translated_text = trans_result["translation"]
        steps_result["translation"] = {
            "time": time.time() - step_start,
            "source": recognized_text,
            "translation": translated_text,
            "success": True
        }
        logger.info(f"Translated: {translated_text}")

        # Step 3: Speech Synthesis
        logger.info(f"Pipeline Step 3: Speech Synthesis (voice={voice}, speed={speed})")
        step_start = time.time()

        output_filename = f"pipeline_{uuid.uuid4().hex}.mp3"
        output_path = OUTPUT_DIR / output_filename

        print(f"[PIPELINE-SYNTH] Calling synthesizer with voice={voice}, speed={speed}, text={translated_text[:50]}...")
        self.loader.synthesizer.synthesize(
            text=translated_text,
            output_path=str(output_path),
            voice=voice,
            speed=speed
        )
        steps_result["synthesis"] = {
            "time": time.time() - step_start,
            "output_path": output_filename,
            "success": True
        }

        total_time = time.time() - total_start

        return {
            "recognized_text": recognized_text,
            "translated_text": translated_text,
            "output_audio_url": f"/uploads/audio/{output_filename}",
            "total_time": total_time,
            "steps": steps_result,
        }
