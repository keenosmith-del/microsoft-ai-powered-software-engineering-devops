import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  GitPullRequest,
  RotateCcw,
  ShieldCheck,
  Server,
  Wrench,
} from 'lucide-react'
import {
  getActions,
  getApiHealth,
  getRepository,
  type ApiHealth,
  type EngineeringAction,
} from '../../services/api'
import './Actions.css'
import ProposalWorkspace from './ProposalWorkspace'

type ConnectionState = 'checking' | 'connected' | 'unavailable'
type ActionsProps = {
  incidentId?: string
  onClearIncidentFilter?: () => void
  onBackToIncidents?: () => void
}

function Actions({ incidentId, onClearIncidentFilter, onBackToIncidents }: ActionsProps) {
  const [actions, setActions] = useState<EngineeringAction[] | null>(null)
  const [apiState, setApiState] = useState<ConnectionState>('checking')
  const [repositoryState, setRepositoryState] = useState<ConnectionState>('checking')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const [actionsResult, healthResult, repositoryResult] = await Promise.allSettled([
      getActions(),
      getApiHealth(),
      getRepository(),
    ])

    if (actionsResult.status === 'fulfilled') {
      setActions(actionsResult.value)
      setError('')
    } else {
      setError(actionsResult.reason instanceof Error ? actionsResult.reason.message : 'Unable to load actions')
    }

    setApiState(
      healthResult.status === 'fulfilled' && (healthResult.value as ApiHealth).status === 'ok'
        ? 'connected'
        : 'unavailable',
    )
    setRepositoryState(repositoryResult.status === 'fulfilled' ? 'connected' : 'unavailable')
    setUpdatedAt(new Date())
    setLoading(false)
    setRefreshing(false)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    void refresh()
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), 30_000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [refresh])

  const advanceAction = (action: EngineeringAction) => { window.history.pushState(null, '', `/incidents/${action.incidentId}`); window.dispatchEvent(new PopStateEvent('popstate')) }

  const visibleActions = actions?.filter((action) => !incidentId || action.incidentId === incidentId) ?? null
  const recommendedCount = visibleActions?.filter((action) => action.status === 'Recommended').length ?? 0
  const inProgressCount = visibleActions?.filter((action) => action.status === 'In progress' || action.status === 'Awaiting verification').length ?? 0
  const verifiedCount = visibleActions?.filter((action) => action.status === 'Verified').length ?? 0
  const stateText = (state: ConnectionState) => ({ checking: 'Checking', connected: 'Connected', unavailable: 'Unavailable' })[state]


  return (
    <main className="actions-page">
      <section className="actions-header">
        <div>
          <span className="eyebrow">ENGINEERING ACTIONS</span>
          <h1>Actions</h1>
          <p>Review AI-generated remediation recommendations and track them through engineering work and verification.</p>
        </div>
        <div className={`actions-header-status ${actions === null ? (loading ? 'is-checking' : 'is-unavailable') : 'is-connected'}`} role="status">
          <span className="status-dot" />
          <span>{visibleActions === null ? (loading ? 'Connecting to action queue' : 'Action queue unavailable') : incidentId ? `${visibleActions.length} action(s) for selected incident` : `${visibleActions.length} persisted recommendations`}</span>
        </div>
      </section>

      <section className="actions-overview">
        <article className="action-metric"><span>RECOMMENDED</span><strong>{actions === null ? '—' : recommendedCount}</strong><small>Ready to be picked up</small></article>
        <article className="action-metric"><span>IN PROGRESS</span><strong>{actions === null ? '—' : inProgressCount}</strong><small>Work or verification underway</small></article>
        <article className="action-metric"><span>VERIFIED</span><strong>{actions === null ? '—' : verifiedCount}</strong><small>Marked verified by an engineer</small></article>
        <article className="action-metric"><span>LAST SYNC</span><strong>{updatedAt ? updatedAt.toLocaleTimeString() : '—'}</strong><small>{refreshing ? 'Refreshing from backend' : 'Automatic refresh every 30 seconds'}</small></article>
      </section>

      <section className="actions-workspace">
        <div className="actions-list-panel">
          <div className="actions-panel-header">
            <div><span className="eyebrow">ACTION QUEUE</span><h2>{incidentId ? 'Linked incident action' : 'Incident recommendations'}</h2></div>
            <button type="button" className="actions-refresh" onClick={handleRefresh} disabled={refreshing}>
              <RotateCcw size={14} strokeWidth={1.7} />{refreshing ? 'Refreshing' : 'Refresh'}
            </button>
            {incidentId && onBackToIncidents && <button type="button" className="actions-refresh" onClick={onBackToIncidents}>Back to incidents</button>}
            {incidentId && onClearIncidentFilter && <button type="button" className="actions-refresh" onClick={onClearIncidentFilter}>Show all actions</button>}
          </div>

          {error && <div className="actions-error" role="alert">{error}</div>}
          <div className="actions-list">
            {loading && <div className="actions-empty">Loading recommendations from the backend…</div>}
            {!loading && visibleActions?.length === 0 && <div className="actions-empty"><strong>{incidentId ? 'No linked action found' : 'No recommendations yet'}</strong><span>{incidentId ? 'This incident has no saved engineering action plan.' : 'AI-generated action plans will appear here after an incident investigation completes.'}</span></div>}
            {!loading && visibleActions?.map((action) => (
              <article className="action-row" key={action.id}>
                <div className="action-icon"><Wrench size={16} strokeWidth={1.7} /></div>
                <div className="action-content">
                  <div className="action-title-row">
                    <div><span className="action-id">INCIDENT {action.incidentId.slice(-7).toUpperCase()}</span><h3>{action.title}</h3></div>
                    <span className={`action-priority action-priority-${action.severity.toLowerCase()}`}>{action.severity}</span>
                  </div>
                  <p>{action.description}</p>
                  <div className="action-meta">
                    <span>{action.source} · {action.service}</span>
                    <span className={`action-status action-status-${action.status.toLowerCase().replaceAll(' ', '-')}`}>
                      {action.status === 'Verified' ? <CheckCircle2 size={12} /> : action.status === 'Recommended' ? <ShieldCheck size={12} /> : <Clock3 size={12} />}
                      {action.status}
                    </span>
                  </div>
                </div>
                <button type="button" className="action-execute" onClick={() => void advanceAction(action)}  title="Tracks workflow status; it does not apply code or cloud changes.">
                  <ArrowRight size={13} strokeWidth={1.7} />Open incident workspace
                </button>
              </article>
            ))}
            {!loading && visibleActions === null && <div className="actions-empty"><strong>Action queue unavailable</strong><span>Check the backend connection. The page will retry automatically.</span></div>}
          </div>
        </div>

        <aside className="actions-context">
          <section className="actions-context-card">
            <div className="actions-context-header"><span className="eyebrow">ACTION LIFECYCLE</span></div>
            <div className="execution-flow">
              <div className="execution-step"><span className="execution-number">01</span><div><strong>Recommendation</strong><span>AI plan saved with its incident</span></div></div>
              <div className="execution-step"><span className="execution-number">02</span><div><strong>Engineering work</strong><span>Engineer tracks work in progress</span></div></div>
              <div className="execution-step"><span className="execution-number">03</span><div><strong>Verification</strong><span>Engineer confirms the outcome</span></div></div>
            </div>
          </section>

          <section className="actions-context-card">
            <div className="actions-context-header"><span className="eyebrow">LIVE CONNECTIONS</span></div>
            <div className="connected-systems">
              <div><Server size={15} /><span>Platform API</span><strong>{stateText(apiState)}</strong></div>
              <div><GitPullRequest size={15} /><span>Repository runtime</span><strong>{stateText(repositoryState)}</strong></div>
              <div><CheckCircle2 size={15} /><span>Action records</span><strong>{actions === null ? (loading ? 'Checking' : 'Unavailable') : 'Connected'}</strong></div>
            </div>
          </section>

          <section className="actions-context-card principle-card"><span className="eyebrow">EXECUTION PRINCIPLE</span><p>These controls track review and verification state. They do not apply code or modify cloud resources.</p></section>
        </aside>
      </section>
    <ProposalWorkspace key={incidentId || "all"} incidentId={incidentId} />
      </main>
  )
}

export default Actions
