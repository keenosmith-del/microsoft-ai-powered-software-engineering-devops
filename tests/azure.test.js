const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAzureDiagnostics } = require('../src/services/azureDiagnostics');
const env = { AZURE_SUBSCRIPTION_ID: '00000000-0000-0000-0000-000000000000', AZURE_RESOURCE_GROUP: 'test-group' };
test('Azure scope and time window reject cross-scope and unbounded requests', async () => {
    const azure = createAzureDiagnostics({ env });
    await assert.rejects(azure.inventory('other-group'), error => error.status === 403);
    await assert.rejects(azure.activity('test-group', 1000), error => error.status === 400);
    await assert.rejects(azure.activity("group' injection", 24), error => error.status === 400);
});
test('Azure inventory and Activity Log use real scoped REST requests and bounded projection', async () => {
    const urls = [];
    const azure = createAzureDiagnostics({ env, now: () => Date.parse('2026-01-01T00:00:00Z'), credential: { getToken: async () => ({ token: 'secret-fixture' }) }, fetcher: async url => { urls.push(url); return { ok: true, json: async () => ({ value: [{ id: '/subscriptions/test/resourceGroups/test-group/providers/test/resource', name: 'test-resource', type: 'test/type', properties: { secret: 'not-returned' }, eventDataId: 'event-fixture', eventTimestamp: '2026-01-01', status: { value: 'Succeeded' } }], nextLink: 'https://management.azure.com/next' }) }; } });
    const resources = await azure.inventory('test-group');
    assert.ok(urls[0].includes('/resourceGroups/test-group/resources'));
    assert.equal(resources.truncated, true);
    assert.ok(!JSON.stringify(resources).includes('not-returned'));
    const events = await azure.activity('test-group', 24);
    const filter = new URL(urls[1]).searchParams.get('$filter');
    assert.ok(filter.includes("resourceGroupName eq 'test-group'"));
    assert.equal(events.items[0].status, 'Succeeded');
});
test('Azure failures redact identity errors and missing config is actionable', async () => {
    await assert.rejects(createAzureDiagnostics({ env: {} }).inventory(), error => error.code === 'NOT_CONFIGURED');
    await assert.rejects(createAzureDiagnostics({ env, credential: { getToken: async () => { throw new Error('private-token'); } } }).inventory(), error => !error.message.includes('private-token'));
});
