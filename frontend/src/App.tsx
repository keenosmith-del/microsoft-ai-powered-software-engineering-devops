import { useState } from 'react'
import {
  analyseIncident,
  getIncident,
  updateIncidentStatus,
  type InvestigationResponse,
} from './services/api'

import Sidebar from './components/Sidebar/Sidebar'
import Incidents from './components/Incidents/Incidents'
import Engineering from './components/Engineering/Engineering'
import Actions from './components/Actions/Actions'
import Repository from './components/Repository/Repository'
import Agents from './components/Agents/Agents'
import AzureFoundry from './components/Azure-Foundry/Azure-Foundry'
import Settings from './components/Settings/Settings'
import './App.css'

type AgentStatus = 'ready' | 'running' | 'complete'

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

function App() {
  const [activeView, setActiveView] = useState('overview')
  const [incident, setIncident] = useState('')
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

  const handleInvestigate = async () => {
    if (!incident.trim()) {
      return
    }

    setAgentStatus('running')
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
      const result = await analyseIncident(incident)

      if (result.incidentId) {
        await updateIncidentStatus(
          result.incidentId,
          'Open',
        )
      }

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
    }
  }

  const handleClearOutput = () => {
    setInvestigationResult(null)
    setInvestigationError('')
    setAgentStatus('ready')

    setAgentExecution((current) =>
      current.map((agent) => ({
        ...agent,
        status: 'idle',
      })),
    )
  }

  const handleNewInvestigation = () => {
    setIncident('')
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
    setAgentStatus('running')
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

      setIncident(selectedIncident.description)

      setInvestigationResult({
        success: true,
        analysis: selectedIncident.analysis,
        investigation: selectedIncident.investigation,
        actions: selectedIncident.actions,
      })

      setAgentStatus('complete')
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

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
      />

      <div className="app-content">

        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">AI</div>

            <div>
              <div className="brand-name">
                AI Engineering Operations
              </div>

              <div className="brand-subtitle">
                Software Engineering &amp; DevOps Intelligence
              </div>
            </div>
          </div>

          <div className="system-status">
            <span className="status-dot" />
            <span>System Operational</span>
          </div>
        </header>

        {activeView === 'overview' && (
          <main className="dashboard">

            <section className="hero-section">
              <div>
                <span className="eyebrow">
                  ENGINEERING OPERATIONS
                </span>

                <h1>Investigate. Understand. Act.</h1>

                <p>
                  AI-powered investigation across application code,
                  repository changes, Azure resources, and engineering
                  context.
                </p>
              </div>

              <div className="hero-meta">
                <div>
                  <span>Runtime</span>
                  <strong>Python / FastAPI</strong>
                </div>

                <div>
                  <span>AI Platform</span>
                  <strong>Microsoft Foundry</strong>
                </div>

                <div>
                  <span>Repository</span>
                  <strong>GitHub</strong>
                </div>
              </div>
            </section>

            <section className="overview-grid">

              <article className="metric-card">
                <div className="card-label">AGENTS</div>
                <div className="metric-value">3</div>
                <div className="metric-detail">
                  Specialised engineering agents
                </div>
              </article>

              <article className="metric-card">
                <div className="card-label">REPOSITORY</div>
                <div className="metric-value">Connected</div>
                <div className="metric-detail">
                  GitHub repository context available
                </div>
              </article>

              <article className="metric-card">
                <div className="card-label">AZURE</div>
                <div className="metric-value">Connected</div>
                <div className="metric-detail">
                  Azure resource context available
                </div>
              </article>

              <article className="metric-card">
                <div className="card-label">MODEL</div>
                <div className="metric-value">Ready</div>
                <div className="metric-detail">
                  Microsoft Foundry inference
                </div>
              </article>

            </section>

            <section className="workspace">

              <div className="workspace-main">

                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      INCIDENT INVESTIGATION
                    </span>

                    <h2>
                      Investigate an engineering incident
                    </h2>
                  </div>

                  <div className={`agent-state ${agentStatus}`}>
                    <span className="status-dot" />

                    {agentStatus === 'ready' && 'Ready'}
                    {agentStatus === 'running' && 'Investigating'}
                    {agentStatus === 'complete' && 'Complete'}
                  </div>
                </div>

                <div className="incident-panel">

                  <label htmlFor="incident">
                    Incident description
                  </label>

                  <textarea
                    id="incident"
                    value={incident}
                    onChange={(event) =>
                      setIncident(event.target.value)
                    }
                    placeholder="Describe the incident, symptoms, affected service, error behaviour, or recent changes..."
                    rows={8}
                  />

                  <div className="incident-actions">

                    <span>
                      Evidence will be evaluated across repository
                      and Azure context.
                    </span>

                    <button
                      type="button"
                      onClick={handleInvestigate}
                      disabled={
                        !incident.trim() ||
                        agentStatus === 'running'
                      }
                    >
                      {agentStatus === 'running'
                        ? 'Investigating...'
                        : 'Start Investigation'}
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
                        Investigation results
                      </h2>
                    </div>

                    <span className="output-placeholder">
                      {agentStatus === 'complete'
                        ? 'Investigation complete'
                        : agentStatus === 'running'
                          ? 'Investigation in progress'
                          : 'Awaiting investigation'}
                    </span>

                  </div>

                  <div className="output-body">

                    {investigationError && (
                      <div className="empty-state">

                        <div className="empty-state-mark">
                          ERR
                        </div>

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

                          <div className="empty-state-mark">
                            01
                          </div>

                          <h3>
                            No investigation yet
                          </h3>

                          <p>
                            Submit an incident above to begin
                            an evidence-driven investigation.
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
                              Clear Output
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
                                <pre>
                                  {investigationResult.analysis}
                                </pre>
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
                                <pre>
                                  {investigationResult.investigation}
                                </pre>
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
                                <pre>
                                  {investigationResult.actions}
                                </pre>
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
                    <span className="eyebrow">
                      AGENT ORCHESTRATION
                    </span>
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
                    <span className="eyebrow">
                      ENGINEERING CONTEXT
                    </span>
                  </div>

                  <div className="context-list">

                    <div>
                      <span>GitHub</span>
                      <strong>
                        Repository snapshot
                      </strong>
                    </div>

                    <div>
                      <span>Git history</span>
                      <strong>
                        Recent commits &amp; diffs
                      </strong>
                    </div>

                    <div>
                      <span>Azure</span>
                      <strong>
                        Resource context
                      </strong>
                    </div>

                    <div>
                      <span>Foundry</span>
                      <strong>
                        Model inference
                      </strong>
                    </div>

                  </div>
                </section>

                <section className="context-card">

                  <div className="card-header">
                    <span className="eyebrow">
                      OPERATIONAL PRINCIPLE
                    </span>
                  </div>

                  <p className="principle">
                    Evidence first. Hypotheses second. Conclusions
                    only when supported by available evidence.
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
          />
        )}

        {activeView === 'engineering' && <Engineering />}

        {activeView === 'actions' && <Actions />}

        {activeView === 'repository' && <Repository />}

        {activeView === 'agents' && <Agents />}

        {activeView === 'azure-foundry' && <AzureFoundry />}

        {activeView === 'settings' && <Settings />}

        <footer className="footer">
          <span>AI Engineering Operations</span>
          <span>Local Engineering Console</span>
        </footer>

      </div>
    </div>
  )
}

export default App