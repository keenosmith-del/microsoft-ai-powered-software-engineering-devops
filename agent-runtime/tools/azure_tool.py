import os

from typing import Any

from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient
from azure.mgmt.resource.resources import ResourceManagementClient
from dotenv import load_dotenv


load_dotenv()


class AzureTool:
    """
    Provides read-only access to Azure resource information
    for the Incident Investigation Agent.
    """

    def __init__(self):

        subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")

        if not subscription_id:
            raise RuntimeError(
                "AZURE_SUBSCRIPTION_ID is not configured."
            )

        self.subscription_id = subscription_id
        self.credential = DefaultAzureCredential()

        self.resource_client = ResourceManagementClient(
            self.credential,
            self.subscription_id,
        )

        self.cognitive_services_client = (
            CognitiveServicesManagementClient(
                self.credential,
                self.subscription_id,
            )
        )

    def get_resources(
        self,
        resource_group: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Return Azure resources visible to the authenticated identity.

        If resource_group is supplied, only resources in that
        resource group are returned.
        """

        if resource_group:
            resources = (
                self.resource_client.resources.list_by_resource_group(
                    resource_group
                )
            )
        else:
            resources = self.resource_client.resources.list()

        results = []

        for resource in resources:

            results.append(
                {
                    "id": resource.id,
                    "name": resource.name,
                    "type": resource.type,
                    "location": resource.location,
                    "resource_group": (
                        resource.id.split(
                            "/resourceGroups/"
                        )[1].split("/")[0]
                        if "/resourceGroups/" in resource.id
                        else None
                    ),
                    "provisioning_state": (
                        (resource.properties or {}).get(
                            "provisioningState"
                        )
                        if resource.properties
                        else None
                    ),
                }
            )

        return results

    def find_foundry_projects(
        self,
    ) -> list[dict[str, Any]]:
        """
        Return Microsoft Foundry project resources visible to the
        authenticated Azure identity.
        """

        resources = self.resource_client.resources.list()

        projects = []

        for resource in resources:

            if resource.type != (
                "Microsoft.CognitiveServices/accounts/projects"
            ):
                continue

            projects.append(
                {
                    "id": resource.id,
                    "name": resource.name,
                    "type": resource.type,
                    "location": resource.location,
                    "resource_group": (
                        resource.id.split(
                            "/resourceGroups/"
                        )[1].split("/")[0]
                        if "/resourceGroups/" in resource.id
                        else None
                    ),
                    "provisioning_state": (
                        (resource.properties or {}).get(
                            "provisioningState"
                        )
                        if resource.properties
                        else None
                    ),
                    "properties": resource.properties or {},
                }
            )

        return projects

    def find_foundry_project(
        self,
        project_name: str,
    ) -> dict[str, Any] | None:
        """
        Find and inspect a specific Microsoft Foundry project.

        The initial subscription listing provides the resource ID.
        The resource is then inspected directly to retrieve its actual
        properties and provisioning state.
        """

        projects = self.find_foundry_projects()

        for project in projects:

            resource_name = project["name"]

            if "/" in resource_name:
                actual_project_name = resource_name.rsplit(
                    "/",
                    1,
                )[-1]
            else:
                actual_project_name = resource_name

            if actual_project_name != project_name:
                continue

            inspected = self.get_resource_by_id(
                project["id"]
            )

            return inspected

        return None

    def get_parent_foundry_account(
        self,
        project: dict[str, Any],
    ) -> dict[str, Any] | None:
        """
        Inspect the Microsoft Cognitive Services account that owns
        a Microsoft Foundry project.
        """

        resource_id = project.get("id")

        if not resource_id:
            return None

        marker = (
            "/providers/Microsoft.CognitiveServices/accounts/"
        )

        if marker not in resource_id:
            return None

        account_path = resource_id.split(
            marker,
            1,
        )[1]

        account_name = account_path.split(
            "/",
            1,
        )[0]

        account_resource_id = (
            f"/subscriptions/{self.subscription_id}"
            f"/resourceGroups/{project['resource_group']}"
            f"/providers/Microsoft.CognitiveServices/accounts/"
            f"{account_name}"
        )

        return self.get_resource_by_id(
            account_resource_id,
            api_version="2025-06-01",
        )

    def get_resource(
        self,
        resource_group: str,
        resource_name: str,
        resource_type: str,
    ) -> dict[str, Any]:
        """
        Return information about a specific Azure resource.
        """

        resource = self.resource_client.resources.get_by_id(
            resource_id=(
                f"/subscriptions/{self.subscription_id}"
                f"/resourceGroups/{resource_group}"
                f"/providers/{resource_type}/{resource_name}"
            ),
            api_version="2025-06-01",
        )

        return {
            "id": resource.id,
            "name": resource.name,
            "type": resource.type,
            "location": resource.location,
            "resource_group": (
                resource.id.split(
                    "/resourceGroups/"
                )[1].split("/")[0]
                if "/resourceGroups/" in resource.id
                else resource_group
            ),
            "provisioning_state": (
                (resource.properties or {}).get(
                    "provisioningState"
                )
                if resource.properties
                else None
            ),
        }

    def get_resource_by_id(
        self,
        resource_id: str,
        api_version: str = "2025-06-01",
    ) -> dict[str, Any]:
        """
        Return information about a specific Azure resource by resource ID.
        """

        resource = self.resource_client.resources.get_by_id(
            resource_id=resource_id,
            api_version=api_version,
        )

        return {
            "id": resource.id,
            "name": resource.name,
            "type": resource.type,
            "location": resource.location,
            "resource_group": (
                resource.id.split(
                    "/resourceGroups/"
                )[1].split("/")[0]
                if "/resourceGroups/" in resource.id
                else None
            ),
            "provisioning_state": (
                (resource.properties or {}).get(
                    "provisioningState"
                )
                if resource.properties
                else None
            ),
            "properties": resource.properties or {},
        }

    def get_resources_by_type(
        self,
        resource_type: str,
        resource_group: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Return Azure resources matching a specific resource type.

        Optionally limits results to a resource group.
        """

        resources = self.get_resources(
            resource_group=resource_group
        )

        return [
            resource
            for resource in resources
            if resource.get("type", "").lower()
            == resource_type.lower()
        ]

    def get_foundry_projects(
        self,
        resource_group: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Return Microsoft Foundry project resources visible
        to the authenticated Azure identity.
        """

        return self.get_resources_by_type(
            "Microsoft.CognitiveServices/accounts/projects",
            resource_group=resource_group,
        )

    def get_model_deployments(
            self,
            account_name: str,
            resource_group: str,
        ) -> list[dict[str, Any]]:
        """
        Return model deployments exposed by the Azure Cognitive Services
        account deployment API.

        Note:
        Microsoft Foundry project deployments may be exposed through
        project-level Foundry APIs rather than this account-level
        Cognitive Services deployment collection.
        """

        deployments = (
            self.cognitive_services_client.deployments.list(
                resource_group_name=resource_group,
                account_name=account_name,
            )
        )

        results = []

        for deployment in deployments:
            properties = getattr(
                deployment,
                "properties",
                None,
            )

            results.append(
                {
                    "id": getattr(
                        deployment,
                        "id",
                        None,
                    ),
                    "name": getattr(
                        deployment,
                        "name",
                        None,
                    ),
                    "type": getattr(
                        deployment,
                        "type",
                        None,
                    ),
                    "location": getattr(
                        deployment,
                        "location",
                        None,
                    ),
                    "resource_group": resource_group,
                    "provisioning_state": (
                        getattr(
                            properties,
                            "provisioning_state",
                            None,
                        )
                        if properties
                        else None
                    ),
                    "model": (
                        properties.model.as_dict()
                        if properties
                        and getattr(
                            properties,
                            "model",
                            None,
                        )
                        else None
                    ),
                    "sku": (
                        deployment.sku.as_dict()
                        if getattr(
                            deployment,
                            "sku",
                            None,
                        )
                        else None
                    ),
                    "properties": (
                        properties.as_dict()
                        if properties
                        else {}
                    ),
                }
            )

        return results
