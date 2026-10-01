const express = require('express');
const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const Proposal = require('../models/RemediationProposal');
const Run = require('../models/InvestigationRun');
const lifecycle = require('../services/incidentLifecycle');
const authorize = require('../middleware/authorization');
const { redact } = require('../services/redaction');
const router = express.Router();
router.use(authorize, require('../middleware/operationsLimit'));
const fields = ['title', 'action', 'rationale', 'validationPlan', 'target', 'owner'];
function validateProposal(body) {
 return body && Object.keys(body).every(key => ['incidentId', 'runId', 'risk', 'owner', ...fields].includes(key)) && mongoose.isObjectIdOrHexString(body.incidentId) && /^[a-f0-9-]{36}$/.test(body.runId || '') && ['low', 'medium', 'high'].includes(body.risk) && fields.filter(k => k !== 'owner').every(k => typeof body[k] === 'string' && body[k].trim() && body[k].length <= (k === 'title' ? 200 : 10000)) && (body.owner === undefined || typeof body.owner === 'string' && body.owner.trim() && body.owner.length <= 200);
}
function accepted(w, runId) { const review = w.reviews.find(r => r.id === w.currentReviewId); if (!review || review.decision !== 'accepted' || review.runId !== runId) lifecycle.fail('Current accepted findings are required before proposal planning or approval'); return review; }
router.get('/', async (req, res, next) => {
 try {
  const page = Number(req.query.page || 1); if (!Number.isInteger(page) || page < 1 || page > 100) lifecycle.fail('Invalid page', 400);
  const filter = {}; if (req.query.incidentId) { if (!mongoose.isObjectIdOrHexString(req.query.incidentId)) lifecycle.fail('Invalid incident ID', 400); filter.incidentId = req.query.incidentId; }
  const rows = await Proposal.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(21).lean();
  res.json({ items: rows.slice(0, 20), hasNext: rows.length > 20, page });
 } catch (e) { next(e); }
});
router.post('/', async (req, res, next) => {
 try {
  if (!validateProposal(req.body)) lifecycle.fail('Supply incidentId, runId, title, action, rationale, validationPlan, target, risk and optional owner', 400);
  const { incidentId, runId, risk, ...text } = req.body;
  const current = await lifecycle.read(incidentId); const review = accepted(current.workflow, runId);
  if (!await Run.exists({ incidentId, runId, status: 'completed' })) lifecycle.fail('A completed incident run is required');
  const key = req.get('Idempotency-Key'); if (!/^[\w-]{8,100}$/.test(key || '')) lifecycle.fail('Supply Idempotency-Key for proposal creation', 400);
  const requestKey = createHash('sha256').update(`${incidentId}:${req.actor}:${key}`).digest('hex');
  const requestHash = createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
  const value = { incidentId, runId, reviewId: review.id, risk, ...Object.fromEntries(Object.entries(text).map(([field, value]) => [field, redact(value.trim())])), requestedBy: req.actor, owner: text.owner || req.actor, audit: [{ actor: req.actor, at: new Date(), action: 'created', version: 0 }] };
  const proposal = await Proposal.findOneAndUpdate({ requestKey }, { $setOnInsert: { ...value, requestKey, requestHash } }, { upsert: true, returnDocument: 'after' });
  if (proposal.requestHash !== requestHash) lifecycle.fail('Proposal key was reused with different content');
  if (!current.workflow.proposalIds?.includes(String(proposal._id))) await lifecycle.change(incidentId, current.lifecycleVersion, { action: 'plan-proposal', notes: 'Proposal linked to accepted findings', proposalId: String(proposal._id), runId }, req.actor);
  res.status(201).json(proposal);
 } catch (e) { next(e); }
});
router.patch('/:id', async (req, res, next) => {
 try {
  const body = req.body || {}; if (!mongoose.isObjectIdOrHexString(req.params.id) || !Number.isInteger(body.version) || Object.keys(body).some(k => !['version', ...fields, 'risk'].includes(k))) lifecycle.fail('Supply current proposal version and editable draft fields', 400);
  const updates = {};
  for (const field of fields) if (body[field] !== undefined) { if (typeof body[field] !== 'string' || !body[field].trim() || body[field].length > (['title', 'owner'].includes(field) ? 200 : 10000)) lifecycle.fail('Invalid draft field', 400); updates[field] = redact(body[field].trim()); }
  if (body.risk !== undefined) { if (!['low', 'medium', 'high'].includes(body.risk)) lifecycle.fail('Invalid risk', 400); updates.risk = body.risk; }
  if (!Object.keys(updates).length) lifecycle.fail('Supply at least one draft field', 400);
  const proposal = await Proposal.findOneAndUpdate({ _id: req.params.id, version: body.version, approvalStatus: { $in: ['pending', 'rejected'] } }, { $set: { ...updates, approvalStatus: 'pending', review: null }, $inc: { version: 1 }, $push: { audit: { actor: req.actor, at: new Date(), action: 'draft-edited', version: body.version + 1 } } }, { returnDocument: 'after' });
  if (!proposal) lifecycle.fail('Draft missing, approved or changed; refresh before editing');
  res.json(proposal);
 } catch (e) { next(e); }
});
router.post('/:id/review', async (req, res, next) => {
 try {
  if (!['approver', 'administrator'].includes(req.role)) return res.status(403).json({ error: 'Approver permission required', code: 'FORBIDDEN' });
  const body = req.body || {};
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !['approved', 'rejected'].includes(body.decision) || !Number.isInteger(body.version) || typeof body.comment !== 'string' || !body.comment.trim() || body.comment.length > 2000 || Object.keys(body).some(k => !['decision', 'version', 'comment'].includes(k))) lifecycle.fail('Supply decision, current version and bounded comment', 400);
  const existing = await Proposal.findById(req.params.id).lean(); if (!existing) lifecycle.fail('Proposal not found', 404);
  const current = await lifecycle.read(existing.incidentId);
  if (body.decision === 'approved') { const review = accepted(current.workflow, existing.runId); if (existing.reviewId !== review.id || !current.workflow.proposalIds?.includes(String(existing._id))) lifecycle.fail('Legacy/unlinked proposal must be linked through current accepted findings before approval'); }
  const at = new Date();
  const proposal = await Proposal.findOneAndUpdate({ _id: req.params.id, version: body.version, approvalStatus: 'pending' }, { $set: { approvalStatus: body.decision, review: { actor: req.actor, at, comment: redact(body.comment) } }, $inc: { version: 1 }, $push: { audit: { actor: req.actor, at, action: body.decision, version: body.version + 1 } } }, { returnDocument: 'after' });
  if (!proposal) lifecycle.fail('Proposal already reviewed or version changed');
  res.json(proposal);
 } catch (e) { next(e); }
});
router.post('/:id/execute', (_req, res) => res.status(403).json({ code: 'EXECUTION_DISABLED', error: 'Remote execution remains disabled; record approved externally performed remediation in the incident workspace' }));
router.validateProposal = validateProposal;
module.exports = router;
