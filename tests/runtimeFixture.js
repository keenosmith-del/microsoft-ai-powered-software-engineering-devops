function runtimeFixture(values = { analysis: 'Test-only analysis', investigation: 'Test-only investigation', actions: 'Test-only action' }) {
 const events = ['software-engineering', 'incident-investigation', 'engineering-action'].flatMap((stage, index) => [
  { stage, status: 'running', at: new Date().toISOString() },
  { stage, status: 'completed', at: new Date().toISOString(), elapsedMs: 1, output: values[['analysis', 'investigation', 'actions'][index]] },
 ]);
 return new Response(events.map(v => JSON.stringify(v)).join('\n') + '\n', { headers: { 'Content-Type': 'application/x-ndjson' } });
}
module.exports = runtimeFixture;
