# Implemented journey and remaining gaps

1. Configure the operations token and reviewer identity. Connect the token in Settings; it remains only in application memory. Browser refresh requires reconnection.
2. Submit an incident in Overview. The frontend creates a persisted incident and submits a durable run; it no longer calls synchronous /api/analyse for new submissions.
3. Select an incident from Incidents. Its bookmark URL is #/incidents/<MongoID>. The workspace loads on refresh after authentication is connected. Run history and state poll every five seconds.
4. Connect workspace access, inspect saved run outputs and enter decision notes, source URL and observed evidence. Accept or reject a completed run. AI output itself remains unconfirmed.
5. Use Actions to create and review a proposal. In the workspace, select an approved incident proposal and record the external change and source reference. Its run must match accepted findings.
6. Enter verification criteria and manual evidence. Record passed, failed or inconclusive. Failure returns to remediate; inconclusive does not permit resolution.
7. Explicitly confirm resolution with notes and outstanding risks. Reopen when required; history stays intact.
8. Write a post-incident report, save its draft, approve it, then index it. Search its actual text in Knowledge. Provenance includes incident ID, report ID and approving identity.
9. Request targeted reinvestigation with decision notes. A real queued run is persisted; failed delivery remains recoverable in the workflow outbox.

This is not a complete Phase 3 experience. Manual creation lacks request-level idempotency; concurrent click protection is only frontend busy state. Reports are manually authored, with no generated draft/editor version comparison. Workspace proposals show the first existing page only. Run history shows the most recent 20. Service/context inputs and evidence attachment on initial submission are incomplete. Full browser back/forward navigation and restored authenticated deep-link loading need E2E tests. Legacy status counters remain independent. Signal detection, automated evidence verification, Entra roles, reviewed GitHub patch/PR operations and semantic retrieval are unfinished.
