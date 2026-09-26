from agents.foundry_client import FoundryClient
from tools.github_tool import GitHubTool
from tools.azure_tool import AzureTool


class IncidentInvestigationAgent:
    """
    Investigates software incidents using repository context,
    source-code evidence, and recent commit changes.
    """

    def __init__(self):
        self.foundry = FoundryClient()
        self.github = GitHubTool()
        self.azure = AzureTool()

    def investigate(
        self,
        incident: str,
    ) -> str:

        print("\n[1] Getting repository snapshot...")

        repository_snapshot = self.github.get_repository_snapshot()

        print("[1] Repository snapshot retrieved.")

        print("\n[1.5] Getting Azure resource context...")

        azure_resources = self.azure.get_resources()

        print(
            f"[1.5] Azure resources retrieved: "
            f"{len(azure_resources)}"
        )

        print("\n[2] Finding relevant commits...")

        # Extract investigation keywords from the incident.
        keywords = [
            "azure",
            "foundry",
            "openai",
            "ai",
            "model",
            "deployment",
            "credential",
            "authentication",
            "token",
            "node",
            "typescript",
            "javascript",
            "express",
            "api",
            "error",
            "500",
            "timeout",
            "retry",
        ]

        relevant_commits = self.github.find_relevant_commits(
            keywords=keywords,
            limit=10,
        )

        print(
            f"[2] Relevant commits found: "
            f"{len(relevant_commits)}"
        )

        print("\n[3] Getting commit diffs...")

        commit_diffs = []

        for commit in relevant_commits:
            sha = commit.get("sha")

            if not sha:
                continue

            print(f"[3] Getting diff: {sha}")

            try:
                diff = self.github.get_commit_diff(sha)
                commit_diffs.append(diff)
            except Exception as exc:
                print(
                    f"[3] Failed to get diff for {sha}: "
                    f"{exc}"
                )

        print(
            f"[3] Commit diffs retrieved: "
            f"{len(commit_diffs)}"
        )

        print("\n[4] Building Foundry prompt...")

        prompt = f"""
You are the Incident Investigation Agent in an AI Engineering Operations platform.

Your responsibility is to investigate software incidents using repository
source code, repository metadata, recent commits, and actual commit diffs.

Do not invent evidence.

Every conclusion must be grounded in the supplied evidence.

Clearly distinguish:

- Confirmed Facts
- Repository Evidence
- Recent Changes
- Potentially Relevant Commits
- Hypotheses
- Missing Evidence
- Recommended Investigation
- Confidence

When analysing commits:

1. Determine whether the changed code could plausibly affect the incident.
2. Identify concrete configuration, dependency, authentication, API,
   deployment, or runtime changes.
3. Do not claim that a commit caused the incident unless the evidence
   supports that conclusion.
4. Treat commit relevance as investigative evidence, not proof of causality.
5. Explicitly identify changes that appear unrelated to the incident.
6. Use the actual commit patches when determining relevance.

When analysing hypotheses:

- Ground each hypothesis in repository evidence.
- Explain why the evidence supports the hypothesis.
- State what evidence would confirm or falsify it.
- Do not manufacture production telemetry.
- Do not assume the repository is identical to the deployed application.
- Do not assume environment variables are configured simply because
  they appear in source code.

Be technical, precise, and concise.

=== INCIDENT ===

{incident}

=== REPOSITORY SNAPSHOT ===

{repository_snapshot}

=== AZURE RESOURCE CONTEXT ===

{azure_resources}

=== RELEVANT COMMITS ===

{relevant_commits}

=== ACTUAL COMMIT DIFFS ===

{commit_diffs}

=== INVESTIGATION TASK ===

Investigate the incident using:

1. The incident description.
2. Repository metadata.
3. Azure resource context.
4. Repository source code.
5. Recent repository changes.
6. Relevant commit metadata.
7. Actual commit diffs.

Determine whether recent repository changes provide evidence
that helps explain the incident.

Pay particular attention to:

- Azure authentication
- DefaultAzureCredential
- Microsoft Foundry
- OpenAI-compatible APIs
- model deployments
- environment variables
- dependency versions
- Node.js runtime requirements
- HTTP/API configuration
- timeout and retry behaviour
- configuration inconsistencies
- competing application implementations
- changes introduced immediately before the incident
- Azure resource types
- Azure resource groups
- Microsoft Foundry projects
- Azure Cognitive Services resources
- Application Insights / monitoring resources
- Azure deployment topology
- Whether the Azure resources provide useful corroborating evidence

Do not treat the presence of a dependency or environment variable
as proof that it is used by the failing application.

Do not assume that an Azure resource is related to the incident merely
because it exists in the subscription.

Use Azure resources as environmental evidence only.

If the repository does not contain enough information to map an Azure
resource to the application, explicitly state that the relationship
cannot be confirmed.

Do not invent App Service, Container App, Function App, AKS, networking,
RBAC, deployment, telemetry, or configuration details that are not
present in the supplied Azure evidence.

For every potentially relevant commit:

- Identify the commit.
- Identify the changed files.
- Explain the relevant code/configuration change.
- Explain why it may or may not relate to the incident.
- State whether there is evidence of causality.

Return the investigation using exactly these sections:

## Confirmed Facts

## Repository Evidence

## Recent Changes

## Potentially Relevant Commits

## Hypotheses

## Missing Evidence

## Recommended Investigation

## Confidence
"""

        print("[4] Sending investigation to Foundry...")
        print(f"[4] Model: {self.foundry.deployment}")
        print(f"[4] Prompt length: {len(prompt)}")

        response = self.foundry.chat(
            prompt=prompt,
        )

        print("[5] Foundry response received.")
        print(f"[5] Response length: {len(response)}")

        if not response:
            raise RuntimeError(
                "Incident investigation returned an empty response."
            )

        return response
