const Run = require('../models/InvestigationRun');
const Workflow = require('../models/IncidentWorkflow');
async function enqueue(incidentId, request) {
 const run = await Run.findOneAndUpdate({ incidentId, idempotencyKey: request.idempotencyKey || `workflow-${request.runId}` }, { $setOnInsert: {
  incidentId, idempotencyKey: request.idempotencyKey || `workflow-${request.runId}`, runId: request.runId, requestedBy: request.actor,
  context: { notes: request.notes }, deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  events: [{ id: 1, status: 'queued', stage: 'queued', at: new Date(), detail: 'Human targeted reinvestigation submitted' }],
 } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
 await require('./incidentLifecycle').attachRun(incidentId, run.toObject(), request);
 return run;
}
async function drain() {
 const records = await Workflow.find({ 'workflow.pendingInvestigation.runId': { $exists: true } }).limit(10).lean();
 for (const record of records) {
  try { await enqueue(record.incidentId, record.workflow.pendingInvestigation); }
  catch (error) { if (error.code !== 11000) throw error; }
 }
}
module.exports = { enqueue, drain };
