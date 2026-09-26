from tools.github_tool import GitHubTool


def main():
    github = GitHubTool()

    keywords = [
        "OpenAI",
        "Foundry",
        "Azure",
        "credential",
        "deployment",
        "environment",
        "backend",
        "src",
    ]

    print("\n=== RELEVANT GITHUB COMMITS ===\n")

    commits = github.find_relevant_commits(
        keywords
    )

    if not commits:
        print("No relevant commits found.")
        return

    for commit in commits:
        print(f"SHA: {commit['sha']}")
        print(f"Message: {commit['message']}")
        print(f"Date: {commit['date']}")

        matching_files = commit.get(
            "matching_files",
            [],
        )

        if matching_files:
            print("Matching files:")

            for filename in matching_files:
                print(f"  - {filename}")

        print()


if __name__ == "__main__":
    main()
