import type { InvestigationRun } from '../../services/api'
const stages = [['software-engineering', 'Software Engineering'], ['incident-investigation', 'Incident Investigation'], ['engineering-action', 'Engineering Action']]
export default function AgentTopology({ run }: { run?: InvestigationRun }) {
  return <section aria-label="Live agent topology" className="live-topology"><h3>Current execution</h3><p>{run ? `${run.runId} · ${run.status}` : 'No execution selected'}</p><ol>{stages.map(([id, label]) => {
    const event = run?.events.filter(item => item.stage === id).at(-1)
    const status = event?.status === 'running' && run && ['failed', 'cancelled'].includes(run.status) ? run.status : event?.status || (run?.status === 'queued' ? 'queued' : 'idle')
    return <li key={id} data-state={status}><strong>{label}</strong><span>{status}{event?.elapsedMs !== undefined ? ` · ${event.elapsedMs} ms` : ''}</span></li>
  })}</ol></section>
}
