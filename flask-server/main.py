"""Recall API: Firebase-authenticated dream storage and guarded AI insights."""

from __future__ import annotations

import hashlib
import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import firebase_admin
from firebase_admin import auth, firestore
from flask import Flask, g, jsonify, request
from flask_cors import CORS

from util.ai import analyse_dream

app = Flask(__name__, static_folder="../client/build", static_url_path="")
CORS(
    app,
    resources={r"/api/*": {"origins": os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")}},
)

if not firebase_admin._apps:
    firebase_admin.initialize_app()
db = firestore.client()

MAX_ENTRY_CHARS = 6000
DAILY_INSIGHT_LIMIT = 3
INSIGHT_COOLDOWN = timedelta(seconds=45)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def require_firebase_user(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Authentication required."}), 401
        try:
            g.user = auth.verify_id_token(header[7:])
        except (ValueError, auth.InvalidIdTokenError, auth.ExpiredIdTokenError):
            return jsonify({"error": "Your session has expired. Please sign in again."}), 401
        return handler(*args, **kwargs)

    return wrapped


def user_entries(uid: str):
    return db.collection("users").document(uid).collection("dreams")


def serialize(doc) -> dict:
    data = doc.to_dict()
    data["id"] = doc.id
    for key in ("createdAt", "updatedAt"):
        if hasattr(data.get(key), "isoformat"):
            data[key] = data[key].isoformat()
    return data


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "recall-api"})


@app.get("/api/dreams")
@require_firebase_user
def list_dreams():
    month = request.args.get("month", "")
    query = user_entries(g.user["uid"])
    if month:
        query = query.where("date", ">=", f"{month}-01").where("date", "<=", f"{month}-31")
    docs = query.order_by("date", direction=firestore.Query.DESCENDING).limit(100).stream()
    return jsonify({"dreams": [serialize(doc) for doc in docs]})


@app.post("/api/dreams")
@require_firebase_user
def create_dream():
    payload = request.get_json(silent=True) or {}
    body = str(payload.get("body", "")).strip()
    date = str(payload.get("date", ""))
    mood = str(payload.get("mood", "curious"))
    if not (10 <= len(body) <= MAX_ENTRY_CHARS):
        return jsonify({"error": "Dreams must be between 10 and 6,000 characters."}), 400
    if mood not in {"peaceful", "joyful", "curious", "uneasy", "heavy"}:
        return jsonify({"error": "Unknown mood."}), 400
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Date must use YYYY-MM-DD."}), 400
    now = utcnow()
    doc = user_entries(g.user["uid"]).document()
    data = {
        "date": date,
        "body": body,
        "contentHtml": str(payload.get("contentHtml", ""))[:24000],
        "title": str(payload.get("title", "")).strip()[:90] or "Untitled dream",
        "mood": mood,
        "createdAt": now,
        "updatedAt": now,
        "contentHash": hashlib.sha256(body.encode()).hexdigest(),
        "insightStatus": "none",
    }
    doc.set(data)
    return jsonify({"dream": {**data, "id": doc.id, "createdAt": now.isoformat(), "updatedAt": now.isoformat()}}), 201


@app.patch("/api/dreams/<dream_id>")
@require_firebase_user
def update_dream(dream_id: str):
    ref = user_entries(g.user["uid"]).document(dream_id)
    snap = ref.get()
    if not snap.exists:
        return jsonify({"error": "Dream not found."}), 404
    payload = request.get_json(silent=True) or {}
    body = str(payload.get("body", snap.get("body"))).strip()
    if not (10 <= len(body) <= MAX_ENTRY_CHARS):
        return jsonify({"error": "Dreams must be between 10 and 6,000 characters."}), 400
    update = {
        "body": body,
        "contentHtml": str(payload.get("contentHtml", snap.get("contentHtml") or ""))[:24000],
        "title": str(payload.get("title", snap.get("title"))).strip()[:90],
        "mood": payload.get("mood", snap.get("mood")),
        "updatedAt": utcnow(),
        "contentHash": hashlib.sha256(body.encode()).hexdigest(),
    }
    if update["contentHash"] != snap.get("contentHash") or update["mood"] != snap.get("mood"):
        update["insightStatus"] = "stale"
        update["insight"] = firestore.DELETE_FIELD
    ref.update(update)
    return jsonify({"dream": serialize(ref.get())})


@firestore.transactional
def reserve_insight(transaction, user_ref):
    snapshot = user_ref.get(transaction=transaction)
    data = snapshot.to_dict() or {}
    now = utcnow()
    day_key = now.strftime("%Y-%m-%d")
    usage = data.get("insightUsage", {})
    count = usage.get("count", 0) if usage.get("day") == day_key else 0
    last_at = usage.get("lastAt")
    if count >= DAILY_INSIGHT_LIMIT:
        return False, "You’ve reached today’s reflection limit. More will be available tomorrow."
    if last_at and now - last_at < INSIGHT_COOLDOWN:
        return False, "Please give the last reflection a moment before requesting another."
    transaction.set(
        user_ref,
        {"insightUsage": {"day": day_key, "count": count + 1, "lastAt": now}},
        merge=True,
    )
    return True, ""


@app.post("/api/dreams/<dream_id>/insight")
@require_firebase_user
def create_insight(dream_id: str):
    uid = g.user["uid"]
    ref = user_entries(uid).document(dream_id)
    snap = ref.get()
    if not snap.exists:
        return jsonify({"error": "Dream not found."}), 404
    dream = snap.to_dict()
    content_hash = dream["contentHash"]
    existing = dream.get("insight")
    if existing and existing.get("contentHash") == content_hash:
        return jsonify({"insight": existing, "cached": True})

    allowed, message = reserve_insight(db.transaction(), db.collection("users").document(uid))
    if not allowed:
        return jsonify({"error": message}), 429

    # Retrieve compact metadata only. Raw historical dreams never enter this call.
    memory = (
        db.collection("users")
        .document(uid)
        .collection("memory")
        .document("rolling")
        .get()
        .to_dict()
        or {}
    )
    try:
        result = analyse_dream(
            body=dream["body"],
            self_reported_mood=dream["mood"],
            recent_context=memory,
            safety_identifier=hashlib.sha256(uid.encode()).hexdigest()[:32],
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 422

    insight = {**result["insight"], "contentHash": content_hash, "createdAt": utcnow().isoformat()}
    ref.update({"title": result["title"], "insight": insight, "insightStatus": "ready"})
    db.collection("users").document(uid).collection("memory").document("rolling").set(
        {
            "themes": firestore.ArrayUnion(result["memory"]["themes"]),
            "motifs": firestore.ArrayUnion(result["memory"]["motifs"]),
            "lastMood": result["memory"]["mood"],
            "updatedAt": utcnow(),
        },
        merge=True,
    )
    return jsonify({"insight": insight, "title": result["title"], "cached": False})


@app.get("/")
def index():
    return app.send_static_file("index.html") if app.static_folder and os.path.exists(f"{app.static_folder}/index.html") else "Recall API"


@app.errorhandler(429)
def rate_limited(_error):
    return jsonify({"error": "Too many requests. Please slow down."}), 429


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG") == "1")
