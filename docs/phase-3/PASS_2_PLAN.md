# Completion Pass 2 plan — 1 October 2026

Starting checkpoint: clean `2ee9e2a`. Preserve canonical IncidentWorkflow, outbox, leases, review/approval, sessions/CSRF, manual change and resolution history. No commit, push, external write, cloud provisioning or deployment is authorized.

Reusable: bounded Fetch GitHub REST adapter, scoped ARM adapter, Mongo models, lexical chunks/provenance, Python three-stage stream and untrusted-evidence instruction, authenticated frontend client and editorial components. Missing: log retrieval, persisted signals/evidence, diagnostics queries, measured comparisons, embeddings, reviewed draft PRs and their UI/tests.

## Ordered implementation

0. Audit Pass 1 and Phase 2/source contracts; run Node 24, Python, build/lint and browser baselines.
1. Extend GitHub with bounded redacted job logs, run lookup, commit patches, PR files and deployment statuses. Add EngineeringSignal (unique provider delivery/dedup keys) and immutable EngineeringEvidence by incident/run. Authenticate raw GitHub webhook before JSON parsing. Manual conversion uses existing lifecycle.create; attach before lifecycle.submit. Delivery retries reuse existing signal and incident keys.
2. Add resource-allowlisted Azure metric definitions/measurements and fixed App Insights/Log Analytics templates. Use DefaultAzureCredential, explicit scope/time/result bounds; retain unavailable/no-observations distinctions.
3. Aggregate only incident-linked evidence into original runs; persist collection tool timings/outcomes and provenance; supply untrusted text to existing agents. Direct identifiers establish linkage, time alone establishes temporal relevance, never causation.
4. Add separate MeasuredVerification records with explicit criteria, equal-duration bounded windows, compatible units/aggregation, completeness checks and explainable passed/failed/inconclusive. Never auto-resolve.
5. Real embeddings through a configured local model endpoint, Mongo-stored vectors/cosine retrieval and explicit lexical fallback. Persist model/dimension; reindex on model change; no synthetic vectors or automatic weight downloads.
6. Disabled-by-default reviewed GitHub draft PR adapter: validated operator file changes, actual preview, approved current proposal/review, role/session/CSRF, repository/base/path policies, sensitive exclusions, payload limits, persisted idempotency and recoverable remote steps. Mock writes only.
7. Integrate existing pages, retaining typography/negative space/pill controls. Show explicit missing configuration/errors/source history.
8. Regression, provider/security/comparison tests, real local Mongo/worker/browser fixture journey; docs and exact continuation checkpoint.

## Additive contracts and models

`/api/signals` authenticated list; `/github` raw signed webhook; `/github/runs/:id` authenticated backend-retrieved failure; `/:id/incident` manual create/attach, optional durable investigation. Evidence GET by incident/run. Azure `/metric-definitions`, `/metrics`, `/query` accept identifiers and fixed templates only. Measured verification POST by incident plus history GET. Knowledge reindex retains source identity and genuine vector metadata. PR prepare/confirm/status reference persisted intent, never arbitrary URLs/commands.

## Configuration and least privilege

GitHub Metadata/Contents/Actions/Checks/Pull requests/Deployments read; webhook secret and configured repository. Writes require separate fine-grained/App credential, Contents and Pull requests write on allowed sandbox repositories; default disabled. Azure Monitoring Reader scoped to allowed resource IDs; Log Analytics Reader on configured workspace, App Insights query permission on configured application. Trusted Azure delivery requires independently authenticated source, not payload claims. Local embeddings require an operator-installed genuine model and pinned model/dimension; no paid search service. Existing auth identities remain configured roles, not enterprise SSO.

## Verification strategy

Fixtures remain under tests; exercise missing permissions, pagination, truncation, binary logs/redaction, webhook signatures/replay/out-of-order, Mongo association/idempotency, worker evidence, missing baseline/current, incompatible metrics and source provenance. Live safe read-only checks only if configuration permits; no mocked result labeled live. Existing reported 39 Node/9 Python/2 browser tests must be rerun. Document all incomplete checkpoints rather than equating partial implementation with acceptance.
