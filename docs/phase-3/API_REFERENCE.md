# Completion Pass 1 API reference

All incident/run/workflow/remediation endpoints require configured bearer authentication or a valid cookie session. Cookie mutations require `X-CSRF-Token`. JSON errors preserve meaningful 400 validation, 401 authentication, 403 permission, 404 absence and 409 stale/invalid-transition statuses. Error `code` is provided where implemented; not every legacy validation response has one.

| Method/path | Contract |
| --- | --- |
| POST `/api/session` | `{token}` plus allowed Origin; returns actor, role, csrf, expiresAt and HttpOnly cookie |
| GET `/api/session` | Restore authenticated session/CSRF; no-store |
| DELETE `/api/session` | CSRF-protected logout, revoke cookie, 204 |
| POST `/api/incidents` | Header `Idempotency-Key` (8–100 word/hyphen characters); `{title,description,service?,severity?,investigate?}`; 201 canonical full incident, or 202 with pending submission marker |
| GET `/api/incidents`, `/:id` | Complete incident fields plus canonical status/version/workflow/activeRun; lazy adoption and repair |
| PATCH `/api/incidents/:id/status` | Legacy arbitrary status edits rejected; reopening requires current version/notes |
| POST `/api/analysis` | Compatibility entry returns durable accepted work (202), no synchronous independent lifecycle |
| POST `/api/investigations/incidents/:id` | Stable Idempotency-Key; queues/replays durable run, 202 |
| GET `/api/investigations?incidentId=...&page=1` | `{items,page,hasNext}`, 20 per page, max page 100 |
| GET `/api/investigations/:runId` | Sanitized run, persisted events/outputs; no lease owner or key |
| GET `/api/investigations/:runId/events?after=...` | Authenticated SSE cursor replay (also accepts Last-Event-ID); bounded connections; terminal closure |
| POST `/api/investigations/:runId/cancel` | Fence persistence and reconcile cancellation; 409 if terminal |
| GET `/api/incidents/:id/workflow` | Canonical workflow including version/history |
| POST `/api/incidents/:id/workflow` | `{version,action,notes,...actionFields}`; CAS update; reinvestigation uses stable requestKey and CAS-backed submission |
| POST `/api/remediation` | Idempotency-Key; `{incidentId,runId,title,action,rationale,validationPlan,target,risk,owner?}`; accepted current review required; 201 linked draft |
| GET `/api/remediation?incidentId=...&page=1` | 20 proposals/page with hasNext; max page 100 |
| PATCH `/api/remediation/:id` | `{version,...editableFields}`; pending/rejected only; owner/title/action/rationale/validationPlan/target/risk; resets pending |
| POST `/api/remediation/:id/review` | Approver/admin; `{version,decision:'approved'|'rejected',comment}`; current accepted linkage enforced for approval |
| POST `/api/remediation/:id/execute` | Always 403 EXECUTION_DISABLED |
| POST `/api/incidents/:id/workflow/report/index` | Resolved + approved latest report; returns documentId/reportId/local_lexical method |

Workflow action fields (all require human notes): `review` → runId, decision accepted/rejected, evidence; `start-remediation` → proposalId; `record-change` → proposalId, performedBy, performedAt, reference (notes describe actual change); `verify` → result passed/failed/inconclusive, criteria, evidence; `return-remediation`; `resolve` → outstandingRisks; `reopen`; `reinvestigate` → requestKey; `draft-report` → content; `approve-report` → approver/admin. `plan-proposal` is internal and rejected by this public route.

Evidence is an array of 1–20 `{source,reference,observation}` items. References use HTTP(S) without credential parameters/userinfo. Manual time must be valid and not future. Strict bounded inputs are validated/redacted. Idempotent incident keys bind actor and original content; proposal keys bind actor/incident/content. Reinvestigation replay returns the existing run rather than submitting another. An active different run conflicts. Ordinary workflow updates and proposal edits/reviews require current versions.

Internal runtime POST `/analyse-stream` retains existing analysis input and emits actual NDJSON stage messages; `/analyse` remains compatible. These runtime endpoints are not a replacement for authenticated gateway incident submission.
