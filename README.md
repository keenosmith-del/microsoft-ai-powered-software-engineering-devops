# AI-Powered Software Engineering & DevOps Operations

A full-stack engineering operations application for investigating incidents with GitHub and Azure evidence, reviewing findings, approving remediation, recording external changes, and verifying recovery. Three sequential specialist agents use Microsoft Azure AI Foundry: Software Engineering, Incident Investigation, and Engineering Action.

## Architecture

React/TypeScript/Vite → Express on **5050** → MongoDB and read-only GitHub/Azure adapters. Express delegates durable investigations to the Python/FastAPI runtime on **8000**, which calls Foundry. Leased investigation runs, stage events, retained evidence, reviews, proposals, verification and audit history persist in MongoDB. The canonical incident workflow governs all lifecycle transitions.

## Features

- Overview with observed connection status, operational queues, signals and persisted agent topology.
- Incidents with search, severity/status filters, sorting, paged display, bookmarks, history, SSE updates and polling recovery.
- Evidence review with accepted/rejected findings, owned remediation proposals and separate approver authorization.
- External manual remediation records, passed/failed/inconclusive verification, explicit resolution and reasoned reopening.
- GitHub branches, commits, workflow jobs/logs, pull requests and deployments; failure signals can create or join incident investigations.
- Signed GitHub webhooks and authenticated Azure relay signals with deduplication and provenance.
- Azure inventory, scoped Activity Logs, allowlisted metrics and fixed diagnostic queries; measured comparisons support human verification.
- Text/Markdown knowledge ingestion, reindexing, deletion, source pagination, cited retrieval and genuine configured Ollama embeddings with explicit lexical fallback.
- HttpOnly cookie sessions, CSRF protection, refresh restoration, browser history and keyboard command search for pages, incidents and the configured repository.
- Draft GitHub PRs require separate write configuration, current approval, a reviewed actual diff and explicit operator confirmation. No automatic deployment or cloud remediation.

## Local requirements and setup

Use **Node 24**, Python 3.11+ and reachable MongoDB. The frontend toolchain does not support older Node 20 releases. Docker Compose offers an alternative local service arrangement; see [deployment instructions](docs/phase-3/DEPLOYMENT.md).

```bash
nvm use 24
npm ci
npm --prefix frontend ci
python3 -m venv agent-runtime/.venv
agent-runtime/.venv/bin/python -m pip install -r agent-runtime/requirements.txt
```

Create a private root `.env` from `.env.example`. Set `MONGODB_URI`, `OPERATIONS_API_TOKEN` (at least 32 characters), `OPERATIONS_REVIEWER_ID`, `OPERATIONS_ROLE=engineer`, distinct `OPERATIONS_APPROVER_TOKEN`/`OPERATIONS_APPROVER_ID`, and `INVESTIGATION_WORKER_ENABLED=true`. Keep `OPERATIONS_LOCAL_MODE=false`. Never commit secrets.

Run these in three terminals from the repository root:

```bash
# FastAPI
cd agent-runtime
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

```bash
# Express (MongoDB must be reachable)
npm run dev
```

```bash
# React
npm --prefix frontend run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. Sign in with the engineer credential; use the separate approver credential when approving. Keep `VITE_API_BASE_URL` empty for the same-origin development proxy. Session credentials stay out of localStorage.

## Optional provider configuration

- Foundry: `FOUNDRY_PROJECT_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, and an Azure identity supported by `DefaultAzureCredential`.
- GitHub: `GITHUB_OWNER`, `GITHUB_REPOSITORY`, `GITHUB_DEFAULT_BRANCH`, and `GITHUB_TOKEN` for private access or authenticated rate limits.
- Azure: `AZURE_SUBSCRIPTION_ID`; diagnostic access additionally needs exact `AZURE_DIAGNOSTIC_RESOURCE_IDS`, supported metric permissions, and configured Application Insights or Log Analytics IDs where used.
- Semantic knowledge: separately install an Ollama embedding model; set `KNOWLEDGE_EMBEDDING_URL`, `KNOWLEDGE_EMBEDDING_MODEL`, and matching `KNOWLEDGE_EMBEDDING_DIMENSION`. The app never downloads models. Missing embeddings retain lexical retrieval.
- Signals: set `GITHUB_WEBHOOK_SECRET` or `AZURE_ALERT_RELAY_TOKEN` for the respective ingress. Automatic conversion, investigation and polling are opt-in.
- Draft PRs: disabled by default. Separate credentials, exact repository/branch/path policy and current human approval are required. See [security](docs/phase-3/SECURITY.md).

Unavailable optional providers show unavailable/configuration states; absence of telemetry does not certify health. Foundry authentication status does not prove model inference.

## Testing

```bash
npm test
(cd agent-runtime && .venv/bin/python -m unittest discover -p 'test_*.py')
npm --prefix frontend run lint
npm --prefix frontend run build
npm run test:e2e
```

Browser tests start Express, Vite, temporary real MongoDB and a deterministic test-only runtime/provider host. They exercise lifecycle, review/approval, recovery, signal provenance, knowledge and responsive navigation. Install Playwright Chromium if Chrome is unavailable. The Mongo test harness uses `/opt/homebrew/bin/mongod` when installed, otherwise mongodb-memory-server's binary cache/download. These tests do not perform live provider writes or certify model quality.

## Deployment and limitations

Container service definitions are `compose.yaml` and `compose.local.yaml`. Production requires HTTPS, secure cookies, a same-origin API reverse proxy, SPA fallback for bookmarks, explicit CORS, durable MongoDB and the enabled worker. Production deployment was not performed.

Live Foundry inference and semantic quality require independently configured providers; deterministic tests validate contracts, persistence and user journeys. Azure AI Search, enterprise SSO and autonomous remediation are outside the implemented local workflow. Incident API lists are bounded to the latest 500 records; frontend sorting/pagination applies to that returned set. Provider APIs likewise return bounded samples.

See [final implementation results](docs/phase-3/FINAL_IMPLEMENTATION_RESULTS.md), [API contracts](docs/phase-3/API_REFERENCE.md), [architecture](docs/phase-3/ARCHITECTURE.md), and [test evidence](docs/phase-3/TEST_RESULTS.md). Earlier pass reports describe historical checkpoints.
