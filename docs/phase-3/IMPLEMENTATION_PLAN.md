# Phase 3 implementation plan — 1 October 2026

## Architecture and baseline
React 19/TypeScript/Vite frontend → Express 5/Mongoose API (5050) → FastAPI specialist runtime (8000). MongoDB holds legacy incidents, separate durable InvestigationRun records, worker heartbeats, lexical KnowledgeDocument chunks and RemediationProposal approvals. Existing worker uses fenced leases, bounded retries and persisted SSE events. GitHub and Azure adapters are read-only. No repository instructions were found. Initial working tree was clean.

Baseline Node: 28 passed, one opt-in Mongo test skipped after allowing loopback binding. Default frontend build selected Node 20.12.1 and failed importing Rolldown; TypeScript completed. Use installed Node 24 explicitly for verification. These results do not verify live cloud execution.

## Defects and incomplete capabilities
Legacy mutation routes lack authorization and incident POST accepts arbitrary model fields. Overview uses synchronous legacy analysis and simulates agent state. Durable runs do not update incident lifecycle and have no individual agent events. Review of findings, manual execution, measured verification, resolution records, reports, signals, command palette and durable URL workspace are missing. Existing lexical retrieval is genuine but no semantic backend exists. Approval uses one shared identity, not role-separated Entra. Remote writes remain disabled. Azure lacks metrics/App Insights. Browser tests, Docker image validation and production deployment remain unverified.

## Design contract
Preserve black/charcoal/off-white, editorial whitespace and system fonts. Establish pill buttons, 14px inputs, 18px popovers and 24px dialogs. Use visible focus, reduced motion and responsive text. Avoid new borders, card grids, silver, fake charts or invented topology states. Existing borders are technical debt to remove incrementally.

## Checkpoints
0. Inventory source, routes, agents, adapters, models, styles, tests, CI and deployment; establish baselines and design tokens. Detailed full-source review remains in progress; source inventory alone is not verification.
1. Harden input and authorization boundaries; preserve explicitly isolated local compatibility.
2. Integrate per-agent durable execution events and existing incident UI; test leases and cancellation.
3. Add independent versioned incident workflow, persisted human reviews and evidence requirements without rewriting historical outputs. Introduce regression tests first.
4. Unified URL incident workspace with refresh, back navigation and history.
5. Approved proposal linkage, ownership, manual change records; authorized reviewed patch/draft PR adapter.
6. Persist evidence-based verification, deliberate resolution/reopening and approved report ingestion.
7. Deduplicated scoped GitHub/Azure signal ingestion and investigation triggers.
8. Complete operational pages and real cross-page navigation.
9. Agent topology, command palette and responsive editorial refinements.
10. Role-separated Entra identity, security/retention, deterministic full E2E/visual suite, Docker/CI and release documentation.

## Database and security
Use additive workflow fields with optimistic version checks and append-only audit. No destructive migration. Retain legacy fields and all runs/proposals. Human-reviewed evidence must reference source/run/change records. Backend validates transitions, approved proposals and successful verification. No arbitrary model commands or automatic merge/deployment. Local compatibility must be explicitly configured and rejected in production; shared-token mode is not multi-user auth.

## Test strategy and prerequisites
Preserve legacy HTTP regressions. Add deterministic workflow transition and authorization tests before incident changes; mocked external fixtures stay in tests. Exercise Mongo concurrency separately using an isolated database. Run Node, Python contracts, frontend TypeScript/build/lint and diff checks. Add browser navigation, refresh, failed/inconclusive verification and viewport tests before release. Live Foundry/Azure/GitHub need scoped credentials and configured deployments; unavailable states must remain honest. No cloud provisioning is authorized by implementation work.
