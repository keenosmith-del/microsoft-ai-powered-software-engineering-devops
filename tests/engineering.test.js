const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEngineeringService } = require('../src/services/engineering');
const query = value => ({ maxTimeMS() { return this; }, sort() { return this; }, limit() { return this; }, select() { return this; }, lean() { return Promise.resolve(value); }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });

test('missing configuration is truthful, unavailable database is not zero, and cache coalesces requests', async () => {
    let requests = 0;
    const overview = createEngineeringService({ env: {}, db: { readyState: 0 }, fetcher: async () => { requests++; return { ok: true, json: async () => ({ status: 'ok' }) }; } });
    const [a, b] = await Promise.all([overview(), overview()]);
    assert.equal(requests, 1);
    assert.deepEqual(a.metrics, { activeIncidents: null, totalIncidents: null, highPrioritySignals: null, completedInvestigations: null, failedInvestigations: null });
    assert.equal(b.services.find(s => s.id === 'github').status, 'not_configured');
    assert.equal(a.services.find(s => s.id === 'foundry').status, 'not_configured');
    assert.equal((await overview()).cached, true);
});
test('authenticated Foundry does not prove model health; upstream errors do not expose secrets', async () => {
    const overview = createEngineeringService({ env: { FOUNDRY_PROJECT_ENDPOINT: 'https://example.invalid', AZURE_OPENAI_DEPLOYMENT: 'configured', GITHUB_OWNER: 'owner', GITHUB_REPOSITORY: 'repo' }, db: { readyState: 0 }, fetcher: async url => {
        if (url.includes('github')) throw new Error('Bearer secret-value');
        return { ok: true, json: async () => url.endsWith('/platform') ? { foundry: { authentication: 'authenticated' } } : { status: 'ok' } };
    } });
    const result = await overview();
    assert.equal(result.services.find(s => s.id === 'foundry').status, 'unknown');
    assert.equal(result.services.find(s => s.id === 'github').status, 'unavailable');
    assert.ok(!JSON.stringify(result).includes('secret-value'));
});
test('actual queries count unresolved records including awaiting review and return bounded activity', async () => {
    const filters = [];
    const overview = createEngineeringService({ env: {}, db: { readyState: 1, db: { admin: () => ({ ping: async () => ({ ok: 1 }) }) } }, incidents: {
        countDocuments(filter) { filters.push(filter); return query(filters.length); },
        find() { return query([{ _id: 'persisted', title: 'Recorded incident', status: 'Awaiting review' }]); },
    }, runs: { countDocuments: () => query(0) }, workerStates: { findOne: () => query(null) }, fetcher: async () => ({ ok: true, json: async () => ({ status: 'ok' }) }) });
    const result = await overview();
    assert.deepEqual(filters[0], { status: { $ne: 'Resolved' } });
    assert.equal(result.metrics.activeIncidents, 1);
    assert.equal(result.activity[0]._id, 'persisted');
    assert.equal(result.dataError, null);
});
test('HTTP failure preserves useful status without provider response bodies', async () => {
    const overview = createEngineeringService({ env: {}, db: { readyState: 0 }, fetcher: async () => ({ ok: false, status: 503 }) });
    assert.equal((await overview()).services.find(s => s.id === 'agent_runtime').detail, 'HTTP 503');
});
