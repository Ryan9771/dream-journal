"""Server-controlled insight access tiers derived from verified Firebase claims."""

import hashlib

from app.config import INSIGHT_ACCESS_COLLECTION


def normalized_google_email(claims: dict) -> str:
    """Return a verified Google-account email, never a client-supplied address."""
    firebase_claims = claims.get("firebase") or {}
    if firebase_claims.get("sign_in_provider") != "google.com":
        return ""
    if claims.get("email_verified") is not True:
        return ""
    return str(claims.get("email", "")).strip().lower()


def insight_access_document_id(email: str) -> str:
    """Hash email addresses so Firestore document paths contain no raw identity."""
    normalized = str(email).strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()


def has_unlimited_insights(claims: dict) -> bool:
    """Check the private server-side allowlist for a verified Google account."""
    email = normalized_google_email(claims)
    if not email:
        return False

    # Imported lazily so claim/hash helpers remain usable in isolated unit tests.
    from app.firebase import db

    snapshot = (
        db.collection(INSIGHT_ACCESS_COLLECTION)
        .document(insight_access_document_id(email))
        .get()
    )
    if not snapshot.exists:
        return False
    access = snapshot.to_dict() or {}
    return access.get("active") is True and access.get("unlimitedInsights") is True
