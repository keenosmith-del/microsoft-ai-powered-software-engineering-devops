import os
import sys

from typing import Any

import requests
from dotenv import load_dotenv


load_dotenv()


class GitHubTool:
    """
    Provides read-only access to repository information for
    the Incident Investigation Agent.
    """

    def __init__(self):
        self.owner = os.environ["GITHUB_OWNER"]
        self.repository = os.environ["GITHUB_REPOSITORY"]
        self.default_branch = os.getenv("GITHUB_DEFAULT_BRANCH", "main")

        self.base_url = "https://api.github.com"

        self.session = requests.Session()

        self.session.headers.update(
            {
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            }
        )

        token = os.getenv("GITHUB_TOKEN")

        if token:
            self.session.headers.update(
                {
                    "Authorization": f"Bearer {token}",
                }
            )

    def _get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> Any:
        response = self.session.get(
            f"{self.base_url}{path}",
            params=params,
            timeout=15,
        )

        if not response.ok:
            try:
                error_data = response.json()
            except ValueError:
                error_data = response.text

            raise RuntimeError(
                f"GitHub API request failed: "
                f"{response.status_code} {response.reason} "
                f"for {response.url}. "
                f"Response: {error_data}"
            )

        return response.json()

    def get_repository(self) -> dict[str, Any]:
        """Return repository metadata."""

        return self._get(
            f"/repos/{self.owner}/{self.repository}"
        )

    def get_branch(
        self,
        branch: str | None = None,
    ) -> dict[str, Any]:
        """Return information about a repository branch."""

        branch_name = branch or self.default_branch

        return self._get(
            f"/repos/{self.owner}/{self.repository}/branches/{branch_name}"
        )

    def get_file(self, path: str) -> dict[str, Any]:
        """
        Return decoded contents and metadata for a repository file.
        """
        import base64

        file_data = self._get(
            f"/repos/{self.owner}/{self.repository}/contents/{path}",
            params={"ref": self.default_branch},
        )

        if file_data.get("type") != "file":
            raise RuntimeError(
                f"GitHub path is not a file: {path}"
            )

        encoded_content = file_data.get("content")

        if not encoded_content:
            raise RuntimeError(
                f"GitHub file contains no content: {path}"
            )

        try:
            content = base64.b64decode(
                encoded_content.replace("\n", "")
            ).decode("utf-8")
        except (UnicodeDecodeError, ValueError) as exc:
            raise RuntimeError(
                f"Unable to decode GitHub file: {path}"
            ) from exc

        return {
            "path": file_data.get("path"),
            "name": file_data.get("name"),
            "sha": file_data.get("sha"),
            "size": file_data.get("size"),
            "html_url": file_data.get("html_url"),
            "content": content,
        }

    def get_files(
        self,
        paths: list[str],
    ) -> dict[str, str]:
        """
        Return decoded contents for multiple repository files.

        Files that cannot be retrieved are omitted rather than
        terminating the entire investigation.
        """

        files: dict[str, str] = {}

        for path in paths:
            try:
                file_data = self.get_file(path)
                files[path] = file_data["content"]
            except Exception:
                continue

        return files

    def get_repository_tree(self) -> list[dict[str, Any]]:
        """
        Return the repository file and directory tree
        for the default branch.
        """

        repository = self.get_repository()

        default_branch = (
            repository.get("default_branch")
            or self.default_branch
        )

        branch = self.get_branch(default_branch)

        commit_sha = (
            branch.get("commit", {}) or {}
        ).get("sha")

        if not commit_sha:
            raise RuntimeError(
                "Unable to determine the commit SHA "
                "for the default branch."
            )

        tree = self._get(
            f"/repos/{self.owner}/{self.repository}/git/trees/{commit_sha}",
            params={"recursive": "1"},
        )

        if tree.get("truncated"):
            raise RuntimeError(
                "GitHub repository tree is truncated."
            )

        return tree.get("tree", [])

    def search_files(
        self,
        query: str,
        paths: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Search repository file contents for a text query.

        Uses the GitHub repository tree and file contents instead of
        GitHub's Code Search API.
        """

        if paths is None:
            tree = self.get_repository_tree()

            paths = [
                item["path"]
                for item in tree
                if item.get("type") == "blob"
            ]

        results = []

        for path in paths:
            try:
                file_data = self.get_file(path)
            except Exception:
                continue

            content = file_data.get("content", "")

            if query.lower() not in content.lower():
                continue

            matching_lines = []

            for line_number, line in enumerate(
                content.splitlines(),
                start=1,
            ):
                if query.lower() in line.lower():
                    matching_lines.append(
                        {
                            "line": line_number,
                            "content": line.strip(),
                        }
                    )

            results.append(
                {
                    "path": path,
                    "matches": matching_lines,
                }
            )

        return results

    def search_code(
        self,
        query: str,
    ) -> list[dict[str, Any]]:
        """
        Search repository source code using the GitHub Code Search API.
        """

        results = self._get(
            "/search/code",
            params={
                "q": f"{query} repo:{self.owner}/{self.repository}",
                "per_page": 20,
            },
        )

        return results.get("items", [])

    def get_recent_commits(
        self,
        limit: int = 10,
        branch: str | None = None,
    ) -> list[dict[str, Any]]:
        """Return recent commits from the selected branch."""

        branch_name = branch or self.default_branch

        commits = self._get(
            f"/repos/{self.owner}/{self.repository}/commits",
            params={
                "sha": branch_name,
                "per_page": min(limit, 100),
            },
        )

        return commits

    def get_commit(
        self,
        sha: str,
    ) -> dict[str, Any]:
        """Return detailed information about a specific commit."""

        return self._get(
            f"/repos/{self.owner}/{self.repository}/commits/{sha}"
        )

    def get_commit_diff(
            self,
            sha: str,
        ) -> dict[str, Any]:
        """
        Return commit metadata and changed-file diffs.
        """

        commit = self.get_commit(sha)

        files = []

        for file in commit.get("files", []):
            files.append(
                {
                    "filename": file.get("filename"),
                    "status": file.get("status"),
                    "additions": file.get("additions"),
                    "deletions": file.get("deletions"),
                    "changes": file.get("changes"),
                    "patch": file.get("patch"),
                }
            )

        return {
            "sha": commit.get("sha"),
            "message": (
                commit.get("commit", {}) or {}
            ).get("message"),
            "date": (
                (
                    commit.get("commit", {}) or {}
                ).get("author", {}) or {}
            ).get("date"),
            "files": files,
        }

    def find_relevant_commits(
        self,
        keywords: list[str],
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """
        Identify recent commits that may be relevant to an
        incident based on commit messages and changed files.
        """

        commits = self.get_recent_commits(
            limit=limit,
        )

        relevant_commits = []

        normalized_keywords = [
            keyword.lower()
            for keyword in keywords
        ]

        for commit in commits:
            message = (
                commit.get("commit", {}) or {}
            ).get("message", "")

            message_lower = message.lower()

            try:
                commit_data = self.get_commit_diff(
                    commit["sha"]
                )
            except Exception:
                continue

            changed_files = commit_data.get(
                "files",
                [],
            )

            matching_files = []

            for file_data in changed_files:
                filename = (
                    file_data.get("filename")
                    or ""
                )

                filename_lower = filename.lower()

                if any(
                    keyword in filename_lower
                    for keyword in normalized_keywords
                ):
                    matching_files.append(
                        filename
                    )

            message_match = any(
                keyword in message_lower
                for keyword in normalized_keywords
            )

            if message_match or matching_files:
                relevant_commits.append(
                    {
                        "sha": commit_data.get("sha"),
                        "message": commit_data.get("message"),
                        "date": commit_data.get("date"),
                        "html_url": commit_data.get("html_url"),
                        "matching_files": matching_files,
                    }
                )

        return relevant_commits

    def get_repository_snapshot(self) -> dict[str, Any]:
        """
        Return a compact repository snapshot suitable for
        consumption by an AI agent.
        """

        repository = self.get_repository()

        # The repository metadata is authoritative for the default branch.
        repository_default_branch = repository.get(
            "default_branch"
        ) or self.default_branch

        branch = self.get_branch(
            repository_default_branch
        )

        branches = self._get(
            f"/repos/{self.owner}/{self.repository}/branches",
            params={"per_page": 10},
        )

        commits = self.get_recent_commits(
            limit=10,
            branch=repository_default_branch,
        )

        recent_commits = []

        for commit in commits:
            commit_data = commit.get("commit", {})

            recent_commits.append(
                {
                    "sha": commit.get("sha"),
                    "message": commit_data.get("message"),
                    "author": (
                        commit_data.get("author", {}) or {}
                    ).get("name"),
                    "date": (
                        commit_data.get("author", {}) or {}
                    ).get("date"),
                    "url": commit.get("html_url"),
                }
            )

        latest_commit_changes = None
        if commits:
            try:
                latest_diff = self.get_commit_diff(commits[0]["sha"])
                changed_files = latest_diff.get("files", [])
                latest_commit_changes = {
                    "sha": latest_diff.get("sha"),
                    "files_changed": len(changed_files),
                    "additions": sum(file.get("additions") or 0 for file in changed_files),
                    "deletions": sum(file.get("deletions") or 0 for file in changed_files),
                    "files": [
                        {
                            "path": file.get("filename"),
                            "status": file.get("status"),
                        }
                        for file in changed_files[:10]
                    ],
                }
            except Exception as error:
                print(f"Latest commit diff unavailable: {error}", file=sys.stderr)

        return {
            "repository": {
                "name": repository.get("name"),
                "full_name": repository.get("full_name"),
                "default_branch": repository_default_branch,
                "private": repository.get("private"),
                "language": repository.get("language"),
                "updated_at": repository.get("updated_at"),
                "html_url": repository.get("html_url"),
            },
            "branch": {
                "name": branch.get("name"),
                "sha": (
                    branch.get("commit", {}) or {}
                ).get("sha"),
            },
            "branches": [
                {
                    "name": item.get("name"),
                    "sha": (item.get("commit", {}) or {}).get("sha"),
                    "protected": item.get("protected", False),
                }
                for item in branches
            ],
            "recent_commits": recent_commits,
            "latest_commit_changes": latest_commit_changes,
        }
