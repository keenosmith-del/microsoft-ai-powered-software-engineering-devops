const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const Run = require('../models/InvestigationRun');
const WorkerState = require('../models/WorkerState');

// Health never executes model inference, writes cloud resources, or exposes provider bodies.
function createEngineeringService({ db = mongoose.connection, incidents = Incident, runs = Run, workerStates = WorkerState, fetcher = fetch, env = process.env, now = () => Date.now(), ttl = 15000 } = {}) {
    let cached;
    let pending;
    const stamp = () => new Date(now()).toISOString();
    async function json(url, headers = {}) {
        const response = await fetcher(url, { headers, signal: AbortSignal.timeout(4000), redirect: 'error' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }
    async function check(id, probe) {
        const start = now();
        try {
            return { id, ...await probe(), checkedAt: stamp(), responseTimeMs: Math.max(0, now() - start) };
        } catch (error) {
            const detail = /^HTTP \d{3}$/.test(error.message) ? error.message : 'Dependency check failed or timed out';
            return { id, status: 'unavailable', checkedAt: stamp(), responseTimeMs: Math.max(0, now() - start), detail };
        }
    }
    async function collect() {
        const runtime = (env.AGENT_RUNTIME_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
        // Three concurrent upstream probes maximum; Azure and Foundry share one runtime response.
        const [mongo, agent, github] = await Promise.all([
            check('mongodb', async () => {
                if (db.readyState !== 1 || !db.db) return { status: 'unavailable', detail: 'MongoDB is disconnected' };
                await db.db.admin().ping({ maxTimeMS: 3000 });
                return { status: 'operational' };
            }),
            check('agent_runtime', async () => {
                const result = await json(`${runtime}/health`);
                return result.status === 'ok' ? { status: 'operational' } : { status: 'degraded', detail: 'Runtime health response is not ok' };
            }),
            check('github', async () => {
                if (!env.GITHUB_OWNER || !env.GITHUB_REPOSITORY) return { status: 'not_configured', detail: 'Set GITHUB_OWNER and GITHUB_REPOSITORY; private repositories require GITHUB_TOKEN' };
                await json(`https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPOSITORY)}`, {
                    Accept: 'application/vnd.github+json', ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
                });
                return { status: 'operational', detail: `${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}` };
            }),
        ]);
        let platform;
        if (env.AZURE_SUBSCRIPTION_ID || env.FOUNDRY_PROJECT_ENDPOINT) {
            try { platform = await json(`${runtime}/platform`); } catch { platform = null; }
        }
        const azure = await check('azure', async () => !env.AZURE_SUBSCRIPTION_ID
            ? { status: 'not_configured', detail: 'Set AZURE_SUBSCRIPTION_ID and grant Reader access' }
            : { status: platform?.azure?.status === 'connected' ? 'operational' : 'unavailable', detail: platform?.azure?.status === 'connected' ? `Accessible inventory: ${platform.azure.resource_count}; truncated: ${Boolean(platform.azure.resources_truncated)}` : 'Azure inventory access could not be verified' });
        const foundry = await check('foundry', async () => !env.FOUNDRY_PROJECT_ENDPOINT || !env.AZURE_OPENAI_DEPLOYMENT
            ? { status: 'not_configured', detail: 'Set FOUNDRY_PROJECT_ENDPOINT and AZURE_OPENAI_DEPLOYMENT' }
            : { status: platform?.foundry?.authentication === 'authenticated' ? 'unknown' : 'unavailable', detail: platform?.foundry?.authentication === 'authenticated' ? 'Identity authenticated; deployment connectivity and inference are not verified' : 'Foundry authentication could not be verified' });
        // These are shared probe timings, not fabricated per-service measurements.
        delete azure.responseTimeMs;
        delete foundry.responseTimeMs;
        let metrics = { activeIncidents: null, totalIncidents: null, highPrioritySignals: null, completedInvestigations: null, failedInvestigations: null };
        let activity = [];
        let signals = [];
        let dataError = null;
        let workerState = null;
        if (mongo.status === 'operational') {
            try {
                if (incidents === Incident) {
                    const records = Incident.find().select('_id').lean().cursor();
                    for await (const record of records) await require('./incidentLifecycle').read(record._id);
                }
                const active = { status: { $ne: 'Resolved' } };
                const values = await Promise.all([
                    incidents.countDocuments(active).maxTimeMS(3000),
                    incidents.countDocuments({}).maxTimeMS(3000),
                    incidents.countDocuments({ ...active, severity: { $in: ['Critical', 'High'] } }).maxTimeMS(3000),
                    incidents.find({}).sort({ updatedAt: -1 }).limit(10).select('title status severity updatedAt').maxTimeMS(3000).lean(),
                    incidents.find(active).sort({ updatedAt: -1 }).limit(10).select('title status severity updatedAt').maxTimeMS(3000).lean(),
                    runs.countDocuments({ status: 'completed' }).maxTimeMS(3000),
                    runs.countDocuments({ status: 'failed' }).maxTimeMS(3000),
                    workerStates.findOne({}).sort({ heartbeatAt: -1 }).maxTimeMS(3000).lean(),
                ]);
                metrics = { activeIncidents: values[0], totalIncidents: values[1], highPrioritySignals: values[2], completedInvestigations: values[5], failedInvestigations: values[6] };
                activity = values[3]; signals = values[4]; workerState = values[7];
            } catch { dataError = 'Incident queries failed or timed out'; }
        } else dataError = 'Incident store unavailable';
        return { checkedAt: stamp(), cacheTtlMs: ttl, services: [
            { id: 'api', status: 'operational', checkedAt: stamp(), detail: 'Gateway handled this request; response latency measured by the browser' },
            mongo, agent, github, azure, foundry,
            { id: 'telemetry', status: mongo.status === 'operational' && !dataError ? 'operational' : 'unavailable', checkedAt: stamp(), detail: 'Persisted run history and actual agent-stage timing; provider token usage is not measured' },
            { id: 'worker', status: workerState?.status === 'active' && now() - new Date(workerState.heartbeatAt).getTime() < 30000 ? 'operational' : env.INVESTIGATION_WORKER_ENABLED === 'true' ? 'unavailable' : 'not_configured', checkedAt: stamp(), detail: workerState?.heartbeatAt ? `Last worker heartbeat: ${new Date(workerState.heartbeatAt).toISOString()}` : 'No persisted worker heartbeat; enable INVESTIGATION_WORKER_ENABLED after configuration' },
        ], metrics, activity, signals, dataError };
    }
    return async function overview() {
        if (cached && now() - cached.at < ttl) return { ...cached.value, cached: true };
        if (!pending) pending = collect().then(value => { cached = { at: now(), value }; return value; }).finally(() => { pending = null; });
        return { ...await pending, cached: false };
    };
}
module.exports = { createEngineeringService };
