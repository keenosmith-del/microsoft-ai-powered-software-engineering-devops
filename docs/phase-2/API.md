# Phase 2 API and local setup

The gateway remains on 5050 and FastAPI on 8000. Existing incident routes and action buttons are unchanged. New routes return sanitized errors with request IDs (X-Request-ID and error requestId). New authorized endpoints use a development single-operator bearer-token boundary, not multi-user RBAC. Production requires a proper identity/access-control design before exposure.

## Startup

From repository root:

```sh
python3 -m venv agent-runtime/.venv
agent-runtime/.venv/bin/python -m pip install -r agent-runtime/requirements.txt
agent-runtime/.venv/bin/python -m uvicorn main:app --app-dir agent-runtime --host 127.0.0.1 --port 8000
# Separate terminal:
npm ci
npm run dev
# Separate terminal:
npm ci --prefix frontend
npm --prefix frontend run dev
```

Use the existing .env configuration; do not replace it. The checked-in .env.example documents additional settings. Configure a random OPERATIONS_API_TOKEN of at least 32 characters and OPERATIONS_REVIEWER_ID before accessing run history, knowledge or remediation. Paste the token into the relevant workspace; the UI holds it only in component memory. Use localhost or HTTPS. Set CORS_ORIGINS to the exact deployed frontend origin in production. Existing legacy incident/action endpoints remain unauthenticated for compatibility; do not expose the gateway publicly.

INVESTIGATION_WORKER_ENABLED defaults to false. Set true to enable one concurrent job per gateway process. Multiple processes use MongoDB leases. Retries may repeat a provider inference after a lost connection or crash; the system does not guarantee exactly-once billing. No paid inference is performed by health probes. New schema indexes are initialized before the gateway starts, requiring MongoDB index permissions.

For fully local MongoDB:

```sh
docker compose -f compose.yaml -f compose.local.yaml up --build
```

This uses a persistent named MongoDB volume, keeps API port 5050, and exposes the runtime on loopback 8000. The original compose.yaml continues using the configured external MongoDB. No Azure resources are provisioned. Frontend remains a separate Vite process.

## Read-only operational endpoints

- GET /api/engineering/overview: services, measured timings, counts, signals, activity, timestamps and cache metadata. Health probes cache 15 seconds and coalesce concurrent refreshes. Foundry token acquisition never means inference is operational.
- GET /api/engineering/health, /signals, /activity, /metrics: modular envelopes. Unavailable counts are null; dataset errors are explicit.
- GET /api/repository?branch=...&page=1: backward-compatible repository snapshot with branch selection, commits and change summaries. First 30 branches and 20 commits per page; maximum page 100.
- GET /api/repository/activity?branch=...&page=1: independent workflow/run/PR/deployment sections. Unavailable sections have null items plus an error; available empty lists mean no history returned. Branch filters workflow runs; PRs and deployments are repository-wide.
- GET /api/repository/runs/:id/jobs?page=1: bounded job and failed-step details.
- GET /api/repository/commits/:sha?page=1: changed-file evidence links and stats.
- GET /api/repository/checks/:sha?page=1: check-run conclusions.
- GET /api/azure/groups: scoped resource groups.
- GET /api/azure/inventory?group=...: configured subscription inventory, limited to configured AZURE_RESOURCE_GROUP when present. First 100 records, explicit truncation; no arbitrary nextLink URLs accepted.
- GET /api/azure/activity?group=...&hours=24: projected Azure Activity Log, bounded to 1–168 hours and first page. Resource drill-down filters returned events in the UI; it does not claim to retrieve every event in a large subscription.

GitHub uses native Fetch, REST API version 2022-11-28, 6-second request deadlines, at most three active upstream requests, a bounded 15-second cache, pagination and rate-limit metadata. Fine-grained credentials need repository Contents, Metadata, Actions, Pull requests, Checks and Deployments read access for corresponding features. Missing permissions surface independently. Raw workflow logs, PR reviews, check suites and environments are not yet retrieved. No new endpoint mutates GitHub.

