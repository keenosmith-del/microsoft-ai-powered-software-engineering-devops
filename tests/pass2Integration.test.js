const { test, before, after } = require('node:test'); const assert = require('node:assert/strict'); const { createHmac } = require('node:crypto'); const mongoose = require('mongoose');
const database = require('./localDatabase');
const Signal = require('../src/models/EngineeringSignal'); const Evidence = require('../src/models/EngineeringEvidence'); const Run = require('../src/models/InvestigationRun');
const lifecycle = require('../src/services/incidentLifecycle');
const { createInvestigationWorker } = require('../src/services/investigationWorker'); const fixture = require('./runtimeFixture');
const token = 'test-engineer-token-pass2-with-at-least-32-characters'; let mongo, server, base;
before(async () => {
 process.env.OPERATIONS_API_TOKEN = token; process.env.OPERATIONS_REVIEWER_ID = 'pass2-engineer'; process.env.OPERATIONS_LOCAL_MODE = 'false'; process.env.GITHUB_WEBHOOK_SECRET = 'test-github-signature-secret-with-32-characters'; process.env.GITHUB_OWNER = 'fixture'; process.env.GITHUB_REPOSITORY = 'repo';
 mongo = await database(); await mongoose.connect(mongo.getUri());
 await Promise.all(['Incident', 'IncidentWorkflow', 'InvestigationRun', 'RemediationProposal', 'EngineeringSignal', 'EngineeringEvidence', 'GitHubChangeIntent'].map(n => require(`../src/models/${n}`).init()));
 server = require('../src/app').listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server?.closeAllConnections(); await new Promise(r => server?.close(r)); await mongoose.disconnect(); await mongo?.stop(); });
