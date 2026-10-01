# AI-Powered Software Engineering & DevOps Operations Platform

> **Technical executive summary** — an active engineering project exploring how evidence-grounded AI agents can support software incident investigation and engineering response across Microsoft Azure, Microsoft Foundry, and GitHub.

## Executive summary

This repository contains a working full-stack prototype for an AI-assisted engineering operations control plane. An engineer submits a problem with a severity; the platform persists it as an incident, runs three specialist AI stages, and presents the analysis, repository investigation, and proposed engineering action in a web console. The workflow is designed around evidence, bounded tool access, explicit action-state transitions, and human review.

The current execution path connects a React/TypeScript frontend to a Node.js/Express REST API, which delegates analysis to a separate Python/FastAPI runtime. The runtime calls Microsoft Foundry through its OpenAI-compatible chat completions endpoint, gathers read-only repository evidence using the GitHub REST API, and can inspect Azure Resource Manager resources using the caller's Azure identity. MongoDB stores incidents and their generated outputs.

This is a prototype, not yet an autonomous production remediation system. The code can recommend an engineering action and track its review status; it does not edit source code, create pull requests, run CI/CD, or deploy changes. The additive Phase 2 foundation now includes local lexical retrieval and persisted investigation runs/reviews. Vector search, Azure AI Search, detailed telemetry correlation, formal model evaluation and production deployment automation remain future direction; see the Phase 2 verification report below.

## System at a glance

```text
Engineer
   │
   ▼
React 19 + TypeScript + Vite  ── REST/JSON ──►  Express 5 API (Node.js 22)
                                                   │            │
                                      MongoDB/Mongoose            └── HTTP /analyse
                                                                    ▼
                                                        FastAPI agent runtime
                                                         │       │        │
                                          Foundry chat ───┘       │        └── Azure Resource Manager
                                                                  └── GitHub REST API
```

### Current investigation sequence

1. **Software Engineering Agent** produces a structured analysis: problem, likely root cause, approach, implementation steps, risks, and validation. It is instructed not to invent unavailable evidence.
2. **Incident Investigation Agent** obtains a repository snapshot, recent commits and relevant diffs, and—when configured—Azure resource context. It asks Foundry to distinguish confirmed facts, repository evidence, hypotheses, missing evidence, and confidence.
3. **Engineering Action Agent** converts that investigation into one concrete proposed action, with evidence, files to inspect, the change, validation, remaining evidence, and confidence.
4. The Express API saves the outputs against the incident. The UI exposes incident and action status, including progression through review and verification states.

The three agents are invoked sequentially by the runtime; the investigation output is passed to the action agent. This is application-level orchestration, not a fully autonomous planner or a Foundry-hosted multi-agent workflow.

## Implemented capabilities

- Submit engineering problems and assign Critical, High, Medium, or Low severity.
- Persist incidents, investigation outputs, errors, timestamps, and action state in MongoDB.
- List and retrieve incidents; retry a failed investigation; apply guarded incident status transitions.
- Run three prompt-specialised Foundry-backed analysis stages.
- Read GitHub repository metadata, branch details, recent commits, latest commit changes, file contents, source search results, and commit patches through the GitHub API.
- Use Azure `DefaultAzureCredential` for Microsoft Foundry token authentication and Azure management-plane resource inspection.
- Display API, Foundry/Azure configuration status, repository information, incidents, actions, and agent output in a React console.
- Run the API and agent runtime as separate Docker services with health checks and startup dependency ordering in Docker Compose.

## Architecture and technology layers

| Layer | Active implementation | Responsibility |
|---|---|---|
| Web UI | React 19, TypeScript 6, Vite 8, Lucide React | Overview, incident investigation, repository, agent, action, cloud status, and settings views; REST client in `frontend/src/services/api.ts` |
| API and persistence | Node.js 22, CommonJS, Express 5, Mongoose 9, MongoDB | REST routes, incident/action lifecycle rules, persistence, health endpoint, and delegation to the agent runtime |
| Agent service | Python 3.12, FastAPI, Pydantic, Uvicorn | HTTP service and sequential coordination of specialist agents and tools |
| Model access | Microsoft Foundry project endpoint, OpenAI Python SDK, OpenAI-compatible chat completions | Model-backed analysis using a configured deployment and Azure token provider |
| Source control evidence | GitHub REST API, `requests` in Python; Octokit is also a declared Node dependency | Read-only repository, branch, file, commit, and diff retrieval |
| Azure integration | Azure Identity, Azure Resource Manager SDKs for Cognitive Services and resources | Default credential-chain authentication and read-only Azure resource inspection |
| Local delivery | Docker, Docker Compose, npm, pip, Vite | Separate API/runtime containers, health checks, local frontend development/build |

