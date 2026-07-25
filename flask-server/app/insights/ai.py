"""Cost-bounded, structured dream reflection."""

from __future__ import annotations

import json
import math
import os
from typing import Iterable

from openai import OpenAI

from app.insights.prompts import DREAM_REFLECTION_PROMPT

client = OpenAI()
MODEL = os.getenv("OPENAI_INSIGHT_MODEL", "gpt-5.6-luna")
EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIMENSIONS = int(os.getenv("OPENAI_EMBEDDING_DIMENSIONS", "256"))
SEMANTIC_MEMORY_ENABLED = os.getenv("SEMANTIC_MEMORY_ENABLED", "true").lower() == "true"
SEMANTIC_MEMORY_THRESHOLD = float(os.getenv("SEMANTIC_MEMORY_THRESHOLD", "0.72"))
THEME_MERGE_THRESHOLD = float(os.getenv("THEME_MERGE_THRESHOLD", "0.82"))
THEME_CANDIDATE_THRESHOLD = float(os.getenv("THEME_CANDIDATE_THRESHOLD", "0.25"))
STARTER_THEME_VOCABULARY = [
    "belonging",
    "boundaries",
    "change",
    "conflict",
    "connection",
    "control",
    "creativity",
    "exploration",
    "freedom",
    "identity",
    "loss",
    "nostalgia",
    "responsibility",
    "safety",
    "self-trust",
    "transition",
    "uncertainty",
    "vulnerability",
]
# Kept as a compatibility export for older imports and stored records. These are
# starter labels, not a closed vocabulary.
THEME_VOCABULARY = STARTER_THEME_VOCABULARY
THEME_ALIASES = {
    "curiosity": "exploration",
    "direction": "transition",
    "movement": "transition",
    "possibility": "exploration",
    "trust": "self-trust",
}


def canonical_theme(value: str) -> str:
    normalized = " ".join(str(value).strip().lower().replace("_", " ").split())
    return THEME_ALIASES.get(normalized, normalized)

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string", "maxLength": 80},
        "insight": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "analysis": {
                    "type": "array",
                    "items": {"type": "string", "minLength": 120, "maxLength": 900},
                    "minItems": 2,
                    "maxItems": 4,
                },
                "themes": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "minLength": 2,
                        "maxLength": 40,
                        "pattern": "^[a-z][a-z -]*$",
                    },
                    "minItems": 1,
                    "maxItems": 3,
                },
                "reflection": {"type": "string", "maxLength": 300},
                "pattern": {"type": "string", "maxLength": 360},
                "connectionDreamIds": {
                    "type": "array",
                    "items": {"type": "string", "maxLength": 128},
                    "maxItems": 3,
                },
                "emotionalTone": {
                    "type": "string",
                    "enum": ["peaceful", "joyful", "curious", "uneasy", "sad", "angry", "mixed"],
                },
                "intensity": {"type": "integer", "minimum": 1, "maximum": 5},
            },
            "required": [
                "analysis",
                "themes",
                "reflection",
                "pattern",
                "connectionDreamIds",
                "emotionalTone",
                "intensity",
            ],
        },
        "memory": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "themes": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "minLength": 2,
                        "maxLength": 40,
                        "pattern": "^[a-z][a-z -]*$",
                    },
                    "maxItems": 3,
                },
                "motifs": {
                    "type": "array",
                    "items": {"type": "string", "maxLength": 50},
                    "maxItems": 4,
                },
                "mood": {"type": "string"},
                "episodeSummary": {"type": "string", "maxLength": 240},
                "anchors": {
                    "type": "array",
                    "items": {"type": "string", "maxLength": 60},
                    "minItems": 1,
                    "maxItems": 6,
                },
            },
            "required": ["themes", "motifs", "mood", "episodeSummary", "anchors"],
        },
    },
    "required": ["title", "insight", "memory"],
}


def embed_dream(body: str, safety_identifier: str) -> list[float]:
    """Create a compact semantic fingerprint used only for private memory retrieval."""
    if not SEMANTIC_MEMORY_ENABLED:
        return []
    return embed_texts([body[:6000].replace("\n", " ")], safety_identifier)[0]


def embed_texts(values: list[str], safety_identifier: str) -> list[list[float]]:
    """Embed a small batch of private strings in one cost-bounded request."""
    if not SEMANTIC_MEMORY_ENABLED or not values:
        return []
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=values,
        dimensions=EMBEDDING_DIMENSIONS,
        user=safety_identifier,
    )
    return [item.embedding for item in response.data]


def cosine_similarity(left: Iterable[float], right: Iterable[float]) -> float:
    left_values = list(left)
    right_values = list(right)
    if not left_values or len(left_values) != len(right_values):
        return 0.0
    dot = sum(a * b for a, b in zip(left_values, right_values))
    left_norm = math.sqrt(sum(value * value for value in left_values))
    right_norm = math.sqrt(sum(value * value for value in right_values))
    return dot / (left_norm * right_norm) if left_norm and right_norm else 0.0


