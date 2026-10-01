import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  analyseIncident,
  getActions,
  getApiHealth,
  getCloudPlatform,
  getIncidents,
  getIncident,
  getRepository,
  retryIncidentInvestigation,
  type ApiHealth,
  type CloudPlatformStatus,
  type EngineeringAction,
  type Incident,
  type InvestigationResponse,
  type RepositoryData,
} from './services/api'

import Sidebar from './components/Sidebar/Sidebar'
import Incidents from './components/Incidents/Incidents'
import Engineering from './components/Engineering/Engineering'
import Actions from './components/Actions/Actions'
import Repository from './components/Repository/Repository'
import Agents from './components/Agents/Agents'
import AzureFoundry from './components/Azure-Foundry/Azure-Foundry'
import Settings from './components/Settings/Settings'
import Knowledge from './components/Knowledge/Knowledge'
import foundryMark from './assets/foundry.png'
import './App.css'

type AgentStatus = 'ready' | 'running' | 'complete' | 'loading'

type OverviewSnapshot = {
  api: ApiHealth | null
  platform: CloudPlatformStatus | null
  repository: RepositoryData | null
  incidents: Incident[] | null
  actions: EngineeringAction[] | null
  checkedAt: Date
  errors: string[]
}

type AgentExecutionStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'error'

type AgentExecution = {
  id: string
  name: string
  description: string
  status: AgentExecutionStatus
}

function renderMarkdownInline(text: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(tokenPattern)) {
    const token = match[0]
    const index = match.index ?? 0
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index))
    if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={`strong-${index}`}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      nodes.push(<code key={`code-${index}`}>{token.slice(1, -1)}</code>)
    } else {
      nodes.push(<em key={`em-${index}`}>{token.slice(1, -1)}</em>)
    }
    lastIndex = index + token.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let index = 0
  let blockKey = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index += 1; continue }

    if (/^\s*```/.test(line)) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !/^\s*```/.test(lines[index])) codeLines.push(lines[index++])
      if (index < lines.length) index += 1
      blocks.push(<pre className="markdown-code" key={blockKey++}><code>{codeLines.join('\n')}</code></pre>)
      continue
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading) {
      const level = Math.min(heading[1].length, 4)
      const Heading = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'
      blocks.push(<Heading key={blockKey++}>{renderMarkdownInline(heading[2])}</Heading>)
      index += 1
      continue
    }

    const listMatch = line.match(/^\s*([-*+]\s+|\d+[.)]\s+)/)
    if (listMatch) {
      const ordered = /^\s*\d/.test(line)
      const items: ReactNode[] = []
      while (index < lines.length) {
        const item = lines[index].match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+)$/)
        if (!item) break
        items.push(<li key={items.length}>{renderMarkdownInline(item[1])}</li>)
        index += 1
      }
      const List = ordered ? 'ol' : 'ul'
      blocks.push(<List key={blockKey++}>{items}</List>)
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^\s*>/.test(lines[index])) quoteLines.push(lines[index++].replace(/^\s*>\s?/, ''))
      blocks.push(<blockquote key={blockKey++}>{renderMarkdownInline(quoteLines.join(' '))}</blockquote>)
      continue
    }

    const paragraph = [line.trim()]
    index += 1
    while (index < lines.length && lines[index].trim() && !/^\s*(#{1,6}\s|[-*+]\s+|\d+[.)]\s+|>|```)/.test(lines[index])) {
      paragraph.push(lines[index++].trim())
    }
    blocks.push(<p key={blockKey++}>{renderMarkdownInline(paragraph.join(' '))}</p>)
  }

  return <div className="markdown-content">{blocks}</div>
}

