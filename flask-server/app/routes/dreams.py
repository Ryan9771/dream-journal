"""Authenticated dream CRUD endpoints."""

from datetime import datetime

from firebase_admin import firestore
from flask import Blueprint, g, jsonify, request

from app.auth import require_firebase_user
from app.config import MAX_ENTRY_CHARS, VALID_MOODS
from app.dreams.repository import (
    decrypt_dream,
    encrypt_dream_private,
    encrypted_dream_update,
    normalize_mood,
    serialize,
    user_entries,
)
from app.firebase import db
from app.security.encryption import keyed_digest
from app.services.title_service import title_for_new_dream
from app.time import utcnow

blueprint = Blueprint("dreams", __name__, url_prefix="/api/dreams")


@blueprint.get("")
@require_firebase_user
def list_dreams():
    uid = g.user["uid"]
    month = request.args.get("month", "")
    query = user_entries(uid)
    if month:
        query = query.where("date", ">=", f"{month}-01").where("date", "<=", f"{month}-31")
    docs = query.order_by("date", direction=firestore.Query.DESCENDING).limit(100).stream()
    return jsonify({"dreams": [serialize(doc, uid) for doc in docs]})


@blueprint.post("")
@require_firebase_user
def create_dream():
    payload = request.get_json(silent=True) or {}
    body = str(payload.get("body", "")).strip()
    date = str(payload.get("date", ""))
    mood = normalize_mood(str(payload.get("mood", "curious")))
    if not (10 <= len(body) <= MAX_ENTRY_CHARS):
        return jsonify({"error": "Dreams must be between 10 and 6,000 characters."}), 400
    if mood not in VALID_MOODS:
        return jsonify({"error": "Unknown mood."}), 400
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Date must use YYYY-MM-DD."}), 400
    now = utcnow()
    uid = g.user["uid"]
    doc = user_entries(uid).document()
    title = title_for_new_dream(uid, body)
    private_data = {
        "body": body,
        "contentHtml": str(payload.get("contentHtml", ""))[:24000],
        "title": title,
        "mood": mood,
    }
    public_data = {
        "date": date,
        "createdAt": now,
        "updatedAt": now,
        "contentHash": keyed_digest(uid, "dream-content", body),
        "insightStatus": "none",
    }
    data = {**public_data, **encrypt_dream_private(uid, doc.id, private_data)}
    doc.set(data)
    return jsonify(
        {
            "dream": {
                **public_data,
                **private_data,
                "id": doc.id,
                "createdAt": now.isoformat(),
                "updatedAt": now.isoformat(),
            }
        }
    ), 201


@blueprint.patch("/<dream_id>")
@require_firebase_user
def update_dream(dream_id: str):
    uid = g.user["uid"]
    ref = user_entries(uid).document(dream_id)
    snap = ref.get()
    if not snap.exists:
        return jsonify({"error": "Dream not found."}), 404
    existing = decrypt_dream(uid, dream_id, snap.to_dict())
    payload = request.get_json(silent=True) or {}
    body = str(payload.get("body", existing.get("body"))).strip()
    mood = normalize_mood(str(payload.get("mood", existing.get("mood"))))
    if not (10 <= len(body) <= MAX_ENTRY_CHARS):
        return jsonify({"error": "Dreams must be between 10 and 6,000 characters."}), 400
    if mood not in VALID_MOODS:
        return jsonify({"error": "Unknown mood."}), 400
    body_changed = body != str(existing.get("body", "")).strip()
    title = title_for_new_dream(uid, body) if body_changed else existing.get("title", "")
    private_update = {
        "body": body,
        "contentHtml": str(payload.get("contentHtml", existing.get("contentHtml") or ""))[:24000],
        "title": title,
        "mood": mood,
        **({"insight": existing["insight"]} if existing.get("insight") else {}),
    }
    public_update = {
        "updatedAt": utcnow(),
        "contentHash": keyed_digest(uid, "dream-content", body),
    }
    insight_invalidated = (
        body_changed
        or mood != normalize_mood(existing.get("mood"))
    )
    if insight_invalidated:
        public_update["insightStatus"] = "stale"
        private_update.pop("insight", None)
    update = {
        **public_update,
        **encrypted_dream_update(uid, dream_id, private_update),
    }
    ref.update(update)
    if insight_invalidated:
        db.collection("users").document(g.user["uid"]).collection("memoryEpisodes").document(dream_id).delete()
    return jsonify({"dream": serialize(ref.get(), uid)})
