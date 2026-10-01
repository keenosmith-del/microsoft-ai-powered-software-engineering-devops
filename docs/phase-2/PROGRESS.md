# Phase 2 progress — 1 October 2026

This is a working additive foundation, not completion of the entire Phase 2 specification. No commits or remote GitHub changes were made. The change manifest below identifies the uncommitted implementation. Existing incident/action lifecycle routes and buttons are unchanged. Existing environment secrets were not edited or printed.

## Delivered capability and verification boundary

| Checkpoint | Delivered | Remaining |
|---|---|---|
| 0 Audit | Source/manifests/routes/models/agents/tools/frontend/Docker/docs inspected; baseline frontend build/lint; failing npm placeholder replaced; plan written | Broader architecture/dependency pinning audit |
| 1 Engineering | Consolidated/modular endpoints; cached bounded health; Mongo ping/counts/activity; runtime/GitHub/Azure checks; truthful Foundry Unknown; persisted worker heartbeat; live dashboard refresh/stale/errors | Safe supported deployment-level Foundry probe; wider frontend interaction tests |
| 2 Repository | Compatible snapshot now read directly through Node; branch/pagination; workflows, runs/jobs/failures, PR metadata, deployment records, commit detail/check-run routes; evidence links; partial/rate-limit states; frontend integration | Raw bounded/redacted logs, reviews/check suites/environments, richer diffs, evidence-triggered submission; investigation launch remains visibly disabled |
| 3 Azure | Scoped ARM inventory/resource-group routes, bounded Activity Log and UI drill-down/date windows; configured group enforcement | Accessible subscription selection, tags, Resource Graph, metrics, Application Insights/log queries, full continuation pagination; live Activity Log permissions test |
| 4 Observability | Persisted runs/events/duration/attempts/correlation/deployment/provenance; Agents history and outputs; static readiness claims removed | Actual per-agent stages/tool spans, distributions, provider usage/cost, OpenTelemetry/export |
| 5 Additive execution | Separate run model, indexes/idempotency, fenced Mongo leases, backoff/exhaustion, cancellation, authenticated history, SSE cursor replay and JSON fallback; worker opt-in; frontend polling | OS restart and multi-process contention tests, bounded stage events from FastAPI, repository triggers; worker disabled in current configuration |
| 6 Knowledge | Real text/Markdown sources, redaction, heading chunks/hash dedup, scoped local lexical retrieval, provenance, inspect/search/delete UI, grounding in additive runtime requests | Embeddings/vector retrieval/Azure AI Search, file parsers/repository ingestion, incremental source versions, advanced scoping/retention |
| 7 Remediation | Real proposal records tied to completed runs, preview/rationale/risk/validation fields; authorized optimistic review; atomic audit history; Actions workspace | Role-separated identity, per-resource/repo permission checks, authorized draft patch/PR path; remote execution intentionally disabled |
| 8 Migration | Actual legacy lifecycle regression tests pass; no status/button migration enabled | Implement and test requested full target lifecycle behind rollback flag before activation |
| 9 Hardening/delivery | Request IDs, sanitized new errors, bearer boundary, operations/SSE limits, CORS allowlist, Fetch deadlines, deterministic CI and audits, optional local Mongo Compose, API/ADR docs | Multi-user auth, protect legacy writes, evidence retention, read-route throttling, IaC/production deployment, browser/E2E suite, formal measured model evaluation |

## Verification results

