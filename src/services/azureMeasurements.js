const { DefaultAzureCredential } = require('@azure/identity');
const { boundedText } = require('./boundedText');
const fail = (message, status = 400, code = 'INVALID_QUERY') => { throw Object.assign(new Error(message), { status, code }); };
function windowBounds(start, end, now = Date.now()) {
 const a = Date.parse(start), b = Date.parse(end);
 if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a || b - a > 86400000 || b > now + 60000) fail('Supply a past time window of at most 24 hours');
 return { start: new Date(a).toISOString(), end: new Date(b).toISOString() };
}
function allowedResource(resourceId, env) {
 if (typeof resourceId !== 'string' || resourceId.length > 1000 || !/^\/subscriptions\/[a-f0-9-]{36}\/resourceGroups\/[\w.()-]+\/providers\/[\w.]+\/[\w/().-]+$/i.test(resourceId)) fail('Invalid resource ID');
 const allowed = (env.AZURE_DIAGNOSTIC_RESOURCE_IDS || '').split(',').filter(Boolean);
 if (!allowed.some(v => v.toLowerCase() === resourceId.toLowerCase())) fail('Resource not allowlisted for diagnostics', 403, 'INVALID_SCOPE');
 if (resourceId.split('/')[2].toLowerCase() !== env.AZURE_SUBSCRIPTION_ID?.toLowerCase() || (env.AZURE_RESOURCE_GROUP && resourceId.split('/')[4].toLowerCase() !== env.AZURE_RESOURCE_GROUP.toLowerCase())) fail('Resource outside configured subscription/group', 403, 'INVALID_SCOPE');
 return resourceId;
}
function createAzureMeasurements({ credential = new DefaultAzureCredential(), fetcher = fetch, env = process.env } = {}) {
 let active = 0;
 async function request(url, scope, body) {
  if (active >= 3) fail('Diagnostics busy; retry later', 429, 'RATE_LIMITED'); active++;
  const signal = AbortSignal.timeout(15000);
  try {
   const token = await credential.getToken(scope, { abortSignal: signal });
   const r = await fetcher(url, { method: body ? 'POST' : 'GET', redirect: 'error', signal, headers: { Authorization: `Bearer ${token.token}`, ...(body ? { 'Content-Type': 'application/json', Prefer: 'wait=10' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
   if (!r.ok) fail(r.status === 403 ? 'Diagnostics permission denied' : r.status === 429 ? 'Diagnostics rate limited' : 'Diagnostics query failed', r.status === 403 ? 403 : r.status === 429 ? 429 : 502, r.status === 403 ? 'PERMISSION_DENIED' : r.status === 429 ? 'RATE_LIMITED' : 'QUERY_FAILED');
   const text = await boundedText(r, { bytes: 262144, env }); if (text.truncated) fail('Diagnostic response exceeded bound', 502, 'RESULT_LIMIT');
   const data = JSON.parse(text.content); if (data.error) fail('Partial or failed diagnostic query', 502, 'QUERY_FAILED'); return data;
  } catch (e) { if (e.status) throw e; fail('Diagnostic credentials unavailable or request timed out', 502, 'DIAGNOSTICS_UNAVAILABLE'); }
  finally { active--; }
 }
 async function definitions(resourceId) {
  allowedResource(resourceId, env);
  const data = await request(`https://management.azure.com${resourceId}/providers/Microsoft.Insights/metricDefinitions?api-version=2018-01-01`, 'https://management.azure.com/.default');
  return { status: data.value?.length ? 'available' : 'no-observations', resourceId, items: (data.value || []).slice(0, 100).map(v => ({ name: v.name?.value, unit: v.unit, aggregations: v.supportedAggregationTypes, availability: v.metricAvailabilities })), truncated: Boolean(data.nextLink) || data.value?.length > 100, retrievedAt: new Date() };
 }
 async function metrics({ resourceId, metric, aggregation, start, end }) {
  const window = windowBounds(start, end); const defs = await definitions(resourceId);
  const definition = defs.items.find(v => v.name === metric);
  if (!definition || !definition.aggregations?.includes(aggregation)) fail('Metric/aggregation not supported for this resource', 422, 'UNSUPPORTED_METRIC');
  const params = new URLSearchParams({ 'api-version': '2023-10-01', metricnames: metric, aggregation, timespan: `${window.start}/${window.end}`, interval: 'PT5M', top: '1' });
  const data = await request(`https://management.azure.com${resourceId}/providers/Microsoft.Insights/metrics?${params}`, 'https://management.azure.com/.default');
  const m = data.value?.find(v => v.name?.value === metric);
  if (m?.errorCode && m.errorCode !== 'Success') fail('Metric retrieval failed', 502, 'QUERY_FAILED');
  const series = m?.timeseries || [];
  // Never average independent dimensions into an invented resource-level measurement.
  const observations = series.length === 1 ? (series[0].data || []).slice(0, 300).map(v => ({ timestamp: v.timeStamp, value: Number.isFinite(v[aggregation.toLowerCase()]) ? v[aggregation.toLowerCase()] : null })) : [];
  return { provider: 'azure-monitor', status: observations.some(v => v.value !== null) ? 'available' : 'no-observations', resourceId, metric, unit: m?.unit || definition.unit, aggregation, window, observations, missingData: !observations.length || observations.some(v => v.value === null), truncated: Boolean(data.nextLink) || series.length > 1 || series[0]?.data?.length > 300, sourceUrl: `https://portal.azure.com/#@/resource${resourceId}`, retrievedAt: new Date() };
 }
 async function query({ provider, template, start, end }) {
  const window = windowBounds(start, end);
  const app = provider === 'application-insights', workspace = provider === 'log-analytics';
  if (!app && !workspace) fail('Unsupported diagnostic provider');
  const id = app ? env.AZURE_APPLICATION_INSIGHTS_APP_ID : env.AZURE_LOG_ANALYTICS_WORKSPACE_ID;
  if (!id) fail('Diagnostic query resource not configured', 503, 'NOT_CONFIGURED');
  if (!/^[a-f0-9-]{36}$/i.test(id)) fail('Configured query resource ID is invalid', 503, 'NOT_CONFIGURED');
  const templates = app ? {
   requests: 'requests | project timestamp, operation_Id, success, duration, resultCode',
   exceptions: 'exceptions | project timestamp, operation_Id, type, outerMessage',
   dependencies: 'dependencies | project timestamp, operation_Id, success, duration, type, target',
  } : { diagnostics: 'AzureDiagnostics | project TimeGenerated, ResourceId, OperationName, CorrelationId', events: 'AzureActivity | project TimeGenerated, ResourceId, OperationNameValue, ActivityStatusValue, CorrelationId' };
  if (!Object.hasOwn(templates, template)) fail('Select a predefined query template');
  const host = app ? 'https://api.applicationinsights.io' : 'https://api.loganalytics.azure.com';
  const url = `${host}/v1/${app ? 'apps' : 'workspaces'}/${id}/query`;
  const data = await request(url, `${host}/.default`, { query: `${templates[template]} | take 100`, timespan: `${window.start}/${window.end}` });
  const tables = (data.tables || []).map(t => ({ name: t.name, columns: t.columns, rows: t.rows.slice(0, 100) }));
  return { provider, resourceId: id, template, window, status: tables.some(t => t.rows.length) ? 'available' : 'no-observations', tables, truncated: tables.some(t => t.rows.length === 100), retrievedAt: new Date(), sourceUrl: 'https://portal.azure.com/' };
 }
 return { definitions, metrics, query };
}
module.exports = { createAzureMeasurements, allowedResource, windowBounds };
