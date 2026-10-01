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
async function main() {
 const mongo = await database(); await mongoose.connect(mongo.getUri());
 const models = ['Incident', 'IncidentWorkflow', 'InvestigationRun', 'RemediationProposal', 'OperationSession', 'KnowledgeDocument', 'WorkerState'];
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
  res.end();
 });
 const runtimeServer = runtime.listen(8001, '127.0.0.1');
 const app = require('../../src/app'); const api = app.listen(5050, '127.0.0.1');
 const worker = require('../../src/services/investigationWorker').createInvestigationWorker(); worker.start();
 const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: 'frontend', stdio: 'inherit', env: process.env });
 let stopped = false;
 const cleanup = async () => { if (stopped) return; stopped = true; worker.stop(); vite.kill('SIGTERM'); api.closeAllConnections(); runtimeServer.closeAllConnections(); api.close(); runtimeServer.close(); await mongoose.disconnect(); await mongo.stop(); process.exit(0); };
 process.on('SIGTERM', cleanup); process.on('SIGINT', cleanup);
}
main().catch(error => { console.error(error.message); process.exit(1); });