function App() {
  const [activeView, setActiveView] = useState('overview')
  const [overview, setOverview] = useState<OverviewSnapshot | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewRefreshing, setOverviewRefreshing] = useState(false)
  const [incident, setIncident] = useState('')
  const [severity, setSeverity] = useState<Incident['severity']>('Medium')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [actionIncidentId, setActionIncidentId] = useState<string | null>(null)
  const [agentStatus, setAgentStatus] =
    useState<AgentStatus>('ready')

  const [agentExecution, setAgentExecution] = useState<
    AgentExecution[]
  >([
    {
      id: 'software-engineering',
      name: 'Software Engineering',
      description: 'Code & architecture analysis',
      status: 'idle',
    },
    {
      id: 'incident-investigation',
      name: 'Incident Investigation',
      description: 'Evidence & root-cause analysis',
      status: 'idle',
    },
    {
      id: 'engineering-action',
      name: 'Engineering Action',
      description: 'Recommended remediation',
      status: 'idle',
    },
  ])

  const [investigationResult, setInvestigationResult] =
    useState<InvestigationResponse | null>(null)

  const [investigationError, setInvestigationError] =
    useState('')

  const refreshOverview = useCallback(async () => {
    const results = await Promise.allSettled([
      getApiHealth(),
      getCloudPlatform(),
      getRepository(),
      getIncidents(),
      getActions(),
    ])
    const [api, platform, repository, incidents, actions] = results

    setOverview({
      api: api.status === 'fulfilled' ? api.value : null,
      platform: platform.status === 'fulfilled' ? platform.value : null,
      repository: repository.status === 'fulfilled' ? repository.value : null,
      incidents: incidents.status === 'fulfilled' ? incidents.value : null,
      actions: actions.status === 'fulfilled' ? actions.value : null,
      checkedAt: new Date(),
      errors: results.flatMap((result) => result.status === 'rejected'
        ? [result.reason instanceof Error ? result.reason.message : 'A live status request failed']
        : []),
    })
    setOverviewLoading(false)
    setOverviewRefreshing(false)
  }, [])

  const handleOverviewRefresh = () => {
    setOverviewRefreshing(true)
    void refreshOverview()
  }

  useEffect(() => {
    if (activeView !== 'overview') return
    const initialLoad = window.setTimeout(() => void refreshOverview(), 0)
    const interval = window.setInterval(() => void refreshOverview(), 120_000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [activeView, refreshOverview])

  const handleInvestigate = async () => {
    if (!incident.trim()) {
      return
    }

    setAgentStatus('running')
    setSelectedIncident(null)
    setInvestigationResult(null)
    setInvestigationError('')

    setAgentExecution([
      {
        id: 'software-engineering',
        name: 'Software Engineering',
        description: 'Code & architecture analysis',
        status: 'running',
      },
      {
        id: 'incident-investigation',
        name: 'Incident Investigation',
        description: 'Evidence & root-cause analysis',
        status: 'idle',
      },
      {
        id: 'engineering-action',
        name: 'Engineering Action',
        description: 'Recommended remediation',
        status: 'idle',
      },
    ])

    try {
      const result = await analyseIncident(incident, severity)

      setAgentExecution([
        {
          id: 'software-engineering',
          name: 'Software Engineering',
          description: 'Code & architecture analysis',
          status: 'complete',
        },
        {
          id: 'incident-investigation',
          name: 'Incident Investigation',
          description: 'Evidence & root-cause analysis',
          status: 'complete',
        },
        {
          id: 'engineering-action',
          name: 'Engineering Action',
          description: 'Recommended remediation',
          status: 'complete',
        },
      ])

      setInvestigationResult(result)
      setAgentStatus('complete')
      if (result.incidentId) {
        try {
          setSelectedIncident(await getIncident(result.incidentId))
        } catch (loadError) {
          console.error('Investigation completed, but its saved record could not be reloaded:', loadError)
        }
      }
      void refreshOverview()
    } catch (error) {
      console.error('Investigation failed:', error)

      setAgentExecution((current) =>
        current.map((agent) => ({
          ...agent,
          status:
            agent.status === 'running'
              ? 'error'
              : agent.status,
        })),
      )

      setInvestigationError(
        error instanceof Error
          ? error.message
          : 'Investigation failed',
      )

      setAgentStatus('ready')
      void refreshOverview()
    }
  }

  const handleClearOutput = () => {
    setInvestigationResult(null)
    setInvestigationError('')
    setAgentStatus('ready')
    setSelectedIncident(null)

    setAgentExecution((current) =>
      current.map((agent) => ({
        ...agent,
        status: 'idle',
      })),
    )
  }

  const handleNewInvestigation = () => {
    setIncident('')
    setSeverity('Medium')
    setSelectedIncident(null)
    setInvestigationResult(null)
    setInvestigationError('')
    setAgentStatus('ready')

    setAgentExecution((current) =>
      current.map((agent) => ({
        ...agent,
        status: 'idle',
      })),
    )

    setActiveView('overview')
  }

  const handleSelectIncident = async (incidentId: string) => {
    setInvestigationError('')
    setInvestigationResult(null)
    setSelectedIncident(null)
    setAgentStatus('loading')
    setActiveView('overview')

    setAgentExecution([
      {
        id: 'software-engineering',
        name: 'Software Engineering',
        description: 'Code & architecture analysis',
        status: 'complete',
      },
      {
        id: 'incident-investigation',
        name: 'Incident Investigation',
        description: 'Evidence & root-cause analysis',
        status: 'complete',
      },
      {
        id: 'engineering-action',
        name: 'Engineering Action',
        description: 'Recommended remediation',
        status: 'complete',
      },
    ])

    try {
      const selectedIncident = await getIncident(incidentId)

      setSelectedIncident(selectedIncident)
      setIncident(selectedIncident.description)
      setSeverity(selectedIncident.severity)

      const hasResults = Boolean(selectedIncident.analysis || selectedIncident.investigation || selectedIncident.actions)
      setInvestigationResult(hasResults ? {
        success: true,
        analysis: selectedIncident.analysis,
        investigation: selectedIncident.investigation,
        actions: selectedIncident.actions,
        incidentId: selectedIncident._id,
      } : null)
      setInvestigationError(hasResults ? '' : selectedIncident.investigationError || (selectedIncident.status === 'Investigating' ? 'This investigation has not completed yet.' : 'This incident has no saved investigation output.'))
      setAgentStatus(hasResults ? 'complete' : 'ready')
      if (!hasResults) {
        setAgentExecution((current) => current.map((agent) => ({ ...agent, status: 'idle' })))
      }
    } catch (error) {
      console.error('Failed to load incident:', error)

      setInvestigationError(
        error instanceof Error
          ? error.message
          : 'Failed to load incident',
      )

      setAgentStatus('ready')
    }
  }

  const handleRetrySelectedInvestigation = async () => {
    if (!selectedIncident) return
    setAgentStatus('running')
    setInvestigationResult(null)
    setInvestigationError('')
    try {
      const updated = await retryIncidentInvestigation(selectedIncident._id)
      setSelectedIncident(updated)
      setInvestigationResult({
        success: true,
        analysis: updated.analysis,
        investigation: updated.investigation,
        actions: updated.actions,
        incidentId: updated._id,
      })
      setAgentStatus('complete')
      void refreshOverview()
    } catch (retryError) {
      setInvestigationError(retryError instanceof Error ? retryError.message : 'Investigation retry failed')
      setAgentStatus('ready')
    }
  }

  const openIncidentActions = (incidentId: string) => {
    setActionIncidentId(incidentId)
    setActiveView('actions')
  }

  const activeIncidentCount = overview?.incidents?.filter((item) =>
    item.status === 'Investigating' || item.status === 'Open',
  ).length
  const openActionCount = overview?.actions?.filter((item) => item.status !== 'Verified').length
  const confirmedChecks = [
    overview?.api?.status === 'ok',
    overview?.platform?.runtime.status === 'ok',
    overview?.repository !== null && overview?.repository !== undefined,
    overview?.incidents !== null && overview?.incidents !== undefined,
    overview?.actions !== null && overview?.actions !== undefined,
    overview?.platform?.azure.status === 'connected',
    overview?.platform?.foundry.authentication === 'authenticated',
  ].filter(Boolean).length
  const overviewStatus = overviewLoading
    ? 'Checking platform'
    : confirmedChecks === 7
      ? 'Services connected · inference untested'
      : confirmedChecks > 0
        ? 'Partial connectivity'
        : 'Services unavailable'
  const getStatusLabel = (status: string | undefined) => {
    if (overviewLoading && !status) return 'Checking'
    if (!status) return 'Unavailable'
    return ({
      ok: 'Connected',
      connected: 'Connected',
      ready: 'Configured',
      authenticated: 'Authenticated',
      not_configured: 'Not configured',
      configuration_incomplete: 'Configuration incomplete',
      unavailable: 'Unavailable',
      not_checked: 'Not checked',
    } as Record<string, string>)[status] ?? status
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
      />

      <div className="app-content">

        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true"><img src={foundryMark} alt="" /></div>

            <div>
              <div className="brand-name">Engineering Operations</div>
              <div className="brand-subtitle">Operational control plane</div>
            </div>
          </div>

          <div className={`system-status ${overviewStatus.startsWith('Services connected') ? 'is-connected' : overviewStatus === 'Checking platform' ? 'is-checking' : 'is-degraded'}`}>
            <span className="status-dot" aria-hidden="true" />
            <span>{overviewStatus}</span>
            {activeView === 'overview' && <button type="button" onClick={handleOverviewRefresh} disabled={overviewRefreshing}><span aria-hidden="true">↻</span>{overviewRefreshing ? 'Refreshing' : 'Refresh'}</button>}
          </div>
        </header>

        {activeView === 'overview' && (
          <main className="dashboard">

            <section className="hero-section">
              <div className="hero-copy">
                <h1>Engineering<br />operations.</h1>
                <p>Incident analysis across application code, repository history, Azure resources, and engineering actions.</p>
              </div>

              <div className="hero-meta">
                <div className="hero-meta-item">
                  <span className="hero-meta-label">API runtime</span>
                  <strong>{overview?.platform?.runtime.service ?? getStatusLabel(undefined)}</strong>
                </div>

                <div className="hero-meta-item">
                  <span className="hero-meta-label">Model deployment</span>
                  <strong>{overview?.platform?.foundry.deployment ?? getStatusLabel(overview?.platform?.foundry.status)}</strong>
                </div>

                <div className="hero-meta-item">
                  <span className="hero-meta-label">Repository</span>
                  <strong>{overview?.repository?.repository.full_name ?? getStatusLabel(undefined)}</strong>
                </div>
              </div>
            </section>

            <div className="overview-sync-status" role="status">
              <span><span className="sync-symbol" aria-hidden="true">⌁</span>{overview?.checkedAt ? `Last synchronized ${overview.checkedAt.toLocaleTimeString()}` : 'Loading platform state'}</span>
              {overview?.errors.length ? <span>{overview.errors.length} data source{overview.errors.length === 1 ? '' : 's'} unavailable</span> : null}
            </div>

            <section className="overview-grid">

              <article className="metric-card">
                <div className="metric-heading">
                  <div className="card-label">OPEN / INVESTIGATING</div>
                </div>
                <div className="metric-value">{activeIncidentCount ?? (overviewLoading ? '…' : '—')}</div>
                <div className="metric-detail">
                  {overview?.incidents ? `${overview.incidents.length} recorded incidents` : overviewLoading ? 'Loading incident history' : 'Incident service unavailable'}
                </div>
              </article>

              <article className="metric-card">
                <div className="metric-heading">
                  <div className="card-label">UNVERIFIED ACTIONS</div>
                </div>
                <div className="metric-value">{openActionCount ?? (overviewLoading ? '…' : '—')}</div>
                <div className="metric-detail">
                  {overview?.actions ? `${overview.actions.filter((item) => item.status === 'Recommended').length} recommended · ${overview.actions.filter((item) => item.status !== 'Verified' && item.status !== 'Recommended').length} in progress` : overviewLoading ? 'Loading action queue' : 'Action queue unavailable'}
                </div>
              </article>

              <article className="metric-card">
                <div className="metric-heading">
                  <div className="card-label">REPOSITORY</div>
                </div>
                <div className="metric-value">{getStatusLabel(overview?.repository ? 'connected' : undefined)}</div>
                <div className="metric-detail">
                  {overview?.repository ? `${overview.repository.repository.full_name} · ${overview.repository.recent_commits.length} recent commits` : 'GitHub repository context'}
                </div>
              </article>

              <article className="metric-card">
                <div className="metric-heading">
                  <div className="card-label">AZURE RESOURCES</div>
                </div>
                <div className="metric-value">{overview?.platform?.azure.status === 'connected' ? overview.platform.azure.resource_count : getStatusLabel(overview?.platform?.azure.status)}</div>
                <div className="metric-detail">
                  {overview?.platform?.azure.status === 'connected' ? `Visible to Azure identity · Foundry ${getStatusLabel(overview.platform.foundry.authentication)}` : 'Live Azure Resource Manager check'}
                </div>
              </article>

            </section>

            <section className="workspace">

              <div className="workspace-main">

                <div className="section-heading">
                  <div>
                    <span className="eyebrow">INCIDENT WORKFLOW</span>
                    <h2>Incident intake</h2>
                    <p className="section-description">Submit a description to run analysis against configured sources.</p>
                  </div>

                  <div className={`agent-state ${agentStatus}`}>
                    <span className="status-dot" />

                    {agentStatus === 'ready' && 'Ready'}
                    {agentStatus === 'running' && 'Investigating'}
                    {agentStatus === 'loading' && 'Loading saved investigation'}
                    {agentStatus === 'complete' && 'Complete'}
                  </div>
                </div>

                <div className="incident-panel">

                  <label htmlFor="incident">
                    Incident details
                  </label>

                  {selectedIncident && <div className="selected-incident-details">
                    <span>INCIDENT {selectedIncident._id}</span>
                    <strong>{selectedIncident.status} · {selectedIncident.severity}</strong>
                    {selectedIncident.actionStatus && <small>Action: {selectedIncident.actionStatus}</small>}
                    {selectedIncident.actions && <button type="button" onClick={() => openIncidentActions(selectedIncident._id)}>Open linked action</button>}
                  </div>}

                  <textarea
                    id="incident"
                    value={incident}
                    onChange={(event) =>
                      setIncident(event.target.value)
                    }
                    readOnly={Boolean(selectedIncident)}
                    placeholder="Describe the symptoms, affected service, observed errors, impact, and relevant changes."
                    rows={8}
                  />

                  {!selectedIncident && <label className="severity-select-label" htmlFor="incident-severity">
                    Severity
                    <select id="incident-severity" value={severity} onChange={(event) => setSeverity(event.target.value as Incident['severity'])}>
                      <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </label>}

                  <div className="incident-actions">

                    <span>
                      {selectedIncident ? 'Saved incident details are read-only. Start a new investigation to submit another incident.' : `Severity: ${severity}. Analysis uses currently configured integrations.`}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedIncident?.status === 'Investigating' && selectedIncident.investigationError) {
                          void handleRetrySelectedInvestigation()
                        } else if (selectedIncident) {
                          handleNewInvestigation()
                        } else {
                          void handleInvestigate()
                        }
                      }}
                      disabled={
                        (!incident.trim() && !selectedIncident) ||
                        agentStatus === 'running' ||
                        agentStatus === 'loading'
                      }
                    >
                      {agentStatus === 'running'
                        ? 'Investigation running…'
                        : agentStatus === 'loading'
                          ? 'Loading saved result…'
                          : selectedIncident?.status === 'Investigating' && selectedIncident.investigationError
                            ? 'Retry Investigation'
                            : selectedIncident
                              ? 'New investigation'
                              : 'Run investigation'}
                    </button>

                  </div>
                </div>

                <div className="investigation-output">

                  <div className="output-header">

                    <div>
                      <span className="eyebrow">
                        AGENT OUTPUT
                      </span>

                      <h2>
                        Investigation result
                      </h2>
                    </div>

                    <span className="output-placeholder">
                      {agentStatus === 'complete'
                        ? 'Investigation complete'
                        : agentStatus === 'running'
                          ? 'Investigation in progress'
                          : agentStatus === 'loading'
                            ? 'Loading saved result'
                            : 'No result loaded'}
                    </span>

                  </div>

                  <div className="output-body">

                    {investigationError && (
                      <div className="empty-state">

                        <h3>
                          Investigation failed
                        </h3>

                        <p>
                          {investigationError}
                        </p>

                      </div>
                    )}

                    {!investigationError &&
                      !investigationResult && (
                        <div className="empty-state">

                          <h3>
                            No investigation yet
                          </h3>

                          <p>
                            Submit an incident description to retrieve analysis and evidence from configured sources.
                          </p>

                        </div>
                      )}

                    {!investigationError &&
                      investigationResult && (
                        <>
                          <div className="investigation-result-actions">
                            <button
                              type="button"
                              onClick={handleClearOutput}
                            >
                              Clear result
                            </button>
                          </div>

                          <div className="investigation-result">

                            <section className="result-section">

                              <div className="result-section-header">

                                <span className="result-index">
                                  01
                                </span>

                                <div>
                                  <span className="eyebrow">
                                    ANALYSIS
                                  </span>

                                  <h3>
                                    Engineering Analysis
                                  </h3>
                                </div>

                              </div>

                              <div className="result-content">
                                <MarkdownContent content={investigationResult.analysis} />
                              </div>

                            </section>

                            <section className="result-section">

                              <div className="result-section-header">

                                <span className="result-index">
                                  02
                                </span>

                                <div>
                                  <span className="eyebrow">
                                    INVESTIGATION
                                  </span>

                                  <h3>
                                    Evidence &amp; Investigation
                                  </h3>
                                </div>

                              </div>

                              <div className="result-content">
                                <MarkdownContent content={investigationResult.investigation} />
                              </div>

                            </section>

                            <section className="result-section">

                              <div className="result-section-header">

                                <span className="result-index">
                                  03
                                </span>

                                <div>
                                  <span className="eyebrow">
                                    ENGINEERING ACTION
                                  </span>

                                  <h3>
                                    Recommended Actions
                                  </h3>
                                </div>

                              </div>

                              <div className="result-content">
                                <MarkdownContent content={investigationResult.actions} />
                              </div>

                            </section>

                          </div>
                        </>
                      )}
                  </div>
                </div>

              </div>

              <aside className="workspace-sidebar">

                <section className="context-card">

                  <div className="card-header">
                    <span className="eyebrow">ANALYSIS SEQUENCE</span>
                  </div>

                  <div className="agent-list">

                    {agentExecution.map((agent, index) => (
                      <div
                        className={`agent-row agent-${agent.status}`}
                        key={agent.id}
                      >
                        <div className="agent-index">
                          {String(index + 1).padStart(2, '0')}
                        </div>

                        <div>
                          <strong>{agent.name}</strong>

                          <span>
                            {agent.description}
                          </span>
                        </div>

                        <div className="agent-runtime-status">
                          {agent.status === 'idle' && 'Idle'}
                          {agent.status === 'running' && 'Running'}
                          {agent.status === 'complete' && 'Complete'}
                          {agent.status === 'error' && 'Error'}
                        </div>
                      </div>
                    ))}

                  </div>
                </section>

                <section className="context-card">

                  <div className="card-header">
                    <span className="eyebrow">CONNECTED SOURCES</span>
                  </div>

                  <div className="context-list">

                    <div>
                      <span>GitHub</span>
                      <strong>
                        {overview?.repository?.repository.full_name ?? getStatusLabel(overview?.repository ? 'connected' : undefined)}
                      </strong>
                    </div>

                    <div>
                      <span>Git history</span>
                      <strong>
                        {overview?.repository ? `${overview.repository.recent_commits.length} commits loaded` : getStatusLabel(undefined)}
                      </strong>
                    </div>

                    <div>
                      <span>Azure</span>
                      <strong>
                        {overview?.platform?.azure.status === 'connected' ? `${overview.platform.azure.resource_count} resources` : getStatusLabel(overview?.platform?.azure.status)}
                      </strong>
                    </div>

                    <div>
                      <span>Foundry</span>
                      <strong>
                        {overview?.platform?.foundry.deployment ?? getStatusLabel(overview?.platform?.foundry.status)}
                      </strong>
                    </div>

                  </div>
                </section>

                <section className="context-card">

                  <div className="card-header">
                    <span className="eyebrow">EVIDENCE STANDARD</span>
                  </div>

                  <p className="principle">
                    Distinguish observed evidence from hypotheses. Record conclusions only when supported by available data.
                  </p>

                </section>

              </aside>

            </section>

          </main>
        )}

        {activeView === 'incidents' && (
          <Incidents
            onNewInvestigation={handleNewInvestigation}
            onSelectIncident={handleSelectIncident}
            onOpenActions={openIncidentActions}
          />
        )}

        {activeView === 'engineering' && <Engineering />}

        {activeView === 'actions' && <Actions incidentId={actionIncidentId ?? undefined} onClearIncidentFilter={() => setActionIncidentId(null)} onBackToIncidents={() => setActiveView('incidents')} />}

        {activeView === 'repository' && <Repository />}

        {activeView === 'agents' && <Agents />}

        {activeView === 'azure-foundry' && <AzureFoundry />}

        {activeView === 'settings' && <Settings />}
        {activeView === 'knowledge' && <Knowledge />}

        <footer className="footer">
          <span>Engineering Operations</span>
          <span>Development environment</span>
        </footer>

      </div>
    </div>
  )
}

export default App
