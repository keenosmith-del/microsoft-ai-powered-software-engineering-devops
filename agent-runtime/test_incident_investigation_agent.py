from agents.incident_investigation_agent import (
    IncidentInvestigationAgent,
)


def main():
    agent = IncidentInvestigationAgent()

    incident = """
A Node.js REST API deployed to Azure intermittently returns HTTP 500
when requests invoke an AI model. The same workflow succeeds locally.

The failure appears intermittent rather than completely reproducible.
The application currently exposes only a generic HTTP 500 response,
and the underlying dependency error has not yet been identified.
"""

    result = agent.investigate(incident)

    print("\n=== INCIDENT INVESTIGATION ===\n")
    print(result)


if __name__ == "__main__":
    main()
