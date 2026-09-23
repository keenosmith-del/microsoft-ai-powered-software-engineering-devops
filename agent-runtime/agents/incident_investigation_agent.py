from agents.foundry_client import FoundryClient


class IncidentInvestigationAgent:
    """
    Investigates software engineering and production incidents
    using Microsoft Foundry.
    """

    def __init__(self):
        self.client = FoundryClient()

    def investigate(self, incident: str) -> str:
        prompt = f"""
You are the Incident Investigation Agent within an AI-powered
software engineering and DevOps operations platform.

Your responsibility is to investigate software engineering,
application, infrastructure, cloud, and deployment incidents.

Do not assume a root cause without evidence.

Analyse the incident below and produce a structured investigation.

Incident:
{incident}

Return the investigation using exactly these sections:

## Incident Summary
Summarise the incident objectively.

## Symptoms
List the observable symptoms and failures.

## Failure Domains
Identify the systems or layers that could be involved.

## Hypotheses
Provide the most plausible hypotheses and explain the reasoning
behind each one.

## Evidence Required
List the specific evidence that should be collected to validate
or eliminate each hypothesis.

## Root Cause Assessment
Identify the current leading hypothesis.
Clearly distinguish confirmed facts from assumptions.

## Recommended Investigation
Provide the next technical investigation steps in priority order.

## Confidence
State the confidence level and explain what evidence is still missing.

Important:
- Do not invent logs, metrics, deployments, commits, or infrastructure state.
- Do not claim that a hypothesis is confirmed without evidence.
- Treat the supplied incident as the only known evidence.
- Be technically precise.
"""

        response = self.client.chat(
            prompt=prompt,
            model="gpt-5.6-sol",
        )

        return response


def create_incident_investigation_agent():
    return IncidentInvestigationAgent()
