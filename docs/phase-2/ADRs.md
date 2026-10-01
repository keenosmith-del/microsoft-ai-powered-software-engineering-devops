# Implementation decisions

## 001 — Preserve the active CommonJS gateway and legacy lifecycle

Source is Express/CommonJS despite the target brief referring to structured TypeScript. Preserve it and define contracts through Mongoose schemas, explicit request validation and typed frontend service models. Incident lifecycle routes and buttons are untouched. Existing regression cases describe actual current transitions, not the future requested lifecycle. No migration flag is enabled because the exact future workflow tests and migration implementation do not exist yet. Rollback of additive execution: set INVESTIGATION_WORKER_ENABLED=false; historical runs remain readable and legacy incident actions continue.

## 002 — MongoDB leased execution

Use existing MongoDB, not a new Redis dependency. Unique incident/idempotency keys prevent duplicate submissions; atomic claims, owners and attempt numbers prevent stale updates. One job per process bounds local concurrency. Expired leases recover after crashes; terminal states are persisted. Inference can repeat after crashes, so this is at-least-once provider invocation with fenced persistence, not exactly-once model execution. Cancel prevents result storage but cannot abort a provider request already executing inside FastAPI. A process restart fault-injection test and two-worker contention test remain to be added; isolated Mongo lease-expiry recovery is verified.

## 003 — Local lexical retrieval before optional semantic retrieval

Plain MongoDB storage plus deterministic lexical overlap works locally without Atlas Vector Search, additional paid services or embeddings. Text/Markdown ingestion keeps sections and timestamps; source IDs are persisted into runs. This baseline is not vector search or semantic ranking. Local ranking examines at most 100 latest scoped documents and returns five passages, explicitly reporting truncated coverage. Embeddings, Azure AI Search, corpus migration, selected repository ingestion and richer file parsing remain separate work. Source deletion removes future retrieval; historical run references may then point to removed sources. Automatic retention is not implemented; use authorized deletion and adopt an explicit retention policy before sensitive production evidence.

## 004 — Fail-closed single-operator authorization

New run, knowledge and remediation APIs require a configured strong bearer token and backend reviewer identity. Frontend confirmation is not authorization. A fixed local operator identity is sufficient for guarded local development; it is not multi-user identity, role separation or enterprise RBAC. Legacy writes are deliberately unchanged and still need an authorization migration before public exposure. Proposals can be reviewed, but remote execution remains disabled regardless of approval. No arbitrary agent shell commands exist. Approval and audit updates are atomic and guarded by a version.

## 005 — Truthful observability

Run status, attempts, duration, events, provenance, correlation IDs and worker heartbeat come from actual persisted execution. Missing individual stage timings, tool spans, token counts and provider costs are not inferred. Foundry configuration and token authentication do not prove model connectivity. Health returns Unknown until a supported deployment probe or real inference result is available. Health probes never invoke paid inference. The local execution console uses polling; API SSE replay is tested. OpenTelemetry and Application Insights export remain planned.

## 006 — Read-only integrations and bounded samples

GitHub and ARM reads use existing credentials, native Fetch and Azure Identity. All remote write paths stay disabled. GitHub maps selected source evidence and displays independent permission failures. Azure scopes to configured subscription/resource group and does not follow client-supplied pagination URLs. Bounded first pages are labeled rather than portrayed as full inventories. ARM inventory and GitHub snapshot/activity retrieval are live-verified; Azure Activity Log code is deterministically tested but its live scope/permission behavior remains to verify.
