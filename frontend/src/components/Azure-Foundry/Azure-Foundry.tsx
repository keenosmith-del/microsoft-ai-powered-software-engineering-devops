import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Brain,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  RotateCcw,
  Server,
  Zap,
} from 'lucide-react'
import {
  getApiHealth,
  getCloudPlatform,
  type ApiHealth,
  type CloudPlatformStatus,
} from '../../services/api'
import './Azure-Foundry.css'

type ConnectionState = 'checking' | 'connected' | 'unavailable'

function AzureFoundry() {
  const [api, setApi] = useState<ApiHealth | null>(null)
  const [platform, setPlatform] = useState<CloudPlatformStatus | null>(null)
  const [apiState, setApiState] = useState<ConnectionState>('checking')
  const [runtimeState, setRuntimeState] = useState<ConnectionState>('checking')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const [apiResult, platformResult] = await Promise.allSettled([
      getApiHealth(),
      getCloudPlatform(),
    ])

    if (apiResult.status === 'fulfilled' && apiResult.value.status === 'ok') {
      setApi(apiResult.value)
      setApiState('connected')
    } else {
      setApiState('unavailable')
    }

    if (platformResult.status === 'fulfilled') {
      setPlatform(platformResult.value)
      setRuntimeState(platformResult.value.runtime.status === 'ok' ? 'connected' : 'unavailable')
      setError('')
    } else {
      setRuntimeState('unavailable')
      setError(platformResult.reason instanceof Error ? platformResult.reason.message : 'Cloud platform status unavailable')
    }

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
    const interval = window.setInterval(() => void refresh(), 60_000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [refresh])

  const azureState = platform?.azure.status ?? (loading ? 'checking' : 'unavailable')
  const foundryState = platform?.foundry.status ?? (loading ? 'checking' : 'unavailable')
  const stateLabels: Record<string, string> = {
    checking: 'Checking',
    connected: 'Connected',
    ready: 'Authenticated · configured',
    unavailable: 'Unavailable',
    not_configured: 'Not configured',
    configuration_incomplete: 'Configuration incomplete',
  }
  const formatState = (state: string) => stateLabels[state] ?? state
  const overallStatus = apiState === 'connected' && runtimeState === 'connected'
    ? azureState === 'connected' && foundryState === 'ready' ? 'Checks passing · inference untested' : 'Partially available'
    : loading ? 'Checking services' : 'Platform unavailable'
  const overallTone = overallStatus === 'Checks passing · inference untested'
    ? 'connected'
    : overallStatus === 'Checking services' ? 'checking' : 'degraded'
  const stateClass = (state: string) => state.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-')
  const resourceCount = platform?.azure.resource_count
  const runtimeName = platform?.runtime.service ?? 'FastAPI agent runtime'
  const deployment = platform?.foundry.deployment

  const connections = [
    { name: 'Platform API', type: api?.service ?? 'Node / Express gateway', status: apiState, description: api ? `Environment: ${api.environment ?? 'unknown'}` : 'Health endpoint', icon: Activity },
    { name: 'Agent Runtime', type: runtimeName, status: runtimeState, description: 'Runtime health endpoint responded', icon: Server },
    { name: 'Azure Resource Manager', type: 'Azure subscription', status: azureState, description: resourceCount === undefined ? 'Resource access check' : `${resourceCount}${platform?.azure.resources_truncated ? '+' : ''} resources returned`, icon: Cloud },
    { name: 'Microsoft Foundry', type: 'AI platform', status: foundryState, description: deployment ? `Deployment configured: ${deployment}` : 'Project endpoint and deployment configuration', icon: Brain },
  ]

  return (
    <main className="azure-foundry-page">
      <section className="azure-foundry-header">
        <div>
          <span className="eyebrow">CLOUD &amp; AI PLATFORM</span>
          <h1>Azure / Foundry</h1>
          <p>Cloud resource access, Foundry authentication and deployment configuration, and live agent-runtime status.</p>
        </div>
        <div className="azure-header-actions">
          <div className={`azure-foundry-header-status is-${overallTone}`} role="status"><span className="azure-foundry-status-dot" /><div><span>PLATFORM STATUS</span><strong>{overallStatus}</strong></div></div>
          <button type="button" className="azure-refresh" onClick={handleRefresh} disabled={refreshing}><RotateCcw size={14} />{refreshing ? 'Refreshing' : 'Refresh'}</button>
          <small>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : 'Not yet checked'}</small>
        </div>
      </section>

      {error && <div className="azure-platform-error" role="status">Agent runtime status unavailable: {error}</div>}

      <section className="azure-foundry-overview">
        <div className="azure-overview-card"><span className="azure-card-label">AZURE RESOURCE ACCESS</span><strong>{formatState(azureState)}</strong><span>{resourceCount === undefined ? 'Subscription resource check' : `${resourceCount}${platform?.azure.resources_truncated ? '+' : ''} resources returned`}</span></div>
        <div className="azure-overview-card"><span className="azure-card-label">FOUNDRY AUTH</span><strong>{formatState(platform?.foundry.authentication ?? (loading ? 'checking' : 'unavailable'))}</strong><span>{platform?.foundry.endpoint_host ?? 'Project endpoint'}</span></div>
        <div className="azure-overview-card"><span className="azure-card-label">MODEL DEPLOYMENT</span><strong>{deployment ?? (loading ? 'Checking…' : 'Not configured')}</strong><span>{platform?.foundry.inference === 'not_tested' ? 'Inference not called from this page' : 'Configured deployment name'}</span></div>
        <div className="azure-overview-card"><span className="azure-card-label">AGENT RUNTIME</span><strong>{runtimeState === 'connected' ? 'Online' : formatState(runtimeState)}</strong><span>{runtimeName}</span></div>
      </section>

      <section className="azure-platform-grid">
        <div className="azure-main-panel">
          <div className="azure-panel-heading"><div><span className="eyebrow">LIVE PLATFORM CHECKS</span><h2>Cloud services</h2></div><span className="azure-panel-count">{connections.filter((item) => item.status === 'connected' || item.status === 'ready').length} / {connections.length} RESPONDING</span></div>
          <div className="azure-resource-list">
            {connections.map((resource) => {
              const Icon = resource.icon
              return <div className="azure-resource-row" key={resource.name}>
                <div className="azure-resource-icon"><Icon size={18} strokeWidth={1.6} /></div>
                <div className="azure-resource-info"><strong>{resource.name}</strong><span>{resource.type}</span></div>
                <div className="azure-resource-description">{resource.description}</div>
                <div className={`azure-resource-status is-${stateClass(resource.status)}`}><span className="azure-resource-status-dot" />{formatState(resource.status)}</div>
              </div>
            })}
          </div>
        </div>

        <aside className="azure-side-panel">
          <div className="azure-panel-heading"><div><span className="eyebrow">FOUNDRY CONFIGURATION</span><h2>Model deployment</h2></div></div>
          <div className="model-card">
            <div className="model-icon"><Brain size={20} strokeWidth={1.5} /></div>
            <div className="model-name"><span>DEPLOYMENT</span><strong>{deployment ?? (loading ? 'Checking…' : 'Not configured')}</strong></div>
            <div className={`model-status is-${stateClass(foundryState)}`}><span className="azure-resource-status-dot" />{formatState(foundryState)}</div>
          </div>
          <div className="model-details">
            <div><span>Provider</span><strong>Microsoft Foundry</strong></div>
            <div><span>Endpoint host</span><strong>{platform?.foundry.endpoint_host ?? 'Unavailable'}</strong></div>
            <div><span>Authentication</span><strong>{formatState(platform?.foundry.authentication ?? (loading ? 'checking' : 'unavailable'))}</strong></div>
            <div><span>Inference probe</span><strong>{platform?.foundry.inference === 'not_tested' ? 'Not run' : 'Not available'}</strong></div>
          </div>
        </aside>
      </section>

      <section className="azure-runtime-section">
        <div className="azure-panel-heading"><div><span className="eyebrow">AZURE RESOURCE INVENTORY</span><h2>Resources visible to this identity</h2></div><span className="azure-panel-count">{platform?.azure.resources_truncated ? 'FIRST 50' : `${resourceCount ?? 0} RESOURCES`}</span></div>
        {!platform && loading && <div className="azure-inventory-empty">Checking Azure resource access…</div>}
        {platform?.azure.status === 'not_configured' && <div className="azure-inventory-empty">AZURE_SUBSCRIPTION_ID is not configured for the agent runtime.</div>}
        {platform?.azure.status === 'unavailable' && <div className="azure-inventory-empty">Azure resource access could not be verified. Check the runtime identity and subscription permissions.</div>}
        {platform?.azure.status === 'connected' && platform.azure.resources.length === 0 && <div className="azure-inventory-empty">Resource access succeeded, but no resources were returned for this identity.</div>}
        {platform?.azure.status === 'connected' && platform.azure.resources.length > 0 && <div className="azure-inventory-list">{platform.azure.resources.map((resource) => <article className="azure-inventory-row" key={`${resource.type}/${resource.name}`}>
          <div className="runtime-icon"><Database size={17} /></div>
          <div><strong>{resource.name}</strong><span>{resource.type}</span></div>
          <span>{resource.location ?? 'Location unavailable'}</span>
          <span>{resource.provisioning_state ?? 'State not reported'}</span>
        </article>)}</div>}
      </section>

      <section className="azure-inference-section">
        <div className="azure-panel-heading"><div><span className="eyebrow">INFERENCE PIPELINE</span><h2>Foundry request path</h2></div></div>
        <div className="inference-flow">
          <div className="inference-step"><span className="inference-number">01</span><div className="inference-step-icon"><Zap size={17} /></div><div><strong>Application API</strong><span>{formatState(apiState)}</span></div></div>
          <div className="inference-step"><span className="inference-number">02</span><div className="inference-step-icon"><Server size={17} /></div><div><strong>Agent Runtime</strong><span>{formatState(runtimeState)}</span></div></div>
          <div className="inference-step"><span className="inference-number">03</span><div className="inference-step-icon"><Brain size={17} /></div><div><strong>Microsoft Foundry</strong><span>{formatState(foundryState)}</span></div></div>
          <div className="inference-step"><span className="inference-number">04</span><div className="inference-step-icon"><CheckCircle2 size={17} /></div><div><strong>Inference</strong><span>{platform?.foundry.inference === 'not_tested' ? 'Not probed on this page' : 'No inference check'}</span></div></div>
        </div>
      </section>

      <section className="azure-info-grid">
        <div className="azure-info-card"><span className="eyebrow">AUTHENTICATION</span><h3>DefaultAzureCredential</h3><p>Foundry access is shown as authenticated only when the runtime successfully obtains an Azure AI access token.</p></div>
        <div className="azure-info-card"><span className="eyebrow">MODEL ACCESS</span><h3>Deployment configuration</h3><p>The page reports the configured deployment name. It does not send model requests as a status probe.</p></div>
        <div className="azure-info-card"><span className="eyebrow">RESOURCE EVIDENCE</span><h3>Azure context</h3><p>The inventory lists resources returned by the Azure Resource Manager SDK for the runtime identity.</p></div>
      </section>

      <section className="azure-actions"><div><span className="eyebrow">PLATFORM MANAGEMENT</span><h2>Azure / Foundry resources</h2></div><a type="button" className="azure-external-button" href="https://portal.azure.com/" target="_blank" rel="noreferrer"><span>Open Azure Portal</span><ExternalLink size={14} strokeWidth={1.5} /></a></section>
    </main>
  )
}

export default AzureFoundry
