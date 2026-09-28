import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import {
  getIncidents,
  retryIncidentInvestigation,
  updateIncidentStatus,
  type Incident,
} from '../../services/api'
import './Incidents.css'

type IncidentsProps = {
  onNewInvestigation: () => void
  onSelectIncident: (incidentId: string) => void | Promise<void>
  onOpenActions: (incidentId: string) => void
}

type StatusFilter = 'All statuses' | Incident['status']
type SeverityFilter = 'All severities' | Incident['severity']

function Incidents({ onNewInvestigation, onSelectIncident, onOpenActions }: IncidentsProps) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [statusError, setStatusError] = useState('')
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All statuses')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All severities')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const loadIncidents = useCallback(async () => {
    try {
      const data = await getIncidents()
      setIncidents(data)
      setError('')
      setUpdatedAt(new Date())
    } catch (loadError) {
      console.error('Failed to load incidents:', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Failed to load incidents')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    void loadIncidents()
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadIncidents(), 0)
    const interval = window.setInterval(() => void loadIncidents(), 60_000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [loadIncidents])

  const handleStatusChange = async (incidentId: string, status: 'Open' | 'Resolved') => {
    setUpdatingIncidentId(incidentId)
    setStatusError('')
    try {
      const updatedIncident = await updateIncidentStatus(incidentId, status)
      setIncidents((current) => current.map((incident) =>
        incident._id === incidentId ? updatedIncident : incident,
      ))
    } catch (updateError) {
      console.error('Failed to update incident status:', updateError)
      setStatusError(updateError instanceof Error ? updateError.message : 'Failed to update incident status')
    } finally {
      setUpdatingIncidentId(null)
    }
  }

  const handleRetry = async (incident: Incident) => {
    setUpdatingIncidentId(incident._id)
    setStatusError('')
    try {
      const updated = await retryIncidentInvestigation(incident._id)
      setIncidents((current) => current.map((item) => item._id === updated._id ? updated : item))
      await onSelectIncident(updated._id)
    } catch (retryError) {
      setStatusError(retryError instanceof Error ? retryError.message : 'Investigation retry failed')
      await loadIncidents()
    } finally {
      setUpdatingIncidentId(null)
    }
  }

  const activeCount = incidents.filter((incident) => incident.status === 'Investigating' || incident.status === 'Open').length
  const awaitingReviewCount = incidents.filter((incident) => incident.status === 'Awaiting review').length
  const resolvedCount = incidents.filter((incident) => incident.status === 'Resolved').length

  const visibleIncidents = useMemo(() => incidents.filter((incident) => {
    const matchesQuery = !query.trim() || [incident.title, incident.service, incident._id]
      .some((value) => value.toLowerCase().includes(query.trim().toLowerCase()))
    return matchesQuery
      && (statusFilter === 'All statuses' || incident.status === statusFilter)
      && (severityFilter === 'All severities' || incident.severity === severityFilter)
  }), [incidents, query, statusFilter, severityFilter])

  const incidentContext = (incident: Incident) => {
    if (incident.status === 'Investigating') {
      return incident.investigationError ? 'Investigation failed · retry available' : 'Investigation is running or awaiting retry'
    }
    if (incident.status === 'Open') {
      if (!incident.actions) return 'Investigation complete · no action plan returned'
      return `Investigation complete · action ${incident.actionStatus ?? 'Recommended'}`
    }
    if (incident.status === 'Awaiting review') {
      return incident.actionStatus === 'Verified' ? 'Action verified · ready to resolve' : 'Action awaiting human verification'
    }
    return 'Resolved · reopen to return to action queue'
  }

  const rowAction = (incident: Incident) => {
    if (updatingIncidentId === incident._id) return <span>Updating…</span>

    if (incident.status === 'Investigating') {
      return incident.investigationError
        ? <button type="button" onClick={() => void handleRetry(incident)}>Retry investigation</button>
        : <span className="incident-action-wait">In progress</span>
    }

    if (incident.status === 'Open') {
      if (incident.actions) {
        return <button type="button" onClick={() => onOpenActions(incident._id)}>
          {incident.actionStatus === 'Verified' ? 'Review action' : 'Open action'}
        </button>
      }
      return <button type="button" onClick={() => void handleStatusChange(incident._id, 'Resolved')}>Resolve incident</button>
    }

    if (incident.status === 'Awaiting review') {
      if (incident.actionStatus === 'Verified' || !incident.actions) {
        return <button type="button" onClick={() => void handleStatusChange(incident._id, 'Resolved')}>Resolve incident</button>
      }
      return <button type="button" onClick={() => onOpenActions(incident._id)}>Review linked action</button>
    }

    return <button type="button" onClick={() => void handleStatusChange(incident._id, 'Open')}>Reopen incident</button>
  }

  return (
    <main className="incidents-page">
      <section className="incidents-header">
        <div>
          <span className="eyebrow">INCIDENT MANAGEMENT</span>
          <h1>Incidents</h1>
          <p>Follow each issue from investigation through engineering work, verification, and resolution.</p>
        </div>
        <div className="incidents-header-actions">
          <span>{updatedAt ? `Synced ${updatedAt.toLocaleTimeString()}` : loading ? 'Loading incidents' : 'Not synced'}</span>
          <button type="button" className="incidents-refresh" onClick={handleRefresh} disabled={refreshing}><RotateCcw size={14} />{refreshing ? 'Refreshing' : 'Refresh'}</button>
          <button type="button" className="new-investigation-button" onClick={onNewInvestigation}>New Investigation</button>
        </div>
      </section>

      <section className="incident-summary">
        <article className="incident-summary-card"><span>ACTIVE</span><strong>{activeCount}</strong><small>Investigating or ready for engineering work</small></article>
        <article className="incident-summary-card"><span>AWAITING REVIEW</span><strong>{awaitingReviewCount}</strong><small>Action verification needed</small></article>
        <article className="incident-summary-card"><span>RESOLVED</span><strong>{resolvedCount}</strong><small>Verified or no-action incidents closed</small></article>
        <article className="incident-summary-card"><span>TOTAL</span><strong>{incidents.length}</strong><small>Persisted incident records</small></article>
      </section>

      <section className="incidents-panel">
        <div className="incidents-panel-header">
          <div><span className="eyebrow">INCIDENT HISTORY</span><h2>Investigation queue</h2></div>
          <span className="incident-count">{visibleIncidents.length} of {incidents.length} incidents</span>
        </div>

        <div className="incident-filters">
          <input aria-label="Search incidents" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, service, or ID" />
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option>All statuses</option><option>Investigating</option><option>Open</option><option>Awaiting review</option><option>Resolved</option>
          </select>
          <select aria-label="Filter by severity" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}>
            <option>All severities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
        </div>

        {error && <div className="incident-load-error" role="alert">Could not refresh incident history: {error}</div>}
        {statusError && <div className="incident-status-error" role="alert">{statusError}</div>}

        <div className="incident-table">
          <div className="incident-table-header"><span>INCIDENT</span><span>SERVICE</span><span>SEVERITY</span><span>STATUS</span><span>UPDATED</span><span>NEXT STEP</span></div>
          {loading && <div className="incident-table-message">Loading incidents…</div>}
          {!loading && !error && visibleIncidents.length === 0 && <div className="incident-table-message">{incidents.length === 0 ? 'No incidents yet. Start an investigation to create the first incident record.' : 'No incidents match these filters.'}</div>}
          {!loading && visibleIncidents.map((incident) => (
            <div className="incident-row" key={incident._id}>
              <button type="button" className="incident-title" onClick={() => void onSelectIncident(incident._id)}>
                <span className="incident-id">{incident._id}</span>
                <strong>{incident.title}</strong>
                <small>{incidentContext(incident)}</small>
              </button>
              <div className="incident-service">{incident.service}</div>
              <div><span className={`severity severity-${incident.severity.toLowerCase()}`}>{incident.severity}</span></div>
              <div><span className={`incident-status status-${incident.status.toLowerCase().replaceAll(' ', '-')}`}><span className="status-indicator" />{incident.status}</span></div>
              <div className="incident-detected">{new Date(incident.updatedAt || incident.createdAt).toLocaleString()}</div>
              <div className="incident-action">{rowAction(incident)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="incident-evidence">
        <div><span className="eyebrow">INCIDENT LIFECYCLE</span><h2>Investigation → action → verification → resolution.</h2></div>
        <p>A completed investigation opens an action plan. When engineering work is ready, its linked action moves the incident to review. Resolve only after the action is verified; reopen returns it to the active queue.</p>
      </section>
    </main>
  )
}

export default Incidents
