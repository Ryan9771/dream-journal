"""Encrypt legacy plaintext Recall records in place with resumable per-document writes."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.firebase import db
from app.security.records import (
    DREAM_PRIVATE_FIELDS,
    ENCRYPTED_FIELD,
    EPISODE_PRIVATE_FIELDS,
    ROLLING_MEMORY_PRIVATE_FIELDS,
    THEME_PRIVATE_FIELDS,
    encrypted_private_update,
    private_values,
)
from app.security.encryption import keyed_digest


def discover_user_ids() -> list[str]:
    user_ids = {snapshot.id for snapshot in db.collection("users").stream()}
    for snapshot in db.collection_group("dreams").stream():
        parts = snapshot.reference.path.split("/")
        if len(parts) >= 4 and parts[0] == "users":
            user_ids.add(parts[1])
    return sorted(user_ids)


def migrate_document(
    ref,
    uid: str,
    scope: str,
    fields: tuple[str, ...],
    apply: bool,
    additional_updates: dict | None = None,
) -> bool:
    snapshot = ref.get()
    if not snapshot.exists:
        return False
    data = snapshot.to_dict() or {}
    if data.get(ENCRYPTED_FIELD):
        return False
    private_data = private_values(data, fields)
    if not private_data:
        return False
    if apply:
        ref.update(
            {
                **encrypted_private_update(uid, scope, private_data, fields),
                **(additional_updates or {}),
            }
        )
    return True


def migrate_user(uid: str, apply: bool) -> int:
    user_ref = db.collection("users").document(uid)
    migrated = 0
    for dream in user_ref.collection("dreams").stream():
        dream_data = dream.to_dict() or {}
        body = str(dream_data.get("body", ""))
        changed = migrate_document(
            dream.reference,
            uid,
            f"dream:{dream.id}",
            DREAM_PRIVATE_FIELDS,
            apply,
            (
                {"contentHash": keyed_digest(uid, "dream-content", body)}
                if apply and body
                else None
            ),
        )
        migrated += changed

    rolling_ref = user_ref.collection("memory").document("rolling")
    migrated += migrate_document(
        rolling_ref,
        uid,
        "memory:rolling",
        ROLLING_MEMORY_PRIVATE_FIELDS,
        apply,
    )

    for episode in user_ref.collection("memoryEpisodes").stream():
        migrated += migrate_document(
            episode.reference,
            uid,
            f"episode:{episode.id}",
            EPISODE_PRIVATE_FIELDS,
            apply,
        )

    for theme in user_ref.collection("themeTaxonomy").stream():
        migrated += migrate_document(
            theme.reference,
            uid,
            f"theme:{theme.id}",
            THEME_PRIVATE_FIELDS,
            apply,
        )
    return migrated


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--uid", help="Migrate one Firebase UID; omit to discover all users")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write encrypted records. Without this flag the command is a dry run.",
    )
    args = parser.parse_args()

    user_ids = [args.uid] if args.uid else discover_user_ids()
    total = 0
    for uid in user_ids:
        count = migrate_user(uid, args.apply)
        total += count
        print(f"{uid}: {count} record(s) {'encrypted' if args.apply else 'would be encrypted'}")
    print(f"Total: {total} record(s) {'encrypted' if args.apply else 'would be encrypted'}")


if __name__ == "__main__":
    main()
