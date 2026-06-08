"""Translation history CRUD routes."""
import logging

from fastapi import APIRouter, Form, HTTPException

from app.services.history_service import (
    create_history_record,
    get_user_history,
    delete_history_record,
    get_user_stats,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["history"])


@router.post("/api/history")
async def save_history(
    user_id: str = Form(...),
    chinese_text: str = Form(...),
    english_text: str = Form(...),
    duration: float = Form(default=0),
    speed: str = Form(default="normal"),
    voice: str = Form(default="female_us"),
    status: str = Form(default="completed")
):
    """Save a translation history record."""
    try:
        record = create_history_record(
            user_id=user_id,
            chinese_text=chinese_text,
            english_text=english_text,
            duration=duration,
            speed=speed,
            voice=voice,
            status=status,
        )
        return {"record": record, "message": "History saved"}

    except Exception as e:
        logger.error(f"Failed to save history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/history")
async def get_history(user_id: str, limit: int = 20, offset: int = 0):
    """Get translation history for a user."""
    try:
        records, total = get_user_history(user_id, limit, offset)
        return {"records": records, "total": total}

    except Exception as e:
        logger.error(f"Failed to get history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/history/{record_id}")
async def delete_history(record_id: str, user_id: str):
    """Delete a history record."""
    try:
        deleted = delete_history_record(record_id, user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Record not found")
        return {"message": "Deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/stats")
async def get_stats(user_id: str):
    """Get user statistics."""
    try:
        stats = get_user_stats(user_id)
        return {"stats": stats}

    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
