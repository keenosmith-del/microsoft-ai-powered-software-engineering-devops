import os
from pathlib import Path

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from dotenv import load_dotenv
from openai import OpenAI


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")


class FoundryClient:
    def __init__(self):
        project_endpoint = os.environ["FOUNDRY_PROJECT_ENDPOINT"]

        token_provider = get_bearer_token_provider(
            DefaultAzureCredential(),
            "https://ai.azure.com/.default",
        )

        self.client = OpenAI(
            base_url=project_endpoint.rstrip("/") + "/openai/v1",
            api_key=token_provider,
        )

    def chat(self, prompt: str, model: str) -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            max_completion_tokens=4000,
        )

        return response.choices[0].message.content or ""