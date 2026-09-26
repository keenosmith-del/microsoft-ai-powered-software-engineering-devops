from tools.github_tool import GitHubTool


def main():
    github = GitHubTool()

    sha = "dea6e97d8dc3a8bb571e8972c405f432785eb4f9"

    result = github.get_commit_diff(sha)

    print("\n=== GITHUB COMMIT DIFF ===\n")

    print(f"SHA: {result['sha']}")
    print(f"Message: {result['message']}")
    print(f"Date: {result['date']}")

    print("\nChanged files:")

    for file in result["files"]:
        print(f"\n--- {file['filename']} ---")
        print(f"Status: {file['status']}")
        print(
            f"Changes: +{file['additions']} "
            f"-{file['deletions']}"
        )

        patch = file.get("patch")

        if patch:
            print("\nPatch:")
            print(patch)


if __name__ == "__main__":
    main()