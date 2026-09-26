from tools.github_tool import GitHubTool


def main():
    github = GitHubTool()

    file_data = github.get_file("backend/src/config/foundry.ts")

    print("=== GITHUB FILE ===")
    print(f"Path: {file_data['path']}")
    print(f"Size: {file_data['size']}")
    print()
    print(file_data["content"])


if __name__ == "__main__":
    main()