### Active repository layout

- `frontend/` — React application, components, styles, and API client.
- `src/` — active Express API, route handlers, MongoDB model/configuration, and service adapters.
- `agent-runtime/` — active FastAPI app, Foundry client, specialist agents, Azure and GitHub tools, and focused test scripts.
- `docs/` — project overview, current runtime architecture, and the engineering rationale behind the project.
- `archive/prototypes/` — earlier TypeScript backend and duplicate Python agent experiments; not on the active startup path.
- Root `Dockerfile` and `agent-runtime/Dockerfile`, plus `compose.yaml` — container definitions and local orchestration.

## Integrations and configuration

Copy `.env.example` to `.env` and provide configuration for the services you want to connect:

- **MongoDB:** `MONGODB_URI` (required for the API to start and persist incidents).
- **Agent runtime:** `AGENT_RUNTIME_URL` (defaults to `http://127.0.0.1:8000` for local processes; Compose sets the service URL).
- **Microsoft Azure / Foundry:** `AZURE_SUBSCRIPTION_ID`, `FOUNDRY_PROJECT_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, and Azure identity settings as needed by `DefaultAzureCredential`.
- **GitHub:** `GITHUB_OWNER`, `GITHUB_REPOSITORY`, optional `GITHUB_TOKEN`, and `GITHUB_DEFAULT_BRANCH`. A token is needed for private repository access and helps avoid unauthenticated API limits.
- **Frontend:** optional `VITE_API_BASE_URL`, documented in `frontend/.env.example`.

The sample environment file also contains placeholders for Azure AI Search and an embedding deployment. Azure AI Search remains optional scaffolding. Pass 2 can generate genuine local embeddings through a separately installed Ollama model and retain vectors in MongoDB; unavailable configuration falls back explicitly to lexical retrieval.

### Run locally

Use three terminals from the repository root:

```bash
# Terminal 1: agent runtime
cd agent-runtime
uvicorn main:app --reload --port 8000

# Terminal 2: API (root .env must be configured)
npm install
npm run dev

