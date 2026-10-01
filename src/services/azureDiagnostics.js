const { DefaultAzureCredential } = require('@azure/identity');
function createAzureDiagnostics({ credential = new DefaultAzureCredential(), fetcher = fetch, env = process.env, now = Date.now } = {}) {
    const cache = new Map();
    let pendingRequests = 0;
    async function read(path, params) {
        const subscription = env.AZURE_SUBSCRIPTION_ID;
        if (!subscription) throw Object.assign(new Error('Set AZURE_SUBSCRIPTION_ID and grant Reader on the intended scope'), { status: 503, code: 'NOT_CONFIGURED' });
        if (!/^[a-fA-F0-9-]{36}$/.test(subscription)) throw Object.assign(new Error('AZURE_SUBSCRIPTION_ID must be a subscription UUID'), { status: 503 });
        const url = `https://management.azure.com/subscriptions/${subscription}${path}?${new URLSearchParams(params)}`;
        const previous = cache.get(url);
        if (previous && previous.until > now()) return previous.promise;
        if (pendingRequests >= 3) throw Object.assign(new Error('Azure diagnostics busy; retry shortly'), { status: 429 });
        pendingRequests++;
        const promise = (async () => {
            const signal = AbortSignal.timeout(10000);
            const token = await credential.getToken('https://management.azure.com/.default', { abortSignal: signal });
            const response = await fetcher(url, { signal, redirect: 'error', headers: { Authorization: `Bearer ${token.token}` } });
            if (!response.ok) throw Object.assign(new Error(`Azure returned HTTP ${response.status}; verify Reader or Monitoring Reader access`), { status: 502, code: 'AZURE_ACCESS_FAILED' });
            const data = await response.json();
            return { items: (data.value || []).slice(0, 100), truncated: Boolean(data.nextLink) || data.value?.length > 100, checkedAt: new Date(now()).toISOString() };
        })().catch(error => {
            cache.delete(url);
            if (error.code === 'AZURE_ACCESS_FAILED') throw error;
            throw Object.assign(new Error('Azure authentication or request failed/timed out; configure DefaultAzureCredential and check scope permissions'), { status: 502, code: 'AZURE_UNAVAILABLE' });
        }).finally(() => { pendingRequests--; });
        if (cache.size >= 50) cache.delete(cache.keys().next().value);
        cache.set(url, { promise, until: now() + 30000 });
        return promise;
    }
    function groupPath(group) {
        if (group && (typeof group !== 'string' || !/^[\w.()-]{1,90}$/.test(group))) throw Object.assign(new Error('Invalid resource group'), { status: 400 });
        const scope = env.AZURE_RESOURCE_GROUP;
        if (scope && group && group.toLowerCase() !== scope.toLowerCase()) throw Object.assign(new Error('Resource group is outside configured scope'), { status: 403 });
        return scope || group;
    }
    async function inventory(group) {
        const selected = groupPath(group);
        const result = await read(selected ? `/resourceGroups/${encodeURIComponent(selected)}/resources` : '/resources', { 'api-version': '2021-04-01' });
        return { ...result, items: result.items.map(resource => ({ id: resource.id, name: resource.name, type: resource.type, location: resource.location, provisioningState: resource.properties?.provisioningState ?? null,
            portalUrl: `https://portal.azure.com/#@/resource${resource.id}` })) };
    }
    async function groups() {
        const result = await read('/resourcegroups', { 'api-version': '2021-04-01' });
        const scope = env.AZURE_RESOURCE_GROUP;
        return { ...result, items: result.items.filter(group => !scope || group.name.toLowerCase() === scope.toLowerCase()).map(group => ({ name: group.name, location: group.location })) };
    }
    async function activity(group, hours) {
        const selected = groupPath(group);
        const duration = Number(hours || 24);
        if (!Number.isInteger(duration) || duration < 1 || duration > 168) throw Object.assign(new Error('hours must be an integer from 1 to 168'), { status: 400 });
        // Minute rounding allows cache reuse while preserving the explicit query window.
        const end = new Date(Math.floor(now() / 60000) * 60000).toISOString();
        const start = new Date(Date.parse(end) - duration * 3600000).toISOString();
        const filter = `eventTimestamp ge '${start}' and eventTimestamp le '${end}'${selected ? ` and resourceGroupName eq '${selected}'` : ''}`;
        const result = await read('/providers/Microsoft.Insights/eventtypes/management/values', { 'api-version': '2015-04-01', '$filter': filter, '$select': 'eventDataId,eventTimestamp,operationName,status,resourceId,correlationId,level' });
        return { ...result, start, end, items: result.items.map(item => ({ id: item.eventDataId, timestamp: item.eventTimestamp, operation: item.operationName?.localizedValue || item.operationName?.value, status: item.status?.localizedValue || item.status?.value, resourceId: item.resourceId, correlationId: item.correlationId, level: item.level })) };
    }
    return { inventory, groups, activity };
}
module.exports = { createAzureDiagnostics };
