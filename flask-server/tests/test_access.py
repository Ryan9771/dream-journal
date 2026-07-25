import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.access import (
    has_unlimited_insights,
    insight_access_document_id,
    normalized_google_email,
)


class FakeSnapshot:
    def __init__(self, data):
        self._data = data
        self.exists = data is not None

    def to_dict(self):
        return self._data


class FakeDocument:
    def __init__(self, data):
        self._data = data

    def get(self):
        return FakeSnapshot(self._data)


class FakeCollection:
    def __init__(self, data):
        self._data = data
        self.requested_document = ""

    def document(self, document_id):
        self.requested_document = document_id
        return FakeDocument(self._data)


class FakeDatabase:
    def __init__(self, data):
        self.collection_ref = FakeCollection(data)

    def collection(self, _name):
        return self.collection_ref


class InsightAccessTests(unittest.TestCase):
    def test_normalizes_verified_google_email(self):
        claims = {
            "email": " Ryan.Example@Gmail.com ",
            "email_verified": True,
            "firebase": {"sign_in_provider": "google.com"},
        }
        self.assertEqual(normalized_google_email(claims), "ryan.example@gmail.com")

    def test_rejects_unverified_or_non_google_email(self):
        self.assertEqual(
            normalized_google_email(
                {
                    "email": "person@gmail.com",
                    "email_verified": False,
                    "firebase": {"sign_in_provider": "google.com"},
                }
            ),
            "",
        )
        self.assertEqual(
            normalized_google_email(
                {
                    "email": "person@gmail.com",
                    "email_verified": True,
                    "firebase": {"sign_in_provider": "password"},
                }
            ),
            "",
        )

    def test_document_id_is_case_insensitive_and_contains_no_email(self):
        lower = insight_access_document_id("person@gmail.com")
        mixed = insight_access_document_id(" Person@Gmail.com ")
        self.assertEqual(lower, mixed)
        self.assertNotIn("person", lower)
        self.assertEqual(len(lower), 64)

    def test_unlimited_access_requires_active_server_record(self):
        claims = {
            "email": "person@gmail.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "google.com"},
        }
        enabled_db = FakeDatabase({"active": True, "unlimitedInsights": True})
        with patch.dict("sys.modules", {"app.firebase": SimpleNamespace(db=enabled_db)}):
            self.assertTrue(has_unlimited_insights(claims))
        self.assertEqual(
            enabled_db.collection_ref.requested_document,
            insight_access_document_id("person@gmail.com"),
        )

        disabled_db = FakeDatabase({"active": False, "unlimitedInsights": True})
        with patch.dict("sys.modules", {"app.firebase": SimpleNamespace(db=disabled_db)}):
            self.assertFalse(has_unlimited_insights(claims))


if __name__ == "__main__":
    unittest.main()
