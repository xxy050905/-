"""
Speech Processing Package

A modular speech processing pipeline with:
- Voice Activity Detection (VAD)
- Preprocessing & MFCC feature extraction
- Speech Recognition (Whisper)
- Translation (Baidu)
- Speech Synthesis (edge-tts)
"""

from speech_processing.vad import SpeechEndpointDetector
from speech_processing.preprocessing import SpeechPreprocessor, MFCCExtractor
from speech_processing.recognition import SpeechRecognizer
from speech_processing.translation import ChineseToEnglishTranslator
from speech_processing.synthesis import SpeechSynthesizer

__all__ = [
    "SpeechEndpointDetector",
    "SpeechPreprocessor",
    "MFCCExtractor",
    "SpeechRecognizer",
    "ChineseToEnglishTranslator",
    "SpeechSynthesizer",
]
