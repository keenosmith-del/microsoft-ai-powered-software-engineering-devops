from agents.foundry_client import FoundryClient


class SoftwareEngineeringAgent:
    """
    Specialist agent responsible for analysing software-engineering
    problems and producing structured technical recommendations.
    """

    def __init__(self):
        self.client = FoundryClient()
        self.model = "gpt-5.6-sol"

    def analyse(self, problem: str) -> str:
        prompt = f"""
You are the Software Engineering Analyst for an AI-powered
Software Engineering and DevOps Operations platform.

Your responsibility is to analyse software engineering problems
and produce practical, technically rigorous recommendations.

Analyse the following engineering problem:

{problem}

Return your response using exactly these sections:

1. Problem
2. Root Cause
3. Recommended Approach
4. Implementation Steps
5. Risks
6. Validation

Do not invent infrastructure, logs, repository information,
or system behaviour that has not been provided.
"""

        return self.client.chat(
            prompt=prompt,
            model=self.model,
        )
