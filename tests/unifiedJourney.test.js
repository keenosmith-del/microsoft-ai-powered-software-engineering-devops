const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const database = require('./localDatabase');
const Incident = require('../src/models/Incident');
const Workflow = require('../src/models/IncidentWorkflow');
const Run = require('../src/models/InvestigationRun');
const Proposal = require('../src/models/RemediationProposal');
const Session = require('../src/models/OperationSession');
const lifecycle = require('../src/services/incidentLifecycle');
const { createInvestigationWorker } = require('../src/services/investigationWorker');
const fixture = require('./runtimeFixture');
const app = require('../src/app');
const engineer = 'test-engineer-credential-with-at-least-32-characters';
const approver = 'test-approver-credential-with-at-least-32-characters';
let mongo, server, base;
before(async () => {
 process.env.OPERATIONS_API_TOKEN = engineer; process.env.OPERATIONS_REVIEWER_ID = 'test-engineer'; process.env.OPERATIONS_ROLE = 'engineer'; process.env.OPERATIONS_APPROVER_TOKEN = approver; process.env.OPERATIONS_APPROVER_ID = 'test-approver'; process.env.OPERATIONS_LOCAL_MODE = 'false';
 mongo = await database(); await mongoose.connect(mongo.getUri()); await Promise.all([Incident.init(), Workflow.init(), Run.init(), Proposal.init(), Session.init()]);
 server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) { server.closeAllConnections(); await new Promise(r => server.close(r)); } await mongoose.disconnect(); if (mongo) await mongo.stop(); });
