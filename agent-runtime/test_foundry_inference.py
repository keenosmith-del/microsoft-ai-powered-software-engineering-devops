import os

from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from dotenv import load_dotenv


load_dotenv()


PROJECT_ENDPOINT = (
    "https://ai-engineering-op-resource.services.ai.azure.com"
    "/api/projects/ai-engineering-operations"
)


def main():
    print("\n=== MICROSOFT FOUNDRY INFERENCE TEST ===\n")

    print("[1] Creating Azure credential...")

    credential = DefaultAzureCredential()

    print("[1] Credential created.")

    print("\n[2] Creating AIProjectClient...")

    project = AIProjectClient(
        endpoint=PROJECT_ENDPOINT,
        credential=credential,
    )

    print("[2] AIProjectClient created.")

    print("\n[3] Getting authenticated OpenAI client...")

    client = project.get_openai_client()

    print("[3] OpenAI client created.")

    print("\n[4] Sending test inference request...")

    response = client.responses.create(
        model="gpt-4o",
        input="Respond with exactly: Azure Foundry inference is working.",
    )

    print("\n=== INFERENCE RESPONSE ===\n")

    print(response)

    print("\n=== RESPONSE OUTPUT ===\n")

    print(response.output_text)

    print("\n=== SUCCESS ===\n")


if __name__ == "__main__":
    main()
