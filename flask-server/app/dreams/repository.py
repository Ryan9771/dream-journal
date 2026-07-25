"""Firestore access and serialization for dream records."""

from firebase_admin import firestore

from app.firebase import db
from app.security.records import (
    DREAM_PRIVATE_FIELDS,
    decrypted_record,
    encrypted_record_fields,
    private_values,
)


def user_entries(uid: str):
    return db.collection("users").document(uid).collection("dreams")


def normalize_mood(value: str) -> str:
    return "sad" if value == "heavy" else value


def dream_scope(dream_id: str) -> str:
    return f"dream:{dream_id}"


def decrypt_dream(uid: str, dream_id: str, data: dict) -> dict:
    return decrypted_record(uid, dream_scope(dream_id), data, DREAM_PRIVATE_FIELDS)


def encrypt_dream_private(uid: str, dream_id: str, data: dict) -> dict:
    return encrypted_record_fields(
        uid,
        dream_scope(dream_id),
        private_values(data, DREAM_PRIVATE_FIELDS),
    )


def encrypted_dream_update(uid: str, dream_id: str, data: dict) -> dict:
    return {
        **encrypt_dream_private(uid, dream_id, data),
        **{field: firestore.DELETE_FIELD for field in DREAM_PRIVATE_FIELDS},
    }


def serialize(doc, uid: str) -> dict:
    data = decrypt_dream(uid, doc.id, doc.to_dict())
    data["id"] = doc.id
    data["mood"] = normalize_mood(data.get("mood", "curious"))
    if data.get("insight", {}).get("emotionalTone") == "heavy":
        data["insight"]["emotionalTone"] = "sad"
    for key in ("createdAt", "updatedAt"):
        if hasattr(data.get(key), "isoformat"):
            data[key] = data[key].isoformat()
    return data
