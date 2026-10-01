# Security checkpoint

Legacy incident/action routes now fail closed without configured shared-token authorization, except when OPERATIONS_LOCAL_MODE=true and NODE_ENV is not production. This explicitly isolated local compatibility mode has no authenticated human identity and must only be used on a trusted local machine. Production cannot enable that bypass. New workflow, knowledge, run and proposal routes retain their existing token and rate limits.

Required shared-token settings: OPERATIONS_API_TOKEN (at least 32 characters) and OPERATIONS_REVIEWER_ID. The browser keeps a connected token in module/component memory and clears it on refresh. Never put the token into VITE environment variables. The configured reviewer is the shared token's identity; it is not evidence of separate users or approval separation.

Manual incident input is allowlisted; callers cannot supply status, rootCause, actionStatus or generated outputs. Workflow version matching prevents stale overwrites. Approved external proposal/run linkage and passed current-change verification are checked on the backend. Notes and observations are redacted. Source URLs are bounded and reject credential-bearing forms. Manual URLs are stored as references and are not fetched. Approved reports use the same bounded redacted lexical ingestion as existing knowledge.

Remaining release blockers: Entra signature/audience/issuer verification and roles; distinct approver identity and separation of duties; authenticated Azure/GitHub read scopes across all legacy endpoints; per-workspace incident access; atomic integration with legacy status routes; safe retention and export; distributed throttling; provider prompt-injection evaluation; CSP/production proxy deployment. Existing provider/tool content is untrusted; no model-generated command execution or remote engineering change is introduced.

No production-readiness claim is made by this checkpoint. Frontend visibility is not authorization.
