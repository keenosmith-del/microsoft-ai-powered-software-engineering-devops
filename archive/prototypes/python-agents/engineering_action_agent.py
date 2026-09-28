from agents.foundry_client import FoundryClient


class EngineeringActionAgent:
    """
    Converts software-engineering investigation findings into
    concrete, evidence-based engineering actions.
    """

    def __init__(self):
        self.foundry = FoundryClient()

    def recommend(
        self,
        incident: str,
        investigation: str,
    ) -> str:

        prompt = f"""
You are the Engineering Action Agent in an AI Engineering Operations platform.

Your responsibility is to convert an incident investigation into a
concrete, evidence-based engineering action plan.

You are NOT responsible for inventing a root cause.

You must use only the evidence contained in the investigation.

=== INCIDENT ===

{incident}

=== INCIDENT INVESTIGATION ===

{investigation}

Your task is to determine:

1. What is the strongest actionable finding.
2. What should be changed first.
3. Which repository files are likely involved.
4. What exact engineering change should be made.
5. How the change should be validated.
6. What evidence is still required before making higher-risk changes.

Rules:

- Do not invent files.
- Do not invent infrastructure.
- Do not invent environment variables that are not present in the investigation.
- Do not invent Azure resources.
- Do not claim a root cause when the investigation says it is unconfirmed.
- Prefer the smallest safe engineering change supported by evidence.
- Do not recommend changing credentials, RBAC, networking, or infrastructure
  unless the investigation provides evidence supporting that action.
- Distinguish confirmed problems from hypotheses.
- If the investigation is insufficient for a code change, explicitly say so.
- Do not rewrite unrelated parts of the application.
- Do not recommend broad refactoring.
- Prioritise one concrete action at a time.

Return exactly these sections:

## Action

State the single highest-priority engineering action.

## Evidence

Explain the specific investigation evidence supporting the action.

## Files

List the exact repository files that should be inspected or changed.

## Change

Describe precisely what should change in those files.

Do not provide generic advice.

## Validation

Provide the exact test or command that should be used to verify the change.

## Remaining Evidence

State what evidence is still missing before taking any higher-risk action.

## Confidence

State High, Medium, or Low confidence and explain why.
"""

        print("\n[6] Building engineering action...")

        response = self.foundry.chat(
            prompt=prompt,
        )

        print("[7] Engineering action received.")
        print(f"[7] Response length: {len(response)}")

        if not response:
            raise RuntimeError(
                "Engineering action agent returned an empty response."
            )

        return response
