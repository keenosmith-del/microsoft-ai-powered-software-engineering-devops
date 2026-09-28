# Current architecture

This document describes the code that currently runs, rather than the broader target architecture in the project overview.

## Runtime boundaries

```text
Browser (frontend/)
  └── REST requests ──> Node API (src/)
                           ├── MongoDB (Incident model)
                           ├── GitHub and Azure integrations
                           └── HTTP request ──> Python agent runtime (agent-runtime/)
                                                   └── Microsoft Foundry
```

### Frontend

`frontend/` is a React and TypeScript application built with Vite. UI pages live under `frontend/src/components/`, and `frontend/src/services/api.ts` owns requests to the Node API. Set `VITE_API_BASE_URL` in `frontend/.env` to point the UI at a different API host.

### Node API

The active API is the CommonJS Express application in the repository root. `src/app.js` mounts the routes, connects MongoDB, and delegates analysis to the Python runtime. Route handlers live in `src/routes/`, persistence schemas in `src/models/`, and external integration code in `src/services/` and `src/config/`.

Run it with `npm run dev` or `npm start`. It listens on port `5050` by default and expects `MONGODB_URI` plus the integration settings listed in `.env.example`.

### Python agent runtime

`agent-runtime/` is a separate FastAPI process. The Node API calls its `/analyse` endpoint; the runtime coordinates the engineering, investigation, and action agents in `agent-runtime/agents/` and their tools in `agent-runtime/tools/`.

Run it from `agent-runtime/` with `uvicorn main:app --reload --port 8000`. Configure `AGENT_RUNTIME_URL` for the Node API when the runtime is not at its local default.

## Duplicate or inactive implementation areas

Earlier implementations are kept under `archive/prototypes/`: a TypeScript backend and a duplicate root Python agents package. Current application imports and startup commands do not use them; the active Node API is root `src/`, and the active agents are under `agent-runtime/`.

Local development requires the Node API and Python runtime as separate processes. `compose.yaml` provides a two-service container setup and waits for the agent runtime health check before starting the API. Set `MONGODB_URI` in the root `.env` to a database that is reachable from the API container before running `docker compose up --build`.

## Intended ownership

- `frontend/`: UI and browser-side API client
- `src/`: active Node API and persistence
- `agent-runtime/`: active Python agents and tools
- `docs/`: implementation and project documentation

New feature code should be added to these active areas unless the runtime boundary itself is intentionally changing.
