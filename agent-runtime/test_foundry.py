from agents.foundry_client import FoundryClient


def main() -> None:
    client = FoundryClient()

    response = client.chat(
        prompt="You are the AI Engineering Operations system. Respond with exactly: Foundry Python runtime operational.",
        model="MAI-Thinking-1",
    )

    print("\nMicrosoft Foundry Python test successful.\n")
    print(response)


if __name__ == "__main__":
    main()
