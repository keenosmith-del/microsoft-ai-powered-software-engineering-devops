from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
from dotenv import load_dotenv
import os


load_dotenv()


def main():
    print("\n=== MICROSOFT FOUNDRY SDK DEPLOYMENT INSPECTION ===\n")

    endpoint = (
        "https://ai-engineering-op-resource.services.ai.azure.com"
        "/api/projects/ai-engineering-operations"
    )

    print("[1] Creating AIProjectClient...")

    client = AIProjectClient(
        endpoint=endpoint,
        credential=DefaultAzureCredential(),
    )

    print("[1] AIProjectClient created.")

    print("\n[2] Listing all project deployments...")

    deployments = list(
        client.deployments.list()
    )

    print(
        f"\n=== ALL PROJECT DEPLOYMENTS ===\n"
        f"\nDeployments found: {len(deployments)}"
    )

    for deployment in deployments:
        print("\n--- Deployment ---")

        print(f"Type: {type(deployment)}")

        try:
            print(f"Name: {deployment.name}")
        except Exception:
            pass

        print("\nDeployment object:")

        print(deployment)

        if hasattr(deployment, "as_dict"):
            print("\nDeployment dictionary:")

            print(
                deployment.as_dict()
            )

    print("\n[3] Testing ModelDeployment filter...")

    model_deployments = list(
        client.deployments.list(
            deployment_type="ModelDeployment"
        )
    )

    print(
        f"\n=== MODEL DEPLOYMENTS ===\n"
        f"\nDeployments found: "
        f"{len(model_deployments)}"
    )

    for deployment in model_deployments:
        print("\n--- Model Deployment ---")
        print(deployment)

        if hasattr(deployment, "as_dict"):
            print(deployment.as_dict())

    client.close()


if __name__ == "__main__":
    main()