const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const Incident = require('../src/models/Incident');
const Run = require('../src/models/InvestigationRun');
const Knowledge = require('../src/models/KnowledgeDocument');
const Proposal = require('../src/models/RemediationProposal');
const Workflow = require('../src/models/IncidentWorkflow');
const { createInvestigationWorker } = require('../src/services/investigationWorker');
const app = require('../src/app');
const enabled = process.env.PHASE2_PERSISTENCE_TEST === 'true';
const database = `p2v_${randomUUID().replaceAll('-', '')}`;
const token = 'test-only-random-token-for-isolated-persistence';
let server, base, incident;
if (enabled) {
    before(async () => {
        process.env.OPERATIONS_API_TOKEN = token; process.env.OPERATIONS_REVIEWER_ID = 'test-reviewer';
        await mongoose.connect(process.env.PHASE2_TEST_MONGODB_URI || process.env.MONGODB_URI, { dbName: database, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 5000 });
        await Promise.all([Run.init(), Knowledge.init(), Workflow.init()]);
        incident = await Incident.create({ title: 'Test-only incident', description: 'Test-only worker timeout', status: 'Open' });
        server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`;
    });
    after(async () => {
        try {
            if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
            if (mongoose.connection.name === database && /^p2v_[a-f0-9]{32}$/.test(database)) await mongoose.connection.dropDatabase();
        } finally { await mongoose.disconnect(); }
    });
}
async function request(path, method = 'GET', body, key) {
    const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
}
test('isolated MongoDB: idempotent submission, expired lease recovery, complete history, RAG, approval and cancellation', { skip: !enabled }, async () => {
    const key = randomUUID();
    const [first, duplicate] = await Promise.all([request(`/api/incidents/${incident.id}/investigations`, 'POST', { triggerSource: 'manual' }, key), request(`/api/incidents/${incident.id}/investigations`, 'POST', { triggerSource: 'manual' }, key)]);
    assert.equal(first.status, 202, JSON.stringify(first.data)); assert.equal(duplicate.status, 202); assert.equal(first.data.runId, duplicate.data.runId);
    assert.equal(await Run.countDocuments(), 1);
    const ingestion = await request('/api/knowledge', 'POST', { title: 'Fixture runbook', text: '# Recovery\nWorker timeout recovery uses leases.' });
    assert.equal(ingestion.status, 201);
    const search = await request('/api/knowledge/search?q=worker%20timeout');
    assert.equal(search.data.results[0].documentId, String(ingestion.data.id));
    await Run.updateOne({ runId: first.data.runId }, { $set: { status: 'running', attempts: 1, leaseOwner: 'expired-test-owner', leaseUntil: new Date(0) } });
    const worker = createInvestigationWorker({ fetcher: async () => ({ ok: true, json: async () => ({ analysis: 'Test-only analysis', investigation: 'Test-only evidence', actions: 'Test-only recommendation' }) }) });
    await worker.tick();
    const completed = await request(`/api/investigations/${first.data.runId}`);
    assert.equal(completed.data.status, 'completed'); assert.equal(completed.data.attempts, 2); assert.equal(completed.data.result.actions, 'Test-only recommendation');
    assert.equal(completed.data.evidenceReferences[0].documentId, ingestion.data.id);
    assert.equal((await Incident.findById(incident.id)).status, 'Open');
    const proposal = await request('/api/remediation', 'POST', { incidentId: incident.id, runId: first.data.runId, title: 'Fixture proposal', action: 'Inspect timeout', rationale: 'Test fixture evidence', validationPlan: 'Run fixture tests', target: 'Test fixture code', risk: 'low' });
    assert.equal(proposal.status, 201);
    const approved = await request(`/api/remediation/${proposal.data._id}/review`, 'POST', { decision: 'approved', version: 0, comment: 'Test-only approval' });
    assert.equal(approved.status, 200); assert.equal(approved.data.executionStatus, 'disabled'); assert.equal(approved.data.audit.length, 2);
    assert.equal((await request(`/api/remediation/${proposal.data._id}/review`, 'POST', { decision: 'rejected', version: 0, comment: 'Stale test review' })).status, 409);
    const workflowPath = `/api/incidents/${incident.id}/workflow`;
    const evidence = [{ source: 'manual', reference: 'https://example.test/test-fixture', observation: 'Deterministic fixture observation; not live telemetry' }];
    const review = { version: 0, action: 'review', notes: 'Test-only accepted findings', runId: first.data.runId, decision: 'accepted', evidence };
    const competing = await Promise.all([request(workflowPath, 'POST', review), request(workflowPath, 'POST', review)]);
    assert.deepEqual(competing.map(response => response.status).sort(), [200, 409]);
    let workflow = (await request(workflowPath)).data;
    assert.equal(workflow.stage, 'plan'); assert.equal(workflow.audit.length, 1);
    workflow = (await request(workflowPath, 'POST', { version: workflow.version, action: 'record-change', notes: 'External test-only change', proposalId: String(proposal.data._id), reference: 'https://example.test/change-fixture' })).data;
    assert.equal(workflow.stage, 'verify');
    workflow = (await request(workflowPath, 'POST', { version: workflow.version, action: 'verify', notes: 'Test-only manual observation', result: 'inconclusive', criteria: 'Recovery not established', evidence })).data;
    assert.equal((await request(workflowPath, 'POST', { version: workflow.version, action: 'resolve', notes: 'Cannot resolve', outstandingRisks: 'Unknown' })).status, 409);
    workflow = (await request(workflowPath, 'POST', { version: workflow.version, action: 'verify', notes: 'Test-only passed observation', result: 'passed', criteria: 'Test fixture recovery', evidence })).data;
    workflow = (await request(workflowPath, 'POST', { version: workflow.version, action: 'resolve', notes: 'Explicit test-only resolution', outstandingRisks: 'Test fixture only' })).data;
    assert.equal(workflow.stage, 'resolved');
    assert.equal((await request(workflowPath + '/report/index', 'POST')).status, 409);
    workflow = (await request(workflowPath, 'POST', { version: workflow.version, action: 'draft-report', notes: 'Test-only report', content: '# Lessons\nTestfixture recovery is documented with manual evidence.' })).data;
    workflow = (await request(workflowPath, 'POST', { version: workflow.version, action: 'approve-report', notes: 'Human test-only report approval' })).data;
    const indexedReport = await request(workflowPath + '/report/index', 'POST');
    assert.equal(indexedReport.status, 200);
    assert.equal((await request(workflowPath + '/report/index', 'POST')).data.documentId, indexedReport.data.documentId);
    const learned = await request('/api/knowledge/search?q=Testfixture');
    assert.ok(learned.data.results.some(hit => hit.documentId === indexedReport.data.documentId));
    workflow = (await request(workflowPath, 'POST', { version: workflow.version, action: 'reopen', notes: 'Test-only reopening' })).data;
    assert.equal(workflow.stage, 'detect'); assert.equal(workflow.resolutions.length, 1); assert.equal(workflow.verifications.length, 2);
    assert.equal(await Workflow.countDocuments(), 1);
    workflow = (await request(workflowPath, 'POST', { version: workflow.version, action: 'reinvestigate', notes: 'Test-only targeted recovery investigation' })).data;
    assert.equal(workflow.stage, 'investigate');
    const targeted = await Run.findOne({ 'context.notes': 'Test-only targeted recovery investigation' });
    assert.ok(targeted); assert.equal(targeted.status, 'queued');
    assert.equal((await Workflow.findOne({ incidentId: incident.id })).workflow.pendingInvestigation, undefined);
    const pending = { runId: randomUUID(), actor: 'test-reviewer', at: new Date(), notes: 'Test-only outbox restart recovery' };
    await Workflow.updateOne({ incidentId: incident.id }, { $set: { 'workflow.pendingInvestigation': pending } });
    const outbox = require('../src/services/investigationOutbox');
    await outbox.drain(); await outbox.enqueue(incident.id, pending);
    assert.equal(await Run.countDocuments({ runId: pending.runId }), 1);
    assert.equal((await Workflow.findOne({ incidentId: incident.id })).workflow.pendingInvestigation, undefined);
    assert.equal((await Incident.findById(incident.id)).status, 'Open');
    const queued = await request(`/api/incidents/${incident.id}/investigations`, 'POST', {}, randomUUID());
    assert.equal((await request(`/api/investigations/${queued.data.runId}/cancel`, 'POST')).data.status, 'cancelled');
    await worker.tick();
    assert.equal((await Run.findOne({ runId: queued.data.runId })).status, 'cancelled');
    assert.equal(await Proposal.countDocuments(), 1);
});
