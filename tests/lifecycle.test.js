const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Incident = require('../src/models/Incident');
const runtime = require('../src/services/agentRuntime');
const originalRun = runtime.runInvestigation;
let output;
runtime.runInvestigation = async () => { if (output instanceof Error) throw output; return output; };
process.env.OPERATIONS_LOCAL_MODE = 'true';
const app = require('../src/app');
let server, base, record;
const originalFind = Incident.findById;
const originalCreate = Incident.create;
before(async () => {
    Incident.findById = async () => record;
    Incident.create = async value => { record = { ...value, _id: 'test-id', save: async () => {} }; return record; };
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { Incident.findById = originalFind; Incident.create = originalCreate; runtime.runInvestigation = originalRun; await new Promise(resolve => server.close(resolve)); });
async function request(path, method, body) { const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json() }; }
test('legacy creation completes into Open and persists all agent outputs', async () => {
    output = { success: true, analysis: 'analysis fixture', investigation: 'investigation fixture', actions: 'action fixture' };
    const response = await request('/api/analyse', 'POST', { problem: 'Test-only incident', severity: 'High' });
    assert.equal(response.status, 200); assert.equal(record.status, 'Open'); assert.equal(record.actions, output.actions);
});
test('legacy resolution requires action verification and reopening resets action state', async () => {
    record = { _id: 'test-id', status: 'Open', actions: 'fixture', actionStatus: 'Recommended', save: async () => {} };
    assert.equal((await request('/api/incidents/test-id/status', 'PATCH', { status: 'Resolved' })).status, 409);
    record.actionStatus = 'Verified';
    assert.equal((await request('/api/incidents/test-id/status', 'PATCH', { status: 'Resolved' })).status, 200);
    assert.equal(record.status, 'Resolved');
    await request('/api/incidents/test-id/status', 'PATCH', { status: 'Open' });
    assert.equal(record.actionStatus, 'Recommended');
});
test('legacy actions progress through review and verification without accepting skipped transitions', async () => {
    record = { _id: 'test-id', title: 'Fixture', status: 'Open', actions: 'fixture', actionStatus: 'Recommended', save: async () => {} };
    assert.equal((await request('/api/actions/test-id/status', 'PATCH', { status: 'Verified' })).status, 409);
    for (const status of ['In progress', 'Awaiting verification', 'Verified']) assert.equal((await request('/api/actions/test-id/status', 'PATCH', { status })).status, 200);
    assert.equal(record.status, 'Awaiting review');
});
test('legacy failed investigation remains retryable; retry returns a complete incident', async () => {
    output = new Error('deterministic fixture failure');
    assert.equal((await request('/api/analyse', 'POST', { problem: 'Test failure' })).status, 502);
    assert.equal(record.status, 'Investigating'); assert.ok(record.investigationError);
    output = { success: true, analysis: 'a', investigation: 'i', actions: 'r' };
    const response = await request('/api/incidents/test-id/retry', 'POST', {});
    assert.equal(response.status, 200); assert.equal(response.body.status, 'Open'); assert.equal(response.body.description, 'Test failure'); assert.equal(response.body.investigation, 'i');
    assert.equal((await request('/api/incidents/test-id/retry', 'POST', {})).status, 409);
});
test('manual creation rejects lifecycle/output injection and persists an Open incident', async () => {
    assert.equal((await request('/api/incidents', 'POST', { title: 'Test manual incident', description: 'Test-only description', status: 'Resolved' })).status, 400);
    assert.equal((await request('/api/incidents', 'POST', { title: 'Test manual incident', description: 'Test-only description', actions: 'Injected AI output' })).status, 400);
    const response = await request('/api/incidents', 'POST', { title: 'Test manual incident', description: 'Test-only description', service: 'Test service', severity: 'High' });
    assert.equal(response.status, 201); assert.equal(record.status, 'Open'); assert.equal(record.actions, undefined);
});
