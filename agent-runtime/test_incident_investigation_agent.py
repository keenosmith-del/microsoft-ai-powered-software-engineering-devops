from agents.incident_investigation_agent import IncidentInvestigationAgent


def main():
    agent = IncidentInvestigationAgent()

    incident = """
A Node.js REST API deployed to Azure intermittently returns HTTP 500
when handling requests that invoke an AI model. The same workflow
succeeds locally.

Investigate the incident and determine whether the available GitHub
repository context provides any useful evidence.
"""

    result = agent.investigate(incident)

    print("\n=== INCIDENT INVESTIGATION ===\n")
    print(result)


if __name__ == "__main__":
    main()