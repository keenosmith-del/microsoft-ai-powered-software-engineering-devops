# Completion Pass 1 test evidence — 1 October 2026

## Baseline

Committed starting HEAD: `59b0df2`. Clean initial tree. Node: 36 passed, one opt-in configured Mongo test skipped. Python: 7 passed. TypeScript/Vite build and lint passed. An initial Python invocation from the wrong directory was corrected; loopback server tests required sandbox permission. No baseline cloud writes or live inference.

## Final verification

- `npm test`: isolated local MongoDB included, 40 tests total, 39 passed, zero failed, one optional configured-Mongo test skipped. Tests cover canonical transitions, review restrictions, ownership/edit/approval, manual remediation and all verification outcomes, report approval/index/retrieval, history preservation and pagination, idempotent concurrent submissions, stale updates, historical adoption, real worker process termination and competing recovery workers, authorization/CSRF/session expiry, output sanitization and existing read-only integrations.
- `(cd agent-runtime && .venv/bin/python -m unittest discover -p 'test_*.py')`: 9 tests passed, including ordered actual NDJSON execution/timing and failed-stage behavior.
- Node 24.14.1 explicitly invoked frontend TypeScript (`tsc -b frontend`) and Vite build; frontend oxlint and `git diff --check` passed.
- `npm run test:e2e`: two actual Chrome browser tests passed (32.6 seconds on final verification run). Real Express/MongoDB/worker/frontend with deterministic test-only provider/runtime data. No cloud credentials required. Latest evidence-history controls and session recovery without reload are included; run-history secondary sort is covered by backend pagination tests.

Browser central journey: double-click creation, queued/running observation, navigate/back/refresh during work, specialist completion, accept findings, proposal/create/edit, switch to approver and reload, approve/begin manual work, record change, inconclusive/failed/revised change/passed, resolve, approve/index report, reopen/reinvestigate, previous history, bookmark and back/forward. Second browser case: reject findings/no planning, targeted cancellation, expired cookie/sign-in recovery and invalid path.

Screenshots at 1280px desktop and 390px mobile were inspected. Scoped workspace remains dark, editorial, border-free and readable through long history. These screenshots are generated in ignored test-results; they are not a full visual-baseline suite. Browser expiry deliberately produces 401 console messages; assertions confirm protected access recovery rather than suppressing the errors.

The worker crash test terminates a real separate worker process after claim, then advances the stored lease deadline rather than waiting a full minute; two recovery workers persist one terminal outcome. This tests fencing/recovery, not a full machine outage or multi-host production chaos run. Python stream is separately contract-tested; browser NDJSON is a test-only deterministic fixture, not live Foundry output.

MongoMemoryServer used installed mongod 8.2.7; its expected-version warning (8.2.6) was nonfatal. Chrome system binary was used locally; CI installs Playwright Chromium. Optional independently configured Mongo smoke remains skipped because no test URI was supplied. Local database integration tests were not skipped.

## Limits

No live cloud inference, external remediation, production deployment, Docker smoke, full multi-browser/accessibility audit, large-data load, SSE disconnect stress or enterprise identity integration was verified. Existing read-only Azure/GitHub/Foundry/knowledge tests passed; all unrelated pages were not manually rechecked. No claim that the broader Phase 3 is complete.
