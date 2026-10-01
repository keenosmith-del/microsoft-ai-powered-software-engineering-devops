# Phase 3 API increment

All new workflow routes require Authorization: Bearer <OPERATIONS_API_TOKEN> and configured OPERATIONS_REVIEWER_ID. Responses include request correlation IDs on errors. Existing Phase 2 endpoints remain documented in ../phase-2/API.md.

| Method | Endpoint | Behavior |
|---|---|---|
| GET | /api/incidents/:id/workflow | Read independent workflow; initial state returned without creating a document |
| POST | /api/incidents/:id/workflow | Versioned human decision and append-only audit |
| POST | /api/incidents/:id/workflow/report/index | Index latest approved report for resolved workflow; repeated calls return same document |
| POST | /api/incidents | Create manual incident using title, description, optional service and severity; starts Open |
| POST | /api/incidents/:id/investigations | Existing idempotent durable submission; requires Idempotency-Key |

Workflow POST requires integer version and nonempty notes (maximum 4000 characters). Unknown top-level fields are rejected. Invalid transitions or stale versions return 409. Malformed incident/proposal IDs return 400. Missing incident returns 404.

Actions and additional fields:
- review: runId for a completed incident run, decision accepted/rejected, evidence.
- record-change: proposalId for an approved proposal tied to accepted findings, reference URL. This records external work; it does not perform it.
- verify: result passed/failed/inconclusive, criteria and evidence.
- resolve: outstandingRisks, with passed verification for current recorded change.
- reopen: notes, from resolved only.
- reinvestigate: notes; records durable pending request and queues a run. A delivery failure returns 202 with submissionStatus=pending; worker recovery retries delivery.
- draft-report: content (maximum 50000 characters), from resolved only; saves a new report draft snapshot.
- approve-report: notes, from resolved only; approves latest draft.

Evidence is an array of 1–20 objects containing source, reference and observation. Source maximum 100 characters, reference maximum 2000, observation maximum 4000. References must be HTTP(S), with no embedded credentials or common secret query keys. No URL is fetched by these manual-evidence endpoints.

Legacy incident/action reads and mutations now use an authorization boundary. Bypass requires OPERATIONS_LOCAL_MODE=true outside production. There is no production bypass.
