from pathlib import Path
import json
from datetime import datetime


HISTORY_FILE = Path("uploads/history.json")


def load_history(user_email=None):
    if not HISTORY_FILE.exists():
        return []

    try:
        history = json.loads(HISTORY_FILE.read_text())

        if not isinstance(history, list):
            return []

        # Backward compatibility:
        # Old records without user_email are not exposed
        # to authenticated users.
        if user_email:
            return [
                item for item in history
                if item.get("user_email") == user_email
            ]

        return history

    except Exception:
        return []


def save_history(record):
    HISTORY_FILE.parent.mkdir(exist_ok=True)

    history = load_history()

    history.insert(0, record)

    # Keep latest 100 records globally.
    history = history[:100]

    HISTORY_FILE.write_text(
        json.dumps(history, indent=2)
    )


def create_history_record(
    filename,
    ats_result,
    analysis,
    suggestions,
    user_email=None
):
    return {
        "id": datetime.now().strftime(
            "%Y%m%d%H%M%S%f"
        ),

        "user_email": user_email,

        "filename": filename,

        "score": ats_result.get(
            "ats_score",
            0
        ),

        "rating": ats_result.get(
            "rating",
            "-"
        ),

        "word_count": ats_result.get(
            "word_count",
            0
        ),

        "skill_count": analysis.get(
            "skill_count",
            0
        ),

        "suggestion_count": suggestions.get(
            "suggestion_count",
            0
        ),

        "analysis": analysis,

        "suggestions": suggestions,

        "created_at": datetime.now().isoformat()
    }


def delete_history_record(
    record_id,
    user_email=None
):
    history = load_history()

    if user_email:
        record_exists = any(
            str(item.get("id")) == str(record_id)
            and item.get("user_email") == user_email
            for item in history
        )
    else:
        record_exists = any(
            str(item.get("id")) == str(record_id)
            for item in history
        )

    if not record_exists:
        return False

    updated_history = [
        item
        for item in history
        if not (
            str(item.get("id")) == str(record_id)
            and (
                user_email is None
                or item.get("user_email") == user_email
            )
        )
    ]

    HISTORY_FILE.write_text(
        json.dumps(
            updated_history,
            indent=2
        )
    )

    return True


def clear_history(user_email=None):
    HISTORY_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    history = load_history()

    if user_email is None:
        updated_history = []
    else:
        updated_history = [
            item
            for item in history
            if item.get("user_email") != user_email
        ]

    HISTORY_FILE.write_text(
        json.dumps(
            updated_history,
            indent=2
        )
    )

    return True