# Terminal 3: frontend
cd frontend
npm install
npm run dev
```

The API listens on port `5050` by default; the agent runtime listens on `8000`. For containers, configure a MongoDB URI reachable from the API container, then run `docker compose up --build`. Compose publishes the API on port `5050`; the frontend remains a separately served development/build artifact.

Useful endpoints include:

- `GET /health` — API health.
- `GET /api/platform` — Azure/Foundry configuration and connection status reported by the runtime.
- `GET /api/repository` — GitHub repository snapshot.
- `POST /api/analyse` — create and run an incident investigation (`problem`, optional `severity`).
- `GET /api/incidents` and `GET /api/actions` — saved incidents and derived action records.

## Skills demonstrated

The codebase and supporting documentation demonstrate practical work across:

- **Full-stack application design:** React/TypeScript UI, REST API, persistence, and integration boundaries.
- **Agentic AI engineering:** role-specific prompts, sequential agent orchestration, model-client integration, structured response contracts, and context passing between stages.
- **Evidence-grounded incident reasoning:** repository snapshots, commit relevance, actual diffs, uncertainty and missing-evidence reporting, and instructions against fabricated telemetry or causality.
- **Tool/API integration:** GitHub REST calls, Azure SDK usage, HTTP service-to-service communication, environment-driven configuration, and failure handling.
- **Cloud identity and resource awareness:** Azure `DefaultAzureCredential`, scoped token acquisition, and management-plane resource inventory.
- **Workflow and data modeling:** incident severity/status, action lifecycle transitions, persistence, retries, and constraints on resolving incidents before action verification.
- **Containerization and service operations:** Docker images, Compose service networking, health checks, and dependency readiness.
- **Technical communication and architecture evolution:** architecture/runtime documentation, explicit separation of active implementation from archived prototypes, and a documented target direction.

## Direction and current boundaries

The broader product direction is an engineering operations layer that can correlate code, CI/CD, deployments, operational telemetry, and engineering knowledge, then guide a proposed remediation through validation and human approval. Current code provides a foundation for investigation and recommendation, with repository and Azure resource evidence. The Azure adapters read bounded Activity Logs, resource-allowlisted Monitor metrics and fixed Application Insights/Log Analytics queries. GitHub reads workflow/job/deployment/commit evidence; separately configured writes require current approval and explicit reviewed diff confirmation and create draft PRs only. Azure DevOps pipelines and GitHub Actions are not executed by the application.

The following remain incomplete: Azure AI Search indexing/querying, autonomous patch generation, CI/CD/deployment control, broad distributed trace correlation, measured model-quality evaluation and enterprise multi-user governance. Local semantic retrieval, signals/evidence, Azure Monitor measured comparisons and a disabled-by-default reviewed draft-PR adapter are implemented; live verification prerequisites and remaining fault coverage are documented below. The additive Phase 2 code provides scoped local lexical retrieval, durable run history, read-only CI/CD intelligence and bearer-protected review records. Treat action status in the UI as workflow tracking for recommendations, not proof that an external engineering change was made or verified.

## Further reading

- [Current runtime architecture](docs/ARCHITECTURE.md)
- [Project overview and target workflow](docs/PROJECT_OVERVIEW.md)
- [Engineering rationale](docs/BUILDING_AN_AI_ENGINEERING_OPS_PLATFORM.md)
- [Archived prototypes](archive/README.md)

## Phase 2 additive implementation

Measured engineering health, GitHub workflow/deployment reads, scoped Azure inventory/activity, durable additive investigations, local lexical knowledge retrieval, and persisted remediation reviews are now available as an initial Phase 2 foundation. The original Phase 2 snapshot retained legacy lifecycle entry points; Completion Pass 1 now governs them centrally; the new worker is opt-in and remote remediation execution remains disabled. See [verification and remaining work](docs/phase-2/PROGRESS.md), [API/setup](docs/phase-2/API.md) and [architecture decisions](docs/phase-2/ADRs.md). This foundation does not implement every target Phase 2 capability.

## Phase 3 Completion Pass 1

The central incident journey now uses one authoritative IncidentWorkflow with a synchronized Incident.status projection: Open → Investigating → Awaiting review → Remediation planned → In remediation → Verifying → Resolved. Actual durable run events, accepted findings, linked/owned proposals, role-gated approval, externally performed manual changes, three verification outcomes, deliberate resolution and reasoned reopening persist together. Historical runs/reviews/reports remain available; approved reports support lexical learning.

Sign in through the global Operations access form. HttpOnly server sessions restore across navigation/refresh; `/incidents/:id` bookmarks and browser history work without browser bearer persistence. The development frontend proxies same-origin API requests to 5050. Enable the worker and configure engineer/approver credentials as described in [exact startup commands](docs/phase-3/DEPLOYMENT.md).

Backend, Python, frontend build/lint and real browser journey checks have been run; see [verification evidence](docs/phase-3/TEST_RESULTS.md) and [Pass 1 results](docs/phase-3/PASS_1_RESULTS.md). This focused pass does not complete all Phase 3. Remote execution, Entra SSO, semantic retrieval, richer telemetry correlation and production deployment remain deferred. See [progress](docs/phase-3/PROGRESS.md), [architecture and transitions](docs/phase-3/ARCHITECTURE.md), [API contracts](docs/phase-3/API_REFERENCE.md) and [security](docs/phase-3/SECURITY.md).

## Completion Pass 2 — evidence and operational integrations

Extends the existing canonical incident journey with signed/deduplicated GitHub and authenticated-relay Azure signals, bounded evidence and tool telemetry, allowlisted Azure diagnostics, retained measured verification, local genuine embedding/vector integration and reviewed operator-provided draft PRs. Default startup performs no GitHub writes, polling, automatic incident conversion or model download. Ports remain 5050/8000; use documented Node 24. No new dependencies.

Read [Pass 2 plan](docs/phase-3/PASS_2_PLAN.md), [results and remaining work](docs/phase-3/PASS_2_RESULTS.md), [configuration](docs/phase-3/DEPLOYMENT.md) and [contracts](docs/phase-3/API_REFERENCE.md). Configure a genuine local model separately; fixtures do not verify real embedding quality. See `.env.example` for empty/default-off settings. No private credentials were edited or published.
