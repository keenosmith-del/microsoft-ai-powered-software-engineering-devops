const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const router = require('../src/routes/investigations');
const remediation = require('../src/routes/remediation');
const Run = require('../src/models/InvestigationRun');
const Proposal = require('../src/models/RemediationProposal');
let server, base;
const token = 'test-only-token-long-enough-for-authentication';
const oldToken = process.env.OPERATIONS_API_TOKEN, oldReviewer = process.env.OPERATIONS_REVIEWER_ID;
const oldFind = Run.findOne;
const oldUpdate = Proposal.findOneAndUpdate;
before(async () => {
    const app = express(); app.use(express.json()); app.use('/runs', router); app.use('/proposals', remediation);
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    if (oldToken === undefined) delete process.env.OPERATIONS_API_TOKEN; else process.env.OPERATIONS_API_TOKEN = oldToken;
    if (oldReviewer === undefined) delete process.env.OPERATIONS_REVIEWER_ID; else process.env.OPERATIONS_REVIEWER_ID = oldReviewer;
    Run.findOne = oldFind; Proposal.findOneAndUpdate = oldUpdate;
    await new Promise(resolve => server.close(resolve));
});
test('new APIs fail closed when auth is unconfigured or invalid', async () => {
    delete process.env.OPERATIONS_API_TOKEN;
    assert.equal((await fetch(base + '/runs')).status, 503);
    process.env.OPERATIONS_API_TOKEN = token; process.env.OPERATIONS_REVIEWER_ID = 'test-reviewer';
    assert.equal((await fetch(base + '/runs')).status, 401);
    assert.equal((await fetch(base + '/runs', { headers: { Authorization: 'Bearer wrong-token' } })).status, 401);
});
test('SSE replay respects event cursor and closes at terminal state; JSON polling returns matching events', async () => {
    process.env.OPERATIONS_API_TOKEN = token; process.env.OPERATIONS_REVIEWER_ID = 'test-reviewer';
    Run.findOne = () => ({ select() { return this; }, lean: async () => ({ status: 'completed', events: [{ id: 1, status: 'queued' }, { id: 2, status: 'running' }, { id: 3, status: 'completed' }] }) });
    const path = '/runs/00000000-0000-0000-0000-000000000001/events';
    const headers = { Authorization: `Bearer ${token}`, 'Last-Event-ID': '2' };
    const response = await fetch(base + path, { headers });
    const body = await response.text();
    assert.ok(body.includes('id: 3')); assert.ok(!body.includes('id: 2'));
    const polling = await fetch(base + path + '?format=json&after=2', { headers: { Authorization: `Bearer ${token}` } });
    assert.deepEqual((await polling.json()).events, [{ id: 3, status: 'completed' }]);
});
test('shared engineer cannot approve a proposal even with a valid bearer token', async () => {
 const response = await fetch(base + '/proposals/000000000000000000000001/review', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'approved', version: 4, comment: 'Test review' }) });
 assert.equal(response.status, 403);
});
test('remote execution remains disabled even with valid authorization', async () => {
    const response = await fetch(base + '/proposals/test/execute', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 403); assert.equal((await response.json()).code, 'EXECUTION_DISABLED');
});
test('SSE connection bound survives rate-window rollover and releases on close', () => {
    const limit = require('../src/middleware/operationsLimit');
    const originalNow = Date.now;
    let at = 1000000, accepted = 0, rejected = 0;
    const closers = [];
    Date.now = () => at;
    const req = { actor: 'isolated-stream-limit-test', path: '/test/events', query: {} };
    const res = { set() { return this; }, status(code) { if (code === 429) rejected++; return this; }, json() {}, once(_event, fn) { closers.push(fn); } };
    try {
        for (let i = 0; i < 10; i++) limit(req, res, () => accepted++);
        at += 61000;
        limit(req, res, () => accepted++);
        assert.equal(accepted, 10); assert.equal(rejected, 1);
        closers.forEach(close => close());
        limit(req, res, () => accepted++);
        assert.equal(accepted, 11);
    } finally { Date.now = originalNow; closers.forEach(close => close()); }
});
