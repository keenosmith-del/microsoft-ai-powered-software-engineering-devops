# Local startup and deployment boundary

Use a supported Node runtime (22.12+ or supported 24), MongoDB and the Python requirements in agent-runtime/requirements.txt. Existing API/runtime ports remain 5050/8000. Copy environment examples and configure actual credentials; existing user .env was not modified.

Configure OPERATIONS_API_TOKEN and OPERATIONS_REVIEWER_ID, then connect the token through Settings and incident workspace. For isolated legacy local development only, OPERATIONS_LOCAL_MODE=true permits legacy reads/writes outside production. It does not bypass new workflow/run/knowledge/proposal authorization. Set INVESTIGATION_WORKER_ENABLED=true to execute real model-backed runs and retry pending outbox delivery. This may incur configured provider usage; leave false until prepared.

Start runtime with uvicorn main:app --port 8000 from agent-runtime; start API with npm start from root; start frontend with npm run dev from frontend. Ensure the npm script shell selects the same supported Node runtime as your terminal. Existing compose.yaml and optional compose.local.yaml are retained. No container image or actual Compose startup was verified during this checkpoint.

External prerequisites: real MongoDB URI/index permissions; configured Foundry project endpoint and model deployment with Azure identity/token access; GitHub owner/repository/branch and read token for private evidence; Azure subscription/resource group and read permissions for inventory/activity. Azure metrics/App Insights and semantic cloud retrieval adapters are not yet implemented. GitHub PR writes are disabled. No paid services were provisioned.

Entra integration and role mapping are unfinished; do not expose this checkpoint as a production multi-user platform. Existing GitHub Actions run Node tests, frontend lint/build, Python contracts and dependency checks. New Node tests are included by tests/*.test.js; Mongo test remains opt-in in CI. Docker build, integration database service, browser E2E/visual jobs and production IaC still need implementation.
