"""Public health and single-page application routes."""

from flask import Blueprint, current_app, jsonify

from app.config import DATA_ENCRYPTION_MODE, DATA_KMS_KEY_NAME

blueprint = Blueprint("system", __name__)


@blueprint.get("/api/health")
def health():
    encryption_ready = (
        DATA_ENCRYPTION_MODE == "disabled"
        or (DATA_ENCRYPTION_MODE == "required" and bool(DATA_KMS_KEY_NAME))
    )
    return jsonify(
        {
            "status": "ok" if encryption_ready else "degraded",
            "service": "recall-api",
            "privateDataEncryption": {
                "mode": DATA_ENCRYPTION_MODE,
                "configured": encryption_ready,
            },
        }
    ), 200 if encryption_ready else 503


@blueprint.get("/")
def index():
    return current_app.send_static_file("index.html") if current_app.static_folder else "Recall API"
