from agents.foundry_client import FoundryClient
from config.settings import AZURE_OPENAI_DEPLOYMENT


def main():
    print("\n=== MICROSOFT FOUNDRY INFERENCE TEST ===\n")

    print("[1] Creating authenticated Foundry client...")
    foundry = FoundryClient()
    print("[1] Foundry client created.")

    model = AZURE_OPENAI_DEPLOYMENT

    print("\n[2] Sending test inference request...")
    print(f"[2] Model: {model}")

    response = foundry.client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": (
                    "Respond with exactly one sentence confirming that "
                    "Microsoft Foundry inference is working."
                ),
            }
        ],
        max_completion_tokens=100,
    )

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError("Foundry returned an empty response.")

    print("\n=== FOUNDRY INFERENCE RESPONSE ===\n")
    print(content)


if __name__ == "__main__":
    main()