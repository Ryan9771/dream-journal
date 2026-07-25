"""Cost-bounded insight orchestration across storage, retrieval and generation."""

import hashlib

from firebase_admin import firestore
from flask import current_app

from app.access import has_unlimited_insights
from app.config import (
    DAILY_INSIGHT_LIMIT,
    INSIGHT_COOLDOWN,
    MAX_ACTIVE_THEMES,
    MAX_MEMORY_EPISODES,
    MAX_ROLLING_MOTIFS,
)
from app.dreams.repository import (
    decrypt_dream,
    encrypted_dream_update,
    normalize_mood,
    user_entries,
)
from app.firebase import db
from app.insights.ai import (
    analyse_dream,
    canonical_theme,
    embed_dream,
    resolve_theme_proposals,
    select_nearby_themes,
    select_similar_episodes,
)
from app.services.memory import bounded_themes, bounded_unique, persist_personal_themes
from app.security.records import (
    EPISODE_PRIVATE_FIELDS,
    ROLLING_MEMORY_PRIVATE_FIELDS,
    THEME_PRIVATE_FIELDS,
    decrypted_record,
    encrypted_private_update,
    encrypted_record_fields,
)
from app.time import utcnow


class InsightServiceError(Exception):
    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.status_code = status_code


@firestore.transactional
def reserve_insight(transaction, user_ref, enforce_daily_limit: bool = True):
    snapshot = user_ref.get(transaction=transaction)
    data = snapshot.to_dict() or {}
    now = utcnow()
    day_key = now.strftime("%Y-%m-%d")
    usage = data.get("insightUsage", {})
    count = usage.get("count", 0) if usage.get("day") == day_key else 0
    last_at = usage.get("lastAt")
    if enforce_daily_limit and count >= DAILY_INSIGHT_LIMIT:
        return False, "You’ve reached today’s reflection limit. More will be available tomorrow."
    if last_at and now - last_at < INSIGHT_COOLDOWN:
        return False, "Please give the last reflection a moment before requesting another."
    transaction.set(
        user_ref,
        {"insightUsage": {"day": day_key, "count": count + 1, "lastAt": now}},
        merge=True,
    )
    return True, ""


def _resolve_themes(result: dict, theme_catalog: list[dict], safety_identifier: str) -> list[dict]:
    try:
        return resolve_theme_proposals(
            result["insight"].get("themes", []),
            theme_catalog,
            safety_identifier,
        )
    except Exception:
        current_app.logger.exception("Theme normalisation failed; retaining canonical proposal labels.")
        return [
            {
                "label": canonical_theme(label),
                "proposedLabel": canonical_theme(label),
                "catalogId": "",
                "embedding": [],
                "matched": False,
            }
            for label in result["insight"].get("themes", [])[:3]
            if canonical_theme(label)
        ]


