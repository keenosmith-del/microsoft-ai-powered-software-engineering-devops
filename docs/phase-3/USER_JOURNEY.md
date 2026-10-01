# Completion Pass 1 user journey

1. Start MongoDB, the API with the durable worker enabled, Python runtime and frontend as documented in DEPLOYMENT.md. Sign in with the configured engineer credential. Session restoration survives refresh; no browser bearer persistence is used.
2. Submit title, description and severity from Overview. A stable request key creates one incident and queues its first real investigation, including repeated clicks/retries. Open `/incidents/:id` to inspect canonical status and current run.
3. Follow actual specialist events and durations. Navigation or browser refresh leaves the leased worker running. Expand historical runs for full findings. Failure/cancellation returns to Open with preserved outcomes; request targeted reinvestigation with notes. Older run pages are available.
4. Select the current completed run, record an evidence URL and observation, and accept or reject findings. Reviewing does not run agents. Rejection prevents proposal planning; targeted investigation remains available.
5. Accepted findings enable an inline proposal with action, rationale, validation, target, risk and owner. Edit pending/rejected drafts; edits reset review to pending. Switch to the separately configured approver identity to approve/reject with a comment. Approval persists while the incident remains Remediation planned.
6. Begin manual remediation against the approved current proposal. Perform the actual change externally, then record what changed, performer, actual time and reference. The application performs no cloud/code writes. This transition enters Verifying.
7. Record criteria, evidence reference, observed result and Passed/Failed/Inconclusive. Failed returns to remediation; inconclusive remains verifying. Return to remediation or request new investigation when necessary. Every previous attempt remains visible.
8. A passing observation for the current change enables deliberate resolution, requiring resolution notes and outstanding risks (including an explicit statement when none remain). Failed/inconclusive results cannot resolve.
9. Draft a factual report manually, obtain approver approval, then index it into existing lexical knowledge. The indexed text includes incident/report/approver provenance. No automatic report content is invented.
10. Reopen with a reason, then request a new investigation. Prior output, reviews, proposal decisions, verification, resolution and reports remain historical; current review/proposal pointers reset.

The workspace supports recovery paths rather than a rigid wizard. Invalid actions are disabled or rejected by the backend. Conflicts refresh current state while keeping the error visible. Proposal/run pagination, chronological audit, explicit empty/loading/unavailable states and pending-action disabling are wired to persisted APIs. Incident/action legacy shortcut buttons open the workspace; status-only mutation cannot bypass governance.

Bookmarks restore after authentication. Browser back/forward and invalid incident IDs have automated coverage. Expired sessions require signing in again and do not reveal a protected incident. Approver identities can also perform engineering actions; this pass does not implement organizational segregation-of-duty policy.

## Pass 2 operational extension

Configure signed GitHub delivery or an authenticated trusted Azure alert relay. Engineering and Repository now expose actual persisted signals independently from incidents. On Repository, capture an actual completed failure, inspect jobs/redacted available logs, then refresh signals. Create an incident or supply an existing incident ID; Investigate signal attaches evidence before submitting through the existing durable workflow. New run evidence does not overwrite earlier runs. The workspace exposes provider source links, relationship labels, retrieval timestamps, truncation and actual tool activity. Nearby changes are hypotheses, not causation.

Azure/Foundry adds supported metric discovery and bounded measurements plus predefined configured App Insights/Log Analytics queries. Missing scopes/configuration or rows remain explicit. No zero-valued health is inferred.

Keep findings review and proposal approval unchanged. When GitHub write policy is explicitly configured, an approved proposal in Actions/workspace can prepare an operator-provided text change, show its actual full-file diff and require explicit hash confirmation to create a draft PR. Writes are disabled in default local startup. The UI currently supports one file per prepared form; the backend supports up to five. This is reviewed provided content, not autonomous patch generation. The PR still requires external human review and deployment.

After recording actual manual change, measured verification retrieves two explicit Azure Monitor windows. Inspect original observations, units, threshold, difference and reason. Passed measurements do not resolve the incident: record the combined human assessment through existing verification controls and deliberately resolve. GitHub CI-only and App Insights measured comparison algorithms remain incomplete; those sources can be inspected but are not evaluated as Azure recovery.

Knowledge displays vector indexing status and permits reindexing. Search shows real semantic cosine ranking when a configured compatible local model/index exists, or labeled lexical fallback and reason. Full history, reopening, approved report ingestion, bookmarks and session restoration remain the existing journey.
