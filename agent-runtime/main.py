import sys

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from agents.software_engineering_agent import SoftwareEngineeringAgent
from agents.incident_investigation_agent import IncidentInvestigationAgent
from agents.engineering_action_agent import EngineeringActionAgent
from tools.github_tool import GitHubTool


app = FastAPI(
    title="AI Engineering Operations",
    description="AI-powered software engineering and DevOps operations agent runtime.",
    version="1.0.0",
)


class EngineeringProblem(BaseModel):
    problem: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-engineering-operations-agent-runtime",
    }


@app.get("/repository")
def repository():
    try:
        github = GitHubTool()

        snapshot = github.get_repository_snapshot()

        return {
            "success": True,
            "repository": snapshot["repository"],
            "branch": snapshot["branch"],
            "recent_commits": snapshot["recent_commits"],
        }

    except Exception as error:
        print(
            f"Repository runtime failed: {error}",
            file=sys.stderr,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve repository data",
        )


@app.post("/analyse")
def analyse(request: EngineeringProblem):
    if not request.problem.strip():
        raise HTTPException(
            status_code=400,
            detail="problem cannot be empty",
        )

    try:
        software_engineering_agent = SoftwareEngineeringAgent()
        incident_investigation_agent = IncidentInvestigationAgent()
        engineering_action_agent = EngineeringActionAgent()

        analysis = software_engineering_agent.analyse(
            request.problem
        )

        investigation = incident_investigation_agent.investigate(
            incident=request.problem
        )

        actions = engineering_action_agent.recommend(
            incident=request.problem,
            investigation=investigation,
        )

        return {
            "success": True,
            "analysis": analysis,
            "investigation": investigation,
            "actions": actions,
        }

    except Exception as error:
        print(f"Agent runtime failed: {error}", file=sys.stderr)

        raise HTTPException(
            status_code=500,
            detail="Agent runtime failed",
        )


def main():
    print("\n=== AI ENGINEERING OPERATIONS ===")

    software_engineering_agent = SoftwareEngineeringAgent()
    incident_investigation_agent = IncidentInvestigationAgent()
    engineering_action_agent = EngineeringActionAgent()

    print("\nEnter engineering problem.")
    print("Paste your full multi-line problem, then press Ctrl+D when finished:\n")

    problem = sys.stdin.read().strip()

    if not problem:
        raise ValueError("Engineering problem cannot be empty.")

    print("\n[1] Running Software Engineering Agent...")
    analysis = software_engineering_agent.analyse(problem)

    print("\n=== SOFTWARE ENGINEERING ANALYSIS ===")
    print(analysis)

    print("\n[2] Running Incident Investigation Agent...")
    investigation = incident_investigation_agent.investigate(
        incident=problem
    )

    print("\n=== INCIDENT INVESTIGATION ===")
    print(investigation)

    print("\n[3] Running Engineering Action Agent...")
    actions = engineering_action_agent.recommend(
        incident=problem,
        investigation=investigation,
    )

    print("\n=== ENGINEERING ACTIONS ===")
    print(actions)


if __name__ == "__main__":
    main()
