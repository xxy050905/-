"""Translation history service (JSON file-based storage)."""
import json
import uuid
from datetime import datetime
from pathlib import Path

from app.config import HISTORY_FILE, settings


def load_history() -> list:
    """Load translation history from JSON file."""
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []


def save_history(history: list) -> None:
    """Save translation history to JSON file."""
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def create_history_record(user_id: str, chinese_text: str, english_text: str,
                          duration: float, speed: str, voice: str, status: str) -> dict:
    """Create and save a new history record."""
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "chinese_text": chinese_text,
        "english_text": english_text,
        "duration": duration,
        "speed": speed,
        "voice": voice,
        "status": status,
        "created_at": datetime.now().isoformat()
    }

    history = load_history()
    history.insert(0, record)
    history = history[:settings.max_history_records]
    save_history(history)
    return record


def get_user_history(user_id: str, limit: int = 20, offset: int = 0) -> tuple[list, int]:
    """Get paginated history for a user. Returns (records, total)."""
    history = load_history()
    user_records = [r for r in history if r["user_id"] == user_id]
    total = len(user_records)
    paginated = user_records[offset:offset + limit]
    return paginated, total


def delete_history_record(record_id: str, user_id: str) -> bool:
    """Delete a history record. Returns True if deleted, False if not found."""
    history = load_history()
    filtered = [r for r in history if not (r["id"] == record_id and r["user_id"] == user_id)]

    if len(filtered) == len(history):
        return False

    save_history(filtered)
    return True


def get_user_stats(user_id: str) -> dict:
    """Get user statistics."""
    from collections import Counter
    from datetime import timedelta

    history = load_history()
    user_records = [r for r in history if r["user_id"] == user_id]

    total = len(user_records)
    completed = len([r for r in user_records if r["status"] == "completed"])
    avg_duration = (sum(r["duration"] for r in user_records) / total) if total > 0 else 0

    daily_counts = Counter()
    for r in user_records:
        date = r["created_at"][:10]
        daily_counts[date] += 1

    daily_trend = []
    for i in range(13, -1, -1):
        d = datetime.now() - timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        daily_trend.append({
            "date": d.strftime("%-m/%-d"),
            "count": daily_counts.get(date_str, 0)
        })

    return {
        "totalTranslations": total,
        "todayTranslations": daily_counts.get(datetime.now().strftime("%Y-%m-%d"), 0),
        "successRate": f"{(completed / total * 100) if total > 0 else 100:.1f}",
        "avgDuration": f"{avg_duration:.1f}",
        "dailyTrend": daily_trend,
    }
