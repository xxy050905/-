"""Translation route."""
import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import TranslateTextRequest, TranslationResponse
from app.services.module_loader import ModuleLoader

logger = logging.getLogger(__name__)

router = APIRouter(tags=["translate"])


def get_loader() -> ModuleLoader:
    """Dependency that returns the shared module loader."""
    from app.main import module_loader
    return module_loader


@router.post("/api/translate", response_model=TranslationResponse)
async def translate_text(request: TranslateTextRequest):
    """Translate Chinese text to English."""
    loader = get_loader()
    try:
        result = loader.translator.translate_with_quality(request.text)

        return TranslationResponse(
            source=request.text,
            translation=result["translation"],
            source_length=len(request.text),
            target_length=len(result["translation"])
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
