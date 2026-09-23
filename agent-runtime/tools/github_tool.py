import os

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
            "recent_commits": recent_commits,
        }