import {
  Bot,
  CheckCircle2,
  Circle,
  GitBranch,
  Search,
  Wrench,
} from 'lucide-react'
import './Agents.css'
import ExecutionConsole from './ExecutionConsole'

type AgentStatus = 'Role defined'

type Agent = {
  number: string
  name: string
  description: string
  responsibility: string
  icon: typeof Bot
  status: AgentStatus
  inputs: string[]
  outputs: string[]
}

const agents: Agent[] = [
  {
    number: '01',
    name: 'Software Engineering',
    description:
      'Analyses application code, architecture, repository structure, and engineering implementation details.',
    responsibility: 'Code & architecture analysis',
    icon: GitBranch,
    status: 'Role defined',
    inputs: [
      'Repository structure',
      'Source code',
      'Recent commits',
      'Architecture context',
    ],
    outputs: [
      'Code findings',
      'Architecture findings',
      'Potential engineering issues',
    ],
  },
  {
    number: '02',
    name: 'Incident Investigation',
    description:
      'Investigates reported incidents by evaluating symptoms, repository evidence, recent changes, and available engineering context.',
    responsibility: 'Evidence & root-cause analysis',
    icon: Search,
    status: 'Role defined',
    inputs: [
      'Incident description',
      'Repository evidence',
      'Git history',
      'Azure context',
    ],
    outputs: [
      'Evidence summary',
      'Root-cause hypotheses',
      'Confidence assessment',
    ],
  },
  {
    number: '03',
    name: 'Engineering Action',
    description:
      'Converts investigation findings into practical engineering recommendations and remediation actions.',
    responsibility: 'Recommended remediation',
    icon: Wrench,
    status: 'Role defined',
    inputs: [
      'Investigation findings',
      'Root-cause hypotheses',
      'Engineering context',
    ],
    outputs: [
      'Recommended actions',
      'Remediation steps',
      'Engineering priorities',
    ],
  },
]

function Agents() {
  return (
    <main className="agents-page">
      <section className="agents-header">
        <div>
          <span className="eyebrow">AGENT ORCHESTRATION</span>

          <h1>Engineering Agents</h1>

          <p>
            Specialised AI agents responsible for analysing engineering
            evidence, investigating incidents, and recommending remediation.
          </p>
        </div>

        <div className="agents-header-status">
          <span className="agents-status-dot" />
          <div>
            <span>AGENT RUNTIME</span>
            <strong>See execution history</strong>
          </div>
        </div>
      </section>

      <section className="agents-overview">
        <div className="agents-overview-card">
          <span className="agents-card-label">TOTAL AGENTS</span>
          <strong>3</strong>
          <span>Specialised engineering agents</span>
        </div>

        <div className="agents-overview-card">
          <span className="agents-card-label">ORCHESTRATION</span>
          <strong>Sequential</strong>
          <span>Evidence-driven agent workflow</span>
        </div>

        <div className="agents-overview-card">
          <span className="agents-card-label">RUNTIME</span>
          <strong>FastAPI</strong>
          <span>Python agent runtime</span>
        </div>

        <div className="agents-overview-card">
          <span className="agents-card-label">AI PLATFORM</span>
          <strong>Foundry</strong>
          <span>Microsoft Foundry inference</span>
        </div>
      </section>

      <section className="agents-section">
        <div className="agents-section-heading">
          <div>
            <span className="eyebrow">SPECIALISED AGENTS</span>
            <h2>Agent pipeline</h2>
          </div>

          <span className="agents-section-count">03 AGENTS</span>
        </div>

        <div className="agent-cards">
          {agents.map((agent) => {
            const Icon = agent.icon

            return (
              <article className="agent-card" key={agent.number}>
                <div className="agent-card-top">
                  <div className="agent-number">{agent.number}</div>

                  <div className="agent-icon">
                    <Icon size={19} strokeWidth={1.6} />
                  </div>

                  <div className="agent-status">
                    <span className="agent-status-dot" />
                    {agent.status}
                  </div>
                </div>

                <div className="agent-card-content">
                  <h3>{agent.name}</h3>

                  <span className="agent-responsibility">
                    {agent.responsibility}
                  </span>

                  <p>{agent.description}</p>
                </div>

                <div className="agent-card-details">
                  <div className="agent-detail-column">
                    <span className="agent-detail-label">INPUTS</span>

                    <div className="agent-detail-list">
                      {agent.inputs.map((input) => (
                        <div key={input}>
                          <Circle size={6} strokeWidth={1.5} />
                          <span>{input}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="agent-detail-column">
                    <span className="agent-detail-label">OUTPUTS</span>

                    <div className="agent-detail-list">
                      {agent.outputs.map((output) => (
                        <div key={output}>
                          <CheckCircle2 size={12} strokeWidth={1.5} />
                          <span>{output}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="agents-flow">
        <div className="agents-section-heading">
          <div>
            <span className="eyebrow">ORCHESTRATION MODEL</span>
            <h2>Investigation flow</h2>
          </div>
        </div>

        <div className="agent-flow-track">
          <div className="flow-step">
            <span className="flow-number">01</span>
            <div>
              <strong>Software Engineering</strong>
              <span>Analyse code &amp; architecture</span>
            </div>
          </div>

          <div className="flow-step">
            <span className="flow-number">02</span>
            <div>
              <strong>Incident Investigation</strong>
              <span>Evaluate evidence &amp; hypotheses</span>
            </div>
          </div>

          <div className="flow-step">
            <span className="flow-number">03</span>
            <div>
              <strong>Engineering Action</strong>
              <span>Recommend remediation</span>
            </div>
          </div>
        </div>
      </section>
    <ExecutionConsole />
    </main>
  )
}

export default Agents
