"""Recall Flask application factory."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from flask import Flask


def create_app() -> Flask:
    from flask import Flask, jsonify
    from flask_cors import CORS

    from app.config import allowed_origins
    from app.routes.dreams import blueprint as dreams_blueprint
    from app.routes.insights import blueprint as insights_blueprint
    from app.routes.system import blueprint as system_blueprint
    from app.security.encryption import EncryptionConfigurationError

    project_root = Path(__file__).resolve().parents[2]
    app = Flask(
        __name__,
        static_folder=str(project_root / "client" / "build"),
        static_url_path="",
    )
    CORS(app, resources={r"/api/*": {"origins": allowed_origins()}})
    app.register_blueprint(system_blueprint)
    app.register_blueprint(dreams_blueprint)
    app.register_blueprint(insights_blueprint)

    @app.errorhandler(429)
    def rate_limited(_error):
        return jsonify({"error": "Too many requests. Please slow down."}), 429

    @app.errorhandler(EncryptionConfigurationError)
    def encryption_unavailable(_error):
        app.logger.exception("Private-data encryption is unavailable.")
        return jsonify(
            {"error": "Private journal encryption is temporarily unavailable. Nothing was saved."}
        ), 503

    return app
