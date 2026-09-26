import os

from dotenv import load_dotenv


load_dotenv()


FOUNDRY_PROJECT_ENDPOINT = os.getenv("FOUNDRY_PROJECT_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


if not FOUNDRY_PROJECT_ENDPOINT:
    raise RuntimeError("FOUNDRY_PROJECT_ENDPOINT is not configured.")

if not AZURE_OPENAI_DEPLOYMENT:
    raise RuntimeError("AZURE_OPENAI_DEPLOYMENT is not configured.")