Azure uses the existing official Azure Identity SDK, DefaultAzureCredential and read-only ARM REST. Reader is needed for inventory; Monitoring Reader permits diagnostic reads. Some tenants require additional scope-specific assignments. Credential acquisition and requests share a 10-second abort deadline. Resource groups outside configured scope are rejected. Azure Monitor metrics and Application Insights queries are not implemented. References: [GitHub workflow runs](https://docs.github.com/en/rest/actions/workflow-runs), [Azure Activity Log](https://learn.microsoft.com/en-us/rest/api/monitor/activity-logs/list?view=rest-monitor-2015-04-01).

## Authorized additive investigations

All calls below require Authorization: Bearer <operations-token>. Submission and cancellation fail closed without configured authorization. Operations routes enforce 120 requests per minute per configured operator and a bound on concurrent SSE connections.

- POST /api/incidents/:id/investigations: optional body {"triggerSource":"manual"}; Idempotency-Key required (8–100 alphanumeric/underscore/hyphen characters). Returns 202 with the same run for repeated keys on the same incident. Alternative submission path: /api/investigations/incidents/:id.
- GET /api/incidents/:id/investigations: newest 20 historical runs, hasNext.
- GET /api/investigations?page=1&incidentId=...: paginated history.
- GET /api/investigations/:runId: full sanitized run, outputs, persisted events and evidence references.
- POST /api/investigations/:runId/cancel: terminal cancellation guarded by current queued/running state.
- GET /api/investigations/:runId/events: authenticated SSE, Last-Event-ID replay, heartbeat and terminal close. Use Fetch streams for Authorization headers. EventSource cannot send these headers.
- GET /api/investigations/:runId/events?format=json&after=2: polling fallback with identical persisted IDs. Frontend console polls run history every five seconds.

Worker claims Mongo state atomically, renews a 60-second lease every 15 seconds and retries at most three attempts with 10/20-second backoff. Expired exhausted leases become failed. Each runtime request has a five-minute deadline. Ownership and attempt checks prevent a stale worker overwriting cancellation or a recovered attempt. Cancellation prevents output persistence; it cannot guarantee termination of already submitted Foundry inference. Submission does not modify incident status or overwrite legacy outputs. No incident lifecycle migration is enabled.

## Engineering knowledge

- GET /api/knowledge?page=1: indexed source metadata for the server-configured workspace.
- POST /api/knowledge: {title,text,sourceUrl?}; text/Markdown only, bounded input, secret redaction, heading chunking and content-hash deduplication. HTTPS provenance URLs are stored, never fetched. Credential-bearing URLs are rejected.
- GET /api/knowledge/search?q=...: deterministic local lexical overlap, up to five passages with document ID, section, chunk, indexed timestamp and source URL. Latest 100 documents examined; explicit truncation. Score is lexical overlap, not confidence or an AI evaluation score.
- DELETE /api/knowledge/:id: authorized removal in current workspace.

Edited content creates a distinct source; identical content updates metadata. Reingestion indexes immediately. No asynchronous ingestion queue, file/PDF parser, embeddings, vector search or Azure AI Search implementation exists yet. Retrieval failure is persisted as unavailable in a run, not misrepresented as successful empty retrieval. Only additive runs send retrieved evidence to the runtime. Foundry receives a system instruction declaring all evidence untrusted; this is a mitigation, not proof of injection resistance.

## Remediation proposals

- GET /api/remediation?page=1: persisted proposals and audit history.
- POST /api/remediation: incidentId, completed runId, title, action, rationale, validationPlan, target, risk (low/medium/high). Run must belong to the incident and be completed.
- POST /api/remediation/:id/review: {decision:"approved"|"rejected",version,comment}. Pending status plus version matched atomically. Reviewer identity comes from backend authorization configuration. Review and audit entry persist in the same update.
- POST /api/remediation/:id/execute: always 403 EXECUTION_DISABLED, including for approved proposals.

Approvals track review only. There is no automatic patch execution, PR creation, merge, deployment, arbitrary shell execution or Azure mutation. The current UI shows previews; no remote dry-run execution is available.
