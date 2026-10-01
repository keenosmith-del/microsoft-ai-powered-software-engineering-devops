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

## Pass 2 additive endpoints

Protected mutations use existing role/session/CSRF checks and operations limits. Exceptions are independently authenticated provider delivery routes, which never trust payload source claims alone.

| Method/path | Contract |
| --- | --- |
| POST `/api/signals/github` | Raw JSON ≤256 KiB, X-Hub-Signature-256 HMAC-SHA256, X-GitHub-Delivery, X-GitHub-Event; configured repository; supported completed workflow failures/deployment failure statuses; 202 signal or ignored |
| POST `/api/signals/azure` | Common alert schema ≤64 KiB; Authorization bearer equal to configured dedicated relay token, exact allowlisted target resource; 202 Fired signal or ignored |
| GET `/api/signals?page=1` | Authenticated latest 20, page ≤100, hasNext |
| POST `/api/signals/github/runs/:id` | Retrieve actual provider run and capture supported completed failure |
| POST `/api/signals/github/poll` | Bounded authenticated one-shot fallback; at most ten recent failures from first page |
| POST `/api/signals/:signalId/incident` | `{incidentId?,investigate?:boolean}`; stable creation/association; optional durable investigation |
| GET `/api/evidence/incidents/:id?runId=...` | Retained incident/run provenance/content, latest 100, explicit truncated flag |
| GET `/api/repository/jobs/:id/logs` | Authenticated bounded/redacted excerpt, truncation, retrieval timestamp; no signed URL exposed |
| GET `/api/repository/deployments/:id/details?page=1` | Deployment status page with hasNext |
| GET `/api/repository/pulls/:id/details?page=1` | PR files/bounded patches with hasNext |
| GET `/api/azure/metric-definitions?resourceId=...` | Authenticated exact allowlisted ARM resource definitions, supported units/aggregations |
| POST `/api/azure/metrics` | `{resourceId,metric,aggregation,start,end}`; maximum 24 hours, five-minute grain, one series; multiple dimensions become truncated/inconclusive |
| POST `/api/azure/query` | `{provider:'application-insights'|'log-analytics',template,start,end}`; configured app/workspace only; fixed requests/exceptions/dependencies or diagnostics/events, ≤100 rows |
| GET/POST `/api/verification/incidents/:id` | GET latest 100 measurements; POST `{resourceId,metric,aggregation,baselineWindow:{start,end},comparisonWindow:{start,end},rule:{type:'maximum'|'minimum'|'reduction-percent',threshold:number}}`; actual current change required, 201 retained measured outcome |
| POST `/api/knowledge/:id/reindex` | Current workspace; regenerate configured genuine local vectors; status indexed/unavailable/not-configured |
| GET `/api/github-changes/proposals/:id` | Config flag and latest 20 intents, diff/audit/actual PR reference |
| POST `/api/github-changes/proposals/:id/prepare` | Idempotency-Key; `{baseBranch,changes:[{path,content}]}`; approved proposal/current review, 1–5 allowed existing text files, ≤32 KiB changes; actual source diff/hash |
| POST `/api/github-changes/:intentId/confirm` | `{confirm:true,hash}` from preparing engineer; policy/current approval/base rechecked; dedicated branch, approved commit and draft PR only; retry returns existing PR |

Knowledge search reports local_semantic/model/dimension when a compatible real index exists; otherwise local_lexical and explicit fallbackReason. Source metadata contains embeddingStatus/model/dimension/provider. GitHub commit details add bounded redacted patch/null and truncation per file. Run responses add operationalEvidenceIds and actual toolActivity (including deployment/token counts when supplied). No browser-supplied URLs, KQL or commands are fetched/executed.

GET `/api/github-changes/:intentId/status` refreshes recorded PR metadata/reviews and its exact commit check runs with independent unavailable states. Historical intents must match the configured read repository; the call performs no write.
