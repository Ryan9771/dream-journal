"""Authenticated AI reflection endpoint."""

from flask import Blueprint, g, jsonify

from app.auth import require_firebase_user
from app.services.insight_service import InsightServiceError, generate_insight

blueprint = Blueprint("insights", __name__, url_prefix="/api/dreams")


@blueprint.post("/<dream_id>/insight")
@require_firebase_user
def create_insight(dream_id: str):
    try:
        return jsonify(generate_insight(g.user, dream_id))
    except InsightServiceError as exc:
        return jsonify({"error": str(exc)}), exc.status_code
