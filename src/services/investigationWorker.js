const { randomUUID } = require('node:crypto');
const Run = require('../models/InvestigationRun');
const Incident = require('../models/Incident');
const WorkerState = require('../models/WorkerState');
const { retrieve } = require('./knowledge');
const { redact } = require('./redaction');
const terminal = ['completed', 'failed', 'cancelled'];
function createInvestigationWorker({ runs = Run, incidents = Incident, fetcher = fetch, env = process.env, now = Date.now, owner = randomUUID(), retrieval = retrieve, statusWriter = at => WorkerState.findOneAndUpdate({ workerId: owner }, { $set: { heartbeatAt: at, status: 'active' } }, { upsert: true }) } = {}) {
    let busy = false;
    let stopped = false;
    let timer;
    let activeController;
    const leaseMs = 60000;
    async function tick() {
        if (busy || stopped) return;
        busy = true;
        let run;
        let heartbeat;
        let lostLease = false;
        try {
            const at = new Date(now());
            await statusWriter(at);
            // Exhausted leases are terminal: a crash must not leave an eternal running state.
            await runs.updateMany({ status: 'running', leaseUntil: { $lt: at }, attempts: { $gte: 3 } }, { $set: { status: 'failed', currentStage: 'failed', completedAt: at, error: 'Worker lease expired after maximum attempts' }, $unset: { leaseOwner: 1, leaseUntil: 1 }, $push: { events: { id: 99, status: 'failed', stage: 'failed', at, detail: 'Maximum retries exhausted after lease expiry' } } });
            run = await runs.findOneAndUpdate({ attempts: { $lt: 3 }, $or: [
                { status: 'queued', nextAttemptAt: { $lte: at } },
                { status: 'running', leaseUntil: { $lt: at } },
            ] }, { $set: { status: 'running', currentStage: 'runtime', leaseOwner: owner, leaseUntil: new Date(now() + leaseMs) }, $inc: { attempts: 1 } }, { returnDocument: 'after', sort: { createdAt: 1 } });
            if (!run) return;
            const owned = { runId: run.runId, status: 'running', leaseOwner: owner, attempts: run.attempts };
            const event = (status, detail) => ({ id: run.attempts * 2 + (status === 'running' ? 0 : 1), status, stage: status === 'running' ? 'runtime' : status, at: new Date(now()), detail });
            const started = await runs.updateOne(owned, { $set: { startedAt: run.startedAt || at }, $push: { events: event('running', 'Agent runtime request started; individual stage telemetry unavailable') } });
            if (!started.matchedCount) return;
            const controller = new AbortController();
            activeController = controller;
            heartbeat = setInterval(async () => {
                try {
                    await statusWriter(new Date(now()));
                    const result = await runs.updateOne(owned, { $set: { leaseUntil: new Date(now() + leaseMs) } });
                    if (!result.matchedCount) { lostLease = true; controller.abort(); }
                } catch { lostLease = true; controller.abort(); }
            }, 15000);
            const timeout = setTimeout(() => controller.abort(), 300000);
            try {
                const incident = await incidents.findById(run.incidentId).lean();
                if (!incident) throw Object.assign(new Error('Incident no longer exists'), { permanent: true });
                let knowledge;
                try { knowledge = await retrieval(incident.description, env); }
                catch { knowledge = { results: [], unavailable: true }; }
                const evidenceWrite = await runs.updateOne(owned, { $set: { retrievalStatus: knowledge.unavailable ? 'unavailable' : 'available', evidenceReferences: knowledge.results.map(({ documentId, section, ordinal, indexedAt, sourceUrl }) => ({ documentId, section, ordinal, indexedAt, sourceUrl })) } });
                if (!evidenceWrite.matchedCount) { lostLease = true; controller.abort(); return; }
                const response = await fetcher(`${(env.AGENT_RUNTIME_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/analyse`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': run.correlationId },
                    body: JSON.stringify({ problem: run.context?.notes ? `${incident.description}\n\nHuman reinvestigation context:\n${run.context.notes}` : incident.description, retrieved_evidence: knowledge.results.map(({ documentId, section, ordinal, text }) => ({ document_id: documentId, section, ordinal, text })) }), signal: controller.signal,
                });
                if (!response.ok) throw new Error('Agent runtime request failed');
                const data = await response.json();
                if (!['analysis', 'investigation', 'actions'].every(key => typeof data[key] === 'string' && data[key].trim() && data[key].length <= 200000)) throw Object.assign(new Error('Agent runtime returned invalid structured output'), { permanent: true });
                if (!lostLease) await runs.updateOne(owned, { $set: {
                    status: 'completed', currentStage: 'completed', completedAt: new Date(now()), elapsedMs: now() - new Date(run.startedAt || at).getTime(),
                    result: { analysis: redact(data.analysis, env), investigation: redact(data.investigation, env), actions: redact(data.actions, env) }, error: null,
                }, $unset: { leaseOwner: 1, leaseUntil: 1 }, $push: { events: event('completed', 'Outputs persisted separately; incident lifecycle unchanged') } });
            } catch (error) {
                if (!lostLease) {
                    const status = error.permanent || run.attempts >= 3 ? 'failed' : 'queued';
                    await runs.updateOne(owned, { $set: { status, currentStage: status, error: error.permanent ? error.message : 'Runtime failed or timed out', nextAttemptAt: new Date(now() + 10000 * 2 ** (run.attempts - 1)), ...(status === 'failed' ? { completedAt: new Date(now()), elapsedMs: now() - new Date(run.startedAt || at).getTime() } : {}) }, $unset: { leaseOwner: 1, leaseUntil: 1 }, $push: { events: event(status, status === 'queued' ? 'Retry scheduled with backoff' : 'Execution failed') } });
                }
            } finally { clearTimeout(timeout); }
        } finally { clearInterval(heartbeat); activeController = null; busy = false; }
    }
    return {
        tick,
        start() { stopped = false; timer = setInterval(() => require('./investigationOutbox').drain().then(() => tick()).catch(() => console.error('Investigation worker database operation failed')), 2000); timer.unref(); },
        stop() { stopped = true; clearInterval(timer); activeController?.abort(); },
    };
}
module.exports = { createInvestigationWorker, terminal };
