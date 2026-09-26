import {
  Activity,
  Brain,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  Server,
  Zap,
} from 'lucide-react'
import './Azure-Foundry.css'

type ConnectionStatus = 'Connected' | 'Ready'

type Resource = {
  name: string
  type: string
  status: ConnectionStatus
  description: string
  icon: typeof Cloud
}

const resources: Resource[] = [
  {
    name: 'Microsoft Foundry',
    type: 'AI Platform',
    status: 'Connected',
    description: 'Model inference and agent orchestration platform',
    icon: Brain,
  },
  {
    name: 'Azure',
    type: 'Cloud Platform',
    status: 'Connected',
    description: 'Cloud resource and infrastructure context',
    icon: Cloud,
  },
  {
    name: 'Agent Runtime',
    type: 'FastAPI / Python',
    status: 'Ready',
    description: 'AI orchestration runtime',
    icon: Server,
  },
]

function AzureFoundry() {
  return (
    <main className="azure-foundry-page">
      <section className="azure-foundry-header">
        <div>
          <span className="eyebrow">CLOUD &amp; AI PLATFORM</span>

          <h1>Azure / Foundry</h1>

          <p>
            Cloud infrastructure, Microsoft Foundry inference, model
            configuration, and AI engineering runtime context.
          </p>
        </div>

        <div className="azure-foundry-header-status">
          <span className="azure-foundry-status-dot" />

          <div>
            <span>PLATFORM STATUS</span>
            <strong>Operational</strong>
          </div>
        </div>
      </section>

      <section className="azure-foundry-overview">
        <div className="azure-overview-card">
          <span className="azure-card-label">AZURE</span>
          <strong>Connected</strong>
          <span>Cloud resource context available</span>
        </div>

        <div className="azure-overview-card">
          <span className="azure-card-label">FOUNDRY</span>
          <strong>Connected</strong>
          <span>AI platform available</span>
        </div>

        <div className="azure-overview-card">
          <span className="azure-card-label">MODEL</span>
          <strong>Ready</strong>
          <span>Inference configuration available</span>
        </div>

        <div className="azure-overview-card">
          <span className="azure-card-label">RUNTIME</span>
          <strong>FastAPI</strong>
          <span>Python agent runtime</span>
        </div>
      </section>

      <section className="azure-platform-grid">
        <div className="azure-main-panel">
          <div className="azure-panel-heading">
            <div>
              <span className="eyebrow">PLATFORM CONNECTIONS</span>
              <h2>Cloud services</h2>
            </div>

            <span className="azure-panel-count">03 CONNECTIONS</span>
          </div>

          <div className="azure-resource-list">
            {resources.map((resource) => {
              const Icon = resource.icon

              return (
                <div className="azure-resource-row" key={resource.name}>
                  <div className="azure-resource-icon">
                    <Icon size={18} strokeWidth={1.6} />
                  </div>

                  <div className="azure-resource-info">
                    <strong>{resource.name}</strong>
                    <span>{resource.type}</span>
                  </div>

                  <div className="azure-resource-description">
                    {resource.description}
                  </div>

                  <div className="azure-resource-status">
                    <span className="azure-resource-status-dot" />
                    {resource.status}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="azure-side-panel">
          <div className="azure-panel-heading">
            <div>
              <span className="eyebrow">AI INFERENCE</span>
              <h2>Model</h2>
            </div>
          </div>

          <div className="model-card">
            <div className="model-icon">
              <Brain size={20} strokeWidth={1.5} />
            </div>

            <div className="model-name">
              <span>DEPLOYMENT</span>
              <strong>gpt-5.6-sol</strong>
            </div>

            <div className="model-status">
              <span className="azure-resource-status-dot" />
              Ready
            </div>
          </div>

          <div className="model-details">
            <div>
              <span>Provider</span>
              <strong>Microsoft Foundry</strong>
            </div>

            <div>
              <span>Authentication</span>
              <strong>DefaultAzureCredential</strong>
            </div>

            <div>
              <span>Inference</span>
              <strong>Azure AI</strong>
            </div>

            <div>
              <span>Runtime</span>
              <strong>Python / FastAPI</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="azure-runtime-section">
        <div className="azure-panel-heading">
          <div>
            <span className="eyebrow">ENGINEERING RUNTIME</span>
            <h2>AI infrastructure</h2>
          </div>

          <span className="azure-panel-count">LOCAL ENVIRONMENT</span>
        </div>

        <div className="azure-runtime-grid">
          <article className="runtime-card">
            <div className="runtime-card-header">
              <div className="runtime-icon">
                <Server size={18} strokeWidth={1.5} />
              </div>

              <span className="runtime-status">
                <CheckCircle2 size={12} strokeWidth={1.5} />
                Ready
              </span>
            </div>

            <span className="runtime-label">AGENT RUNTIME</span>

            <strong>Python / FastAPI</strong>

            <p>
              Dedicated AI orchestration runtime responsible for coordinating
              specialised engineering agents.
            </p>

            <div className="runtime-meta">
              <span>Port</span>
              <strong>8000</strong>
            </div>
          </article>

          <article className="runtime-card">
            <div className="runtime-card-header">
              <div className="runtime-icon">
                <Activity size={18} strokeWidth={1.5} />
              </div>

              <span className="runtime-status">
                <CheckCircle2 size={12} strokeWidth={1.5} />
                Ready
              </span>
            </div>

            <span className="runtime-label">API GATEWAY</span>

            <strong>Node / Express</strong>

            <p>
              HTTP gateway responsible for exposing the application API and
              forwarding requests to the agent runtime.
            </p>

            <div className="runtime-meta">
              <span>Port</span>
              <strong>5050</strong>
            </div>
          </article>

          <article className="runtime-card">
            <div className="runtime-card-header">
              <div className="runtime-icon">
                <Database size={18} strokeWidth={1.5} />
              </div>

              <span className="runtime-status">
                <CheckCircle2 size={12} strokeWidth={1.5} />
                Available
              </span>
            </div>

            <span className="runtime-label">CLOUD CONTEXT</span>

            <strong>Azure Resources</strong>

            <p>
              Azure resource evidence available to the engineering agents
              during investigation workflows.
            </p>

            <div className="runtime-meta">
              <span>Source</span>
              <strong>Azure SDK</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="azure-inference-section">
        <div className="azure-panel-heading">
          <div>
            <span className="eyebrow">INFERENCE PIPELINE</span>
            <h2>Foundry request path</h2>
          </div>
        </div>

        <div className="inference-flow">
          <div className="inference-step">
            <span className="inference-number">01</span>

            <div className="inference-step-icon">
              <Zap size={17} strokeWidth={1.5} />
            </div>

            <div>
              <strong>Application API</strong>
              <span>HTTP request</span>
            </div>
          </div>

          <div className="inference-line" />

          <div className="inference-step">
            <span className="inference-number">02</span>

            <div className="inference-step-icon">
              <Server size={17} strokeWidth={1.5} />
            </div>

            <div>
              <strong>Agent Runtime</strong>
              <span>Agent orchestration</span>
            </div>
          </div>

          <div className="inference-line" />

          <div className="inference-step">
            <span className="inference-number">03</span>

            <div className="inference-step-icon">
              <Brain size={17} strokeWidth={1.5} />
            </div>

            <div>
              <strong>Microsoft Foundry</strong>
              <span>Model inference</span>
            </div>
          </div>

          <div className="inference-line" />

          <div className="inference-step">
            <span className="inference-number">04</span>

            <div className="inference-step-icon">
              <CheckCircle2 size={17} strokeWidth={1.5} />
            </div>

            <div>
              <strong>Engineering Result</strong>
              <span>Evidence &amp; recommendations</span>
            </div>
          </div>
        </div>
      </section>

      <section className="azure-info-grid">
        <div className="azure-info-card">
          <span className="eyebrow">AUTHENTICATION</span>

          <h3>DefaultAzureCredential</h3>

          <p>
            Azure authentication is handled through the standard Azure
            credential chain rather than embedding credentials in application
            code.
          </p>
        </div>

        <div className="azure-info-card">
          <span className="eyebrow">MODEL ACCESS</span>

          <h3>Azure AI inference</h3>

          <p>
            The agent runtime communicates with Microsoft Foundry through the
            Azure AI authentication and inference path.
          </p>
        </div>

        <div className="azure-info-card">
          <span className="eyebrow">RESOURCE EVIDENCE</span>

          <h3>Azure context</h3>

          <p>
            Azure resource information can be supplied to the engineering
            agents as evidence during incident investigation.
          </p>
        </div>
      </section>

      <section className="azure-actions">
        <div>
          <span className="eyebrow">PLATFORM MANAGEMENT</span>
          <h2>Azure / Foundry resources</h2>
        </div>

        <button type="button" className="azure-external-button">
          <span>Open Azure Portal</span>
          <ExternalLink size={14} strokeWidth={1.5} />
        </button>
      </section>
    </main>
  )
}

export default AzureFoundry