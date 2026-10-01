# Current Phase 3 architecture

Status: partial implementation checkpoint, not final acceptance.

The existing React/TypeScript frontend, Express/Mongoose gateway and FastAPI runtime are retained. API port remains 5050 and agent runtime 8000. MongoDB stores original Incident records and separate InvestigationRun, WorkerState, RemediationProposal, KnowledgeDocument and new IncidentWorkflow records. Original incident status/output fields are not migrated or overwritten by the new workflow.

## Flow
Manual frontend submission creates an Open incident and queues an existing durable run. The worker claims fenced leases, retrieves real lexical knowledge, calls the three-agent runtime and persists outputs. Incident workspace polls run history and independent workflow state every five seconds. Engineers review completed runs with source observations; accepted findings permit recording external changes against an approved proposal linked to the reviewed run. Human-recorded verification allows passed, failed or inconclusive outcomes. Passed verification enables deliberate resolution; reopening retains every decision. Resolved workflows accept report drafts and human approval. Approved reports are explicitly indexed in existing lexical retrieval with incident/report/approval provenance.

Targeted reinvestigation first commits a pending request inside the versioned workflow document. Delivery upserts an InvestigationRun using its stable request ID, then clears pending state. Worker startup polling drains pending requests. Crash between delivery and acknowledgement is safe because the queue key is unique. Human notes are passed to the runtime as untrusted problem context, not commands.

## State model
Initial detect → accepted review → plan → approved external change record → verify → passed observation plus explicit resolution → resolved. Rejected review returns to investigate. Failed verification returns to remediate. Inconclusive verification remains verify. Reopening returns to detect. Targeted reinvestigation can be requested from every active stage and queues a real run. Review and verification histories remain available after reopening. Workflow updates compare the persisted version atomically and append actor/time/notes to audit history.

## Boundaries
Workflow stage is separate from legacy Incident.status. Existing lists, counters and legacy actions do not yet reflect the workflow's resolution. There are no live per-agent/tool events or actual agent topology yet. The HTTP runtime still executes three agents within one bounded worker call. SSE exists for overall worker events; the workspace uses polling. Identity remains configured shared-token identity; no Entra roles or multi-user policies are implemented. Manual observations are human assertions with source references, not automated proof. GitHub writes, merges, deployments and Azure infrastructure mutation remain disabled.
