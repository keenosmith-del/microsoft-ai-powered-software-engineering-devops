const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGitHubIntelligence } = require('../src/services/githubIntelligence');
const env = { GITHUB_OWNER: 'test-owner', GITHUB_REPOSITORY: 'test-repository' };
const response = (data, status = 200, headers = {}) => ({ ok: status === 200, status, headers: { get: name => headers[name] || null }, json: async () => data });
test('GitHub activity distinguishes absent deployment history from denied access and caches reads', async () => {
    let calls = 0;
    const github = createGitHubIntelligence({ env, fetcher: async url => {
        calls++;
        if (url.includes('/pulls')) return response(null, 403, { 'retry-after': '60' });
        if (url.includes('/actions/runs')) return response({ workflow_runs: [{ id: 12, conclusion: 'failure', head_sha: 'abcdef123', html_url: 'https://github.com/test/run/12' }] });
        if (url.includes('/actions/workflows')) return response({ workflows: [] });
        return response([]);
    } });
    const data = await github.activity('feature/branch', 1);
    assert.equal(data.runs.items[0].conclusion, 'failure');
    assert.deepEqual(data.deployments.items, []);
    assert.equal(data.pulls.items, null);
    assert.equal(data.pulls.retryAfter, '60');
    await github.activity('feature/branch', 1);
    assert.equal(calls, 5); // Successful reads cached; failed read retried.
});
test('snapshot keeps the frontend contract and safely encodes branch names', async () => {
    const urls = [];
    const github = createGitHubIntelligence({ env, fetcher: async url => {
        urls.push(url);
        if (url.includes('/branches/')) return response({ name: 'feature/x', commit: { sha: 'abcdef1' } });
        if (url.includes('/branches?')) return response([{ name: 'feature/x', commit: { sha: 'abcdef1' }, protected: true }]);
        if (url.includes('/commits/')) return response({ sha: 'abcdef1', stats: { additions: 1, deletions: 0 }, files: [{ filename: 'test.txt', status: 'modified' }] });
        if (url.includes('/commits?')) return response([{ sha: 'abcdef1', commit: { message: 'Test fixture', author: { name: 'Fixture', date: '2026-01-01' } }, html_url: 'https://github.com/test/commit' }], 200, { link: '<next>; rel="next"' });
        return response({ name: 'test-repository', full_name: 'test-owner/test-repository', default_branch: 'main' });
    } });
    const data = await github.snapshot('feature/x', 1);
    assert.ok(urls.some(url => url.includes('/branches/feature%2Fx')));
    assert.equal(data.branch.name, 'feature/x');
    assert.equal(data.latest_commit_changes.files[0].path, 'test.txt');
    assert.equal(data.hasNext, true);
});
test('GitHub concurrency stays bounded and never leaks fetch errors or token values', async () => {
    let active = 0, maximum = 0;
    const github = createGitHubIntelligence({ env, fetcher: async () => {
        active++; maximum = Math.max(maximum, active);
        await new Promise(resolve => setTimeout(resolve, 5)); active--;
        throw new Error('secret-token');
    } });
    const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => github.jobs(i + 1, 1)));
    assert.equal(maximum, 3);
    assert.ok(results.every(result => result.status === 'rejected' && !result.reason.message.includes('secret-token')));
});
