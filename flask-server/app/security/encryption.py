"""KMS-wrapped, per-user AES-GCM encryption for Firestore payloads."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from functools import lru_cache

from app.config import DATA_ENCRYPTION_MODE, DATA_KMS_KEY_NAME

ENCRYPTION_VERSION = 1


class EncryptionConfigurationError(RuntimeError):
    pass


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode()


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value.encode())


def _kms_client():
    from google.cloud import kms_v1

    return kms_v1.KeyManagementServiceClient()


def _root_key_reference(uid: str):
    from app.firebase import db

    return (
        db.collection("users")
        .document(uid)
        .collection("security")
        .document("encryptionKey")
    )


def _kms_aad(uid: str) -> bytes:
    return f"recall:user-key:v1:{uid}".encode()


def _unwrap_root_key(uid: str, record: dict) -> bytes:
    key_name = str(record.get("kmsKeyName", ""))
    wrapped = str(record.get("wrappedRootKey", ""))
    if not key_name or not wrapped:
        raise EncryptionConfigurationError("The user encryption-key record is incomplete.")
    response = _kms_client().decrypt(
        request={
            "name": key_name,
            "ciphertext": _b64decode(wrapped),
            "additional_authenticated_data": _kms_aad(uid),
        }
    )
    return response.plaintext


@lru_cache(maxsize=512)
def user_root_key(uid: str) -> bytes:
    """Load or atomically create one KMS-wrapped root key for this user."""
    if DATA_ENCRYPTION_MODE == "disabled":
        raise EncryptionConfigurationError("Application-level encryption is disabled.")
    if DATA_ENCRYPTION_MODE != "required":
        raise EncryptionConfigurationError("DATA_ENCRYPTION_MODE must be required or disabled.")
    if not DATA_KMS_KEY_NAME:
        raise EncryptionConfigurationError("DATA_KMS_KEY_NAME is required.")

    ref = _root_key_reference(uid)
    snapshot = ref.get()
    if snapshot.exists:
        return _unwrap_root_key(uid, snapshot.to_dict() or {})

    root_key = os.urandom(32)
    wrapped = _kms_client().encrypt(
        request={
            "name": DATA_KMS_KEY_NAME,
            "plaintext": root_key,
            "additional_authenticated_data": _kms_aad(uid),
        }
    ).ciphertext
    record = {
        "version": ENCRYPTION_VERSION,
        "algorithm": "AES-256-GCM",
        "kmsKeyName": DATA_KMS_KEY_NAME,
        "wrappedRootKey": _b64encode(wrapped),
    }
    try:
        ref.create(record)
        return root_key
    except Exception as exc:
        # A concurrent request may have created the key first. Never overwrite it.
        snapshot = ref.get()
        if snapshot.exists:
            return _unwrap_root_key(uid, snapshot.to_dict() or {})
        raise exc


def _record_key(uid: str, scope: str) -> bytes:
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF

    return HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=uid.encode(),
        info=f"recall:record:v1:{scope}".encode(),
    ).derive(user_root_key(uid))


def _record_aad(uid: str, scope: str) -> bytes:
    return f"recall:payload:v1:{uid}:{scope}".encode()


def keyed_digest(uid: str, purpose: str, value: str) -> str:
    """Create a per-user blind index without exposing a guessable plaintext hash."""
    key = _record_key(uid, f"blind-index:{purpose}")
    return hmac.new(key, value.encode(), hashlib.sha256).hexdigest()


def encrypt_payload(uid: str, scope: str, payload: dict) -> dict:
    """Encrypt a JSON payload; disabled mode is explicit and development-only."""
    if DATA_ENCRYPTION_MODE == "disabled":
        return {"version": 0, "algorithm": "PLAINTEXT-DEVELOPMENT-ONLY", "plaintext": payload}

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    nonce = os.urandom(12)
    plaintext = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
    ciphertext = AESGCM(_record_key(uid, scope)).encrypt(
        nonce,
        plaintext,
        _record_aad(uid, scope),
    )
    return {
        "version": ENCRYPTION_VERSION,
        "algorithm": "AES-256-GCM",
        "nonce": _b64encode(nonce),
        "ciphertext": _b64encode(ciphertext),
    }


def decrypt_payload(uid: str, scope: str, envelope: dict) -> dict:
    version = envelope.get("version")
    if version == 0 and DATA_ENCRYPTION_MODE == "disabled":
        return dict(envelope.get("plaintext") or {})
    if version != ENCRYPTION_VERSION:
        raise EncryptionConfigurationError("Unsupported encrypted payload version.")

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    plaintext = AESGCM(_record_key(uid, scope)).decrypt(
        _b64decode(str(envelope.get("nonce", ""))),
        _b64decode(str(envelope.get("ciphertext", ""))),
        _record_aad(uid, scope),
    )
    decoded = json.loads(plaintext.decode())
    if not isinstance(decoded, dict):
        raise ValueError("Encrypted payload must decode to an object.")
    return decoded