- Baseline: npm test failed by design (placeholder); frontend TypeScript/Vite build and oxlint passed. System Python had no pytest/runtime packages selected.
- Final deterministic Node suite: 28 passed, zero failed, one opt-in Mongo test skipped in the default command. HTTP tests require loopback binding; the desktop sandbox required escalation.
- Separately enabled isolated Mongo integration: one passed. Uses a uniquely named temporary database on configured MongoDB, then removes only that database. Verified concurrent same-key submission, unique indexes, expired lease recovery, complete persisted outputs, unchanged incident status, real local retrieval/provenance, proposal approval/version conflict/audit, cancellation and non-execution of cancelled jobs. External model response is a labeled test fixture.
- Initial isolated test database name exceeded Atlas's 38-byte limit before test records were created. Shortened to p2v_<uuid>, made cleanup disconnect in finally, then passed.
- Python: configuration (1), evidence context (2), runtime contract (4) tests passed. Runtime tests use deterministic agent/provider mocks; no model quality scores are claimed. Prompt-injection checks verify provenance and system instructions, not proven model resistance.
- Frontend TypeScript/Vite build and oxlint passed after integration; git diff --check passed. No browser visual/E2E verification yet.
- npm audit: zero backend vulnerabilities, zero frontend vulnerabilities.
- Docker Compose merged configuration validates. Images/containers were not built or started.
- Project-local Python virtual environment installed/confirmed runtime requirements. FastAPI import and actual Uvicorn startup passed on port 8000; actual gateway startup passed on port 5050 with new schema indexes. Temporary API/runtime processes started for verification, with worker disabled, then stopped after the checks.
- Read-only live checks: MongoDB connectivity and persisted incident counts passed; actual API /health and FastAPI /health passed; Python /platform provided real Azure inventory/token authentication. Foundry remains Unknown because deployment/inference is unverified.
- Real GitHub snapshot returned 9 commits on main. Actions workflows/runs, pull requests and deployment reads succeeded with empty histories; no history was fabricated. Real Node Azure inventory returned 10 resources, untruncated. These are observations during this session, not hardcoded UI counts.
- Live Foundry inference, model quality, Azure Activity Log, remote remediation and deployment have not been verified. No paid model inference or Azure provisioning was performed.

## Authorization and startup prerequisites

Configure OPERATIONS_API_TOKEN (random, at least 32 characters) and OPERATIONS_REVIEWER_ID to access new run/knowledge/proposal workspaces. Their absence produces AUTH_NOT_CONFIGURED and no write. Set INVESTIGATION_WORKER_ENABLED=true only when ready to execute actual model-backed investigations, which may incur provider usage. CORS_ORIGINS is explicit in production. Use localhost/HTTPS. Legacy write routes remain unauthenticated for compatibility and must not be exposed publicly.

See [API and setup](API.md), [decisions and limitations](ADRs.md), and [implementation plan](IMPLEMENTATION_PLAN.md).

## Change manifest

- Gateway composition/startup: src/app.js; npm test script in package.json; environment examples; compose.local.yaml.
- New middleware: authorization.js, operationsLimit.js.
- New Mongoose records: InvestigationRun.js, WorkerState.js, KnowledgeDocument.js, RemediationProposal.js. Existing Incident.js is unchanged.
- New routes: engineering.js, azure.js, investigations.js, incidentInvestigations.js, knowledge.js, remediation.js; repository.js expanded while retaining snapshot fields.
- New services: engineering.js, githubIntelligence.js, azureDiagnostics.js, investigationWorker.js, knowledge.js, redaction.js.
- Frontend: typed api.ts contracts/deadlines; Engineering.tsx and Repository.tsx enhanced; additive ExecutionConsole, AzureDiagnostics, ProposalWorkspace, Knowledge components; existing Agents/Azure/Actions pages composed with them; Sidebar/App new Knowledge view; scoped styles in index.css.
- Python: bounded optional retrieved_evidence in main.py; evidence_context.py; system instruction in foundry_client.py; evidence/runtime contract tests. Specialist agent implementations and existing sequence remain.
- Tests: engineering, github, azure, worker, knowledge, lifecycle, security and isolated Mongo persistence files under tests/.
- Delivery: .github/workflows/ci.yml; read-only verification scripts; docs/phase-2 plan/API/ADRs/progress; README additive link.

## Exact next actions

1. Add actual FastAPI per-agent/tool events, timing and provider usage without inferring missing measurements; persist them into runs and render them in Agents.
2. Test two competing Mongo workers, process restart, cancellation during provider execution, temporary Mongo outage and lease loss; establish retention and terminal-event consistency.
3. Implement typed GitHub workflow/commit evidence triggers with backend revalidation; only then enable repository investigation launch.
4. Add redacted bounded workflow-log retrieval, PR reviews and check/deployment correlations; verify Azure Activity Log and add scoped metrics/App Insights setup.
5. Implement optional embeddings/Azure AI Search through a tested retrieval abstraction and richer ingestion/source versioning.
6. Introduce proper multi-user identity and roles, protect legacy writes through a compatibility migration, and add browser/component contract/E2E tests.
7. Write all exact requested incident lifecycle tests, implement the flag-controlled migration, validate complete incident responses, and retain the legacy rollback path. Current regression tests alone do not authorize claiming this migration complete.
8. Add measured evaluation scenarios, IaC and production deployment documentation; do not provision cloud resources or enable remote writes without authorization.
