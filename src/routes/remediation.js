const express = require('express');
const mongoose = require('mongoose');
const Proposal = require('../models/RemediationProposal');
const Run = require('../models/InvestigationRun');
const authorize = require('../middleware/authorization');
const { redact } = require('../services/redaction');
const router = express.Router();
router.use(authorize, require('../middleware/operationsLimit'));
function validateProposal(body) {
    if (!body || Object.keys(body).some(key => !['incidentId', 'runId', 'title', 'action', 'rationale', 'validationPlan', 'target', 'risk'].includes(key))) return false;
    return mongoose.isObjectIdOrHexString(body.incidentId) && /^[a-f0-9-]{36}$/.test(body.runId || '') && ['low', 'medium', 'high'].includes(body.risk)
        && ['title', 'action', 'rationale', 'validationPlan', 'target'].every(field => typeof body[field] === 'string' && body[field].trim() && body[field].length <= (field === 'title' ? 200 : 10000));
}
router.get('/', async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);
        if (!Number.isInteger(page) || page < 1 || page > 100) return res.status(400).json({ error: 'Invalid page' });
        const rows = await Proposal.find().sort({ createdAt: -1 }).skip((page - 1) * 20).limit(21).lean();
        res.json({ items: rows.slice(0, 20), hasNext: rows.length > 20, page });
    } catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
    try {
        if (!validateProposal(req.body)) return res.status(400).json({ error: 'Supply incidentId, completed runId, title, action, rationale, validationPlan, target and risk (low/medium/high)' });
        const { incidentId, runId, risk, ...text } = req.body;
        if (!await Run.exists({ incidentId, runId, status: 'completed' })) return res.status(409).json({ error: 'Proposal requires a completed investigation belonging to this incident' });
        const proposal = await Proposal.create({ incidentId, runId, risk, ...Object.fromEntries(Object.entries(text).map(([field, value]) => [field, redact(value.trim())])), requestedBy: req.actor,
            audit: [{ actor: req.actor, at: new Date(), action: 'created', version: 0 }] });
        res.status(201).json(proposal);
    } catch (error) { next(error); }
});
router.post('/:id/review', async (req, res, next) => {
    try {
        const body = req.body || {};
        if (!mongoose.isObjectIdOrHexString(req.params.id) || !['approved', 'rejected'].includes(body.decision) || !Number.isInteger(body.version) || body.version < 0 || typeof body.comment !== 'string' || !body.comment.trim() || body.comment.length > 2000 || Object.keys(body).some(field => !['decision', 'version', 'comment'].includes(field))) return res.status(400).json({ error: 'Supply decision (approved/rejected), current version and review comment (1–2000 characters)' });
        const at = new Date();
        const proposal = await Proposal.findOneAndUpdate({ _id: req.params.id, version: body.version, approvalStatus: 'pending' }, {
            $set: { approvalStatus: body.decision, review: { actor: req.actor, at, comment: redact(body.comment) } }, $inc: { version: 1 },
            $push: { audit: { actor: req.actor, at, action: body.decision, version: body.version + 1 } },
        }, { returnDocument: 'after' });
        if (!proposal) return res.status(409).json({ error: 'Proposal already reviewed, missing or version changed; refresh before reviewing' });
        res.json(proposal);
    } catch (error) { next(error); }
});
router.post('/:id/execute', (_req, res) => res.status(403).json({ code: 'EXECUTION_DISABLED', error: 'Remote remediation execution, PR creation and production changes are disabled; approval records do not execute actions' }));
router.validateProposal = validateProposal;
module.exports = router;
