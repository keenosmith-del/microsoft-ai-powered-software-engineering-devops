import sys
import os
from datetime import datetime, timezone
from urllib.parse import urlparse

from azure.identity import DefaultAzureCredential
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from evidence_context import grounded_problem

from agents.software_engineering_agent import SoftwareEngineeringAgent
from agents.incident_investigation_agent import IncidentInvestigationAgent
from agents.engineering_action_agent import EngineeringActionAgent
from tools.github_tool import GitHubTool


app = FastAPI(
    title="AI Engineering Operations",
    description="AI-powered software engineering and DevOps operations agent runtime.",
    version="1.0.0",
)


class RetrievedEvidence(BaseModel):
    document_id: str = Field(min_length=1, max_length=100)
    section: str = Field(max_length=200)
    ordinal: int = Field(ge=0)
    text: str = Field(max_length=2000)


class EngineeringProblem(BaseModel):
    problem: str = Field(min_length=1, max_length=100000)
    retrieved_evidence: list[RetrievedEvidence] = Field(default_factory=list, max_length=5)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-engineering-operations-agent-runtime",
    }


@app.get("/platform")
def platform_status():
    subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
    project_endpoint = os.getenv("FOUNDRY_PROJECT_ENDPOINT")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    credential = None

    if subscription_id or project_endpoint:
        credential = DefaultAzureCredential()

    if subscription_id:
        try:
            from tools.azure_tool import AzureTool

            azure_tool = AzureTool(credential)
            azure_resources = azure_tool.get_resources(limit=50)
            azure = {
                "status": "connected",
                "resource_count": len(azure_resources),
                "resources_truncated": azure_tool.last_resource_query_truncated,
                "resources": [
                    {
                        "name": resource.get("name"),
                        "type": resource.get("type"),
                        "location": resource.get("location"),
                        "resource_group": resource.get("resource_group"),
                        "provisioning_state": resource.get("provisioning_state"),
                    }
                    for resource in azure_resources
                ],
            }
        except Exception as error:
            print(f"Azure resource check failed: {error}", file=sys.stderr)
            azure = {
                "status": "unavailable",
                "resource_count": 0,
                "resources_truncated": False,
                "resources": [],
                "detail": "Azure resource access could not be verified.",
            }
    else:
        azure = {
            "status": "not_configured",
            "resource_count": 0,
            "resources_truncated": False,
            "resources": [],
        }

    if not project_endpoint:
        foundry = {
            "status": "not_configured",
            "authentication": "not_checked",
            "endpoint_host": None,
            "deployment": deployment,
        }
    else:
        try:
            credential.get_token("https://ai.azure.com/.default")
            authentication = "authenticated"
        except Exception as error:
            print(f"Foundry authentication check failed: {error}", file=sys.stderr)
            authentication = "unavailable"

        foundry = {
            "status": (
                "ready" if authentication == "authenticated" and deployment
                else "configuration_incomplete" if authentication == "authenticated"
                else "unavailable"
            ),
            "authentication": authentication,
            "endpoint_host": urlparse(project_endpoint).hostname,
            "deployment": deployment,
            "inference": "not_tested",
        }

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "runtime": {
            "status": "ok",
            "service": "ai-engineering-operations-agent-runtime",
        },
        "azure": azure,
        "foundry": foundry,
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
            "branches": snapshot["branches"],
            "recent_commits": snapshot["recent_commits"],
            "latest_commit_changes": snapshot["latest_commit_changes"],
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

    problem = grounded_problem(request.problem, [entry.model_dump() for entry in request.retrieved_evidence])

    try:
        software_engineering_agent = SoftwareEngineeringAgent()
        incident_investigation_agent = IncidentInvestigationAgent()
        engineering_action_agent = EngineeringActionAgent()

        analysis = software_engineering_agent.analyse(
            problem
        )

        investigation = incident_investigation_agent.investigate(
            incident=problem
        )

        actions = engineering_action_agent.recommend(
            incident=problem,
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

# NDJSON carries real stage starts/results while preserving the existing /analyse contract.
@app.post('/analyse-stream')
def analyse_stream(request: EngineeringProblem):
    from fastapi.responses import StreamingResponse
    import json
    import time

    if not request.problem.strip():
        raise HTTPException(status_code=400, detail='problem cannot be empty')

    def events():
        problem = grounded_problem(request.problem, [entry.model_dump() for entry in request.retrieved_evidence])
        investigation = ''
        for stage in ['software-engineering', 'incident-investigation', 'engineering-action']:
            started = time.monotonic()
            yield json.dumps({'stage': stage, 'status': 'running', 'at': datetime.now(timezone.utc).isoformat()}) + '\n'
            try:
                if stage == 'software-engineering':
                    output = SoftwareEngineeringAgent().analyse(problem)
                elif stage == 'incident-investigation':
                    output = IncidentInvestigationAgent().investigate(incident=problem)
                    investigation = output
                else:
                    output = EngineeringActionAgent().recommend(incident=problem, investigation=investigation)
                if not isinstance(output, str) or not output.strip() or len(output) > 200000:
                    raise ValueError('Invalid stage output')
                yield json.dumps({'stage': stage, 'status': 'completed', 'at': datetime.now(timezone.utc).isoformat(), 'elapsedMs': round((time.monotonic() - started) * 1000), 'output': output}) + '\n'
            except Exception:
                yield json.dumps({'stage': stage, 'status': 'failed', 'at': datetime.now(timezone.utc).isoformat(), 'elapsedMs': round((time.monotonic() - started) * 1000), 'error': 'Agent stage failed'}) + '\n'
                return

    return StreamingResponse(events(), media_type='application/x-ndjson')
