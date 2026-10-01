import os
from evidence_context import SAFETY_INSTRUCTION

from pathlib import Path

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from dotenv import load_dotenv
from openai import OpenAI


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")


class FoundryClient:

    def __init__(self):

        project_endpoint = os.getenv("FOUNDRY_PROJECT_ENDPOINT")
        deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")

        if not project_endpoint:
            raise RuntimeError(
                "FOUNDRY_PROJECT_ENDPOINT is not configured."
            )

        if not deployment:
            raise RuntimeError(
                "AZURE_OPENAI_DEPLOYMENT is not configured."
            )

        self.deployment = deployment

        token_provider = get_bearer_token_provider(
            DefaultAzureCredential(),
            "https://ai.azure.com/.default",
        )

        self.client = OpenAI(
            base_url=project_endpoint.rstrip("/") + "/openai/v1",
            api_key=token_provider,
        )

    def chat(self, prompt: str) -> str:

        response = self.client.chat.completions.create(
            model=self.deployment,
            messages=[
                {"role": "system", "content": SAFETY_INSTRUCTION},
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            max_completion_tokens=12000,
        )

        if not response.choices:
            raise RuntimeError(
                "Foundry returned no completion choices."
            )

        choice = response.choices[0]
        content = choice.message.content

        if not content:
            raise RuntimeError(
                "Foundry returned an empty message content. "
                f"Finish reason: {choice.finish_reason}."
            )

        return content