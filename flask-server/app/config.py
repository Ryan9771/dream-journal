"""Runtime limits and environment-backed application settings."""

import os
from datetime import timedelta

MAX_ENTRY_CHARS = 6000
DAILY_INSIGHT_LIMIT = 3
DAILY_TITLE_LIMIT = 20
INSIGHT_COOLDOWN = timedelta(seconds=45)
VALID_MOODS = {"peaceful", "joyful", "curious", "uneasy", "sad", "angry", "mixed"}
MAX_MEMORY_EPISODES = 60
MAX_ROLLING_MOTIFS = 40
MAX_ACTIVE_THEMES = 60
INSIGHT_ACCESS_COLLECTION = "insightAccess"
FIRESTORE_DATABASE_ID = os.getenv("FIRESTORE_DATABASE_ID", "").strip()
DATA_ENCRYPTION_MODE = os.getenv("DATA_ENCRYPTION_MODE", "required").strip().lower()
DATA_KMS_KEY_NAME = os.getenv("DATA_KMS_KEY_NAME", "").strip()


def allowed_origins() -> list[str]:
    return os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