def select_similar_episodes(
    query_embedding: list[float],
    episodes: list[dict],
    limit: int = 3,
) -> list[dict]:
    """Return only strong semantic matches; never pad the prompt with unrelated history."""
    if not query_embedding:
        return []
    ranked = []
    for episode in episodes:
        score = cosine_similarity(query_embedding, episode.get("embedding", []))
        if score >= SEMANTIC_MEMORY_THRESHOLD:
            ranked.append((score, episode))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [
        {
            "dreamId": episode.get("dreamId") or episode.get("id", ""),
            "date": episode.get("date", ""),
            "title": episode.get("title", ""),
            "summary": episode.get("summary", ""),
            "anchors": episode.get("anchors", [])[:6],
        }
        for _, episode in ranked[:limit]
    ]


def select_nearby_themes(
    query_embedding: list[float],
    theme_catalog: list[dict],
    limit: int = 8,
) -> list[str]:
    """Retrieve only the closest active personal labels for the generation prompt."""
    if not query_embedding:
        return []
    ranked = []
    for theme in theme_catalog:
        score = cosine_similarity(query_embedding, theme.get("embedding", []))
        if score >= THEME_CANDIDATE_THRESHOLD:
            ranked.append((score, theme))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [canonical_theme(theme.get("label", "")) for _, theme in ranked[:limit] if theme.get("label")]


def resolve_theme_proposals(
    proposals: list[str],
    theme_catalog: list[dict],
    safety_identifier: str,
) -> list[dict]:
    """Merge close synonyms while allowing genuinely new personal themes."""
    normalized = list(
        dict.fromkeys(
            canonical_theme(value)[:40]
            for value in proposals[:3]
            if canonical_theme(value)
        )
    )
    catalog_by_label = {}
    for item in theme_catalog:
        labels = [item.get("label", ""), *item.get("aliases", [])]
        for label in labels:
            if canonical_theme(label):
                catalog_by_label[canonical_theme(label)] = item

    resolved: list[dict] = []
    needs_embedding: list[str] = []
    for label in normalized:
        exact = catalog_by_label.get(label)
        if exact:
            resolved.append(
                {
                    "label": canonical_theme(exact.get("label", label)),
                    "proposedLabel": label,
                    "catalogId": exact.get("id", ""),
                    "embedding": exact.get("embedding", []),
                    "matched": True,
                }
            )
        else:
            needs_embedding.append(label)

    embeddings = embed_texts(
        [f"dream journal theme: {label}" for label in needs_embedding],
        safety_identifier,
    )
    active_catalog = [item for item in theme_catalog if item.get("active", True)]
    for index, label in enumerate(needs_embedding):
        embedding = embeddings[index] if index < len(embeddings) else []
        candidates = [
            (cosine_similarity(embedding, item.get("embedding", [])), item)
            for item in active_catalog
            if item.get("embedding")
        ]
        candidates.sort(key=lambda item: item[0], reverse=True)
        if candidates and candidates[0][0] >= THEME_MERGE_THRESHOLD:
            match = candidates[0][1]
            resolved.append(
                {
                    "label": canonical_theme(match.get("label", label)),
                    "proposedLabel": label,
                    "catalogId": match.get("id", ""),
                    "embedding": match.get("embedding", []),
                    "matched": True,
                }
            )
        else:
            resolved.append(
                {
                    "label": label,
                    "proposedLabel": label,
                    "catalogId": "",
                    "embedding": embedding,
                    "matched": False,
                }
            )

    # Preserve model order after exact and semantic matching took separate paths.
    by_proposal = {item["proposedLabel"]: item for item in resolved}
    ordered = [by_proposal[label] for label in normalized if label in by_proposal]
    unique = []
    seen = set()
    for item in ordered:
        if item["label"] not in seen:
            unique.append(item)
            seen.add(item["label"])
    return unique[:3]


def analyse_dream(body: str, self_reported_mood: str, recent_context: dict, safety_identifier: str) -> dict:
    moderation = client.moderations.create(model="omni-moderation-latest", input=body)
    result = moderation.results[0]
    if result.flagged:
        raise ValueError("This entry cannot be analysed automatically. Your journal entry is still safe to keep.")

    context = {
        "recurring_themes": [
            theme
            for theme in dict.fromkeys(canonical_theme(value) for value in recent_context.get("themes", []))
            if theme
        ][-12:],
        "nearby_personal_themes": list(dict.fromkeys(recent_context.get("nearbyThemes", [])))[:8],
        "recurring_motifs": list(dict.fromkeys(recent_context.get("motifs", [])))[-12:],
        "last_recorded_mood": recent_context.get("lastMood"),
        "similar_episodes": recent_context.get("similarEpisodes", [])[:3],
    }
    response = client.responses.create(
        model=MODEL,
        safety_identifier=safety_identifier,
        reasoning={"effort": "low"},
        max_output_tokens=1400,
        store=False,
        input=[
            {"role": "developer", "content": DREAM_REFLECTION_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "dream_text": body,
                        "self_reported_mood": self_reported_mood,
                        "recent_context": context,
                    }
                ),
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "dream_reflection",
                "strict": True,
                "schema": SCHEMA,
            },
            "verbosity": "medium",
        },
    )
    return json.loads(response.output_text)
