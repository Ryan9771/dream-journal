"""Persist-safe, rate-bounded orchestration for generated dream titles."""

import hashlib

from firebase_admin import firestore
from flask import current_app

from app.config import DAILY_TITLE_LIMIT
from app.firebase import db
from app.insights.titles import fallback_title, generate_dream_title
from app.time import utcnow


@firestore.transactional
def reserve_title_generation(transaction, user_ref) -> bool:
    snapshot = user_ref.get(transaction=transaction)
    data = snapshot.to_dict() or {}
    day_key = utcnow().strftime("%Y-%m-%d")
    usage = data.get("titleUsage", {})
    count = usage.get("count", 0) if usage.get("day") == day_key else 0
    if count >= DAILY_TITLE_LIMIT:
        return False
    transaction.set(
        user_ref,
        {"titleUsage": {"day": day_key, "count": count + 1}},
        merge=True,
    )
    return True


def title_for_new_dream(uid: str, body: str) -> str:
    user_ref = db.collection("users").document(uid)
    if not reserve_title_generation(db.transaction(), user_ref):
        return fallback_title(body)
    try:
        return generate_dream_title(
            body,
            hashlib.sha256(uid.encode()).hexdigest()[:32],
        )
    except Exception:
        current_app.logger.exception("Dream title generation failed; using a local fallback.")
        return fallback_title(body)
