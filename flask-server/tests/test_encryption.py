import unittest
from unittest.mock import patch

from cryptography.exceptions import InvalidTag

from app.security.encryption import decrypt_payload, encrypt_payload, keyed_digest
from app.security.records import (
    DREAM_PRIVATE_FIELDS,
    ENCRYPTED_FIELD,
    encrypted_private_update,
)


class RecordEncryptionTests(unittest.TestCase):
    @patch("app.security.encryption.user_root_key", return_value=b"k" * 32)
    def test_round_trip_hides_plaintext(self, _root_key):
        payload = {"body": "a private dream", "mood": "uneasy"}
        envelope = encrypt_payload("user-1", "dream:dream-1", payload)

        self.assertNotIn("private dream", str(envelope))
        self.assertEqual(
            decrypt_payload("user-1", "dream:dream-1", envelope),
            payload,
        )

    @patch("app.security.encryption.user_root_key", return_value=b"k" * 32)
    def test_scope_is_authenticated(self, _root_key):
        envelope = encrypt_payload(
            "user-1",
            "dream:dream-1",
            {"body": "private"},
        )
        with self.assertRaises(InvalidTag):
            decrypt_payload("user-1", "dream:other-dream", envelope)

    @patch(
        "app.security.encryption.user_root_key",
        side_effect=lambda uid: (uid.encode() + b"x" * 32)[:32],
    )
    def test_blind_index_is_stable_per_user(self, _root_key):
        first = keyed_digest("user-1", "dream-content", "same text")
        repeated = keyed_digest("user-1", "dream-content", "same text")
        another_user = keyed_digest("user-2", "dream-content", "same text")
        self.assertEqual(first, repeated)
        self.assertNotEqual(first, another_user)

    @patch("app.security.encryption.user_root_key", return_value=b"k" * 32)
    def test_firestore_update_contains_no_private_plaintext(self, _root_key):
        private_data = {
            "title": "A private title",
            "body": "A private dream",
            "contentHtml": "<p>A private dream</p>",
            "mood": "uneasy",
            "insight": {"reflection": "A private interpretation"},
        }

        update = encrypted_private_update(
            "user-1",
            "dream:dream-1",
            private_data,
            DREAM_PRIVATE_FIELDS,
        )

        self.assertIn(ENCRYPTED_FIELD, update)
        self.assertNotIn("private dream", str(update[ENCRYPTED_FIELD]).lower())
        self.assertNotIn("private interpretation", str(update[ENCRYPTED_FIELD]).lower())
        self.assertEqual(
            decrypt_payload(
                "user-1",
                "dream:dream-1",
                update[ENCRYPTED_FIELD],
            ),
            private_data,
        )


if __name__ == "__main__":
    unittest.main()
