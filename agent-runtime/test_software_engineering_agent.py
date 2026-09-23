from agents.software_engineering_agent import SoftwareEngineeringAgent


def main():
    agent = SoftwareEngineeringAgent()

    response = agent.analyse(
        """
        A Node.js REST API deployed to Azure intermittently returns
        HTTP 500 errors when processing requests that call an AI model.
        The application works correctly during local development.
        """
    )

    print("\n=== SOFTWARE ENGINEERING ANALYSIS ===\n")
    print(response)


if __name__ == "__main__":
    main()
