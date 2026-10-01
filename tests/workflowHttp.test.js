const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
let server, base;
before(async () => { process.env.OPERATIONS_API_TOKEN = 'test-only-workflow-token-more-than-32-characters'; process.env.OPERATIONS_REVIEWER_ID = 'test-engineer'; server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(r => server.close(r)); });
test('workflow HTTP denies anonymous reads and validates IDs and privileged actions before DB access', async () => {
 assert.equal((await fetch(base + '/api/incidents/000000000000000000000001/workflow')).status, 401);
 const headers = { Authorization: `Bearer ${process.env.OPERATIONS_API_TOKEN}`, 'Content-Type': 'application/json' };
 assert.equal((await fetch(base + '/api/incidents/bad-id/workflow', { headers })).status, 400);
 const response = await fetch(base + '/api/incidents/000000000000000000000001/workflow', { method: 'POST', headers, body: JSON.stringify({ version: 0, action: 'approve-report', notes: 'Not an approver' }) }); assert.equal(response.status, 403);
});
