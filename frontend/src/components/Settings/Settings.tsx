import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  Cloud,
  Database,
  Lock,
  RotateCcw,
  Server,
  Workflow,
} from 'lucide-react'
import {
  setOperationsToken,
  getActions,
  getApiHealth,
  getCloudPlatform,
  getIncidents,
  getRepository,
  type ApiHealth,
  type CloudPlatformStatus,
  type EngineeringAction,
  type Incident,
  type RepositoryData,
} from '../../services/api'
import './Settings.css'

type SettingsSnapshot = {
  api: ApiHealth | null
  platform: CloudPlatformStatus | null
  repository: RepositoryData | null
  actions: EngineeringAction[] | null
  incidents: Incident[] | null
}

const emptySnapshot: SettingsSnapshot = {
  api: null,
  platform: null,
  repository: null,
  actions: null,
  incidents: null,
}

function Settings() {
  const [operationsToken, setToken] = useState('')
  const [snapshot, setSnapshot] = useState(emptySnapshot)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      getApiHealth(),
      getCloudPlatform(),
      getRepository(),
      getActions(),
      getIncidents(),
    ])
    const [api, platform, repository, actions, incidents] = results

    setSnapshot({
      api: api.status === 'fulfilled' ? api.value : null,
      platform: platform.status === 'fulfilled' ? platform.value : null,
      repository: repository.status === 'fulfilled' ? repository.value : null,
      actions: actions.status === 'fulfilled' ? actions.value : null,
      incidents: incidents.status === 'fulfilled' ? incidents.value : null,
    })
    setErrors(results.flatMap((result) => result.status === 'rejected'
      ? [result.reason instanceof Error ? result.reason.message : 'A status request failed']
      : []))
    setLoading(false)
    setRefreshing(false)
    setUpdatedAt(new Date())
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    void refresh()
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), 120_000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [refresh])

  const checks = [
    snapshot.api?.status === 'ok',
    snapshot.platform?.runtime.status === 'ok',
    snapshot.platform?.azure.status === 'connected',
    snapshot.platform?.foundry.authentication === 'authenticated',
    snapshot.repository !== null,
    snapshot.actions !== null && snapshot.incidents !== null,
  ]
  const confirmedChecks = checks.filter(Boolean).length
  const pageStatus = loading ? 'Checking integrations' : confirmedChecks === checks.length ? 'All checks responding' : `${confirmedChecks} of ${checks.length} checks responding`
  const pageTone = loading ? 'checking' : confirmedChecks === checks.length ? 'connected' : confirmedChecks > 0 ? 'partial' : 'unavailable'

  const connectionLabel = (state: string | null | undefined) => {
    if (loading && !state) return 'Checking'
    if (!state) return 'Unavailable'
    return ({
      ok: 'Connected',
      connected: 'Connected',
      authenticated: 'Authenticated',
      ready: 'Configured',
      not_configured: 'Not configured',
      configuration_incomplete: 'Incomplete configuration',
      unavailable: 'Unavailable',
      not_checked: 'Not checked',
    } as Record<string, string>)[state] ?? state
  }

  const activeIncidents = snapshot.incidents?.filter((incident) =>
    incident.status === 'Investigating' || incident.status === 'Open',
  ).length
  const recommendedActions = snapshot.actions?.filter((action) => action.status === 'Recommended').length
  const inProgressActions = snapshot.actions?.filter((action) =>
    action.status === 'In progress' || action.status === 'Awaiting verification',
  ).length
  const verifiedActions = snapshot.actions?.filter((action) => action.status === 'Verified').length

  return (
    <main className="settings-page">
      <section className="settings-header">
        <div>
          <span className="settings-eyebrow">SYSTEM CONFIGURATION</span>
          <h1>Settings</h1>
          <p>Live configuration and integration status for the AI Engineering Operations environment.</p>
        </div>
        <div className="settings-header-actions">
          <div className={`settings-status is-${pageTone}`} role="status"><span className="settings-status-dot" /><span>{pageStatus}</span></div>
          <button type="button" className="settings-refresh" onClick={handleRefresh} disabled={refreshing}>
            <RotateCcw size={14} />{refreshing ? 'Refreshing' : 'Refresh'}
          </button>
          <small>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : 'Not yet checked'}</small>
        </div>
      </section>

      {errors.length > 0 && <div className="settings-error" role="status">Some live checks did not respond: {errors.join(' · ')}</div>}

      <section className="phase2-workspace">
        <h2>Operations access</h2>
        <p>Enter the configured operations token to access incidents and engineering actions. It remains in application memory and clears on browser refresh. This local shared identity does not provide separate user roles.</p>
        <form onSubmit={event => { event.preventDefault(); setOperationsToken(operationsToken); void refresh(); if (/^#\/incidents\/[a-fA-F0-9]{24}$/.test(window.location.hash)) window.dispatchEvent(new Event('hashchange')) }}><label>Operations token<input type="password" autoComplete="off" value={operationsToken} onChange={event => setToken(event.target.value)} /></label><button type="submit">Connect operations</button></form>
      </section>

      <section className="settings-grid">
        <article className="settings-card">
          <div className="settings-card-header"><div className="settings-icon"><Server size={18} /></div><div><span>RUNTIME</span><h2>Application Runtime</h2></div></div>
          <div className="settings-list">
            <SettingRow label="API Gateway" detail={snapshot.api?.service ?? 'Primary application gateway'} value={connectionLabel(snapshot.api?.status)} />
            <SettingRow label="Environment" detail="Backend process environment" value={snapshot.api?.environment ?? (loading ? 'Checking' : 'Unavailable')} />
            <SettingRow label="Agent Runtime" detail={snapshot.platform?.runtime.service ?? 'AI orchestration service'} value={connectionLabel(snapshot.platform?.runtime.status)} />
            <SettingRow label="Last platform check" detail="Cloud status endpoint" value={snapshot.platform?.timestamp ? new Date(snapshot.platform.timestamp).toLocaleTimeString() : (loading ? 'Checking' : 'Unavailable')} />
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-header"><div className="settings-icon"><Cloud size={18} /></div><div><span>AI PLATFORM</span><h2>Microsoft Foundry</h2></div></div>
          <div className="settings-list">
            <SettingRow label="Project endpoint" detail="Host only; credentials are not exposed" value={snapshot.platform?.foundry.endpoint_host ?? (loading ? 'Checking' : 'Not configured')} />
            <SettingRow label="Deployment" detail="Configured model deployment" value={snapshot.platform?.foundry.deployment ?? (loading ? 'Checking' : 'Not configured')} />
            <SettingRow label="Authentication" detail="Azure AI token acquisition" value={connectionLabel(snapshot.platform?.foundry.authentication)} />
            <SettingRow label="Inference check" detail="No model request is sent by Settings" value={snapshot.platform?.foundry.inference === 'not_tested' ? 'Not tested' : (loading ? 'Checking' : 'Not tested')} />
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-header"><div className="settings-icon"><Database size={18} /></div><div><span>INTEGRATION</span><h2>Repository &amp; Azure</h2></div></div>
          <div className="settings-list">
            <SettingRow label="GitHub repository" detail={snapshot.repository?.repository.full_name ?? 'Repository integration'} value={snapshot.repository ? 'Connected' : (loading ? 'Checking' : 'Unavailable')} />
            <SettingRow label="Default branch" detail={snapshot.repository?.branch.sha ? `HEAD ${snapshot.repository.branch.sha.slice(0, 7)}` : 'Remote branch reference'} value={snapshot.repository?.branch.name ?? (loading ? 'Checking' : 'Unavailable')} />
            <SettingRow label="Commit history" detail="Recent commit snapshot" value={snapshot.repository ? `${snapshot.repository.recent_commits.length} commits` : (loading ? 'Checking' : 'Unavailable')} />
            <SettingRow label="Azure resource access" detail="Azure Resource Manager listing" value={connectionLabel(snapshot.platform?.azure.status)} />
            <SettingRow label="Azure resources returned" detail={snapshot.platform?.azure.resources_truncated ? 'First 50 resources' : 'Visible to runtime identity'} value={snapshot.platform ? `${snapshot.platform.azure.resource_count}` : (loading ? 'Checking' : 'Unavailable')} />
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-header"><div className="settings-icon"><Workflow size={18} /></div><div><span>ENGINEERING ACTIVITY</span><h2>Incident &amp; action workflow</h2></div></div>
          <div className="settings-list">
            <SettingRow label="Recorded incidents" detail="Persisted incident history" value={snapshot.incidents?.length.toString() ?? (loading ? 'Checking' : 'Unavailable')} />
            <SettingRow label="Active incidents" detail="Open or under investigation" value={activeIncidents?.toString() ?? (loading ? 'Checking' : 'Unavailable')} />
            <SettingRow label="Recommended actions" detail="Awaiting engineering work" value={recommendedActions?.toString() ?? (loading ? 'Checking' : 'Unavailable')} />
            <SettingRow label="In progress" detail="Work or verification underway" value={inProgressActions?.toString() ?? (loading ? 'Checking' : 'Unavailable')} />
            <SettingRow label="Verified actions" detail="Marked verified by an engineer" value={verifiedActions?.toString() ?? (loading ? 'Checking' : 'Unavailable')} />
          </div>
        </article>
      </section>

      <section className="settings-security">
        <div className="settings-security-icon"><Lock size={18} /></div>
        <div><span className="settings-eyebrow">SECURITY</span><h2>Credentials remain outside the interface</h2><p>Secrets are not returned by these status endpoints. Azure uses DefaultAzureCredential; Foundry status confirms token acquisition and configuration, not model inference.</p></div>
      </section>

      <section className="settings-footer-panel">
        <div className="settings-footer-icon"><Bell size={17} /></div>
        <div><strong>Operational notifications</strong><span>No notification provider or delivery endpoint is configured in the current backend.</span></div>
        <span className="settings-coming-soon">NOT CONFIGURED</span>
      </section>
    </main>
  )
}

function SettingRow({ label, detail, value }: { label: string; detail: string; value: string }) {
  const isUnavailable = ['Unavailable', 'Not configured', 'Configuration incomplete', 'Incomplete configuration'].includes(value)
  const valueClass = isUnavailable ? 'settings-unavailable' : value === 'Checking' ? 'settings-checking' : value === 'Connected' || value === 'Authenticated' || value === 'Configured' ? 'settings-connected' : ''
  return <div className="settings-row"><div><strong>{label}</strong><span>{detail}</span></div><b className={valueClass}>{value}</b></div>
}

export default Settings
