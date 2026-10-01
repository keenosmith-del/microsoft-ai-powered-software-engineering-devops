import { useEffect, useState } from 'react'
import { getInvestigationRuns, getSignals, type Incident, type InvestigationRun, type EngineeringSignal } from '../services/api'
import AgentTopology from './Agents/AgentTopology'
export default function OperationsQueue({ onIncident, onNavigate, incidents }: { incidents: Incident[] | null; onIncident: (id: string) => void; onNavigate: (view: string) => void }) {
  const [runs, setRuns] = useState<InvestigationRun[]>([])
  const [signals, setSignals] = useState<EngineeringSignal[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    let running = false
    const load = async () => {
      if (running) return
      running = true
      const results = await Promise.allSettled([getInvestigationRuns('', 1), getSignals()])
      running = false
      if (!active) return
      setLoading(false)
      setRuns(results[0].status === 'fulfilled' ? results[0].value.items : [])
      setSignals(results[1].status === 'fulfilled' ? results[1].value.items : [])
      setError(results.filter(item => item.status === 'rejected').map(item => String(item.reason.message || item.reason)).join(' · '))
    }
    void load(); const interval = setInterval(() => void load(), 15000)
    window.addEventListener('ops-auth-changed', load)
    return () => { active = false; clearInterval(interval); window.removeEventListener('ops-auth-changed', load) }
  }, [])
  return <section className="phase2-workspace operations-queue" aria-label="Operations queue"><h2>Engineering queue</h2>{loading && <p role="status">Loading saved operations…</p>}{error && <p role="alert">{error}</p>}<div className="operations-columns"><section><h3>Review and recovery</h3>{(incidents || []).filter(item => ['Awaiting review', 'Remediation planned', 'In remediation', 'Verifying'].includes(item.status)).slice(0, 8).map(item => <p key={item._id}><button onClick={() => onIncident(item._id)}>{item.title}</button> · {item.status}</p>)}{!loading && !error && incidents?.length === 0 && <p>No recorded incidents.</p>}<button onClick={() => onNavigate('incidents')}>All incidents</button></section><section><h3>Recent investigations</h3>{runs.slice(0, 5).map(run => <p key={run.runId}><button onClick={() => onIncident(run.incidentId)}>{run.currentStage || 'Investigation'}</button> · {run.status}{run.error && ` · ${run.error}`}</p>)}{!loading && !error && runs.length === 0 && <p>No executions recorded.</p>}</section><section><h3>Recent engineering signals</h3>{signals.slice(0, 5).map(signal => <p key={signal.signalId}>{signal.incidentId ? <button onClick={() => onIncident(signal.incidentId!)}>{signal.summary}</button> : <a href={signal.references.sourceUrl} target="_blank" rel="noreferrer">{signal.summary}</a>} · {signal.severity}</p>)}{!loading && !error && signals.length === 0 && <p>No observed signals.</p>}<button onClick={() => onNavigate('engineering')}>Inspect engineering evidence</button></section></div><AgentTopology run={runs.find(run => ['queued', 'running'].includes(run.status)) || runs[0]} /></section>
}
