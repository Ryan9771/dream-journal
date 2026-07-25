import unittest

from app.insights.prompts import DREAM_REFLECTION_PROMPT


class DreamReflectionPromptTests(unittest.TestCase):
    def test_requires_morning_readability_without_losing_depth(self):
        self.assertIn("Write for someone who may have just woken up", DREAM_REFLECTION_PROMPT)
        self.assertIn("simplify the wording, not the thinking", DREAM_REFLECTION_PROMPT)
        self.assertIn("the open question out of `analysis`", DREAM_REFLECTION_PROMPT)


if __name__ == "__main__":
    unittest.main()
