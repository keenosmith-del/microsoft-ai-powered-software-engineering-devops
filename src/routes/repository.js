const express = require('express');

const router = express.Router();

const { createGitHubIntelligence } = require('../services/githubIntelligence');
const github = createGitHubIntelligence();
function parameters(req) {
    const page = Number(req.query.page || 1);
    const branch = req.query.branch;
    if (!Number.isSafeInteger(page) || page < 1 || page > 100 || (branch !== undefined && (typeof branch !== 'string' || branch.length > 200 || !branch.trim()))) {
        throw Object.assign(new Error('Invalid branch or page (1–100)'), { status: 400, code: 'INVALID_INPUT' });
    }
    return { page, branch };
}
function handler(fn) {
    return async (req, res) => {
        try { res.json(await fn(req, parameters(req))); }
        catch (error) { res.status(error.status || 502).json({ success: false, error: error.message, code: error.code || 'REPOSITORY_UNAVAILABLE', upstreamStatus: error.upstreamStatus, retryAfter: error.retryAfter, rateLimitReset: error.rateLimitReset }); }
    };
}
router.get('/', handler((_req, { branch, page }) => github.snapshot(branch, page)));
router.get('/activity', handler((_req, { branch, page }) => github.activity(branch, page)));
router.get('/runs/:id/jobs', handler((req, { page }) => {
    if (!/^\d{1,20}$/.test(req.params.id)) throw Object.assign(new Error('Invalid run ID'), { status: 400 });
    return github.jobs(req.params.id, page);
}));
for (const name of ['commits', 'checks']) router.get(`/${name}/:sha`, handler((req, { page }) => {
    if (!/^[a-fA-F0-9]{7,40}$/.test(req.params.sha)) throw Object.assign(new Error('Invalid commit SHA'), { status: 400 });
    return github[name === 'commits' ? 'commit' : 'checks'](req.params.sha, page);
}));
router.get('/jobs/:id/logs', require('../middleware/authorization'), handler(req => {
 if (!/^\d{1,20}$/.test(req.params.id)) throw Object.assign(new Error('Invalid job ID'), { status: 400 });
 return github.jobLogs(req.params.id);
}));
for (const [path, method] of [['deployments', 'deploymentStatuses'], ['pulls', 'pullFiles']]) router.get(`/${path}/:id/details`, handler((req, { page }) => {
 if (!/^\d{1,20}$/.test(req.params.id)) throw Object.assign(new Error('Invalid provider ID'), { status: 400 });
 return github[method](req.params.id, page);
}));
module.exports = router;
