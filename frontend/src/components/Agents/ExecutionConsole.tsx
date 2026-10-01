import { useEffect, useState } from 'react'
import { getInvestigationRuns, submitInvestigation, cancelInvestigation, type InvestigationRun } from '../../services/api'
export default function ExecutionConsole() {
  const [token, setToken] = useState('')
  const [connectedToken, setConnectedToken] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<InvestigationRun[]>([])
  const [hasNext, setHasNext] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [incidentId, setIncidentId] = useState('')
  const [submissionKey, setSubmissionKey] = useState(() => crypto.randomUUID())
  useEffect(() => {
    if (!connectedToken) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const data = await getInvestigationRuns(connectedToken, page, AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]))
        if (!controller.signal.aborted) { setRows(data.items); setHasNext(data.hasNext); setError('') }
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Run history unavailable') }
    }
    void load()
    const interval = window.setInterval(() => void load(), 5000)
    return () => { controller.abort(); window.clearInterval(interval) }
  }, [connectedToken, page, version])
  const submit = async () => {
    setBusy(true)
    try { const run = await submitInvestigation(connectedToken, incidentId, submissionKey); setSelected(run.runId); setSubmissionKey(crypto.randomUUID()); setVersion(value => value + 1); setError('') }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Submission failed') }
    finally { setBusy(false) }
  }
  const cancel = async (runId: string) => {
    setBusy(true)
    try { await cancelInvestigation(connectedToken, runId); setVersion(value => value + 1) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Cancellation failed') }
    finally { setBusy(false) }
  }
  const detail = rows.find(row => row.runId === selected)
  return <section className="agents-section phase2-workspace">
    <div className="agents-section-heading"><div><span className="eyebrow">EXECUTION OBSERVABILITY</span><h2>Persisted investigation runs</h2></div></div>
    <form onSubmit={event => { event.preventDefault(); setConnectedToken(token); setVersion(value => value + 1) }}><label>Operations token <input type="password" value={token} onChange={event => setToken(event.target.value)} autoComplete="off" /></label><button type="submit">Connect history</button></form>
    <p>Token stays in component memory. Additive runs preserve incident statuses. Worker execution requires INVESTIGATION_WORKER_ENABLED=true. Polling refreshes every five seconds; authenticated SSE is also available through the API.</p>
    {error && <p role="alert">{error} · Displayed history may be stale.</p>}
    {connectedToken && <><form onSubmit={event => { event.preventDefault(); void submit() }}><label>Existing incident ID <input value={incidentId} onChange={event => { setIncidentId(event.target.value); setSubmissionKey(crypto.randomUUID()) }} required pattern="[a-fA-F0-9]{24}" /></label><button disabled={busy}>Start separate investigation</button></form>
      <button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button> Page {page} <button disabled={!hasNext} onClick={() => setPage(value => value + 1)}>Next</button>
      {rows.length === 0 && !error && <p>No run records returned.</p>}
      <div className="agent-cards">{rows.map(run => <article className="agent-card" key={run.runId}><div className="agent-card-content"><button onClick={() => setSelected(run.runId)}>{run.runId}</button><p>{run.status} · {run.currentStage} · Attempts {run.attempts}</p><p>{new Date(run.createdAt).toLocaleString()} · {run.elapsedMs === undefined ? 'Duration not measured' : `${run.elapsedMs} ms`}</p><p>Deployment: {run.deployment || 'Not configured'}</p>{['queued', 'running'].includes(run.status) && <button disabled={busy} onClick={() => void cancel(run.runId)}>Cancel run</button>}</div></article>)}</div>
      {detail && <article className="agent-card"><div className="agent-card-content"><h3>Run {detail.runId}</h3><p>Correlation: {detail.correlationId}</p>{detail.error && <p role="status">{detail.error}</p>}{detail.events.map(event => <p key={event.id}>{new Date(event.at).toLocaleString()} · {event.status} · {event.detail}</p>)}{detail.result && Object.entries(detail.result).map(([stage, value]) => <details key={stage}><summary>{stage}</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{value}</pre></details>)}<p>Per-agent timing, tool spans, token usage and cost are not measured by the current runtime.</p></div></article>}
    </>}
  </section>
}
