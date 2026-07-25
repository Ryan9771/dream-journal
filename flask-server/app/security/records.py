"""Helpers for encrypted Firestore records with legacy plaintext read support."""

from app.security.encryption import ENCRYPTION_VERSION, decrypt_payload, encrypt_payload

ENCRYPTED_FIELD = "encryptedData"

DREAM_PRIVATE_FIELDS = ("title", "body", "contentHtml", "mood", "insight")
ROLLING_MEMORY_PRIVATE_FIELDS = ("themes", "motifs", "lastMood")
EPISODE_PRIVATE_FIELDS = ("title", "summary", "anchors", "themes", "mood", "embedding")
THEME_PRIVATE_FIELDS = ("label", "aliases", "embedding")


def decrypted_record(
    uid: str,
    scope: str,
    data: dict,
    private_fields: tuple[str, ...],
) -> dict:
    """Merge encrypted private fields into a copy, or read legacy plaintext fields."""
    result = dict(data)
    envelope = result.pop(ENCRYPTED_FIELD, None)
    if envelope:
        result.update(decrypt_payload(uid, scope, envelope))
    return result


def encrypted_record_fields(uid: str, scope: str, private_data: dict) -> dict:
    return {
        ENCRYPTED_FIELD: encrypt_payload(uid, scope, private_data),
        "encryptionVersion": ENCRYPTION_VERSION,
    }


def encrypted_private_update(
    uid: str,
    scope: str,
    private_data: dict,
    private_fields: tuple[str, ...],
) -> dict:
    from firebase_admin import firestore

    return {
        **encrypted_record_fields(uid, scope, private_data),
        **{field: firestore.DELETE_FIELD for field in private_fields},
    }


def private_values(data: dict, private_fields: tuple[str, ...]) -> dict:
    return {field: data[field] for field in private_fields if field in data}
