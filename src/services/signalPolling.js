const { createGitHubIntelligence } = require('./githubIntelligence');
const signals = require('./signals');
function createSignalPolling({ env = process.env, github = createGitHubIntelligence({ env }) } = {}) {
 let busy = false;
 async function poll() {
  if (busy) return { status: 'busy' }; busy = true;
  try {
   const activity = await github.activity(env.GITHUB_DEFAULT_BRANCH, 1);
   if (activity.runs.items === null) throw Object.assign(new Error('GitHub polling unavailable'), { status: 502 });
   let captured = 0;
   for (const r of activity.runs.items.filter(r => ['failure', 'timed_out', 'action_required'].includes(r.conclusion) && Date.now() - Date.parse(r.created_at) <= 86400000).slice(0, 10)) {
    const run = await github.run(r.id);
    await signals.ingest(signals.normalizeGitHub({ repository: { full_name: `${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}` }, action: 'completed', workflow_run: run }, 'workflow_run', `poll-run-${r.id}`, env)); captured++;
   }
   return { status: 'available', captured, truncated: activity.runs.hasNext };
  } finally { busy = false; }
 }
 return { poll, start() { const seconds = Math.max(60, Math.min(3600, Number(env.GITHUB_SIGNAL_POLL_SECONDS) || 300)); const timer = setInterval(() => poll().catch(() => console.error('Configured GitHub signal poll unavailable')), seconds * 1000); timer.unref(); return () => clearInterval(timer); } };
}
module.exports = { createSignalPolling };
