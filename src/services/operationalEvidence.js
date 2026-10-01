const { randomUUID } = require('node:crypto');
const Evidence = require('../models/EngineeringEvidence');
const Signal = require('../models/EngineeringSignal');
const { createGitHubIntelligence } = require('./githubIntelligence');
const { redact } = require('./redaction');
async function collect(incidentId, runId, { github = createGitHubIntelligence(), env = process.env } = {}) {
 const signals = await Signal.find({ incidentId }).sort({ observedAt: -1 }).limit(5).lean();
 const results = [], tools = [];
 async function tool(name, fn) {
  const at = new Date(), start = Date.now();
  try { const value = await fn(); tools.push({ name, at, durationMs: Date.now() - start, outcome: 'available' }); return value; }
  catch { tools.push({ name, at, durationMs: Date.now() - start, outcome: 'unavailable', error: 'Evidence unavailable; check provider permissions, retention and connectivity' }); return null; }
 }
 async function store(signal, type, content, extra = {}) {
  const filter = { incidentId, runId, signalId: signal.signalId, type, jobId: extra.jobId || null };
  const value = { evidenceId: randomUUID(), provider: signal.provider, repository: signal.sourceResource, branch: signal.references.branch, commitSha: signal.references.commitSha, workflowRunId: signal.references.workflowRunId, deploymentId: signal.references.deploymentId, sourceUrl: signal.references.sourceUrl, observedAt: signal.observedAt, retrievedAt: new Date(), content: redact(content, env).slice(0, 12000), truncated: content.length > 12000, relationship: 'directly-linked', ...extra };
  const doc = await Evidence.findOneAndUpdate(filter, { $setOnInsert: value }, { upsert: true, returnDocument: 'after' }); results.push(doc.toObject());
 }
 for (const signal of signals) {
  await store(signal, signal.type, signal.summary);
  if (signal.provider === 'azure') {
   const azure = require('./azureMeasurements').createAzureMeasurements({ env });
   const end = new Date(Math.min(Date.now(), new Date(signal.observedAt).getTime() + 1800000)).toISOString();
   const start = new Date(Date.parse(end) - 3600000).toISOString();
   const defs = await tool('azure.metric-definitions', () => azure.definitions(signal.sourceResource));
   const metric = defs?.items.find(v => v.name === env.AZURE_INVESTIGATION_METRIC);
   if (metric) {
    const aggregation = metric.aggregations.includes('Average') ? 'Average' : metric.aggregations[0];
    const measurement = await tool('azure.metrics', () => azure.metrics({ resourceId: signal.sourceResource, metric: metric.name, aggregation, start, end }));
    if (measurement) await store(signal, 'azure-metric', JSON.stringify(measurement), { resourceId: signal.sourceResource, subscriptionId: env.AZURE_SUBSCRIPTION_ID, unit: measurement.unit, aggregation, window: measurement.window });
   }
   if (env.AZURE_APPLICATION_INSIGHTS_APP_ID) for (const template of ['requests', 'exceptions']) {
    const diagnostics = await tool(`azure.${template}`, () => azure.query({ provider: 'application-insights', template, start, end }));
    if (diagnostics) await store(signal, `application-insights-${template}`, JSON.stringify(diagnostics), { resourceId: diagnostics.resourceId, relationship: 'potentially-relevant', sourceUrl: diagnostics.sourceUrl });
   }
  }
  if (signal.type === 'workflow-failure') {
   const jobs = await tool('github.workflow-jobs', () => github.jobs(signal.references.workflowRunId, 1));
   if (jobs) await store(signal, 'workflow-jobs', JSON.stringify(jobs));
   for (const job of (jobs?.items || []).filter(j => ['failure', 'timed_out'].includes(j.conclusion)).slice(0, 2)) {
    const logs = await tool('github.job-log', () => github.jobLogs(job.id));
    if (logs) await store(signal, 'job-log', logs.content, { jobId: String(job.id), sourceUrl: job.html_url, truncated: logs.truncated || logs.content.length > 12000 });
   }
  }
  if (signal.references.deploymentId) {
   const status = await tool('github.deployment-status', () => github.deploymentStatuses(signal.references.deploymentId));
   if (status) await store(signal, 'deployment-status', JSON.stringify(status));
  }
  if (signal.references.commitSha) {
   const commit = await tool('github.commit', () => github.commit(signal.references.commitSha, 1));
   if (commit) await store(signal, 'commit-change', JSON.stringify(commit), { relationship: 'potentially-relevant', sourceUrl: commit.url });
  }
 }
 return { results, tools, truncated: signals.length === 5 };
}
module.exports = { collect };
