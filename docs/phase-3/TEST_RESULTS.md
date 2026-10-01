# Test evidence — 1 October 2026

- Baseline backend: 28 passed, one opt-in Mongo integration skipped. Initial sandbox run failed for two HTTP test files because loopback binding was denied; rerun with permitted loopback access passed.
- Latest expanded Node suite with PHASE2_PERSISTENCE_TEST=true: 36 passed, zero failed/skipped. Real MongoDB integration used a uniquely named p2v_<uuid> database and removed only that database on completion. This tested unique queue keys, expired lease recovery, original incident preservation, workflow CAS contention, review/change/manual verification/resolution/reopening, approved report indexing and actual lexical retrieval, targeted run delivery, outbox drain/replay without duplication, cancellation and proposal audit. Provider outputs were deterministic test fixtures, not live inference.
- Final default Node suite after adding manual-creation injection regression: 36 passed, one opt-in Mongo test skipped. The preceding Mongo-enabled run passed all 36 tests then present.
- Deterministic workflow tests: valid human journey; rejected/unsupported findings; failed/inconclusive verification; unapproved changes; unsafe references; report approval constraints and history preservation.
- HTTP workflow test: authentication, invalid IDs, missing completed runs, stale and simulated competing updates, unapproved changes.
- Legacy boundary test: explicit local bypass and production rejection of bypass. Original legacy lifecycle tests remain passing.
- TypeScript and Vite production build passed using installed Node 24.14.1. Default npm frontend build previously selected Node 20.12.1 and failed inside Rolldown. Use Node 22.12+ or supported Node 24 and verify PATH.
- Frontend oxlint passed.
- Python configuration/runtime contracts: five passed; evidence context: two passed in existing project venv. No live provider call was made.
- git diff --check passed before documentation finalization; repeat after edits.

Unverified: browser E2E, visual regression, touch/accessibility inspection, live Foundry inference, Azure telemetry verification, GitHub write operations, worker OS process restart/contention beyond existing lease tests, container images/startup and production deployment. No cloud feature is marked verified solely because a mocked adapter test passes.
