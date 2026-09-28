from agents.foundry_client import FoundryClient


class EngineeringActionAgent:
    """Turn investigation evidence into one concrete engineering action."""

    def __init__(self):
        self.foundry = FoundryClient()

    def recommend(self, incident: str, investigation: str) -> str:
        prompt = f"""
You are the Engineering Action Agent in an AI Engineering Operations platform.

Create one concrete, evidence-based engineering action from the investigation.
Do not invent a root cause, files, infrastructure, environment variables, or
Azure resources. Prefer the smallest safe change supported by evidence. If the
investigation does not support a code change, say so. Distinguish confirmed
problems from hypotheses and identify evidence still needed before higher-risk
changes. Do not recommend unrelated refactors or generic advice.

=== INCIDENT ===
{incident}

=== INCIDENT INVESTIGATION ===
{investigation}

Return exactly these sections:

## Action
State the single highest-priority engineering action.

## Evidence
Explain the investigation evidence supporting it.

## Files
List exact repository files to inspect or change. Do not invent files.

## Change
Describe precisely what should change. Do not provide generic advice.

## Validation
Give the exact test or command that should verify the change.

## Remaining Evidence
State what evidence is still needed before higher-risk action.

## Confidence
State High, Medium, or Low and explain why.
"""

        response = self.foundry.chat(prompt=prompt)
        if not response:
            raise RuntimeError("Engineering action agent returned an empty response.")
        return response
