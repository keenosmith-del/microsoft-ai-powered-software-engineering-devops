// Read-only, repository-scoped GitHub REST adapter. Never accepts upstream URLs from clients.
function createGitHubIntelligence({ fetcher = fetch, env = process.env, now = Date.now } = {}) {
    const cache = new Map();
    let active = 0;
    const waiting = [];
    async function get(path, params = {}) {
        if (!env.GITHUB_OWNER || !env.GITHUB_REPOSITORY) throw Object.assign(new Error('Configure GITHUB_OWNER and GITHUB_REPOSITORY'), { status: 503, code: 'NOT_CONFIGURED' });
        const base = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPOSITORY)}`;
        const url = `${base}${path}?${new URLSearchParams(params)}`;
        const existing = cache.get(url);
        if (existing && existing.expires > now()) return existing.promise;
        const promise = (async () => {
            if (active >= 3) await new Promise(resolve => waiting.push(resolve));
            else active++;
            try {
                const response = await fetcher(url, { signal: AbortSignal.timeout(6000), redirect: 'error', headers: {
                    Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
                    ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
                } });
                if (!response.ok) throw Object.assign(new Error(response.status === 403 || response.status === 429 ? 'GitHub access denied or rate limited; check token permissions and retry after reset' : `GitHub returned HTTP ${response.status}`), {
                    status: 502, code: 'GITHUB_ERROR', upstreamStatus: response.status,
                    retryAfter: response.headers.get('retry-after'), rateLimitReset: response.headers.get('x-ratelimit-reset'),
                });
                return { data: await response.json(), hasNext: /rel="next"/.test(response.headers.get('link') || '') };
            } catch (error) {
                cache.delete(url);
                if (error.code === 'GITHUB_ERROR') throw error;
                throw Object.assign(new Error('GitHub request failed or timed out'), { status: 502, code: 'GITHUB_UNAVAILABLE' });
            } finally { const next = waiting.shift(); if (next) next(); else active--; }
        })();
        if (cache.size >= 100) cache.delete(cache.keys().next().value);
        cache.set(url, { expires: now() + 15000, promise });
        return promise;
    }
    const pick = (value, fields) => Object.fromEntries(fields.map(key => [key, value[key] ?? null]));
    async function snapshot(branch, page) {
        const repo = (await get('')).data;
        const selected = branch || env.GITHUB_DEFAULT_BRANCH || repo.default_branch;
        const [branchData, branches, commits] = await Promise.all([
            get(`/branches/${encodeURIComponent(selected)}`), get('/branches', { per_page: 30, page }), get('/commits', { sha: selected, per_page: 20, page }),
        ]);
        const latest = commits.data[0] ? (await get(`/commits/${encodeURIComponent(commits.data[0].sha)}`)).data : null;
        return {
            success: true, checkedAt: new Date(now()).toISOString(), page, hasNext: commits.hasNext,
            repository: pick(repo, ['name', 'full_name', 'default_branch', 'private', 'language', 'updated_at', 'html_url']),
            branch: { name: branchData.data.name, sha: branchData.data.commit.sha },
            branches: branches.data.map(b => ({ name: b.name, sha: b.commit.sha, protected: b.protected })),
            recent_commits: commits.data.map(c => ({ sha: c.sha, message: c.commit.message, author: c.commit.author?.name ?? null, date: c.commit.author?.date ?? null, url: c.html_url })),
            latest_commit_changes: latest ? { sha: latest.sha, files_changed: latest.files.length, additions: latest.stats?.additions, deletions: latest.stats?.deletions,
                files: latest.files.map(f => ({ path: f.filename, status: f.status })) } : null,
        };
    }
    async function activity(branch, page) {
        const parts = [
            ['workflows', '/actions/workflows', {}, 'workflows', ['id', 'name', 'state', 'html_url']],
            ['runs', '/actions/runs', branch ? { branch } : {}, 'workflow_runs', ['id', 'name', 'head_branch', 'head_sha', 'status', 'conclusion', 'html_url', 'created_at', 'run_attempt']],
            ['pulls', '/pulls', { state: 'all' }, null, ['number', 'title', 'state', 'html_url', 'updated_at']],
            ['deployments', '/deployments', {}, null, ['id', 'sha', 'ref', 'environment', 'created_at']],
        ];
        const values = await Promise.all(parts.map(async ([key, path, params, field, fields]) => {
            try {
                const response = await get(path, { ...params, per_page: 20, page });
                const data = field ? response.data[field] : response.data;
                return [key, { status: 'available', items: data.map(item => pick(item, fields)), hasNext: response.hasNext }];
            } catch (error) { return [key, { status: 'unavailable', items: null, error: error.message, retryAfter: error.retryAfter ?? null }]; }
        }));
        return { checkedAt: new Date(now()).toISOString(), page, ...Object.fromEntries(values) };
    }
    async function jobs(id, page) {
        const response = await get(`/actions/runs/${id}/jobs`, { per_page: 30, page });
        return { items: response.data.jobs.map(job => ({ ...pick(job, ['id', 'run_id', 'name', 'status', 'conclusion', 'html_url', 'started_at', 'completed_at']), steps: job.steps.map(step => pick(step, ['name', 'status', 'conclusion', 'number'])) })), hasNext: response.hasNext, page };
    }
    async function commit(sha, page) {
        const response = await get(`/commits/${encodeURIComponent(sha)}`, { per_page: 30, page });
        return { sha: response.data.sha, url: response.data.html_url, stats: response.data.stats, page, hasNext: response.hasNext,
            files: response.data.files.map(file => ({ path: file.filename, status: file.status, additions: file.additions, deletions: file.deletions, evidenceUrl: file.blob_url, patch: file.patch ? require('./redaction').redact(file.patch.slice(0, 12000), env) : null, truncated: !file.patch || file.patch.length > 12000 })) };
    }
    async function checks(sha, page) {
        const response = await get(`/commits/${encodeURIComponent(sha)}/check-runs`, { per_page: 30, page });
        return { items: response.data.check_runs.map(c => pick(c, ['id', 'name', 'status', 'conclusion', 'html_url', 'started_at', 'completed_at'])), page, hasNext: response.hasNext };
    }
    async function pullDetails(id) {
        const [pull, reviews] = await Promise.all([get(`/pulls/${id}`), get(`/pulls/${id}/reviews`, { per_page: 30, page: 1 })]);
        return { ...pick(pull.data, ['number', 'state', 'draft', 'merged', 'mergeable_state', 'html_url', 'updated_at']), reviews: reviews.data.map(v => ({ state: v.state, submittedAt: v.submitted_at, reviewer: v.user?.login })), reviewsTruncated: reviews.hasNext };
    }
    async function checkSuites(sha, page = 1) { const r = await get(`/commits/${encodeURIComponent(sha)}/check-suites`, { per_page: 30, page }); return { items: r.data.check_suites.map(v => pick(v, ['id', 'head_sha', 'status', 'conclusion', 'created_at', 'updated_at'])), hasNext: r.hasNext, page }; }
    async function run(id) { return (await get(`/actions/runs/${id}`)).data; }
    async function deploymentStatuses(id, page = 1) { const r = await get(`/deployments/${id}/statuses`, { per_page: 30, page }); return { items: r.data.map(v => pick(v, ['id', 'state', 'description', 'created_at', 'log_url', 'environment_url'])), hasNext: r.hasNext, page }; }
    async function pullFiles(id, page = 1) { const r = await get(`/pulls/${id}/files`, { per_page: 30, page }); return { items: r.data.map(v => ({ path: v.filename, status: v.status, url: v.blob_url, patch: v.patch ? require('./redaction').redact(v.patch.slice(0, 12000), env) : null, truncated: !v.patch || v.patch.length > 12000 })), hasNext: r.hasNext, page }; }
    async function jobLogs(id) {
        if (!env.GITHUB_OWNER || !env.GITHUB_REPOSITORY) throw Object.assign(new Error('GitHub repository not configured'), { status: 503 });
        const url = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPOSITORY)}/actions/jobs/${id}/logs`;
        const signal = AbortSignal.timeout(10000);
        if (active >= 3) throw Object.assign(new Error('GitHub evidence retrieval busy; retry shortly'), { status: 429 });
        active++;
        let response;
        try {
            response = await fetcher(url, { signal, redirect: 'manual', headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) } });
            if (response.status === 302) {
                const target = new URL(response.headers.get('location'));
                if (target.protocol !== 'https:' || target.username || target.password || !(target.hostname.endsWith('.blob.core.windows.net') || target.hostname.endsWith('.actions.githubusercontent.com'))) throw new Error('Unsupported log host');
                // Signed URL remains server-only; never forward the GitHub credential.
                response = await fetcher(target.href, { signal, redirect: 'error' });
            }
            if (!response.ok) throw Object.assign(new Error('GitHub logs unavailable; check Actions permission, retention and rate limit'), { status: 502, code: 'LOGS_UNAVAILABLE', upstreamStatus: response.status, retryAfter: response.headers.get('retry-after') });
            return { ...await require('./boundedText').boundedText(response, { env }), provider: 'github', type: 'job-log', jobId: String(id), retrievedAt: new Date(now()).toISOString(), sourceUrl: `https://github.com/${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}/actions` };
        } catch (error) { if (error.status) throw error; throw Object.assign(new Error('GitHub logs request failed or timed out'), { status: 502, code: 'LOGS_UNAVAILABLE' }); }
        finally { const next = waiting.shift(); if (next) next(); else active--; }
    }
    return { snapshot, activity, jobs, commit, checks, run, deploymentStatuses, pullFiles, jobLogs, pullDetails, checkSuites };
}
module.exports = { createGitHubIntelligence };
