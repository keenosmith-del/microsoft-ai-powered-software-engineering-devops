const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createInvestigationWorker } = require('../src/services/investigationWorker');
function fixture() {
    const writes = [];
    const run = { runId: 'fixture-id', incidentId: 'fixture-incident', attempts: 1, startedAt: new Date(0), correlationId: 'fixture-correlation' };
    const runs = { updateMany: async (filter, update) => { writes.push({ filter, update }); }, findOneAndUpdate: async (filter, update) => { writes.push({ filter, update }); return run; }, updateOne: async (filter, update) => { writes.push({ filter, update }); return { matchedCount: 1 }; } };
    const incidents = { findById: () => ({ lean: async () => ({ description: 'Test-only problem' }) }) };
    return { writes, run, runs, incidents, retrieval: async () => ({ results: [] }), statusWriter: async () => {} };
}
test('worker claims leased Mongo state and persists complete sanitized outputs without changing Incident', async () => {
    const f = fixture();
    let request;
    const worker = createInvestigationWorker({ ...f, owner: 'test-owner', now: () => 100, env: { GITHUB_TOKEN: 'test-secret-value' }, fetcher: async (_url, options) => { request = options; return { ok: true, json: async () => ({ analysis: 'Bearer private-token', investigation: 'test-secret-value', actions: 'Test output' }) }; } });
    await worker.tick();
    const claim = f.writes.find(write => write.update.$inc);
    assert.equal(claim.update.$set.leaseOwner, 'test-owner');
    const completed = f.writes.find(write => write.update.$set?.status === 'completed');
    assert.equal(completed.update.$set.result.analysis, 'Bearer [REDACTED]');
    assert.equal(completed.update.$set.result.investigation, '[REDACTED]');
    assert.equal(completed.filter.leaseOwner, 'test-owner');
    assert.equal(completed.filter.status, 'running');
    assert.equal(request.headers['X-Correlation-ID'], 'fixture-correlation');
});
test('runtime failures retry with backoff and terminal failure after three attempts', async () => {
    for (const attempt of [1, 3]) {
        const f = fixture(); f.run.attempts = attempt;
        await createInvestigationWorker({ ...f, now: () => 100, fetcher: async () => { throw new Error('Provider secret'); } }).tick();
        const failure = f.writes.find(write => write.update.$set?.error === 'Runtime failed or timed out');
        assert.equal(failure.update.$set.status, attempt === 3 ? 'failed' : 'queued');
        assert.equal(failure.update.$set.nextAttemptAt.getTime(), 100 + 10000 * 2 ** (attempt - 1));
        assert.ok(!JSON.stringify(f.writes).includes('Provider secret'));
    }
});
test('malformed results are terminal and cannot be treated as successful investigation', async () => {
    const f = fixture();
    await createInvestigationWorker({ ...f, fetcher: async () => ({ ok: true, json: async () => ({ analysis: '' }) }) }).tick();
    assert.equal(f.writes.find(write => write.update.$set?.error === 'Agent runtime returned invalid structured output').update.$set.status, 'failed');
});
test('overlapping ticks cannot claim concurrent work in the same worker', async () => {
    const f = fixture();
    let calls = 0;
    const worker = createInvestigationWorker({ ...f, fetcher: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return { ok: false }; } });
    await Promise.all([worker.tick(), worker.tick()]);
    assert.equal(calls, 1);
});
