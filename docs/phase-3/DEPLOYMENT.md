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
