const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Workflow = require('../src/models/IncidentWorkflow');
const Incident = require('../src/models/Incident');
const Run = require('../src/models/InvestigationRun');
const Proposal = require('../src/models/RemediationProposal');
const originals = { exists: Incident.exists, find: Workflow.findOne, create: Workflow.create, update: Workflow.updateOne, run: Run.findOne, proposal: Proposal.findOne, token: process.env.OPERATIONS_API_TOKEN, actor: process.env.OPERATIONS_REVIEWER_ID };
const token = 'test-only-workflow-token-with-more-than-32-characters';
const id = '000000000000000000000001';
let record, server, base, conflict = false;
before(async () => {
 process.env.OPERATIONS_API_TOKEN = token; process.env.OPERATIONS_REVIEWER_ID = 'test-engineer';
 Incident.exists = async () => true;
 Workflow.findOne = () => ({ lean: async () => record });
 Workflow.create = async value => { record = value; return record; };
 Workflow.updateOne = async (filter, update) => {
  if (conflict || filter.version !== record.version) return { matchedCount: 0 };
  record = { ...record, ...update.$set }; return { matchedCount: 1 };
 };
 Run.findOne = filter => ({ lean: async () => filter.runId === 'run-fixture' ? { runId: 'run-fixture' } : null });
 Proposal.findOne = () => ({ lean: async () => null });
 const app = express(); app.use(express.json()); app.use('/incidents/:id/workflow', require('../src/routes/incidentWorkflow'));
 server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}/incidents/${id}/workflow`;
});
after(async () => {
 Incident.exists = originals.exists; Workflow.findOne = originals.find; Workflow.create = originals.create; Workflow.updateOne = originals.update; Run.findOne = originals.run; Proposal.findOne = originals.proposal;
 for (const [key, value] of [['OPERATIONS_API_TOKEN', originals.token], ['OPERATIONS_REVIEWER_ID', originals.actor]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
 await new Promise(resolve => server.close(resolve));
});
async function post(body) { return fetch(base, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
test('workflow HTTP denies anonymous reads, validates IDs and prevents stale or competing writes', async () => {
 assert.equal((await fetch(base)).status, 401);
 const headers = { Authorization: `Bearer ${token}` };
 assert.equal((await fetch(base.replace(id, 'bad-id'), { headers })).status, 400);
 assert.equal((await fetch(base, { headers })).status, 200); assert.equal(record, undefined);
 assert.equal((await post({ version: 0, action: 'review', notes: 'Review', runId: 'missing', decision: 'accepted', evidence: [] })).status, 409);
 const review = { version: 0, action: 'review', notes: 'Inspected source', runId: 'run-fixture', decision: 'accepted', evidence: [{ source: 'manual', reference: 'https://example.test/log', observation: 'Observed error' }] };
 const accepted = await post(review); assert.equal(accepted.status, 200); assert.equal((await accepted.json()).stage, 'plan');
 assert.equal((await post(review)).status, 409);
 conflict = true;
 assert.equal((await post({ version: 1, action: 'reinvestigate', notes: 'More evidence needed' })).status, 409);
 assert.equal(record.workflow.stage, 'plan'); conflict = false;
 assert.equal((await post({ version: 1, action: 'record-change', notes: 'Change', proposalId: id, reference: 'https://example.test/change' })).status, 409);
 assert.equal(record.workflow.audit.length, 1);
});
