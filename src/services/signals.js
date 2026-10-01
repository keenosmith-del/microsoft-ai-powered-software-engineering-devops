const { createHmac, timingSafeEqual, createHash, randomUUID } = require('node:crypto');
const Signal = require('../models/EngineeringSignal');
const Evidence = require('../models/EngineeringEvidence');
const { redact } = require('./redaction');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
function verifySignature(body, signature, secret) {
 if (!secret || secret.length < 32) fail('Webhook authentication not configured', 503);
 if (!Buffer.isBuffer(body) || !/^sha256=[a-f0-9]{64}$/.test(signature || '')) fail('Invalid webhook signature', 401);
 const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
 if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) fail('Invalid webhook signature', 401);
}
function normalizeGitHub(payload, event, delivery, env = process.env) {
 const repository = `${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}`;
 if (!env.GITHUB_OWNER || !env.GITHUB_REPOSITORY) fail('GitHub repository not configured', 503);
 if (payload.repository?.full_name?.toLowerCase() !== repository.toLowerCase()) fail('Repository outside configured scope', 403);
 if (!/^[\w-]{8,100}$/.test(delivery || '')) fail('Invalid delivery ID');
 let r, type, refs;
 if (event === 'workflow_run' && payload.action === 'completed' && ['failure', 'timed_out', 'action_required'].includes(payload.workflow_run?.conclusion)) {
  r = payload.workflow_run; type = 'workflow-failure';
  refs = { workflowRunId: String(r.id), commitSha: r.head_sha, branch: r.head_branch, attempt: r.run_attempt || 1 };
 } else if (event === 'deployment_status' && ['failure', 'error'].includes(payload.deployment_status?.state)) {
  r = payload.deployment_status; type = 'deployment-failure'; refs = { deploymentId: String(payload.deployment?.id), commitSha: payload.deployment?.sha, branch: payload.deployment?.ref };
 } else return null;
 if ((refs.deploymentId && !/^\d{1,20}$/.test(refs.deploymentId)) || !/^\d{1,20}$/.test(String(r.id)) || !/^[a-f0-9]{40}$/i.test(refs.commitSha || '')) fail('Invalid engineering event identifiers');
 const observedAt = new Date(r.completed_at || r.updated_at || r.created_at);
 if (!Number.isFinite(observedAt.getTime()) || observedAt.getTime() > Date.now() + 300000) fail('Invalid event timestamp');
 const sourceUrl = type === 'workflow-failure' ? `https://github.com/${repository}/actions/runs/${refs.workflowRunId}` : `https://github.com/${repository}/deployments`;
 const deduplicationKey = createHash('sha256').update(`${repository}:${type}:${refs.workflowRunId || refs.deploymentId}:${refs.attempt || r.id}`).digest('hex');
 return { signalId: randomUUID(), provider: 'github', providerEventId: delivery, type, sourceResource: repository, severity: 'High', observedAt, references: { ...refs, sourceUrl }, deduplicationKey, correlationKey: `${repository}:${type}:${type === 'workflow-failure' ? `${r.workflow_id || r.name || 'workflow'}:${refs.branch || 'unknown'}` : payload.deployment?.environment || 'deployment'}`, summary: redact(`${type}: ${r.name || refs.branch || 'repository'} (${r.conclusion || r.state})`, env).slice(0, 1000), audit: [{ action: 'received', actor: 'github-authenticated-delivery', at: new Date() }] };
}
async function ingest(value) {
 if (!value) return { ignored: true };
 try { const signal = await Signal.findOneAndUpdate({ deduplicationKey: value.deduplicationKey }, { $setOnInsert: value }, { upsert: true, returnDocument: 'after' }); return await applyAutomaticPolicy(signal.toObject()); }
 catch (e) { if (e.code !== 11000) throw e; return await applyAutomaticPolicy(await Signal.findOne({ deduplicationKey: value.deduplicationKey }).lean()); }
}
async function associate(signalId, body, actor) {
 if (!body || Object.keys(body).some(k => !['incidentId', 'investigate'].includes(k)) || (body.investigate !== undefined && typeof body.investigate !== 'boolean')) fail('Supply optional incidentId and investigate');
 const signal = await Signal.findOne({ signalId }).lean(); if (!signal) fail('Signal not found', 404);
 const lifecycle = require('./incidentLifecycle');
 let incidentId = signal.incidentId;
 if (body.incidentId) {
  if (!require('mongoose').isObjectIdOrHexString(body.incidentId)) fail('Invalid incident ID');
  if (incidentId && String(incidentId) !== body.incidentId) fail('Signal is already linked', 409);
  await lifecycle.read(body.incidentId); incidentId = body.incidentId;
 }
 if (!incidentId) {
  // Stable system identity/key recover create-before-link failures across retries/operators.
  const incident = await lifecycle.create({ title: signal.summary.slice(0, 200), description: `${signal.summary}\nObserved source: ${signal.references.sourceUrl}\nThis observation does not establish a causal change.`, service: signal.sourceResource, severity: signal.severity, investigate: false }, 'engineering-signal-ingestion', `signal-${signal.signalId}`);
  incidentId = incident._id;
 }
 const linked = await Signal.findOneAndUpdate({ signalId, $or: [{ incidentId: { $exists: false } }, { incidentId }] }, { $set: { incidentId, state: 'attached', lastProcessedAt: new Date() }, $push: { audit: { action: 'associated', actor, at: new Date() } } }, { returnDocument: 'after' });
 if (!linked) fail('Signal association changed concurrently', 409);
 await Evidence.updateOne({ incidentId, runId: null, signalId, type: signal.type, jobId: null }, { $setOnInsert: { evidenceId: randomUUID(), provider: signal.provider, repository: signal.sourceResource, branch: signal.references.branch, commitSha: signal.references.commitSha, workflowRunId: signal.references.workflowRunId, deploymentId: signal.references.deploymentId, sourceUrl: signal.references.sourceUrl, observedAt: signal.observedAt, retrievedAt: signal.receivedAt, content: signal.summary, truncated: false, relationship: 'directly-linked' } }, { upsert: true });
 if (body.investigate) await lifecycle.submit(incidentId, actor, `signal-${signal.signalId}`, 'Investigate authenticated engineering signal; distinguish observation from causal hypotheses');
 return lifecycle.read(incidentId);
}
module.exports = { verifySignature, normalizeGitHub, ingest, associate };
function normalizeAzure(payload, env = process.env) {
 const essentials = payload?.data?.essentials;
 if (payload?.schemaId !== 'azureMonitorCommonAlertSchema' || !essentials || essentials.monitorCondition !== 'Fired') return null;
 const resources = essentials.alertTargetIDs;
 if (!Array.isArray(resources) || resources.length !== 1) fail('Exactly one allowlisted alert resource is required');
 const resourceId = require('./azureMeasurements').allowedResource(resources[0], env);
 if (typeof essentials.alertId !== 'string' || essentials.alertId.length > 1000 || !essentials.alertId.startsWith('/subscriptions/')) fail('Invalid alert ID');
 const observedAt = new Date(essentials.firedDateTime);
 if (!Number.isFinite(observedAt.getTime()) || observedAt > new Date(Date.now() + 300000)) fail('Invalid alert time');
 const key = createHash('sha256').update(`${essentials.alertId}:${essentials.firedDateTime}`).digest('hex');
 return { signalId: randomUUID(), provider: 'azure', providerEventId: essentials.alertId, type: 'monitor-alert', sourceResource: resourceId, severity: ['Sev0', 'Sev1'].includes(essentials.severity) ? 'High' : 'Medium', observedAt, references: { resourceId, sourceUrl: `https://portal.azure.com/#@/resource${resourceId}` }, summary: redact(`Azure Monitor Fired: ${essentials.alertRule || 'alert'}`, env).slice(0, 1000), deduplicationKey: key, correlationKey: `${resourceId}:${essentials.alertRule || essentials.alertId}`, audit: [{ action: 'received', actor: 'authenticated-alert-relay', at: new Date() }] };
}
module.exports.normalizeAzure = normalizeAzure;

