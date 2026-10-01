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

## Completion Pass 2 verification — 1 October 2026

Starting committed checkpoint `2ee9e2a`, clean tree. Baseline reproduced: 40 Node total, 39 passed, one optional Mongo skip; 9 Python passed; two original Chrome E2E passed (32.2s). Initial sandbox runs failed on loopback binding; authorized runs passed. The optional independently configured Mongo test stayed skipped; real isolated local Mongo integration was executed.

Final commands use `/Users/keenosmith/.nvm/versions/node/v24.14.1/bin` on PATH:

- `node --test tests/*.test.js`: 54 total, 53 passed, zero failed, one optional configured-Mongo skip (2.35 seconds). Covers retained signal/run evidence, auth/signature/scopes/duplicate ordering, automatic correlation, Mongo vector citations/model compatibility/reindex/delete, mocked draft PR current approval/confirmation/idempotency and existing lifecycle/process-recovery tests.
- `(cd agent-runtime && .venv/bin/python -m unittest discover -p 'test_*.py')`: 11 passed. Existing nine plus actual bounded/sanitized context-local tool telemetry and returned provider usage metadata. No live Foundry inference or model-resistance claim.
- `npm --prefix frontend run build`: TypeScript/Vite passed with Node 24.14.1. `npm --prefix frontend run lint`: no warnings/errors. `git diff --check`: passed.
- `npm run test:e2e`: three Chrome tests passed (35.7 seconds on the final run), real isolated Mongo/API/worker/Vite and test-only deterministic external providers. The new journey ingests a signed failure, finds it in Engineering, creates/links/starts the canonical investigation, inspects retained sources/tools, reviews/approves/records a change, retrieves actual backend fixture measurements, inspects a passing comparison without automatic resolution, searches indexed vector provenance, and refreshes the complete history. Existing resolution/reopening/manual-outcome/session/browser journey coverage remains. Model vectors and telemetry are explicit test fixtures, not real cloud or embedding quality tests.

Browser iterations uncovered redundant workspace requests reaching the unchanged 120/min actor limiter; polling now uses canonical incident.workflow rather than a duplicate workflow call and restores role separately. Separate tests use isolated configured actors in the test-only host. Hidden-details assertions were corrected to expand the run. An introduced lease-renewal telemetry edit was caught by source review, fixed, and guarded by a test that advances a waiting runtime past the 15-second heartbeat without aborting it. Earlier failed browser iterations are not presented as passes.

Live safe read-only probes (`scripts/verify-intelligence.js`, `scripts/verify-pass2.js`) were executed with network permission: GitHub main returned 12 commits, one workflow and three runs; PR/deployment histories were available/empty. Azure inventory returned ten resources. Failed-workflow evidence could not be exercised live (no failed run in returned page). New Azure telemetry/app/workspace IDs and local embedding model were not configured; GitHub writes not executed. Docker, production deployment, all-provider fault matrix, all-page visual/accessibility, real model relevance and OpenTelemetry exporter remain unverified. See PASS_2_RESULTS.md for exact acceptance gaps.

## Final implementation verification — 2 October 2026

Starting HEAD `04103b5`; no commit/push. Executed `npm test`: 53 passed, one optional configured-Mongo skip, zero failed. Temporary real MongoDB integration tests ran. Python `.venv/bin/python -m unittest discover -p 'test_*.py'`: 11 passed. Frontend lint and TypeScript/Vite build passed on Node 24. The final four-test Playwright run passed in 43.3 seconds, including original complete lifecycle/recovery and signal/evidence journeys plus new primary-page, keyboard-command, knowledge-ingestion and responsive overflow checks. Browser coverage used deterministic test-only providers and real temporary MongoDB.

Actual FastAPI startup on 8000 and `/health` HTTP 200 passed, followed by clean shutdown. Browser harness ran Express 5050 and Vite 5173; its runtime uses 8001 to keep fixtures separate. Incident desktop/mobile screenshots were visually inspected. No unhandled browser page exceptions in the new navigation test. Responsive width assertions covered 1440/1024/768/390 on five representative pages; assistive-technology certification and exhaustive provider faults were not performed. Live cloud inference, semantic quality and writes remain unverified. See FINAL_IMPLEMENTATION_RESULTS.md for scope.

The final navigation regression also switches directly between two real persisted incidents through command search and verifies browser back restoration. An intermediate combined run hit the intended operations rate limit because the new test reused a preceding test identity; the test now isolates identities using the existing fixture endpoint. The final combined run passed all four tests.
