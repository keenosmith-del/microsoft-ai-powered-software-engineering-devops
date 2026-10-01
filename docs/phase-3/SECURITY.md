# Completion Pass 1 security boundary

Operations fail closed without a configured strong credential and actor identity. Optional separate approver identity gates proposal/report approval; viewers cannot mutate. Roles are configured identities, not Entra SSO or per-workspace isolation. Approvers/admins also have engineering permissions. Existing read-only provider adapters and their scope validation remain.

POST /api/session validates an allowlisted frontend Origin and throttles login, rotates existing cookie sessions, stores random-key hashes and credential fingerprints with expiry/TTL in MongoDB. Cookie: HttpOnly, SameSite=Strict, Path=/, Secure when NODE_ENV=production. Cookie-authenticated mutations require matching in-memory X-CSRF-Token; session GET/login are no-store. Credential rotation revokes sessions on subsequent validation. Logout deletes the session. Browser refresh restores CSRF via authenticated GET; bearer tokens never persist in localStorage, URLs or history. The sign-in form clears the entered credential after success.

Bearer API clients remain supported. Explicit OPERATIONS_LOCAL_MODE compatibility remains restricted to nonproduction and identifies its actor; it is never silently enabled. Test fixtures supply distinct credentials in test process environment only. Runtime defaults stay separate from gateway authentication; deploy the runtime on a private trusted network.

Lifecycle/proposal CAS, current accepted-review linkage, approved manual-change checks, bounded inputs, secret redaction, safe evidence URLs, SSE limits and output fencing remain server controls. Approval cannot execute remote work; execute endpoint always rejects. Manual verification does not prove measured Azure recovery.

Deferred: Entra/OIDC, tenant/workspace authorization, organization-level separation of duties, complete audit retention, hardened runtime ingress/deployment, broader independent security review. No cloud provisioning, token rotation or secret-file editing was performed during this pass.
