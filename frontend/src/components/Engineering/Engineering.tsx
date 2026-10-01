import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Server, Terminal } from 'lucide-react'
import { getEngineeringOverview, type EngineeringOverview } from '../../services/api'
import './Engineering.css'

const label = (value: string) => value.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())

function Engineering() {
  const [snapshot, setSnapshot] = useState<EngineeringOverview | null>(null)
  const [refreshing, setRefreshing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const controller = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    const timer = window.setTimeout(() => current.abort(), 20_000)
    setRefreshing(true)
    const start = performance.now()
    try {
      const result = await getEngineeringOverview(current.signal)
      if (!current.signal.aborted) {
        setSnapshot(result)
        setLatency(Math.round(performance.now() - start))
        setError(null)
      }
    } catch (failure) {
      if (controller.current === current) setError(failure instanceof Error ? failure.message : 'Overview unavailable')
    } finally {
      window.clearTimeout(timer)
      if (controller.current === current) setRefreshing(false)
    }
  }, [])
  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), 30_000)
    return () => { window.clearTimeout(initial); window.clearInterval(interval); controller.current?.abort() }
  }, [refresh])
  const services = snapshot?.services ?? []
  const responding = services.filter(s => s.status === 'operational').length
  const overall = !snapshot ? (refreshing ? 'Checking' : 'Unavailable') : error ? 'Stale' : services.some(s => s.status === 'unavailable' || s.status === 'degraded') ? 'Degraded' : 'Partial'
  const metric = (value: number | null | undefined) => value ?? (refreshing && !snapshot ? 'Loading' : 'Unavailable')
  return (
    <section className="engineering-page">
      <div className="engineering-header">
        <div><span className="eyebrow">ENGINEERING</span><h1>Engineering intelligence</h1><p>Measured dependency health and persisted incident activity.</p></div>
        <div className="engineering-runtime">
          <div className={`runtime-indicator is-${overall.toLowerCase()}`} role="status"><span className="runtime-dot" />{overall}</div>
          <span>{snapshot ? `Checked ${new Date(snapshot.checkedAt).toLocaleString()}${snapshot.cached ? ' · Cached' : ''}` : 'Waiting for data'}</span>
          <button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>
      {error && <p role="alert">{error}{snapshot ? ' · Showing last successful snapshot; data is stale.' : ''}</p>}
      <div className="engineering-metrics">
        <article className="engineering-metric"><div className="engineering-metric-icon"><Activity size={17} /></div><div><span>API RESPONSE</span><strong>{latency === null ? 'Unknown' : `${latency} ms`}</strong><small>Browser to gateway round trip</small></div></article>
        <article className="engineering-metric"><div className="engineering-metric-icon"><AlertTriangle size={17} /></div><div><span>ACTIVE INCIDENTS</span><strong>{metric(snapshot?.metrics.activeIncidents)}</strong><small>All persisted unresolved incidents</small></div></article>
        <article className="engineering-metric"><div className="engineering-metric-icon"><Server size={17} /></div><div><span>OPERATIONAL SERVICES</span><strong>{snapshot ? `${responding} / ${services.length}` : 'Unknown'}</strong><small>Configuration alone does not prove connectivity</small></div></article>
        <article className="engineering-metric"><div className="engineering-metric-icon"><AlertTriangle size={17} /></div><div><span>HIGH PRIORITY SIGNALS</span><strong>{metric(snapshot?.metrics.highPrioritySignals)}</strong><small>Unresolved high or critical incidents</small></div></article>
      </div>
      <div className="engineering-grid">
        <section className="engineering-panel engineering-health">
          <div className="engineering-panel-header"><div><span className="eyebrow">SYSTEM HEALTH</span><h2>Connected services</h2></div></div>
          <div className="health-services">{services.map(service => <div className={`health-service is-${service.status === 'operational' ? 'connected' : 'unavailable'}`} key={service.id}><div><span>{label(service.id)}</span><small>{service.detail}</small><small>{new Date(service.checkedAt).toLocaleTimeString()}{service.responseTimeMs !== undefined ? ` · ${service.responseTimeMs} ms` : ''}</small></div><span>{label(service.status)}</span></div>)}{!snapshot && <p>{refreshing ? 'Checking services…' : 'Service checks unavailable'}</p>}</div>
        </section>
        <section className="engineering-panel">
          <div className="engineering-panel-header"><div><span className="eyebrow">ENGINEERING SIGNALS</span><h2>Active incidents</h2></div></div>
          {snapshot?.dataError ? <p role="status">{snapshot.dataError}</p> : !snapshot ? <p>Waiting for incident data</p> : snapshot.signals.length === 0 ? <div className="engineering-empty-state"><CheckCircle2 size={20} /><h3>No active incidents</h3></div> : <div className="engineering-context-list">{snapshot.signals.map(incident => <div key={incident._id}><span>{incident.title}</span><strong>{incident.severity} · {incident.status}</strong></div>)}</div>}
        </section>
      </div>
      <div className="engineering-grid">
        <section className="engineering-panel"><div className="engineering-panel-header"><div><span className="eyebrow">ACTIVITY</span><h2>Recent incident updates</h2></div></div>{snapshot?.dataError ? <p>{snapshot.dataError}</p> : <div className="engineering-context-list">{snapshot?.activity.map(item => <div key={item._id}><span>{item.title}</span><strong>{item.status} · {new Date(item.updatedAt).toLocaleString()}</strong></div>)}{snapshot && snapshot.activity.length === 0 && <p>No persisted activity</p>}</div>}</section>
        <section className="engineering-panel"><div className="engineering-panel-header"><div><span className="eyebrow">DATA COVERAGE</span><h2>Available context</h2></div><Terminal size={17} /></div><div className="engineering-context-list"><div><span>Incident history</span><strong>{metric(snapshot?.metrics.totalIncidents)}</strong></div><div><span>Investigation execution history</span><strong>{metric(snapshot?.metrics.completedInvestigations)} completed · {metric(snapshot?.metrics.failedInvestigations)} failed</strong></div><div><span>Snapshot cache</span><strong>{snapshot ? `${snapshot.cacheTtlMs / 1000} seconds` : 'Unknown'}</strong></div></div></section>
      </div>
    </section>
  )
}
export default Engineering