def generate_insight(user: dict, dream_id: str) -> dict:
    uid = user["uid"]
    ref = user_entries(uid).document(dream_id)
    snap = ref.get()
    if not snap.exists:
        raise InsightServiceError("Dream not found.", 404)
    dream = decrypt_dream(uid, dream_id, snap.to_dict())
    content_hash = dream["contentHash"]
    existing = dream.get("insight")
    if existing and existing.get("contentHash") == content_hash:
        return {"insight": existing, "cached": True}

    user_ref = db.collection("users").document(uid)
    try:
        unlimited_insights = has_unlimited_insights(user)
    except Exception:
        current_app.logger.exception("Insight access lookup failed; applying the standard daily limit.")
        unlimited_insights = False

    allowed, message = reserve_insight(
        db.transaction(),
        user_ref,
        enforce_daily_limit=not unlimited_insights,
    )
    if not allowed:
        raise InsightServiceError(message, 429)

    memory_snapshot = user_ref.collection("memory").document("rolling").get()
    memory = decrypted_record(
        uid,
        "memory:rolling",
        memory_snapshot.to_dict() or {},
        ROLLING_MEMORY_PRIVATE_FIELDS,
    )
    safety_identifier = hashlib.sha256(uid.encode()).hexdigest()[:32]
    episode_ref = user_ref.collection("memoryEpisodes")
    episode_docs = list(
        episode_ref.order_by("date", direction=firestore.Query.DESCENDING)
        .limit(MAX_MEMORY_EPISODES)
        .stream()
    )
    episodes = [
        {
            **decrypted_record(
                uid,
                f"episode:{doc.id}",
                doc.to_dict(),
                EPISODE_PRIVATE_FIELDS,
            ),
            "id": doc.id,
        }
        for doc in episode_docs
        if doc.id != dream_id
    ]
    theme_ref = user_ref.collection("themeTaxonomy")
    theme_docs = list(theme_ref.where("active", "==", True).limit(MAX_ACTIVE_THEMES).stream())
    theme_catalog = [
        {
            **decrypted_record(
                uid,
                f"theme:{doc.id}",
                doc.to_dict(),
                THEME_PRIVATE_FIELDS,
            ),
            "id": doc.id,
        }
        for doc in theme_docs
    ]

    try:
        current_embedding = embed_dream(dream["body"], safety_identifier)
        similar_episodes = select_similar_episodes(current_embedding, episodes)
        nearby_themes = select_nearby_themes(current_embedding, theme_catalog)
    except Exception:
        current_app.logger.exception("Semantic memory retrieval failed; continuing without episode context.")
        current_embedding = []
        similar_episodes = []
        nearby_themes = []

    episode_themes = [theme for episode in episodes for theme in episode.get("themes", [])]
    episode_anchors = [anchor for episode in episodes for anchor in episode.get("anchors", [])]
    context = {
        "themes": bounded_themes([], episode_themes) if episodes else memory.get("themes", []),
        "motifs": bounded_unique([], episode_anchors, 12) if episodes else memory.get("motifs", []),
        "lastMood": episodes[0].get("mood") if episodes else memory.get("lastMood"),
        "similarEpisodes": similar_episodes,
        "nearbyThemes": nearby_themes,
    }
    try:
        result = analyse_dream(
            body=dream["body"],
            self_reported_mood=normalize_mood(dream["mood"]),
            recent_context=context,
            safety_identifier=safety_identifier,
        )
    except ValueError as exc:
        raise InsightServiceError(str(exc), 422) from exc

    resolved_themes = _resolve_themes(result, theme_catalog, safety_identifier)
    normalized_themes = list(dict.fromkeys(item["label"] for item in resolved_themes))[:3]
    result["insight"]["themes"] = normalized_themes
    result["memory"]["themes"] = normalized_themes

    allowed_connection_ids = {
        episode.get("dreamId")
        for episode in similar_episodes
        if episode.get("dreamId")
    }
    connection_ids = list(
        dict.fromkeys(
            candidate_id
            for candidate_id in result["insight"].get("connectionDreamIds", [])
            if candidate_id in allowed_connection_ids
        )
    )[:3]
    if not result["insight"].get("pattern") or not connection_ids:
        result["insight"]["pattern"] = ""
        connection_ids = []
    result["insight"]["connectionDreamIds"] = connection_ids

    insight = {**result["insight"], "contentHash": content_hash, "createdAt": utcnow().isoformat()}
    dream["title"] = result["title"]
    dream["insight"] = insight
    ref.update(
        {
            **encrypted_dream_update(uid, dream_id, dream),
            "insightStatus": "ready",
        }
    )
    memory_result = result["memory"]
    rolling_private = {
        "themes": bounded_themes(memory.get("themes", []), memory_result["themes"]),
        "motifs": bounded_unique(memory.get("motifs", []), memory_result["motifs"], MAX_ROLLING_MOTIFS),
        "lastMood": normalize_mood(memory_result["mood"]),
    }
    user_ref.collection("memory").document("rolling").set(
        {
            **encrypted_private_update(
                uid,
                "memory:rolling",
                rolling_private,
                ROLLING_MEMORY_PRIVATE_FIELDS,
            ),
            "updatedAt": utcnow(),
        },
        merge=True,
    )
    try:
        persist_personal_themes(uid, resolved_themes)
    except Exception:
        current_app.logger.exception("Theme catalogue persistence failed; the reflection remains available.")

    if current_embedding:
        episode_private = {
            "title": result["title"],
            "summary": memory_result["episodeSummary"],
            "anchors": bounded_unique([], memory_result["anchors"], 6),
            "themes": memory_result["themes"],
            "mood": normalize_mood(memory_result["mood"]),
            "embedding": current_embedding,
        }
        episode_ref.document(dream_id).set(
            {
                "dreamId": dream_id,
                "date": dream["date"],
                **encrypted_record_fields(
                    uid,
                    f"episode:{dream_id}",
                    episode_private,
                ),
                "updatedAt": utcnow(),
            }
        )
        retained = list(
            episode_ref.order_by("date", direction=firestore.Query.DESCENDING)
            .limit(MAX_MEMORY_EPISODES + 1)
            .stream()
        )
        for expired in retained[MAX_MEMORY_EPISODES:]:
            expired.reference.delete()

    return {"insight": insight, "title": result["title"], "cached": False}
