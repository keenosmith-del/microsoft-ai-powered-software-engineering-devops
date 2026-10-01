# Local startup and hosting — Completion Pass 1

Use Node 22.12+ or supported Node 24 (verified with 24.14.1), Python 3.11+, and reachable MongoDB. From the repository root install dependencies:

```bash
nvm use 24
npm ci
npm --prefix frontend ci
python3 -m venv agent-runtime/.venv
agent-runtime/.venv/bin/python -m pip install -r agent-runtime/requirements.txt
```

Configure a private root `.env` using `.env.example` without committing credentials. Required: `MONGODB_URI`, strong `OPERATIONS_API_TOKEN` (at least 32 characters), `OPERATIONS_REVIEWER_ID`, `OPERATIONS_ROLE=engineer`, distinct strong `OPERATIONS_APPROVER_TOKEN` and `OPERATIONS_APPROVER_ID` for approvals, `INVESTIGATION_WORKER_ENABLED=true`. Keep `OPERATIONS_LOCAL_MODE=false`. Configure real Foundry/GitHub/Azure settings for live investigation. API defaults 5050, runtime 8000. This pass did not change secrets.

Three terminals, starting in repository root:

```bash
# Terminal 1
cd agent-runtime
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

```bash
# Terminal 2
npm run dev
```

```bash
# Terminal 3
npm --prefix frontend run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`, sign in, and submit an incident. Leave VITE_API_BASE_URL empty for the development same-origin proxy; localhost is also supported by default CORS. Foundry deployment/authentication and scoped read-only GitHub/Azure access are external prerequisites for live evidence. Missing configuration is unavailable/error, never synthetic success.

Production needs HTTPS, same-origin API reverse proxy, SPA fallback for `/incidents/:id`, explicit `CORS_ORIGINS`, `NODE_ENV=production`, reachable durable MongoDB, enabled worker and runtime. Cookies become Secure. Session TTL is OPERATIONS_SESSION_SECONDS, clamped 60–86400 (default 28800). Production deployment, Docker smoke and cloud inference were not exercised in this pass.

For reproducible cloud-free verification:

```bash
npm test
(cd agent-runtime && .venv/bin/python -m unittest discover -p 'test_*.py')
npm --prefix frontend run build
npm --prefix frontend run lint
npx playwright install chromium
npm run test:e2e
```

Tests use isolated local MongoDB, actual API/worker/frontend, and test-only deterministic runtime streams. Local system mongod/Chrome are used when available; otherwise MongoMemoryServer/Playwright obtain test binaries. CI installs Chromium with OS dependencies. Local network/binary-download permissions may be needed. E2E ports 5050/5173 and test runtime 8001 must be free. No paid cloud account is required.

## Pass 2 external configuration

See new blank/default-off entries in `.env.example`; the private `.env` was not modified. All existing startup commands/ports remain. No new npm/Python dependency or paid search service is required.

GitHub reads require Metadata/Contents/Actions/Checks/Pull requests/Deployments read access on GITHUB_OWNER/GITHUB_REPOSITORY. Configure `GITHUB_WEBHOOK_SECRET` (random ≥32 characters) and HTTPS `/api/signals/github` for workflow_run and deployment_status events. Optional polling: GITHUB_SIGNAL_POLL_ENABLED=true, GITHUB_SIGNAL_POLL_SECONDS=60–3600 (default 300), first-page/24-hour bounded sample. Opt-in automatic association: SIGNAL_AUTO_CREATE=true, SIGNAL_AUTO_SEVERITIES=Critical,High; SIGNAL_DEDUP_MINUTES=5–1440; investigation requires separate SIGNAL_AUTO_INVESTIGATE=true and an enabled worker/real Foundry deployment. Defaults remain manual.

Azure: DefaultAzureCredential must have Monitoring Reader only on intended resources; AZURE_DIAGNOSTIC_RESOURCE_IDS is a comma-separated exact allowlist, additionally limited by subscription and optional group. Select an actual supported AZURE_INVESTIGATION_METRIC to collect it for Azure alerts. Configure AZURE_LOG_ANALYTICS_WORKSPACE_ID with Log Analytics Reader on that workspace, and AZURE_APPLICATION_INSIGHTS_APP_ID with application query permission. Use dedicated scoped query resources; workspace queries cover that configured workspace, not an inferred service. For alert delivery configure a trusted Azure Logic App/relay that validates the Azure sender and posts common-alert JSON to `/api/signals/azure` with a dedicated AZURE_ALERT_RELAY_TOKEN ≥32 characters over HTTPS. Do not embed this token in browser code or public payloads.

Local genuine embeddings: separately install/start Ollama and a real small model, e.g. [all-minilm:22m](https://ollama.com/library/all-minilm/tags) (46 MB, [384 dimensions](https://ollama.com/library/all-minilm/blobs/797b70c4edf8)). Set KNOWLEDGE_EMBEDDING_URL=http://127.0.0.1:11434, KNOWLEDGE_EMBEDDING_MODEL=all-minilm:22m, KNOWLEDGE_EMBEDDING_DIMENSION=384. The adapter uses official [`/api/embed`](https://github.com/ollama/ollama/blob/main/docs/capabilities/embeddings.mdx); it never downloads weights. Input truncation is disabled: oversized model context yields explicit unavailable/lexical fallback. Pin an installed model version and reindex all sources after model/dimension changes. The current session had no configured local model, so real model quality/output is unverified.

Controlled writes require separate scoped App/fine-grained GITHUB_WRITE_TOKEN (Contents/Pull requests write), GITHUB_WRITE_ENABLED=true, exact GITHUB_WRITE_REPOSITORIES, GITHUB_WRITE_BASE_BRANCH, and slash-terminated GITHUB_WRITE_PATH_PREFIXES such as `src/`. Keep disabled until independent review and a separately authorized sandbox write smoke. No actual external writes were performed. Completed PR references live in intent records; PR checks/reviews can be refreshed on demand; automatic synchronization remains incomplete.

Safe status-only smoke commands: Node 24 `node scripts/verify-intelligence.js` and `node scripts/verify-pass2.js`. The latter prints counts/status only; no log content, secrets or vectors. Provider implementations follow [GitHub job logs](https://docs.github.com/en/rest/actions/workflow-jobs), [Azure Monitor metrics](https://learn.microsoft.com/en-us/rest/api/monitor/metrics/list?view=rest-monitor-2023-10-01), and [fixed Logs query request format](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/api/request-format). Local environment cannot verify absent failure history/telemetry simply by passing fixture tests.
