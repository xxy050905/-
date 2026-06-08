"""Lazy loading of speech processing modules."""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ModuleLoader:
    """Lazy-loads heavy speech processing modules on first access."""

    def __init__(self):
        self._recognizer = None
        self._translator = None
        self._synthesizer = None
        self._vad_detector = None
        self._preprocessor = None
        self._mfcc_extractor = None

    # ---------- Lightweight modules (load eagerly) ----------

    @property
    def vad_detector(self):
        if self._vad_detector is None:
            from speech_processing.vad import SpeechEndpointDetector
            self._vad_detector = SpeechEndpointDetector(sample_rate=16000)
        return self._vad_detector

    @property
    def preprocessor(self):
        if self._preprocessor is None:
            from speech_processing.preprocessing import SpeechPreprocessor
            self._preprocessor = SpeechPreprocessor(sample_rate=16000)
        return self._preprocessor

    @property
    def mfcc_extractor(self):
        if self._mfcc_extractor is None:
            from speech_processing.preprocessing import MFCCExtractor
            self._mfcc_extractor = MFCCExtractor(sample_rate=16000)
        return self._mfcc_extractor

    # ---------- Heavy modules (lazy load) ----------

    @property
    def recognizer(self):
        if self._recognizer is None:
            from speech_processing.recognition import SpeechRecognizer
            from app.config import settings
            self._recognizer = SpeechRecognizer(model_size=settings.recognizer_model_size)
        return self._recognizer

    @property
    def translator(self):
        if self._translator is None:
            from speech_processing.translation import ChineseToEnglishTranslator
            from app.config import settings
            self._translator = ChineseToEnglishTranslator(
                app_id=settings.baidu_app_id,
                app_key=settings.baidu_app_key,
            )
        return self._translator

    @property
    def synthesizer(self):
        if self._synthesizer is None:
            from speech_processing.synthesis import SpeechSynthesizer
            self._synthesizer = SpeechSynthesizer()
        return self._synthesizer

    # ---------- Status ----------

    @property
    def module_status(self) -> dict:
        return {
            "vad": self._vad_detector is not None,
            "preprocessing": self._preprocessor is not None,
            "mfcc": self._mfcc_extractor is not None,
            "recognizer": self._recognizer is not None,
            "translator": self._translator is not None,
            "synthesizer": self._synthesizer is not None,
        }
