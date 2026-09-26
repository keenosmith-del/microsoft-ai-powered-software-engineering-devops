from tools.github_tool import GitHubTool


def main():
    github = GitHubTool()

    queries = [
        "OpenAI",
        "AIProjectClient",
        "chat.completions",
        "responses.create",
        "getBearerTokenProvider",
    ]

    print("=== GITHUB REPOSITORY CONTENT SEARCH ===")

    for query in queries:
        print(f"\n--- SEARCH: {query} ---")

        results = github.search_files(query)

        if not results:
            print("No results.")
            continue

        for result in results:
            print(f"\nFile: {result['path']}")

            for match in result["matches"]:
                print(
                    f"  Line {match['line']}: "
                    f"{match['content']}"
                )


if __name__ == "__main__":
    main()