async function request(path, body, headers = {}) { return fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); }
function payload(id = 321, date = '2026-01-01T00:00:00Z') { return { repository: { full_name: 'fixture/repo' }, action: 'completed', workflow_run: { id, conclusion: 'failure', head_sha: 'a'.repeat(40), head_branch: 'main', run_attempt: 1, completed_at: date } }; }
async function deliver(p, delivery) { const bytes = JSON.stringify(p); return request('/api/signals/github', p, { 'X-GitHub-Event': 'workflow_run', 'X-GitHub-Delivery': delivery, 'X-Hub-Signature-256': `sha256=${createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET).update(bytes).digest('hex')}` }); }
test('real local API/Mongo signal replay, out-of-order ingestion, incident association and durable worker retain provenance', async () => {
 assert.equal((await request('/api/signals/github', payload(), { 'X-Hub-Signature-256': 'invalid' })).status, 401);
 const first = await deliver(payload(), 'test-first-delivery'); assert.equal(first.status, 202); const signal = await first.json();
 const duplicate = await deliver(payload(), 'test-second-delivery'); assert.equal((await duplicate.json()).signalId, signal.signalId); assert.equal(await Signal.countDocuments(), 1);
 await deliver(payload(322, '2025-12-01T00:00:00Z'), 'test-older-delivery');
 const listing = await (await request('/api/signals')).json(); assert.equal(listing.items[0].signalId, signal.signalId);
 const create = await request(`/api/signals/${signal.signalId}/incident`, { investigate: true }); assert.equal(create.status, 200); const incident = await create.json(); assert.equal(incident.status, 'Investigating');
 assert.equal((await (await request(`/api/signals/${signal.signalId}/incident`, { investigate: true })).json())._id, incident._id); assert.equal(await Run.countDocuments({ incidentId: incident._id }), 1);
 const originalFetch = global.fetch; let supplied;
 global.fetch = async (url, init) => {
  if (String(url).startsWith('https://api.github.com/')) {
   if (String(url).includes('/jobs/')) return new Response('Fixture failing assertion\npassword=fixture-secret', { headers: { 'content-type': 'text/plain' } });
   if (String(url).includes('/jobs?')) return new Response(JSON.stringify({ jobs: [{ id: 11, run_id: 321, conclusion: 'failure', html_url: 'https://github.com/fixture/repo/actions/runs/321/job/11', steps: [{ name: 'tests', conclusion: 'failure' }] }] }));
   return new Response(JSON.stringify({ sha: 'a'.repeat(40), html_url: 'https://github.com/fixture/repo/commit/' + 'a'.repeat(40), files: [] }));
  }
  return originalFetch(url, init);
 };
 try {
  const worker = createInvestigationWorker({ statusWriter: async () => {}, retrieval: async () => ({ results: [{ documentId: 'fixture-doc', section: 'Runbook', ordinal: 0, text: 'Runbook fixture' }] }), fetcher: async (_url, init) => { supplied = JSON.parse(init.body); return fixture(); } });
  await worker.tick();
  const run = await Run.findOne({ incidentId: incident._id }).lean(); assert.equal(run.status, 'completed'); assert.ok(run.toolActivity.some(t => t.name === 'github.job-log' && t.outcome === 'available')); assert.ok(supplied.retrieved_evidence.some(v => v.text.includes('Fixture failing assertion'))); assert.ok(supplied.retrieved_evidence.length <= 5); assert.ok(supplied.retrieved_evidence.every(v => v.section.length <= 200));
  assert.equal((await lifecycle.read(incident._id)).status, 'Awaiting review'); const retained = await Evidence.find({ runId: run.runId }).lean(); assert.ok(retained.length >= 3); assert.ok(!JSON.stringify(retained).includes('password=fixture-secret'));
  await lifecycle.submit(incident._id, 'pass2-engineer', 'second-evidence-run'); await worker.tick(); assert.ok(await Evidence.countDocuments({ runId: run.runId }) >= 3);
 } finally { global.fetch = originalFetch; }
 assert.equal((await request('/api/signals/azure', { schemaId: 'azureMonitorCommonAlertSchema' })).status, 503);
});
test('draft PR confirms current approval and explicit diff; provider writes are fixture-only and retry idempotent', async () => {
 const Proposal = require('../src/models/RemediationProposal'), Workflow = require('../src/models/IncidentWorkflow');
 const incident = await lifecycle.create({ title: 'Fixture write', description: 'Fixture approved remediation' }, 'pass2-engineer', 'fixture-write-incident');
 const reviewId = 'test-review-approved';
 const p = await Proposal.create({ incidentId: incident._id, runId: 'fixture-run', reviewId, requestedBy: 'pass2-engineer', title: 'Fixture', action: 'Change fixture', rationale: 'Fixture evidence', validationPlan: 'Test', target: 'src/test.txt', risk: 'low', approvalStatus: 'approved', version: 1 });
 await Workflow.updateOne({ incidentId: incident._id }, { $set: { 'workflow.stage': 'plan', 'workflow.currentReviewId': reviewId, 'workflow.currentProposalId': String(p._id), 'workflow.reviews': [{ id: reviewId, decision: 'accepted' }] } });
 const body = { baseBranch: 'main', changes: [{ path: 'src/test.txt', content: 'after\n' }] };
 process.env.GITHUB_WRITE_ENABLED = 'false'; assert.equal((await request(`/api/github-changes/proposals/${p._id}/prepare`, body, { 'Idempotency-Key': 'fixture-write-01' })).status, 403);
 Object.assign(process.env, { GITHUB_WRITE_ENABLED: 'true', GITHUB_WRITE_TOKEN: 'test-only-write-token', GITHUB_WRITE_REPOSITORIES: 'fixture/repo', GITHUB_WRITE_BASE_BRANCH: 'main', GITHUB_WRITE_PATH_PREFIXES: 'src/' });
 const original = global.fetch; let branch = null, pr = null, writes = 0;
 global.fetch = async (url, init) => {
  if (!String(url).startsWith('https://api.github.com/')) return original(url, init);
  const path = new URL(url).pathname; const b = init?.body ? JSON.parse(init.body) : null; if (b) writes++;
  let data;
  if (path.includes('/contents/')) data = { type: 'file', encoding: 'base64', size: 7, sha: 'b'.repeat(40), content: Buffer.from('before\n').toString('base64') };
  else if (path.endsWith('/git/ref/heads/main')) data = { object: { sha: 'a'.repeat(40) } };
  else if (path.includes('/git/commits/')) data = { tree: { sha: 'tree-base' } };
  else if (path.endsWith('/git/trees')) data = { sha: 'new-tree' };
  else if (path.endsWith('/git/commits')) data = { sha: 'new-commit' };
  else if (path.includes('/git/ref/heads/')) { if (!branch) return new Response('{}', { status: 404 }); data = { object: { sha: branch } }; }
  else if (path.endsWith('/git/refs')) { branch = b.sha; data = { object: { sha: branch } }; }
  else if (path.endsWith('/pulls') && !b) data = pr ? [pr] : [];
  else if (path.endsWith('/pulls')) { assert.equal(b.draft, true); pr = { number: 99, html_url: 'https://github.com/fixture/repo/pull/99', head: { ref: b.head } }; data = pr; }
  else throw new Error('Unexpected fixture request');
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
 };
 try {
  const prepared = await request(`/api/github-changes/proposals/${p._id}/prepare`, body, { 'Idempotency-Key': 'fixture-write-01' }); assert.equal(prepared.status, 201); const intent = await prepared.json(); assert.ok(intent.diff.includes('-before'));
  assert.equal((await request(`/api/github-changes/${intent._id}/confirm`, { hash: intent.hash, confirm: false })).status, 403); assert.equal(writes, 0);
  const confirmed = await request(`/api/github-changes/${intent._id}/confirm`, { hash: intent.hash, confirm: true }); assert.equal(confirmed.status, 200); assert.equal((await confirmed.json()).number, 99); const count = writes;
  assert.equal((await request(`/api/github-changes/${intent._id}/confirm`, { hash: intent.hash, confirm: true })).status, 200); assert.equal(writes, count);
  await Workflow.updateOne({ incidentId: incident._id }, { $set: { 'workflow.currentReviewId': 'other-review' } }); assert.equal((await request(`/api/github-changes/${intent._id}/confirm`, { hash: intent.hash, confirm: true })).status, 409);
 } finally { global.fetch = original; process.env.GITHUB_WRITE_ENABLED = 'false'; }
});
test('automatic conversion is opt-in, severity bounded and correlated repeated failures share one incident/run', async () => {
 const signals = require('../src/services/signals');
 const timestamp = new Date().toISOString();
 const a = signals.normalizeGitHub({ ...payload(400, timestamp), workflow_run: { ...payload(400, timestamp).workflow_run, workflow_id: 55 } }, 'workflow_run', 'auto-first-delivery');
 await signals.ingest(a); assert.equal((await Signal.findOne({ signalId: a.signalId }).lean()).incidentId, undefined);
 process.env.SIGNAL_AUTO_CREATE = 'true'; process.env.SIGNAL_AUTO_INVESTIGATE = 'true';
 try {
  const first = await signals.ingest(a);
  const b = signals.normalizeGitHub({ ...payload(401, timestamp), workflow_run: { ...payload(401, timestamp).workflow_run, workflow_id: 55 } }, 'workflow_run', 'auto-next-delivery');
  const second = await signals.ingest(b); assert.equal(String(first.incidentId), String(second.incidentId)); assert.equal(await Run.countDocuments({ incidentId: first.incidentId }), 1);
  const low = { ...b, signalId: require('node:crypto').randomUUID(), deduplicationKey: 'low-fixture-key', severity: 'Low' }; assert.equal((await signals.ingest(low)).incidentId, undefined);
 } finally { process.env.SIGNAL_AUTO_CREATE = 'false'; process.env.SIGNAL_AUTO_INVESTIGATE = 'false'; }
});
test('Mongo local vector retrieval preserves citations, model compatibility, reindex/delete and explicit lexical fallback', async () => {
 const Document = require('../src/models/KnowledgeDocument'); await Document.init();
 const { ingest, retrieve } = require('../src/services/knowledge'); const { indexVectors } = require('../src/services/embeddings');
 const env = { KNOWLEDGE_WORKSPACE: 'pass2-test-semantic', KNOWLEDGE_EMBEDDING_MODEL: 'test-fixture-model', KNOWLEDGE_EMBEDDING_DIMENSION: '3' };
 const original = global.fetch;
 global.fetch = async (url, init) => {
  if (!String(url).includes('11434/api/embed')) return original(url, init);
  return new Response(JSON.stringify({ embeddings: JSON.parse(init.body).input.map(text => text.includes('timeout') ? [1, 0, 0] : [0, 1, 0]) }), { headers: { 'content-type': 'application/json' } });
 };
 try {
  const value = await indexVectors(ingest({ title: 'Timeout source', text: '# Recovery\ntimeout retry runbook', sourceUrl: 'https://example.test/runbook' }, 'fixture', env), env);
  const doc = await Document.create(value); const retrieval = await retrieve('timeout', env); assert.equal(retrieval.method, 'local_semantic'); assert.equal(retrieval.results[0].documentId, String(doc._id)); assert.equal(retrieval.results[0].score, 1); assert.equal(retrieval.results[0].sourceUrl, 'https://example.test/runbook');
  const changed = await retrieve('timeout', { ...env, KNOWLEDGE_EMBEDDING_MODEL: 'new-model' }); assert.equal(changed.method, 'local_lexical'); assert.ok(changed.fallbackReason.includes('reindex'));
  const reindexed = await indexVectors(ingest({ title: 'Timeout source', text: '# Recovery\ntimeout retry runbook' }, 'fixture', env), { ...env, KNOWLEDGE_EMBEDDING_MODEL: 'new-model' }); await Document.updateOne({ _id: doc._id }, { $set: reindexed }); assert.equal((await retrieve('timeout', { ...env, KNOWLEDGE_EMBEDDING_MODEL: 'new-model' })).method, 'local_semantic');
  await Document.deleteOne({ _id: doc._id }); assert.deepEqual((await retrieve('timeout', env)).results, []);
 } finally { global.fetch = original; }
});
