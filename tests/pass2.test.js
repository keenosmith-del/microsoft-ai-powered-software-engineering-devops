const { test } = require('node:test'); const assert = require('node:assert/strict'); const { createHmac } = require('node:crypto');
const { verifySignature, normalizeGitHub, normalizeAzure } = require('../src/services/signals');
const { createGitHubIntelligence } = require('../src/services/githubIntelligence');
const { createAzureMeasurements, windowBounds } = require('../src/services/azureMeasurements');
const { evaluate } = require('../src/services/measuredVerification');
const { createEmbeddings, cosine } = require('../src/services/embeddings');
const { policy, createGitHubChanges } = require('../src/services/githubChanges');
const env = { GITHUB_OWNER: 'fixture', GITHUB_REPOSITORY: 'repo' };
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
test('signed signals authenticate exact bytes, scope, identifiers and delivery; duplicate failure has stable key', () => {
 const bytes = Buffer.from('{"fixture":true}'), secret = 'test-secret-'.repeat(4), signature = `sha256=${createHmac('sha256', secret).update(bytes).digest('hex')}`;
 verifySignature(bytes, signature, secret); assert.throws(() => verifySignature(Buffer.from('{}'), signature, secret), /signature/); assert.throws(() => verifySignature(bytes, signature, ''), /configured/);
 const payload = { repository: { full_name: 'fixture/repo' }, action: 'completed', workflow_run: { id: 123, run_attempt: 1, conclusion: 'failure', head_sha: 'a'.repeat(40), updated_at: '2026-01-01T00:00:00Z' } };
 const a = normalizeGitHub(payload, 'workflow_run', 'delivery-first', env), b = normalizeGitHub(payload, 'workflow_run', 'delivery-second', env); assert.equal(a.deduplicationKey, b.deduplicationKey);
 assert.equal(normalizeGitHub({ ...payload, action: 'requested' }, 'workflow_run', 'delivery-third', env), null);
 assert.throws(() => normalizeGitHub({ ...payload, repository: { full_name: 'other/repo' } }, 'workflow_run', 'delivery-fourth', env), /scope/);
});
test('GitHub logs are byte-bounded, redacted, reject binary and unsafe redirects; signed host does not receive token', async () => {
 const seen = []; const adapter = createGitHubIntelligence({ env: { ...env, GITHUB_TOKEN: 'test-token-secret' }, fetcher: async (url, init) => { seen.push(init); return seen.length === 1 ? new Response(null, { status: 302, headers: { location: 'https://fixture.blob.core.windows.net/log?sig=private' } }) : new Response('password=hunter2\n' + 'x'.repeat(70000), { headers: { 'content-type': 'text/plain' } }); } });
 const result = await adapter.jobLogs(12); assert.equal(result.truncated, true); assert.ok(!result.content.includes('hunter2')); assert.equal(seen[1].headers, undefined); assert.ok(!JSON.stringify(result).includes('sig='));
 await assert.rejects(createGitHubIntelligence({ env, fetcher: async () => new Response(null, { status: 302, headers: { location: 'https://evil.example/log' } }) }).jobLogs(1), /failed/);
 await assert.rejects(createGitHubIntelligence({ env, fetcher: async () => new Response(Buffer.from([0, 1])) }).jobLogs(1), /Binary/);
});
const resourceId = '/subscriptions/11111111-1111-1111-1111-111111111111/resourceGroups/test/providers/Microsoft.Web/sites/app';
const azureEnv = { AZURE_SUBSCRIPTION_ID: '11111111-1111-1111-1111-111111111111', AZURE_RESOURCE_GROUP: 'test', AZURE_DIAGNOSTIC_RESOURCE_IDS: resourceId, AZURE_LOG_ANALYTICS_WORKSPACE_ID: '22222222-2222-2222-2222-222222222222', AZURE_APPLICATION_INSIGHTS_APP_ID: '33333333-3333-3333-3333-333333333333' };
const window = { start: '2026-01-01T00:00:00Z', end: '2026-01-01T00:10:00Z' };
test('Azure discovers supported units/aggregation, preserves nulls, rejects scope and arbitrary query', async () => {
 const calls = []; const adapter = createAzureMeasurements({ env: azureEnv, credential: { getToken: async () => ({ token: 'fixture' }) }, fetcher: async (url, init) => { calls.push({ url, init }); return json(url.includes('metricDefinitions') ? { value: [{ name: { value: 'Errors' }, unit: 'Count', supportedAggregationTypes: ['Total'] }] } : url.includes('/query') ? { tables: [] } : { value: [{ name: { value: 'Errors' }, unit: 'Count', timeseries: [{ data: [{ timeStamp: window.start, total: null }] }] }] }); } });
 const data = await adapter.metrics({ resourceId, metric: 'Errors', aggregation: 'Total', ...window }); assert.equal(data.unit, 'Count'); assert.equal(data.status, 'no-observations'); assert.equal(data.observations[0].value, null);
 await assert.rejects(adapter.metrics({ resourceId, metric: 'Bogus', aggregation: 'Average', ...window }), /supported/);
 await assert.rejects(adapter.definitions(resourceId.replace('/app', '/other')), /allowlisted/);
 const result = await adapter.query({ provider: 'log-analytics', template: 'events', ...window }); assert.equal(result.status, 'no-observations');
 await adapter.query({ provider: 'application-insights', template: 'exceptions', ...window });
 await assert.rejects(adapter.query({ provider: 'log-analytics', template: 'drop table', ...window }), /predefined/);
 assert.throws(() => windowBounds(window.start, '2026-01-03T00:00:00Z'), /24 hours/);
 const denied = createAzureMeasurements({ env: azureEnv, credential: { getToken: async () => ({ token: 'fixture' }) }, fetcher: async () => new Response('', { status: 403 }) }); await assert.rejects(denied.definitions(resourceId), e => e.code === 'PERMISSION_DENIED');
 const alert = normalizeAzure({ schemaId: 'azureMonitorCommonAlertSchema', data: { essentials: { alertTargetIDs: [resourceId], alertId: `${resourceId}/alert/one`, firedDateTime: window.start, monitorCondition: 'Fired', severity: 'Sev1' } } }, azureEnv); assert.equal(alert.provider, 'azure');
});
function measurement(start, values) { return { provider: 'azure-monitor', resourceId, metric: 'Errors', unit: 'Count', aggregation: 'Total', status: 'available', window: { start, end: new Date(Date.parse(start) + 600000).toISOString() }, observations: values.map((value, i) => ({ value, timestamp: new Date(Date.parse(start) + i * 300000).toISOString() })) }; }
test('measured outcomes require complete compatible baseline/current and explain actual comparison', () => {
 const base = measurement('2026-01-01T00:00:00Z', [10, 10]), current = measurement('2026-01-01T01:00:00Z', [2, 2]), rule = { type: 'reduction-percent', threshold: 50 };
 assert.equal(evaluate(base, current, rule).outcome, 'passed'); assert.equal(evaluate(base, current, rule).difference, -16);
 assert.equal(evaluate(base, measurement('2026-01-01T01:00:00Z', [20, 20]), rule).outcome, 'failed');
 for (const change of [{ observations: [] }, { unit: 'Milliseconds' }, { status: 'unavailable' }, { truncated: true }, { observations: [{ value: 1, timestamp: current.window.start }] }, { provider: 'github-actions' }]) assert.equal(evaluate(base, { ...current, ...change }, rule).outcome, 'inconclusive');
 assert.equal(evaluate({ ...base, observations: [] }, current, rule).outcome, 'inconclusive');
 assert.throws(() => evaluate(base, current, { type: 'maximum', threshold: NaN }), /finite/);
});
test('embedding contract requires genuine configured dimensions, rejects arbitrary hosts and invalid vectors', async () => {
 const embEnv = { KNOWLEDGE_EMBEDDING_MODEL: 'operator-installed-fixture', KNOWLEDGE_EMBEDDING_DIMENSION: '3' };
 const adapter = createEmbeddings({ env: embEnv, fetcher: async () => json({ embeddings: [[1, 0, 0]] }) }); assert.deepEqual(await adapter.embed(['fixture']), [[1, 0, 0]]); assert.equal(cosine([1, 0], [1, 0]), 1); assert.equal(cosine([1], [1, 0]), null);
 await assert.rejects(createEmbeddings({ env: {} }).embed(['text']), /Configure/);
 await assert.rejects(createEmbeddings({ env: { ...embEnv, KNOWLEDGE_EMBEDDING_URL: 'http://evil.example' } }).embed(['text']), /loopback/);
 await assert.rejects(createEmbeddings({ env: embEnv, fetcher: async () => json({ embeddings: [[0, 0, 0]] }) }).embed(['text']), /unavailable/);
});
const writeEnv = { ...env, GITHUB_WRITE_ENABLED: 'true', GITHUB_WRITE_TOKEN: 'fixture-write-token', GITHUB_WRITE_REPOSITORIES: 'fixture/repo', GITHUB_WRITE_BASE_BRANCH: 'main', GITHUB_WRITE_PATH_PREFIXES: 'src/' };
test('GitHub changes are disabled by default and enforce base/path/secrets/size; actual source drives preview', async () => {
 const body = { baseBranch: 'main', changes: [{ path: 'src/app.txt', content: 'after\n' }] };
 assert.throws(() => policy(body, env), /disabled/); assert.equal(policy(body, writeEnv), 'fixture/repo');
 for (const path of ['src/../.env', 'src/.env', 'src/security.md', 'src/deploy.js', 'other/file', 'src/key.pem']) assert.throws(() => policy({ ...body, changes: [{ path, content: 'safe' }] }, writeEnv));
 assert.throws(() => policy({ ...body, changes: [{ path: 'src/file', content: 'password=secret' }] }, writeEnv), /credentials/);
 const adapter = createGitHubChanges({ env: writeEnv, fetcher: async url => json(url.includes('/git/ref') ? { object: { sha: 'a'.repeat(40) } } : { type: 'file', encoding: 'base64', size: 7, sha: 'b'.repeat(40), content: Buffer.from('before\n').toString('base64') }) });
 const preview = await adapter.preview(body); assert.ok(preview.diff.includes('-before')); assert.ok(preview.diff.includes('+after')); assert.equal(preview.baseSha, 'a'.repeat(40));
});
test('runtime tool frames persist actual timing/usage and sanitize errors without changing ordered stages', async () => {
 const names = ['software-engineering', 'incident-investigation', 'engineering-action'];
 const events = names.flatMap(stage => [{ stage, status: 'running', at: new Date().toISOString() }, { kind: 'tool', stage, name: 'foundry.model-response', at: new Date().toISOString(), durationMs: 12, outcome: 'available', deployment: 'fixture-deployment', totalTokens: 15 }, { stage, status: 'completed', at: new Date().toISOString(), elapsedMs: 20, output: 'Test-only output' }]);
 const seen = []; const response = new Response(events.map(e => JSON.stringify(e)).join('\n') + '\n', { headers: { 'content-type': 'application/x-ndjson' } });
 await require('../src/services/runtimeStream').consume(response, e => seen.push(e)); assert.equal(seen.filter(e => e.kind === 'tool').length, 3); assert.equal(seen[1].totalTokens, 15);
 events[1].durationMs = -1;
 await assert.rejects(require('../src/services/runtimeStream').consume(new Response(events.map(e => JSON.stringify(e)).join('\n') + '\n', { headers: { 'content-type': 'application/x-ndjson' } }), () => {}), /telemetry/);
});
test('PR reviews/check suites retain actual provider state and bounded pagination', async () => {
 const adapter = createGitHubIntelligence({ env, fetcher: async url => json(url.includes('/reviews') ? [{ state: 'CHANGES_REQUESTED', user: { login: 'fixture-reviewer' }, submitted_at: '2026-01-01' }] : url.includes('/check-suites') ? { check_suites: [{ id: 1, status: 'completed', conclusion: 'failure' }] } : { number: 1, state: 'open', draft: true, merged: false }) });
 const pull = await adapter.pullDetails(1); assert.equal(pull.draft, true); assert.equal(pull.reviews[0].state, 'CHANGES_REQUESTED');
 assert.equal((await adapter.checkSuites('a'.repeat(40))).items[0].conclusion, 'failure');
});
test('bounded excerpts preserve valid UTF-8 at truncation boundaries and reject invalid encoding', async () => {
 const { boundedText } = require('../src/services/boundedText');
 const value = await boundedText(new Response('a'.repeat(65535) + '🙂')); assert.equal(value.truncated, true); assert.equal(value.content.length, 65535); assert.ok(!value.content.includes('\uFFFD'));
 await assert.rejects(boundedText(new Response(Buffer.from([255, 254, 253]))), /encoding/);
});
