"""Bounded rolling memory and personal theme-taxonomy persistence."""

import hashlib

from firebase_admin import firestore

from app.config import MAX_ACTIVE_THEMES
from app.firebase import db
from app.insights.ai import canonical_theme
from app.security.records import (
    THEME_PRIVATE_FIELDS,
    decrypted_record,
    encrypted_private_update,
    encrypted_record_fields,
)
from app.time import utcnow


def bounded_unique(existing: list, incoming: list, limit: int) -> list[str]:
    values = []
    for value in [*existing, *incoming]:
        normalized = str(value).strip().lower()
        if normalized and normalized not in values:
            values.append(normalized)
    return values[-limit:]


def bounded_themes(existing: list, incoming: list) -> list[str]:
    canonical = [canonical_theme(value) for value in [*existing, *incoming]]
    return bounded_unique([], [theme for theme in canonical if theme], MAX_ACTIVE_THEMES)


def persist_personal_themes(uid: str, resolved_themes: list[dict]) -> None:
    collection = db.collection("users").document(uid).collection("themeTaxonomy")
    now = utcnow()
    for theme in resolved_themes:
        label = canonical_theme(theme.get("label", ""))
        if not label:
            continue
        theme_id = theme.get("catalogId") or hashlib.sha256(label.encode()).hexdigest()[:24]
        ref = collection.document(theme_id)
        snapshot = ref.get()
        existing = (
            decrypted_record(
                uid,
                f"theme:{theme_id}",
                snapshot.to_dict() or {},
                THEME_PRIVATE_FIELDS,
            )
            if snapshot.exists
            else {}
        )
        public_payload = {
            "active": True,
            "lastSeenAt": now,
            "count": firestore.Increment(1),
        }
        proposed = canonical_theme(theme.get("proposedLabel", ""))
        aliases = list(existing.get("aliases", []))
        if proposed and proposed != label and proposed not in aliases:
            aliases.append(proposed)
        private_payload = {
            "label": label,
            "aliases": aliases,
            "embedding": existing.get("embedding") or theme.get("embedding", []),
        }
        if not snapshot.exists:
            public_payload["firstSeenAt"] = now
            encrypted_fields = encrypted_record_fields(
                uid,
                f"theme:{theme_id}",
                private_payload,
            )
        else:
            encrypted_fields = encrypted_private_update(
                uid,
                f"theme:{theme_id}",
                private_payload,
                THEME_PRIVATE_FIELDS,
            )
        ref.set({**public_payload, **encrypted_fields}, merge=True)

    active_docs = list(collection.where("active", "==", True).limit(MAX_ACTIVE_THEMES + 4).stream())
    if len(active_docs) <= MAX_ACTIVE_THEMES:
        return

    def archive_priority(doc):
        data = doc.to_dict()
        last_seen = data.get("lastSeenAt")
        timestamp = last_seen.timestamp() if hasattr(last_seen, "timestamp") else 0
        return data.get("count", 0), timestamp

    for expired in sorted(active_docs, key=archive_priority)[: len(active_docs) - MAX_ACTIVE_THEMES]:
        expired.reference.set({"active": False, "archivedAt": now}, merge=True)
