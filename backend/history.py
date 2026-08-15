from pathlib import Path
import json
from datetime import datetime


HISTORY_FILE = Path("uploads/history.json")


def load_history():
    if not HISTORY_FILE.exists():
        return []

    try:
        return json.loads(HISTORY_FILE.read_text())
    except Exception:
        return []


def save_history(record):
    HISTORY_FILE.parent.mkdir(exist_ok=True)

    history = load_history()

    history.insert(0, record)

    history = history[:20]

    HISTORY_FILE.write_text(
        json.dumps(history, indent=2)
    )


def create_history_record(
    filename,
    ats_result,
    analysis,
    suggestions
):
    return {
        "id": datetime.now().strftime(
            "%Y%m%d%H%M%S%f"
        ),
        "filename": filename,
        "score": ats_result.get("ats_score", 0),
        "rating": ats_result.get("rating", "-"),
        "word_count": ats_result.get("word_count", 0),
        "skill_count": analysis.get("skill_count", 0),
        "suggestion_count": suggestions.get(
            "suggestion_count", 0
        ),
        "created_at": datetime.now().isoformat()
    }
