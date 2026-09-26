from tools.github_tool import GitHubTool


def main():

    github = GitHubTool()

    print("\n=== GITHUB REPOSITORY SNAPSHOT ===\n")

    snapshot = github.get_repository_snapshot()

    print(f"Repository: {snapshot['repository']['full_name']}")
    print(
        f"Default branch: "
        f"{snapshot['repository']['default_branch']}"
    )
    print(f"Language: {snapshot['repository']['language']}")
    print(f"Private: {snapshot['repository']['private']}")

    print(f"\nBranch: {snapshot['branch']['name']}")
    print(f"Branch SHA: {snapshot['branch']['sha']}")

    print("\nRecent commits:")

    for commit in snapshot["recent_commits"]:
        print(
            f"\n{commit['sha'][:7]} - "
            f"{commit['message']}\n"
            f"Author: {commit['author']}\n"
            f"Date: {commit['date']}"
        )

    print("\n=== REPOSITORY TREE ===\n")

    tree = github.get_repository_tree()

    for item in tree:
        print(
            f"{item.get('type', 'unknown'):4} "
            f"{item.get('path', '')}"
        )


if __name__ == "__main__":
    main()
