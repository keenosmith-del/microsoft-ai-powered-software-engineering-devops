// Test-only integration host. No provider fixture is reachable from production startup.
const { spawn } = require('node:child_process');
const mongoose = require('mongoose');
const express = require('express');
const database = require('../localDatabase');
process.env.OPERATIONS_API_TOKEN = 'test-engineer-credential-with-at-least-32-characters';
process.env.OPERATIONS_REVIEWER_ID = 'test-engineer'; process.env.OPERATIONS_ROLE = 'engineer';
process.env.OPERATIONS_APPROVER_TOKEN = 'test-approver-credential-with-at-least-32-characters'; process.env.OPERATIONS_APPROVER_ID = 'test-approver';
process.env.OPERATIONS_LOCAL_MODE = 'false'; process.env.INVESTIGATION_WORKER_ENABLED = 'false';
process.env.AGENT_RUNTIME_URL = 'http://127.0.0.1:8001'; process.env.CORS_ORIGINS = 'http://127.0.0.1:5173';
for (const key of ['GITHUB_OWNER', 'GITHUB_REPOSITORY', 'GITHUB_TOKEN', 'AZURE_SUBSCRIPTION_ID', 'FOUNDRY_PROJECT_ENDPOINT', 'AZURE_OPENAI_DEPLOYMENT']) process.env[key] = '';
// Providers below are deterministic test-only fixtures, never production startup.
process.env.GITHUB_OWNER = 'fixture'; process.env.GITHUB_REPOSITORY = 'repo';
process.env.GITHUB_WEBHOOK_SECRET = 'test-github-signature-secret-with-32-characters';
process.env.KNOWLEDGE_EMBEDDING_MODEL = 'test-fixture-embedding'; process.env.KNOWLEDGE_EMBEDDING_DIMENSION = '3';
const originalFetch = global.fetch;
global.fetch = async (url, init) => {
 if (String(url).startsWith('http://127.0.0.1:11434/api/embed')) return new Response(JSON.stringify({ embeddings: JSON.parse(init.body).input.map(() => [1, 0, 0]) }), { headers: { 'content-type': 'application/json' } });
 if (!String(url).startsWith('https://api.github.com/')) return originalFetch(url, init);
 const path = new URL(url).pathname;
 let value;
 if (path.includes('/actions/jobs/')) return new Response('Browser fixture failing assertion. password=fixture-secret', { headers: { 'content-type': 'text/plain' } });
 if (path.endsWith('/jobs')) value = { jobs: [{ id: 11, name: 'Fixture tests', conclusion: 'failure', html_url: 'https://github.com/fixture/repo/actions/runs/321', steps: [{ name: 'Assertion', conclusion: 'failure' }] }] };
 else if (path.includes('/commits/')) value = { sha: 'a'.repeat(40), html_url: 'https://github.com/fixture/repo/commit/' + 'a'.repeat(40), files: [], stats: {} };
 else if (path.endsWith('/actions/runs')) value = { workflow_runs: [] };
 else if (path.endsWith('/actions/workflows')) value = { workflows: [] };
 else if (path.endsWith('/deployments') || path.endsWith('/pulls') || path.endsWith('/commits')) value = [];
 else if (path.includes('/branches/')) value = { name: 'main', commit: { sha: 'a'.repeat(40) } };
 else if (path.endsWith('/branches')) value = [{ name: 'main', commit: { sha: 'a'.repeat(40) } }];
 else value = { name: 'repo', full_name: 'fixture/repo', default_branch: 'main' };
 return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
};
async function main() {
 const mongo = await database(); await mongoose.connect(mongo.getUri());
 const models = ['Incident', 'IncidentWorkflow', 'InvestigationRun', 'RemediationProposal', 'OperationSession', 'KnowledgeDocument', 'WorkerState', 'EngineeringSignal', 'EngineeringEvidence', 'MeasuredVerification', 'GitHubChangeIntent'];
 await Promise.all(models.map(name => require(`../../src/models/${name}`).init()));
 const runtime = express(); runtime.use(express.json());
 runtime.get('/platform', (_req, res) => res.json({ timestamp: new Date().toISOString(), runtime: { status: 'ok', service: 'deterministic-test-runtime' }, azure: { status: 'not_configured', resource_count: 0, resources: [], resources_truncated: false }, foundry: { status: 'not_configured', authentication: 'not_checked', endpoint_host: null, deployment: null, inference: 'not_tested' } }));
 runtime.get('/health', (_req, res) => res.json({ status: 'ok' }));
 runtime.post('/analyse-stream', async (req, res) => {
  res.set('Content-Type', 'application/x-ndjson'); res.flushHeaders();
  const names = ['software-engineering', 'incident-investigation', 'engineering-action'];
  for (const stage of names) {
   const at = Date.now(); res.write(JSON.stringify({ stage, status: 'running', at: new Date().toISOString() }) + '\n');
   await new Promise(resolve => setTimeout(resolve, 1000));
   if (res.destroyed) return;
   res.write(JSON.stringify({ stage, status: 'completed', at: new Date().toISOString(), elapsedMs: Date.now() - at, output: `Deterministic browser test fixture: ${stage}. Source evidence must be reviewed by a human.` }) + '\n');
  }
  if (req.body.retrieved_evidence?.length) await require('../../src/models/InvestigationRun').updateOne({ correlationId: req.get('X-Correlation-ID') }, { $set: { 'context.notes': 'Test fixture received real retained evidence IDs: ' + req.body.retrieved_evidence.map(e => e.document_id).join(', ') } });
  res.end();
 });
 const runtimeServer = runtime.listen(8001, '127.0.0.1');
 const app = require('../../src/app');
 app.locals.azureMeasurements = { metrics: async ({ resourceId, metric, aggregation, start, end }) => ({ provider: 'azure-monitor', resourceId, metric, aggregation, window: { start, end }, unit: 'Count', status: 'available', missingData: false, truncated: false, observations: Array.from({ length: (Date.parse(end) - Date.parse(start)) / 300000 }, (_, i) => ({ timestamp: new Date(Date.parse(start) + i * 300000).toISOString(), value: start.includes('2026-01-01T00') ? 10 : 1 })), sourceUrl: 'https://portal.azure.com/', retrievedAt: new Date() }) };
 app.post('/__test/isolate-actors', express.json(), (req, res) => {
  if (!/^[a-z0-9-]{1,100}$/.test(req.body.label || '')) return res.sendStatus(400);
  process.env.OPERATIONS_REVIEWER_ID = `test-engineer-${req.body.label}`; process.env.OPERATIONS_APPROVER_ID = `test-approver-${req.body.label}`; res.json({ isolated: true });
 });
 const api = app.listen(5050, '127.0.0.1');
 const worker = require('../../src/services/investigationWorker').createInvestigationWorker(); worker.start();
 const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: 'frontend', stdio: 'inherit', env: process.env });
 let stopped = false;
 const cleanup = async () => { if (stopped) return; stopped = true; worker.stop(); vite.kill('SIGTERM'); api.closeAllConnections(); runtimeServer.closeAllConnections(); api.close(); runtimeServer.close(); await mongoose.disconnect(); await mongo.stop(); process.exit(0); };
 process.on('SIGTERM', cleanup); process.on('SIGINT', cleanup);
}
main().catch(error => { console.error(error.message); process.exit(1); });
