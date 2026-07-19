"""Cost-bounded, structured dream reflection."""

from __future__ import annotations

import json
import os

from openai import OpenAI

from util.prompts import DREAM_REFLECTION_PROMPT

client = OpenAI()
MODEL = os.getenv("OPENAI_INSIGHT_MODEL", "gpt-5.6-luna")
THEME_VOCABULARY = [
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
                    "items": {"type": "string", "enum": THEME_VOCABULARY},
                    "minItems": 1,
                    "maxItems": 3,
                },
                "reflection": {"type": "string", "maxLength": 300},
                "pattern": {"type": "string", "maxLength": 240},
                "emotionalTone": {
                    "type": "string",
                    "enum": ["peaceful", "joyful", "curious", "uneasy", "heavy", "mixed"],
                },
                "intensity": {"type": "integer", "minimum": 1, "maximum": 5},
            },
            "required": ["analysis", "themes", "reflection", "pattern", "emotionalTone", "intensity"],
        },
        "memory": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "themes": {
                    "type": "array",
                    "items": {"type": "string", "enum": THEME_VOCABULARY},
                    "maxItems": 3,
                },
                "motifs": {"type": "array", "items": {"type": "string"}, "maxItems": 4},
                "mood": {"type": "string"},
            },
            "required": ["themes", "motifs", "mood"],
        },
    },
    "required": ["title", "insight", "memory"],
}


def analyse_dream(body: str, self_reported_mood: str, recent_context: dict, safety_identifier: str) -> dict:
    moderation = client.moderations.create(model="omni-moderation-latest", input=body)
    result = moderation.results[0]
    if result.flagged:
        raise ValueError("This entry cannot be analysed automatically. Your journal entry is still safe to keep.")

    context = {
        "recurring_themes": list(dict.fromkeys(recent_context.get("themes", [])))[-12:],
        "recurring_motifs": list(dict.fromkeys(recent_context.get("motifs", [])))[-12:],
        "last_recorded_mood": recent_context.get("lastMood"),
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
