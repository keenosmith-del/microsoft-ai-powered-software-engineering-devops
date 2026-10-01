const express = require('express');
const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const Workflow = require('../models/IncidentWorkflow');
const Run = require('../models/InvestigationRun');
const Proposal = require('../models/RemediationProposal');
const lifecycle = require('../services/incidentLifecycle');
const router = express.Router({ mergeParams: true });
router.use(require('../middleware/authorization'), require('../middleware/operationsLimit'));
router.use((req, res, next) => {
 if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid incident ID' });
 next();
});
router.get('/', async (req, res, next) => {
 try {
  res.json((await lifecycle.read(req.params.id)).workflow);
 } catch (error) { next(error); }
});
router.post('/report/index', async (req, res, next) => {
 try {
  const record = await Workflow.findOne({ incidentId: req.params.id }).lean();
  const report = record?.workflow.reports?.at(-1);
  if (record?.workflow.stage !== 'resolved' || report?.status !== 'approved') return res.status(409).json({ error: 'Indexing requires an approved report for a resolved workflow' });
  const { ingest } = require('../services/knowledge');
  const Document = require('../models/KnowledgeDocument');
  const value = await require('../services/embeddings').indexVectors(ingest({ title: `Incident report ${req.params.id}`, text: `# Incident provenance\nIncident: ${req.params.id}\nReport: ${report.id}\nApproved by: ${report.approvedBy}\nApproved at: ${new Date(report.approvedAt).toISOString()}\n\n${report.content}` }, req.actor));
  const document = await Document.findOneAndUpdate({ workspace: value.workspace, contentHash: value.contentHash }, { $setOnInsert: value }, { upsert: true, returnDocument: 'after' });
  res.json({ documentId: document._id, reportId: report.id, method: document.method });
 } catch (error) {
  if (error.code === 11000) return res.status(409).json({ error: 'Concurrent indexing; retry to retrieve the indexed report' });
  next(error);
 }
});
router.post('/', async (req, res, next) => {
 try {
  const body = req.body || {};
  const allowed = ['version', 'action', 'notes', 'decision', 'runId', 'evidence', 'proposalId', 'reference', 'result', 'criteria', 'outstandingRisks', 'content', 'performedBy', 'performedAt', 'requestKey'];
  if (Object.keys(body).some(key => !allowed.includes(key))) return res.status(400).json({ error: 'Unknown workflow fields' });
  if (['plan-proposal'].includes(body.action)) return res.status(400).json({ error: 'Proposal planning requires the remediation API' });
  if (body.action === 'reinvestigate') {
   const key = body.requestKey;
   if (!/^[\w-]{8,100}$/.test(key || '')) return res.status(400).json({ error: 'Supply a stable requestKey for reinvestigation' });
   await lifecycle.submit(req.params.id, req.actor, key, body.notes);
   return res.json((await lifecycle.read(req.params.id)).workflow);
  }
  if (body.action === 'approve-report' && !['approver', 'administrator'].includes(req.role)) return res.status(403).json({ error: 'Approver permission required' });
  if (!Number.isInteger(body.version) || body.version < 0 || Object.keys(body).some(key => !allowed.includes(key))) return res.status(400).json({ error: 'Supply current workflow version and supported action fields' });
  if (!await Incident.exists({ _id: req.params.id })) return res.status(404).json({ error: 'Incident not found' });
  await lifecycle.read(req.params.id);
  const { record: existing } = await lifecycle.ensure(req.params.id);
  if ((existing?.version || 0) !== body.version) return res.status(409).json({ error: 'Workflow changed; refresh before submitting' });
  let completedRun, approvedProposal;
  if (body.action === 'review') completedRun = await Run.findOne({ incidentId: req.params.id, runId: body.runId, status: 'completed' }).lean();
  if (['record-change', 'start-remediation'].includes(body.action)) {
   if (!mongoose.isObjectIdOrHexString(body.proposalId)) return res.status(400).json({ error: 'Invalid proposal ID' });
   approvedProposal = await Proposal.findOne({ _id: body.proposalId, incidentId: req.params.id, approvalStatus: 'approved' }).lean();
  }
  const workflow = await lifecycle.change(req.params.id, body.version, body, req.actor, { completedRun, approvedProposal });
  if (workflow.pendingInvestigation) {
   try { await require('../services/investigationOutbox').enqueue(req.params.id, workflow.pendingInvestigation); delete workflow.pendingInvestigation; }
   catch { return res.status(202).json({ ...workflow, submissionStatus: 'pending', detail: 'Investigation request persisted; the worker will retry queue delivery' }); }
  }
  res.json((await lifecycle.read(req.params.id)).workflow);
 } catch (error) {
  if (error.code === 11000) return res.status(409).json({ error: 'Workflow changed; refresh before submitting' });
  if (error.status === 409) return res.status(409).json({ error: error.message });
  next(error);
 }
});
module.exports = router;
