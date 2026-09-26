from tools.github_tool import GitHubTool


def main():
    github = GitHubTool()

    paths = [
        "backend/package.json",
        "backend/src/server.ts",
        "backend/src/config/foundry.ts",
        "src/app.js",
        "src/config/azure.js",
        "src/services/foundry.js",
    ]

    files = github.get_files(paths)

    print("=== GITHUB FILES ===")

    for path, content in files.items():
        print()
        print(f"--- {path} ---")
        print(content)


if __name__ == "__main__":
    main()