import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitCommit,
  GitPullRequest,
  Server,
  Terminal,
} from 'lucide-react'
import {
  getApiHealth,
  getIncidents,
  getRepository,
  type Incident,
  type RepositoryData,
} from '../../services/api'
import './Engineering.css'

type CheckState = 'checking' | 'connected' | 'unavailable'
type EngineeringSnapshot = {
  api: CheckState
  incidents: Incident[] | null
  repository: RepositoryData | null
  refreshedAt: Date | null
}

const initialSnapshot: EngineeringSnapshot = {
  api: 'checking',
  incidents: null,
  repository: null,
  refreshedAt: null,
}

function Engineering() {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [refreshing, setRefreshing] = useState(true)

  const refresh = useCallback(async () => {
    const [healthResult, incidentsResult, repositoryResult] = await Promise.allSettled([
      getApiHealth(),
      getIncidents(),
      getRepository(),
    ])

    setSnapshot({
      api: healthResult.status === 'fulfilled' && healthResult.value.status === 'ok'
        ? 'connected'
        : 'unavailable',
      incidents: incidentsResult.status === 'fulfilled' ? incidentsResult.value : null,
      repository: repositoryResult.status === 'fulfilled' ? repositoryResult.value : null,
      refreshedAt: new Date(),
    })
    setRefreshing(false)
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), 30_000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [refresh])

  const activeIncidents = snapshot.incidents?.filter((incident) =>
    incident.status === 'Investigating' || incident.status === 'Open',
  ) ?? []
  const connectedCount = [
    snapshot.api === 'connected',
    snapshot.incidents !== null,
    snapshot.repository !== null,
  ].filter(Boolean).length
  const overallState = connectedCount === 3 ? 'Connected' : connectedCount > 0 ? 'Partial' : 'Unavailable'
  const activeSignals = activeIncidents.filter((incident) =>
    incident.severity === 'Critical' || incident.severity === 'High',
  )
  const services: { name: string; detail: string; state: CheckState }[] = [
    { name: 'Platform API', detail: 'Engineering operations backend', state: snapshot.api },
    { name: 'Incident store', detail: 'Incident data service', state: snapshot.incidents === null ? (refreshing ? 'checking' : 'unavailable') : 'connected' },
    { name: 'Agent and repository runtime', detail: snapshot.repository?.repository.full_name ?? 'Repository integration', state: snapshot.repository === null ? (refreshing ? 'checking' : 'unavailable') : 'connected' },
  ]
  const stateLabel = (state: CheckState) => ({ checking: 'Checking', connected: 'Connected', unavailable: 'Unavailable' })[state]

  return (
    <section className="engineering-page">
      <div className="engineering-header">
        <div>
          <span className="eyebrow">ENGINEERING</span>
          <h1>Engineering intelligence</h1>
          <p>Live application health, repository activity, and engineering signals from connected platform services.</p>
        </div>
        <div className="engineering-runtime">
          <div className="runtime-indicator"><span className="runtime-dot" />{overallState} · {connectedCount}/3 sources</div>
          <span>{refreshing ? 'Refreshing data…' : snapshot.refreshedAt ? `Updated ${snapshot.refreshedAt.toLocaleTimeString()}` : 'Waiting for data'}</span>
        </div>
      </div>

      <div className="engineering-metrics">
        <article className="engineering-metric"><div className="engineering-metric-icon"><Activity size={17} /></div><div><span>APPLICATION HEALTH</span><strong>{stateLabel(snapshot.api)}</strong><small>{snapshot.api === 'connected' ? 'Backend health endpoint responded' : 'Live backend health check'}</small></div></article>
        <article className="engineering-metric"><div className="engineering-metric-icon"><GitCommit size={17} /></div><div><span>RECENT COMMITS</span><strong>{snapshot.repository ? snapshot.repository.recent_commits.length : refreshing ? 'Loading' : 'Unavailable'}</strong><small>{snapshot.repository?.repository.full_name ?? 'Repository activity'}</small></div></article>
        <article className="engineering-metric"><div className="engineering-metric-icon"><Server size={17} /></div><div><span>CONNECTED SOURCES</span><strong>{connectedCount} / 3</strong><small>API, incident store, repository runtime</small></div></article>
        <article className="engineering-metric"><div className="engineering-metric-icon"><AlertTriangle size={17} /></div><div><span>ACTIVE SIGNALS</span><strong>{snapshot.incidents === null ? (refreshing ? 'Loading' : 'Unavailable') : activeSignals.length}</strong><small>{snapshot.incidents === null ? 'Incident data not available' : 'Open high or critical incidents'}</small></div></article>
      </div>

      <div className="engineering-grid">
        <section className="engineering-panel engineering-health">
          <div className="engineering-panel-header"><div><span className="eyebrow">SYSTEM HEALTH</span><h2>Connected services</h2></div><span className="panel-status"><span className="panel-status-dot" />{overallState}</span></div>
          <div className="health-overview">
            <div className="health-score"><strong>{connectedCount}/3</strong><span>Sources responding</span></div>
            <div className="health-services">{services.map((service) => <div className="health-service" key={service.name}><div><span>{service.name}</span><small>{service.detail}</small></div>{service.state === 'connected' ? <CheckCircle2 size={16} /> : <span>{stateLabel(service.state)}</span>}</div>)}</div>
          </div>
        </section>

        <section className="engineering-panel">
          <div className="engineering-panel-header"><div><span className="eyebrow">ENGINEERING SIGNALS</span><h2>Active incidents</h2></div><span className="signal-count">{snapshot.incidents === null ? '—' : `${activeIncidents.length} active`}</span></div>
          {snapshot.incidents === null ? <div className="engineering-empty-state"><div className="engineering-empty-icon"><AlertTriangle size={20} /></div><h3>{refreshing ? 'Loading incident signals' : 'Incident data unavailable'}</h3><p>{refreshing ? 'Checking the incident service.' : 'The backend did not return incident data. It will be retried automatically.'}</p></div> : activeIncidents.length === 0 ? <div className="engineering-empty-state"><div className="engineering-empty-icon"><CheckCircle2 size={20} /></div><h3>No active incidents</h3><p>There are no incidents currently open or under investigation.</p></div> : <div className="engineering-context-list">{activeIncidents.slice(0, 5).map((incident) => <div key={incident._id}><span>{incident.title}</span><strong>{incident.severity} · {incident.status}</strong></div>)}</div>}
        </section>
      </div>

      <div className="engineering-grid">
        <section className="engineering-panel">
          <div className="engineering-panel-header"><div><span className="eyebrow">REPOSITORY</span><h2>Repository activity</h2></div><GitPullRequest size={17} /></div>
          {snapshot.repository ? <div className="engineering-repository-list"><div className="repository-placeholder"><GitCommit size={18} /><div><strong>{snapshot.repository.repository.full_name}</strong><span>{snapshot.repository.branch.name} · {snapshot.repository.repository.language ?? 'Language not reported'}</span></div></div>{snapshot.repository.recent_commits.slice(0, 5).map((commit) => <div className="repository-placeholder" key={commit.sha}><GitCommit size={18} /><div><strong>{commit.message.split('\n')[0]}</strong><span>{commit.author ?? 'Unknown author'} · {commit.date ? new Date(commit.date).toLocaleString() : 'Date unavailable'}</span></div></div>)}</div> : <div className="repository-placeholder"><GitCommit size={18} /><div><strong>{refreshing ? 'Loading repository activity' : 'Repository unavailable'}</strong><span>{refreshing ? 'Requesting live repository data.' : 'Check the repository and agent runtime connection.'}</span></div></div>}
        </section>

        <section className="engineering-panel">
          <div className="engineering-panel-header"><div><span className="eyebrow">ENGINEERING TOOLS</span><h2>Available context</h2></div><Terminal size={17} /></div>
          <div className="engineering-context-list">
            <div><span>Platform API</span><strong>{stateLabel(snapshot.api)}</strong></div>
            <div><span>Incident history</span><strong>{snapshot.incidents === null ? (refreshing ? 'Checking' : 'Unavailable') : `${snapshot.incidents.length} records`}</strong></div>
            <div><span>GitHub repository</span><strong>{snapshot.repository?.repository.full_name ?? (refreshing ? 'Checking' : 'Unavailable')}</strong></div>
            <div><span>Current branch</span><strong>{snapshot.repository?.branch.name ?? '—'}</strong></div>
          </div>
        </section>
      </div>
    </section>
  )
}

export default Engineering
