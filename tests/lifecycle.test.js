const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const lifecycle = require('../src/services/incidentLifecycle');
const app = require('../src/app');
let server, base; const original = lifecycle.create;
before(async () => { process.env.OPERATIONS_LOCAL_MODE = 'true'; server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { lifecycle.create = original; await new Promise(r => server.close(r)); });
async function post(path, body) { return fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'legacy-test-key' }, body: JSON.stringify(body) }); }
test('legacy analyse is a durable compatibility entry and preserves complete incident shape', async () => {
 let supplied;
 lifecycle.create = async body => { supplied = body; return { _id: '000000000000000000000001', description: body.description, status: 'Investigating', analysis: 'Preserved earlier output', investigation: '', actions: '' }; };
 const response = await post('/api/analyse', { problem: 'Compatibility fixture', severity: 'High' }); const body = await response.json();
 assert.equal(response.status, 202); assert.equal(supplied.investigate, true); assert.equal(body.incidentId, body._id); assert.equal(body.analysis, 'Preserved earlier output'); lifecycle.create = original;
});
test('legacy status and action shortcuts cannot bypass evidence-backed lifecycle decisions', async () => {
 for (const path of ['/api/incidents/000000000000000000000001/status', '/api/actions/000000000000000000000001/status']) {
  const response = await fetch(base + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Resolved' }) }); assert.equal(response.status, 409);
 }
});
test('manual creation rejects lifecycle/output injection and missing idempotency key before persistence', async () => {
 for (const extra of [{ status: 'Resolved' }, { actions: 'Injected output' }]) assert.equal((await post('/api/incidents', { title: 'Fixture', description: 'Fixture', ...extra })).status, 400);
 const response = await fetch(base + '/api/incidents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Fixture', description: 'Fixture' }) }); assert.equal(response.status, 400);
});
