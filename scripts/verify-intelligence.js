require('dotenv').config({ quiet: true });
const { createGitHubIntelligence } = require('../src/services/githubIntelligence');
const { createAzureDiagnostics } = require('../src/services/azureDiagnostics');
async function main() {
    const github = createGitHubIntelligence();
    const results = await Promise.allSettled([github.snapshot(undefined, 1), github.activity(undefined, 1), createAzureDiagnostics().inventory()]);
    console.log(JSON.stringify(results.map((result, index) => {
        const integration = ['repository', 'github_activity', 'azure_inventory'][index];
        if (result.status === 'rejected') return { integration, status: 'unavailable', detail: result.reason.message };
        const data = result.value;
        if (index === 0) return { integration, status: 'available', repository: data.repository.full_name, branch: data.branch.name, commitsReturned: data.recent_commits.length };
        if (index === 1) return { integration, sections: Object.fromEntries(['runs', 'workflows', 'pulls', 'deployments'].map(key => [key, { status: data[key].status, count: data[key].items?.length ?? null }])) };
        return { integration, status: 'available', count: data.items.length, truncated: data.truncated };
    }), null, 2));
}
main().catch(() => { console.error('Intelligence verification failed'); process.exitCode = 1; });