async function applyAutomaticPolicy(signal, env = process.env) {
 if (env.SIGNAL_AUTO_CREATE !== 'true' || !signal) return signal;
 const eligible = (env.SIGNAL_AUTO_SEVERITIES || 'Critical,High').split(',');
 if (!eligible.includes(signal.severity) || Date.now() - new Date(signal.observedAt).getTime() > 86400000) return signal;
 try {
  const lifecycle = require('./incidentLifecycle');
  let incidentId = signal.incidentId;
  if (!incidentId) {
   const previous = await Signal.findOne({ correlationKey: signal.correlationKey, incidentId: { $exists: true }, observedAt: { $gte: new Date(Date.now() - 86400000) } }).sort({ observedAt: -1 }).lean();
   if (previous && (await lifecycle.read(previous.incidentId)).status !== 'Resolved') incidentId = previous.incidentId;
  }
  if (!incidentId) {
   const windowMinutes = Math.max(5, Math.min(1440, Number(env.SIGNAL_DEDUP_MINUTES) || 60));
   const bucket = Math.floor(new Date(signal.observedAt).getTime() / (windowMinutes * 60000));
   const key = createHash('sha256').update(`${signal.correlationKey}:${bucket}`).digest('hex');
   const incident = await lifecycle.create({ title: `Engineering signal: ${signal.sourceResource}`.slice(0, 200), description: `Configured automatic correlation group: ${signal.correlationKey}. Inspect attached evidence; correlation does not prove cause.`, service: signal.sourceResource, severity: signal.severity, investigate: false }, 'configured-signal-policy', `auto-${key}`);
   incidentId = incident._id;
  }
  await associate(signal.signalId, { incidentId: String(incidentId) }, 'configured-signal-policy');
  if (env.SIGNAL_AUTO_INVESTIGATE === 'true') await lifecycle.submit(incidentId, 'configured-signal-policy', `auto-${incidentId}`, 'Configured automatic investigation of authenticated engineering evidence');
  return Signal.findOne({ signalId: signal.signalId }).lean();
 } catch {
  await Signal.updateOne({ signalId: signal.signalId }, { $addToSet: { processingErrors: 'Automatic association failed; replay delivery or associate manually' } });
  return Signal.findOne({ signalId: signal.signalId }).lean();
 }
}
module.exports.applyAutomaticPolicy = applyAutomaticPolicy;
