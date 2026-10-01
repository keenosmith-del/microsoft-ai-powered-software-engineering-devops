# Phase 2 implementation plan

## Audit and baseline (2026-10-01)
Clean working tree at entry. No applicable AGENTS.md found. Active gateway is CommonJS Express 5, not TypeScript; preserve it. React/TypeScript/Vite frontend builds and oxlint passes. Root npm test is a failing placeholder. Python pytest is unavailable; configuration unittest can run without external SDKs. Most other Python test scripts invoke real external services and are not safe deterministic CI tests.

Verified source capabilities: Incident persistence; synchronous three-agent /analyse; failed retry; guarded resolution and action verification; read-only Python GitHub metadata/commits/diffs; Azure resource inventory; Foundry inference adapter. No durable execution, RAG, remediation approval records, authentication, evaluation harness, telemetry history, IaC or CI workflow. Compose provides API/runtime only and requires external MongoDB. Foundry platform readiness currently means token authentication, not deployment connectivity. Agents page has static readiness claims. Existing lifecycle differs from requested migration; do not change it before regression and migration tests.

## Ordered checkpoints and file-level changes
0. This plan; docs/phase-2/PROGRESS.md; tests using node:test. Separate app import from startup in src/app.js to permit actual HTTP route tests.
1. src/services/engineering.js and src/routes/engineering.js: bounded cached dependency probes, Mongo ping/count/activity, truthful Foundry status. frontend/src/services/api.ts typed contract and Engineering.tsx integration preserving CSS. No model inference health probe or paid provisioning.
2. Expand src/routes/repository.js and GitHub adapter with branches, workflows/jobs/checks/deployments, bounded logs and evidence context. Keep existing snapshot contract. Wire Repository.tsx selection and partial failures.
3. Expand runtime Azure SDK adapter, scoped inventory and diagnostics; wire Azure-Foundry component. Verify SDK versions before adding APIs.
4. Persist real execution telemetry separately; wire Agents.tsx; optional OpenTelemetry export.
5. New InvestigationRun model, leased Mongo worker, idempotent authenticated submission/cancellation, SSE/replay and polling. Integration tests for lease/recovery and cancellation before activation.
6. Scoped knowledge documents/chunks, local lexical retrieval first with explicit method metadata; embeddings/provider abstraction and optional Azure AI Search. Wire provenance UI; injection regression tests.
7. Persist proposals, approvals and audit records; authenticated versioned transitions. Remote PR creation remains disabled until approved and scoped credentials exist.
8. Feature flag migration with exact requested lifecycle tests, full incident response regression and rollback instructions. Preserve legacy default until tests pass.
9. Shared errors/IDs/redaction, auth/CORS/rate limits, frontend integration, CI, retention, Compose startup and deployment ADRs.

## Risks and dependencies
Existing incident and action transitions are coupled. Current agent request is unbounded and synchronous. Database tests require reachable MongoDB; cloud verification requires configured identities and read roles. Do not read or publish secret .env values. New dangerous writes must fail closed without backend auth. Avoid claiming cached or configuration-only responses prove connectivity. No additional packages needed for checkpoint 1 (native fetch, node:test, Mongoose).

## Validation
npm test; npm --prefix frontend run build; npm --prefix frontend run lint; python3 -m unittest discover -s agent-runtime -p test_configuration_contract.py. Use mocked deterministic dependency probes and real HTTP gateway tests without listening to configured production ports. Later checkpoints require Mongo-backed integration tests and deterministic Python service mocks. Record external prerequisites separately from code verification.
