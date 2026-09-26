import re
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_EXAMPLE = PROJECT_ROOT / ".env.example"


class ConfigurationContractTest(unittest.TestCase):

    def test_foundry_configuration_contract(self):
        content = ENV_EXAMPLE.read_text(encoding="utf-8")

        variables = set(
            re.findall(
                r"^([A-Z][A-Z0-9_]*)=",
                content,
                flags=re.MULTILINE,
            )
        )

        self.assertIn("AZURE_OPENAI_DEPLOYMENT", variables)
        self.assertNotIn("FOUNDRY_MODEL_DEPLOYMENT", variables)


if __name__ == "__main__":
    unittest.main()