async function request(path, method = 'GET', body, options = {}) {
 const headers = { 'Content-Type': 'application/json', ...(options.cookie ? { Cookie: options.cookie } : { Authorization: `Bearer ${options.token || engineer}` }), ...(options.csrf ? { 'X-CSRF-Token': options.csrf } : {}), ...(options.key ? { 'Idempotency-Key': options.key } : {}), ...options.headers };
 const response = await fetch(base + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 return { status: response.status, data: response.status === 204 ? null : await response.json(), response };
}
const evidence = [{ source: 'manual', reference: 'https://example.test/incident-log', observation: 'Deterministic test-only failure and recovery evidence' }];
async function command(id, action, fields = {}) { const current = await request(`/api/incidents/${id}/workflow`); return request(`/api/incidents/${id}/workflow`, 'POST', { version: current.data.version, action, notes: 'Test human engineering decision', ...fields }); }
function worker(output = fixture) { return createInvestigationWorker({ fetcher: async () => output(), retrieval: async () => ({ results: [] }), statusWriter: async () => {} }); }
test('one real persisted journey: duplicate creation, stages, review, proposal draft/approval, manual recovery, resolution, reports and reopening', async () => {
 const key = randomUUID(); const body = { title: 'Journey fixture', description: 'Test-only recovery incident', severity: 'High', investigate: true };
 const submissions = await Promise.all([request('/api/incidents', 'POST', body, { key }), request('/api/incidents', 'POST', body, { key })]);
 assert.ok(submissions.every(r => r.status === 201), JSON.stringify(submissions.map(r => r.data))); const id = submissions[0].data._id; assert.equal(submissions[1].data._id, id); assert.equal(await Run.countDocuments({ incidentId: id }), 1);
 assert.equal((await request(`/api/incidents/${id}`)).data.status, 'Investigating');
 await worker().tick(); const run = await Run.findOne({ incidentId: id }); assert.equal(run.status, 'completed'); assert.equal(run.events.filter(e => e.status === 'completed' && e.elapsedMs !== undefined).length, 3);
 assert.equal((await request(`/api/incidents/${id}`)).data.status, 'Awaiting review');
 const review = await command(id, 'review', { runId: run.runId, decision: 'accepted', evidence }); assert.equal(review.status, 200);
 const proposalBody = { incidentId: id, runId: run.runId, title: 'Fix worker handling', action: 'External manual corrective change', rationale: 'Inspected incident evidence', validationPlan: 'Verify the original symptom', target: 'Fixture service', risk: 'low', owner: 'test-owner' };
 const created = await request('/api/remediation', 'POST', proposalBody, { key: randomUUID() }); assert.equal(created.status, 201, JSON.stringify(created.data)); const proposal = created.data;
 assert.equal((await request(`/api/incidents/${id}`)).data.status, 'Remediation planned');
 const edited = await request(`/api/remediation/${proposal._id}`, 'PATCH', { version: 0, owner: 'assigned-engineer' }); assert.equal(edited.status, 200);
 assert.equal((await request(`/api/remediation/${proposal._id}/review`, 'POST', { version: 1, decision: 'approved', comment: 'Reviewed risk' })).status, 403);
 const approval = await request(`/api/remediation/${proposal._id}/review`, 'POST', { version: 1, decision: 'approved', comment: 'Approved external change' }, { token: approver }); assert.equal(approval.status, 200, JSON.stringify(approval.data));
 assert.equal((await command(id, 'record-change', { proposalId: proposal._id, reference: 'https://example.test/change', performedBy: 'assigned-engineer', performedAt: new Date(0).toISOString() })).status, 409);
 assert.equal((await command(id, 'start-remediation', { proposalId: proposal._id })).status, 200);
 assert.equal((await command(id, 'record-change', { proposalId: proposal._id, reference: 'https://example.test/change', performedBy: 'assigned-engineer', performedAt: new Date(0).toISOString() })).status, 200);
 assert.equal((await request(`/api/incidents/${id}`)).data.status, 'Verifying');
 assert.equal((await command(id, 'verify', { result: 'inconclusive', criteria: 'Original failure absent', evidence })).status, 200);
 assert.equal((await command(id, 'resolve', { outstandingRisks: 'Unknown' })).status, 409);
 await command(id, 'verify', { result: 'failed', criteria: 'Original failure absent', evidence }); assert.equal((await request(`/api/incidents/${id}`)).data.status, 'In remediation');
 await command(id, 'record-change', { proposalId: proposal._id, reference: 'https://example.test/revised-change', performedBy: 'assigned-engineer', performedAt: new Date(0).toISOString() });
 await command(id, 'verify', { result: 'passed', criteria: 'Original failure absent', evidence }); assert.equal((await command(id, 'resolve', { outstandingRisks: 'Continue monitoring' })).status, 200);
 let current = (await request(`/api/incidents/${id}`)).data; assert.equal(current.status, 'Resolved'); assert.equal((await Incident.findById(id)).status, 'Resolved');
 assert.equal((await request('/api/incidents')).data.find(i => i._id === id).status, 'Resolved');
 await command(id, 'draft-report', { content: '# Lessons\nJourneyfixture recovery evidence and prevention.' });
 let w = (await request(`/api/incidents/${id}/workflow`)).data;
 assert.equal((await request(`/api/incidents/${id}/workflow`, 'POST', { version: w.version, action: 'approve-report', notes: 'Report approved' }, { token: approver })).status, 200);
 const indexed = await request(`/api/incidents/${id}/workflow/report/index`, 'POST'); assert.equal(indexed.status, 200);
 assert.ok((await request('/api/knowledge/search?q=Journeyfixture')).data.results.some(r => r.documentId === indexed.data.documentId));
 assert.equal((await command(id, 'reopen')).status, 200); current = (await request(`/api/incidents/${id}`)).data; assert.equal(current.status, 'Open'); assert.equal(current.workflow.resolutions.length, 1);
 const repeatedKey = randomUUID(); const reinvestigate = { version: current.lifecycleVersion, action: 'reinvestigate', notes: 'Recurrence investigation', requestKey: repeatedKey };
 assert.equal((await request(`/api/incidents/${id}/workflow`, 'POST', reinvestigate)).status, 200);
 assert.equal((await request(`/api/incidents/${id}/workflow`, 'POST', reinvestigate)).status, 200);
 assert.equal(await Run.countDocuments({ incidentId: id }), 2); await worker().tick();
 assert.equal((await request(`/api/incidents/${id}`)).data.workflow.resolutions.length, 1);
 const terminalAudit = (await request(`/api/incidents/${id}/workflow`)).data.audit.filter(e => e.action === 'investigation-completed'); await lifecycle.repair();
 assert.equal((await request(`/api/incidents/${id}/workflow`)).data.audit.filter(e => e.action === 'investigation-completed').length, terminalAudit.length);
});
test('historical adoption preserves outputs without invented decisions; failure/cancellation/restart and stale writers recover', async () => {
 const old = await Incident.create({ title: 'Historical', description: 'Existing incident', status: 'Resolved', analysis: 'Preserved prior output' });
 const adopted = await lifecycle.read(old.id); assert.equal(adopted.status, 'Resolved'); assert.equal(adopted.analysis, 'Preserved prior output'); assert.equal(adopted.workflow.audit.length, 0);
 const key = randomUUID(); const created = await request('/api/incidents', 'POST', { title: 'Failure fixture', description: 'Test failure' }, { key }); const id = created.data._id;
 const queued = await lifecycle.submit(id, 'test-engineer', randomUUID());
 await Run.updateOne({ runId: queued.runId }, { $set: { status: 'running', attempts: 2, leaseOwner: 'crashed-worker', leaseUntil: new Date(0) } });
 await worker(() => new Response(JSON.stringify({ stage: 'software-engineering', status: 'running', at: new Date().toISOString() }) + '\n' + JSON.stringify({ stage: 'software-engineering', status: 'failed', at: new Date().toISOString(), elapsedMs: 2 }) + '\n', { headers: { 'Content-Type': 'application/x-ndjson' } })).tick();
 assert.equal((await request(`/api/incidents/${id}`)).data.status, 'Open');
 const cancelled = await lifecycle.submit(id, 'test-engineer', randomUUID()); assert.equal((await request(`/api/investigations/${cancelled.runId}/cancel`, 'POST')).status, 200); assert.equal((await request(`/api/incidents/${id}`)).data.status, 'Open');
 const latest = await lifecycle.read(id); const commands = await Promise.all([command(id, 'reinvestigate', { requestKey: randomUUID() }), command(id, 'reinvestigate', { requestKey: randomUUID() })]); assert.ok(commands.some(r => r.status === 409));
 assert.equal((await request(`/api/incidents/${id}/status`, 'PATCH', { status: 'Resolved', version: latest.lifecycleVersion, notes: 'Bypass' })).status, 409);
});
test('HttpOnly sessions persist across requests, reject CSRF, separate approval role, and expire', async () => {
 const login = await request('/api/session', 'POST', { token: engineer }, { headers: { Origin: 'http://127.0.0.1:5173' } }); assert.equal(login.status, 200);
 const cookie = login.response.headers.get('set-cookie').split(';')[0]; assert.match(login.response.headers.get('set-cookie'), /HttpOnly/); assert.match(login.response.headers.get('set-cookie'), /SameSite=Strict/);
 assert.equal((await request('/api/session', 'GET', undefined, { cookie })).data.role, 'engineer');
 const body = { title: 'CSRF fixture', description: 'Session test' };
 assert.equal((await request('/api/incidents', 'POST', body, { cookie, key: randomUUID() })).status, 403);
 assert.equal((await request('/api/incidents', 'POST', body, { cookie, csrf: login.data.csrf, key: randomUUID() })).status, 201);
 await Session.updateMany({}, { $set: { expiresAt: new Date(0) } }); assert.equal((await request('/api/session', 'GET', undefined, { cookie })).status, 401);
});
test('killed worker process leaves a recoverable lease; competing recovery workers persist one terminal outcome', async () => {
 const { spawn } = require('node:child_process');
 const incident = await lifecycle.create({ title: 'Crash recovery fixture', description: 'Test-only killed worker' }, 'test-engineer', randomUUID());
 const run = await lifecycle.submit(incident._id, 'test-engineer', randomUUID());
 // Isolate the claim from earlier queued test runs.
 await Run.updateMany({ runId: { $ne: run.runId }, status: { $in: ['queued', 'running'] } }, { $set: { status: 'cancelled' } });
 const child = spawn(process.execPath, ['tests/workerProcess.js'], { env: { ...process.env, TEST_WORKER_MONGODB_URI: mongo.getUri() }, stdio: 'ignore' });
 try {
  let claimed = false;
  for (let n = 0; n < 50; n++) { if ((await Run.findOne({ runId: run.runId })).status === 'running') { claimed = true; break; } await new Promise(r => setTimeout(r, 50)); }
  assert.ok(claimed); const exited = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGKILL'); await exited;
  // Advance the persisted deadline instead of waiting a minute for real time.
  await Run.updateOne({ runId: run.runId }, { $set: { leaseUntil: new Date(0) } });
  await Promise.all([worker().tick(), worker().tick()]);
  const recovered = await Run.findOne({ runId: run.runId }); assert.equal(recovered.status, 'completed'); assert.equal(recovered.attempts, 2);
  assert.equal((await lifecycle.read(incident._id)).status, 'Awaiting review');
  assert.equal((await lifecycle.read(incident._id)).workflow.audit.filter(e => e.action === 'investigation-completed').length, 1);
 } finally { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }
});

test('older run and proposal pages remain isolated, complete and bounded', async () => {
 const incident = await Incident.create({ title: 'Pagination fixture', description: 'Only test history' });
 const runs = await Run.insertMany(Array.from({ length: 23 }, (_, i) => ({ incidentId: incident._id, requestedBy: 'pagination-test', idempotencyKey: `history-${i}`, status: 'completed', currentStage: 'completed' })));
 await Proposal.insertMany(runs.map(run => ({ incidentId: incident._id, runId: run.runId, title: 'Historical proposal', action: 'External only', rationale: 'Test', validationPlan: 'Test', target: 'Test', risk: 'low', requestedBy: 'pagination-test' })));
 for (const path of ['/api/investigations', '/api/remediation']) {
  const first = await request(`${path}?incidentId=${incident._id}&page=1`); const second = await request(`${path}?incidentId=${incident._id}&page=2`);
  assert.equal(first.status, 200); assert.equal(first.data.items.length, 20); assert.equal(first.data.hasNext, true);
  assert.equal(second.data.items.length, 3); assert.equal(second.data.hasNext, false);
  assert.equal(new Set([...first.data.items, ...second.data.items].map(item => item._id)).size, 23);
  assert.ok(second.data.items.every(item => item.incidentId === String(incident._id)));
  assert.equal((await request(`${path}?page=101`)).status, 400);
 }
 const legacy = await Proposal.findOne({ incidentId: incident._id });
 assert.equal((await request(`/api/remediation/${legacy._id}/review`, 'POST', { version: 0, decision: 'approved', comment: 'Attempt to bypass review' }, { token: approver })).status, 409);
});
