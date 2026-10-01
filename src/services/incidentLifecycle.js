const { createHash, randomUUID } = require('node:crypto');
const Incident = require('../models/Incident');
const Workflow = require('../models/IncidentWorkflow');
const Run = require('../models/InvestigationRun');
const { initialWorkflow, transition } = require('./incidentWorkflow');
const labels = { detect: 'Open', investigate: 'Investigating', review: 'Awaiting review', plan: 'Remediation planned', remediate: 'In remediation', verify: 'Verifying', resolved: 'Resolved' };
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status, code: status === 409 ? 'LIFECYCLE_CONFLICT' : 'INVALID_INPUT' }); };
async function ensure(incidentId) {
 const incident = await Incident.findById(incidentId).lean();
 if (!incident) fail('Incident not found', 404);
 let record = await Workflow.findOne({ incidentId }).lean();
 if (!record) {
  const workflow = initialWorkflow();
  workflow.stage = incident.status === 'Resolved' ? 'resolved' : incident.analysis || incident.investigation ? 'review' : 'detect';
  workflow.migration = { adoptedAt: new Date(), legacyStatus: incident.status, source: 'existing-record', historicalEventsInvented: false };
  try { record = (await Workflow.create({ incidentId, version: 0, workflow })).toObject(); }
  catch (error) { if (error.code !== 11000) throw error; record = await Workflow.findOne({ incidentId }).lean(); }
 }
 return { incident, record };
}
async function project(incidentId, record) {
 // Monotonic version fence prevents an old repair from overwriting a newer projection.
 await Incident.updateOne({ _id: incidentId, $or: [{ lifecycleVersion: { $exists: false } }, { lifecycleVersion: { $lte: record.version } }] }, { $set: { status: labels[record.workflow.stage] || 'Open', lifecycleVersion: record.version } }, { timestamps: false });
}
async function save(incidentId, record, workflow) {
 const result = await Workflow.updateOne({ incidentId, version: record.version }, { $set: { workflow, version: workflow.version } });
 if (!result.matchedCount) fail('Incident changed; refresh before submitting');
 const next = { ...record, workflow, version: workflow.version };
 // Read responses always derive canonical state; a failed projection is recoverable, never authoritative.
 try { await project(incidentId, next); } catch { /* repaired by reads and worker */ }
 return next;
}
async function change(incidentId, version, body, actor, context = {}) {
 const { record } = await ensure(incidentId);
 if (record.version !== version) fail('Incident changed; refresh before submitting');
 const workflow = transition(record.workflow, body, { actor, ...context });
 return (await save(incidentId, record, workflow)).workflow;
}
async function attachRun(incidentId, run, request) {
 for (let attempt = 0; attempt < 8; attempt++) {
  const { record } = await ensure(incidentId);
  const w = structuredClone(record.workflow);
  w.submittedRuns ||= [];
  if (w.submittedRuns.includes(run.runId)) return w;
  if (w.pendingInvestigation?.runId !== request.runId) fail('Investigation request no longer current');
  w.submittedRuns.push(run.runId); w.activeRunId = run.runId; w.currentReviewId = null; w.currentProposalId = null; w.stage = 'investigate'; delete w.pendingInvestigation;
  w.version++; w.audit.push({ id: randomUUID(), actor: request.actor, at: new Date(), action: 'investigation-queued', runId: run.runId, notes: request.notes, stage: w.stage, version: w.version });
  try { return (await save(incidentId, record, w)).workflow; } catch (error) { if (error.status !== 409 || attempt === 7) throw error; }
 }
}
async function reconcileRun(run) {
 if (!['completed', 'failed', 'cancelled'].includes(run.status)) return;
 for (let attempt = 0; attempt < 8; attempt++) {
  const { record } = await ensure(run.incidentId);
  const w = structuredClone(record.workflow); w.reconciledRuns ||= [];
  if (w.reconciledRuns.includes(run.runId)) return;
  w.reconciledRuns.push(run.runId);
  if (w.activeRunId === run.runId || (!w.activeRunId && !w.submittedRuns?.length && ['detect', 'investigate', 'review'].includes(w.stage))) {
   w.stage = run.status === 'completed' ? 'review' : 'detect';
   w.lastRunId = run.runId; w.lastRunOutcome = run.status; delete w.activeRunId;
  }
  w.version++; w.audit.push({ id: randomUUID(), actor: 'investigation-worker', at: run.completedAt || new Date(), action: `investigation-${run.status}`, runId: run.runId, notes: run.status === 'completed' ? 'Persisted findings available for human review' : 'Run ended; history preserved and another investigation may be requested', stage: w.stage, version: w.version });
  try { await save(run.incidentId, record, w); return; } catch (error) { if (error.status !== 409 || attempt === 7) throw error; }
 }
}
async function read(incidentId) {
 let { incident, record } = await ensure(incidentId);
 const run = record.workflow.activeRunId ? await Run.findOne({ incidentId, runId: record.workflow.activeRunId }).lean() : await Run.findOne({ incidentId }).sort({ createdAt: -1 }).lean();
 if (run && record.workflow.pendingInvestigation?.runId === run.runId) { await attachRun(incidentId, run, record.workflow.pendingInvestigation); record = await Workflow.findOne({ incidentId }).lean(); }
 if (run && ['completed', 'failed', 'cancelled'].includes(run.status)) { await reconcileRun(run); record = await Workflow.findOne({ incidentId }).lean(); }
 else if (run && ['queued', 'running'].includes(run.status) && !record.workflow.activeRunId && !record.workflow.pendingInvestigation && ['detect', 'investigate'].includes(record.workflow.stage)) {
  const w = structuredClone(record.workflow); w.activeRunId = run.runId; w.currentReviewId = null; w.currentProposalId = null; w.stage = 'investigate'; w.version++;
  record = await save(incidentId, record, w); // adoption metadata, not an invented historical action
 }
 if (record.workflow.currentReviewId === undefined && record.workflow.reviews?.at(-1)?.decision === 'accepted') {
  const w = structuredClone(record.workflow); w.currentReviewId = w.reviews.at(-1).id; w.version++; record = await save(incidentId, record, w);
 }
 if (record.workflow.stage === 'investigate' && !record.workflow.activeRunId && !record.workflow.pendingInvestigation) {
  const w = structuredClone(record.workflow); w.stage = 'detect'; w.version++; record = await save(incidentId, record, w);
 }
 await project(incidentId, record);
 return { ...incident, status: labels[record.workflow.stage], canonicalStatus: labels[record.workflow.stage], lifecycleVersion: record.version, workflow: record.workflow, activeRun: run && ['queued', 'running'].includes(run.status) ? Object.fromEntries(Object.entries(run).filter(([key]) => !['leaseOwner', 'leaseUntil', 'idempotencyKey', '__v'].includes(key))) : null };
}
async function submit(incidentId, actor, key, notes = 'Manual investigation requested', retry = 0) {
 if (typeof notes !== 'string' || !notes.trim() || notes.length > 4000) fail('Supply bounded human investigation notes', 400);
 notes = require('./redaction').redact(notes.trim());
 if (!/^[\w-]{8,100}$/.test(key || '')) fail('Supply Idempotency-Key (8–100 letters, digits, underscores or hyphens)', 400);
 const previous = await Run.findOne({ incidentId, idempotencyKey: key }).lean();
 if (previous) { await reconcileRun(previous); return previous; }
 const current = await read(incidentId);
 const { record } = await ensure(incidentId);
 if (record.workflow.pendingInvestigation?.idempotencyKey === key) return require('./investigationOutbox').enqueue(incidentId, record.workflow.pendingInvestigation);
 if (current.activeRun || record.workflow.pendingInvestigation) {
  const replay = await Run.findOne({ incidentId, idempotencyKey: key }).lean();
  if (replay) return replay;
  fail('An investigation is already active or pending');
 }
 if (record.workflow.stage === 'resolved') fail('Reopen the incident before investigating');
 const w = structuredClone(record.workflow);
 w.pendingInvestigation = { runId: randomUUID(), idempotencyKey: key, actor, at: new Date(), notes };
 w.version++;
 try { await save(incidentId, record, w); } catch (error) { if (error.status === 409 && retry < 8) return submit(incidentId, actor, key, notes, retry + 1); throw error; }
 return require('./investigationOutbox').enqueue(incidentId, w.pendingInvestigation);
}
async function create(body, actor, key) {
 const fields = ['title', 'description', 'service', 'severity', 'investigate'];
 if (!body || Object.keys(body).some(k => !fields.includes(k)) || !['title', 'description'].every(k => typeof body[k] === 'string' && body[k].trim() && body[k].length <= (k === 'title' ? 200 : 100000)) || (body.service !== undefined && (typeof body.service !== 'string' || !body.service.trim() || body.service.length > 200)) || (body.severity !== undefined && !['Critical', 'High', 'Medium', 'Low'].includes(body.severity)) || (body.investigate !== undefined && typeof body.investigate !== 'boolean')) fail('Supply bounded title, description, optional service/severity and investigate', 400);
 if (!/^[\w-]{8,100}$/.test(key || '')) fail('Supply Idempotency-Key for manual creation', 400);
 const { investigate = false, ...data } = body;
 const submissionKey = createHash('sha256').update(`${actor}:${key}`).digest('hex');
 const submissionHash = createHash('sha256').update(JSON.stringify(fields.map(k => body[k] ?? null))).digest('hex');
 let incident;
 try { incident = await Incident.findOneAndUpdate({ submissionKey }, { $setOnInsert: { ...data, status: 'Open', submissionKey, submissionHash } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }); }
 catch (error) { if (error.code !== 11000) throw error; incident = await Incident.findOne({ submissionKey }); }
 if (incident.submissionHash !== submissionHash) fail('Idempotency key was already used with different incident content');
 await ensure(incident._id);
 if (investigate) {
  try { await submit(incident._id, actor, key, 'Initial manual investigation'); }
  catch (error) { if (error.status === 409) throw error; return { ...await read(incident._id), submissionStatus: 'pending' }; }
 }
 return read(incident._id);
}
async function repair() {
 const runs = await Run.find({ status: { $in: ['completed', 'failed', 'cancelled'] } }).sort({ completedAt: -1 }).limit(100).lean();
 for (const run of runs) await reconcileRun(run);
}
module.exports = { labels, fail, ensure, read, change, save, submit, create, attachRun, reconcileRun, repair };
