import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.insights.titles import (
    MAX_TITLE_INPUT_CHARS,
    clean_generated_title,
    fallback_title,
    generate_dream_title,
)


class DreamTitleTests(unittest.TestCase):
    def test_cleans_and_bounds_generated_title(self):
        self.assertEqual(
            clean_generated_title('"The train beyond the moonlit forest."'),
            "The train beyond the moonlit forest",
        )
        self.assertEqual(
            clean_generated_title("One two three four five six seven eight nine"),
            "One two three four five six seven",
        )
        self.assertEqual(clean_generated_title("Too short"), "")

    def test_fallback_removes_dream_boilerplate(self):
        title = fallback_title(
            "I remember I had a dream that I was pretty angry at my flatmate "
            "and started flipping things in the sink."
        )
        self.assertEqual(title, "Angry at my flatmate and started")

    @patch("app.insights.titles._client")
    def test_model_call_is_private_bounded_and_structured(self, client_factory):
        create = client_factory.return_value.responses.create
        create.return_value = SimpleNamespace(
            output_text=json.dumps({"title": "The argument beside the sink"})
        )
        body = "beginning " + ("x" * 5000) + " ending"

        title = generate_dream_title(body, "safe-user-id")

        self.assertEqual(title, "The argument beside the sink")
        request = create.call_args.kwargs
        self.assertEqual(request["model"], "gpt-5.4-nano")
        self.assertEqual(request["max_output_tokens"], 80)
        self.assertFalse(request["store"])
        self.assertEqual(request["reasoning"], {"effort": "none"})
        sent_body = json.loads(request["input"][1]["content"])["dream_text"]
        self.assertLessEqual(len(sent_body), MAX_TITLE_INPUT_CHARS + 5)
        self.assertTrue(request["text"]["format"]["strict"])


if __name__ == "__main__":
    unittest.main()
