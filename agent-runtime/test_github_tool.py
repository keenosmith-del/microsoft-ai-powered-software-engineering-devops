from tools.github_tool import GitHubTool


def main():
    github = GitHubTool()

    snapshot = github.get_repository_snapshot()

    print("\n=== GITHUB REPOSITORY SNAPSHOT ===\n")

    repository = snapshot["repository"]
    branch = snapshot["branch"]

    print(f"Repository: {repository['full_name']}")
    print(f"Default branch: {repository['default_branch']}")
    print(f"Language: {repository['language']}")
    print(f"Private: {repository['private']}")
    print(f"Branch: {branch['name']}")
    print(f"Branch SHA: {branch['sha']}")

    print("\nRecent commits:\n")

    for commit in snapshot["recent_commits"]:
        print(f"{commit['sha'][:7]} - {commit['message']}")
        print(f"Author: {commit['author']}")
        print(f"Date: {commit['date']}")
        print()


if __name__ == "__main__":
    main()
