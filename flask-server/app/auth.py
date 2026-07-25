"""Firebase ID-token authentication for private API routes."""

from functools import wraps

from firebase_admin import auth
from flask import g, jsonify, request


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
