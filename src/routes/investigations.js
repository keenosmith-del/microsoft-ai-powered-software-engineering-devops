const express = require('express');
const mongoose = require('mongoose');
const Run = require('../models/InvestigationRun');
const Incident = require('../models/Incident');
const authorize = require('../middleware/authorization');
const router = express.Router();
router.use(authorize, require('../middleware/operationsLimit'));
const publicRun = run => { const { leaseOwner, leaseUntil, idempotencyKey, __v, ...data } = run; return data; };
function validId(req, res, next) {
    if (!/^[a-f0-9-]{36}$/.test(req.params.runId || '')) return res.status(400).json({ error: 'Invalid run ID' });
    next();
}
router.get('/', async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);
        if (!Number.isInteger(page) || page < 1 || page > 100) return res.status(400).json({ error: 'Invalid page' });
        const query = {};
        if (req.query.incidentId) {
            if (!mongoose.isObjectIdOrHexString(req.query.incidentId)) return res.status(400).json({ error: 'Invalid incident ID' });
            query.incidentId = req.query.incidentId;
        }
        const rows = await Run.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(21).lean();
        res.json({ page, hasNext: rows.length > 20, items: rows.slice(0, 20).map(publicRun) });
    } catch (error) { next(error); }
});
async function submit(req, res, next) {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid incident ID' });
        const key = req.get('Idempotency-Key');
        const body = req.body || {};
        if (!key || !/^[\w-]{8,100}$/.test(key) || Object.keys(body).some(field => field !== 'triggerSource') || (body.triggerSource && body.triggerSource !== 'manual')) return res.status(400).json({ error: 'Use an Idempotency-Key (8–100 letters, digits, underscores or hyphens) and optional triggerSource=manual' });
        const run = await require('../services/incidentLifecycle').submit(req.params.id, req.actor, key);
        res.status(202).json(publicRun(typeof run.toObject === 'function' ? run.toObject() : run));
    } catch (error) {
        if (error.code === 11000) { const run = await Run.findOne({ incidentId: req.params.id, idempotencyKey: req.get('Idempotency-Key') }).lean(); return res.status(202).json(publicRun(run)); }
        next(error);
    }
}
router.post('/incidents/:id', submit);
router.submit = submit;

router.get('/:runId', validId, async (req, res, next) => {
    try { const run = await Run.findOne({ runId: req.params.runId }).lean(); if (!run) return res.status(404).json({ error: 'Run not found' }); res.json(publicRun(run)); }
    catch (error) { next(error); }
});
router.post('/:runId/cancel', validId, async (req, res, next) => {
    try {
        const at = new Date();
        const run = await Run.findOneAndUpdate({ runId: req.params.runId, status: { $in: ['queued', 'running'] } }, {
            $set: { status: 'cancelled', currentStage: 'cancelled', completedAt: at, cancellation: { requestedBy: req.actor, requestedAt: at, detail: 'Gateway execution cancelled; in-flight provider work may still finish and will not be persisted' } },
            $unset: { leaseOwner: 1, leaseUntil: 1 },
            $push: { events: { id: 100, status: 'cancelled', stage: 'cancelled', at, detail: 'Human cancellation requested' } },
        }, { returnDocument: 'after' });
        if (!run) return res.status(409).json({ error: 'Run does not exist or is already terminal' });
        await require('../services/incidentLifecycle').reconcileRun(run.toObject());
        res.json(publicRun(typeof run.toObject === 'function' ? run.toObject() : run));
    } catch (error) { next(error); }
});
router.get('/:runId/events', validId, async (req, res) => {
    let last = Number(req.get('Last-Event-ID') || req.query.after || 0);
    if (!Number.isInteger(last) || last < 0 || last > 100) return res.status(400).json({ error: 'Invalid event cursor' });
    if (req.query.format === 'json') {
        try { const run = await Run.findOne({ runId: req.params.runId }).select('events status').lean(); if (!run) return res.status(404).json({ error: 'Run not found' }); return res.json({ status: run.status, events: run.events.filter(event => event.id > last) }); }
        catch { return res.status(503).json({ error: 'Event store unavailable' }); }
    }
    // Fetch-based SSE permits Authorization headers; browser EventSource cannot send them.
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    let closed = false;
    let timer;
    const finish = () => { closed = true; clearTimeout(timer); if (!res.writableEnded) res.end(); };
    req.on('close', finish);
    const poll = async () => {
        if (closed) return;
        try {
            const run = await Run.findOne({ runId: req.params.runId }).select('events status').lean();
            if (closed) return;
            if (!run) { res.write('event: error\ndata: {"error":"Run not found"}\n\n'); finish(); return; }
            for (const event of run.events.filter(event => event.id > last).sort((a, b) => a.id - b.id)) { res.write(`id: ${event.id}\nevent: progress\ndata: ${JSON.stringify(event)}\n\n`); last = event.id; }
            if (['completed', 'failed', 'cancelled'].includes(run.status)) { finish(); return; }
            res.write(': heartbeat\n\n');
            timer = setTimeout(poll, 2000);
        } catch { if (!closed) res.write('event: error\ndata: {"error":"Event store unavailable"}\n\n'); finish(); }
    };
    void poll();
});
module.exports = router;
