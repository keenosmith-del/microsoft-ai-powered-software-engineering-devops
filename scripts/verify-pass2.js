// Safe read-only probes. Prints metadata/status only, never logs, vectors or credentials.
require('dotenv').config({ quiet: true });
async function main() {
 const github = require('../src/services/githubIntelligence').createGitHubIntelligence();
 const activity = await github.activity(undefined, 1);
 const failure = activity.runs.items?.find(r => ['failure', 'timed_out'].includes(r.conclusion));
 const result = { github: { activity: activity.runs.status, failuresInReturnedPage: activity.runs.items?.filter(r => ['failure', 'timed_out'].includes(r.conclusion)).length ?? null } };
 if (failure) {
  try {
   const jobs = await github.jobs(failure.id, 1); const failed = jobs.items.find(j => ['failure', 'timed_out'].includes(j.conclusion));
   result.github.jobs = { status: 'live-read-only-verified', returned: jobs.items.length, hasNext: jobs.hasNext };
   if (failed) { const logs = await github.jobLogs(failed.id); result.github.logs = { status: 'live-read-only-verified', bytes: logs.bytes, truncated: logs.truncated }; }
   const commit = await github.commit(failure.head_sha, 1); result.github.commit = { status: 'live-read-only-verified', filesReturned: commit.files.length, hasNext: commit.hasNext };
  } catch (e) { result.github.failureEvidence = { status: 'failed', code: e.code || 'REQUEST_FAILED' }; }
 } else result.github.failureEvidence = { status: 'no-failure-in-returned-page' };
 const azure = require('../src/services/azureMeasurements').createAzureMeasurements();
 const resourceId = (process.env.AZURE_DIAGNOSTIC_RESOURCE_IDS || '').split(',').filter(Boolean)[0];
 result.azure = { metrics: 'not-configured', applicationInsights: 'not-configured', logAnalytics: 'not-configured' };
 if (resourceId) { try { const defs = await azure.definitions(resourceId); result.azure.metrics = { status: 'live-read-only-verified', definitionsReturned: defs.items.length }; } catch (e) { result.azure.metrics = { status: 'failed', code: e.code }; } }
 const end = new Date().toISOString(), start = new Date(Date.now() - 3600000).toISOString();
 for (const [field, provider, template, key] of [['applicationInsights', 'application-insights', 'requests', 'AZURE_APPLICATION_INSIGHTS_APP_ID'], ['logAnalytics', 'log-analytics', 'events', 'AZURE_LOG_ANALYTICS_WORKSPACE_ID']]) if (process.env[key]) {
  try { const data = await azure.query({ provider, template, start, end }); result.azure[field] = { status: 'live-read-only-verified', dataStatus: data.status, rows: data.tables.reduce((n, t) => n + t.rows.length, 0), truncated: data.truncated }; }
  catch (e) { result.azure[field] = { status: 'failed', code: e.code }; }
 }
 const embedding = require('../src/services/embeddings').createEmbeddings(); result.embeddings = { status: 'not-configured' };
 if (embedding.configured) { try { const [v] = await embedding.embed(['Read-only embedding configuration probe']); result.embeddings = { status: 'live-local-verified', model: embedding.model, dimension: v.length }; } catch (e) { result.embeddings = { status: 'failed', code: e.code }; } }
 result.githubWrites = 'not-executed'; console.log(JSON.stringify(result, null, 2));
}
main().catch(() => { console.error('Read-only Pass 2 probes failed; no writes attempted'); process.exitCode = 1; });
