import {
  CheckCircle2,
  Clock3,
  GitPullRequest,
  Play,
  RotateCcw,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import './Actions.css'

type ActionStatus = 'Recommended' | 'Pending' | 'Completed'

type Action = {
  id: string
  title: string
  description: string
  source: string
  status: ActionStatus
  priority: 'High' | 'Medium' | 'Low'
}

const actions: Action[] = [
  {
    id: 'ACT-001',
    title: 'Review recent repository changes',
    description:
      'Inspect recent commits and diffs associated with the affected service before applying remediation.',
    source: 'Software Engineering Agent',
    status: 'Recommended',
    priority: 'High',
  },
  {
    id: 'ACT-002',
    title: 'Validate Azure resource health',
    description:
      'Check the relevant Azure resources and runtime configuration for availability, failures, or configuration drift.',
    source: 'Incident Investigation Agent',
    status: 'Pending',
    priority: 'High',
  },
  {
    id: 'ACT-003',
    title: 'Prepare remediation change',
    description:
      'Generate an engineering remediation recommendation based on the available incident evidence.',
    source: 'Engineering Action Agent',
    status: 'Pending',
    priority: 'Medium',
  },
  {
    id: 'ACT-004',
    title: 'Verify post-remediation state',
    description:
      'Confirm that the affected service has returned to the expected operational state after remediation.',
    source: 'Engineering Action Agent',
    status: 'Pending',
    priority: 'Low',
  },
]

function Actions() {
  return (
    <main className="actions-page">
      <section className="actions-header">
        <div>
          <span className="eyebrow">ENGINEERING ACTIONS</span>
          <h1>Actions</h1>
          <p>
            Review, prioritise, and execute engineering actions generated from
            investigation evidence.
          </p>
        </div>

        <div className="actions-header-status">
          <span className="status-dot" />
          <span>Action engine ready</span>
        </div>
      </section>

      <section className="actions-overview">
        <article className="action-metric">
          <span>RECOMMENDED</span>
          <strong>1</strong>
          <small>Actions requiring review</small>
        </article>

        <article className="action-metric">
          <span>PENDING</span>
          <strong>3</strong>
          <small>Actions awaiting execution</small>
        </article>

        <article className="action-metric">
          <span>COMPLETED</span>
          <strong>0</strong>
          <small>Verified remediation actions</small>
        </article>

        <article className="action-metric">
          <span>AUTOMATION</span>
          <strong>Ready</strong>
          <small>Execution layer available</small>
        </article>
      </section>

      <section className="actions-workspace">
        <div className="actions-list-panel">
          <div className="actions-panel-header">
            <div>
              <span className="eyebrow">ACTION QUEUE</span>
              <h2>Engineering actions</h2>
            </div>

            <button type="button" className="actions-refresh">
              <RotateCcw size={14} strokeWidth={1.7} />
              Refresh
            </button>
          </div>

          <div className="actions-list">
            {actions.map((action) => (
              <article className="action-row" key={action.id}>
                <div className="action-icon">
                  <Wrench size={16} strokeWidth={1.7} />
                </div>

                <div className="action-content">
                  <div className="action-title-row">
                    <div>
                      <span className="action-id">{action.id}</span>
                      <h3>{action.title}</h3>
                    </div>

                    <span
                      className={`action-priority action-priority-${action.priority.toLowerCase()}`}
                    >
                      {action.priority}
                    </span>
                  </div>

                  <p>{action.description}</p>

                  <div className="action-meta">
                    <span>{action.source}</span>

                    <span className={`action-status action-status-${action.status.toLowerCase()}`}>
                      {action.status === 'Recommended' && (
                        <ShieldCheck size={12} strokeWidth={1.7} />
                      )}

                      {action.status === 'Pending' && (
                        <Clock3 size={12} strokeWidth={1.7} />
                      )}

                      {action.status === 'Completed' && (
                        <CheckCircle2 size={12} strokeWidth={1.7} />
                      )}

                      {action.status}
                    </span>
                  </div>
                </div>

                <button type="button" className="action-execute">
                  <Play size={13} strokeWidth={1.7} />
                  Execute
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="actions-context">
          <section className="actions-context-card">
            <div className="actions-context-header">
              <span className="eyebrow">EXECUTION MODEL</span>
            </div>

            <div className="execution-flow">
              <div className="execution-step">
                <span className="execution-number">01</span>
                <div>
                  <strong>Evidence</strong>
                  <span>Collect engineering context</span>
                </div>
              </div>

              <div className="execution-line" />

              <div className="execution-step">
                <span className="execution-number">02</span>
                <div>
                  <strong>Recommendation</strong>
                  <span>Generate supported action</span>
                </div>
              </div>

              <div className="execution-line" />

              <div className="execution-step">
                <span className="execution-number">03</span>
                <div>
                  <strong>Execution</strong>
                  <span>Apply approved remediation</span>
                </div>
              </div>

              <div className="execution-line" />

              <div className="execution-step">
                <span className="execution-number">04</span>
                <div>
                  <strong>Verification</strong>
                  <span>Confirm operational state</span>
                </div>
              </div>
            </div>
          </section>

          <section className="actions-context-card">
            <div className="actions-context-header">
              <span className="eyebrow">CONNECTED SYSTEMS</span>
            </div>

            <div className="connected-systems">
              <div>
                <GitPullRequest size={15} strokeWidth={1.7} />
                <span>GitHub</span>
                <strong>Connected</strong>
              </div>

              <div>
                <CloudIcon />
                <span>Azure</span>
                <strong>Connected</strong>
              </div>

              <div>
                <BotIcon />
                <span>AI Agents</span>
                <strong>Ready</strong>
              </div>
            </div>
          </section>

          <section className="actions-context-card principle-card">
            <span className="eyebrow">EXECUTION PRINCIPLE</span>

            <p>
              No action should be executed without sufficient evidence,
              explicit engineering intent, and a verifiable outcome.
            </p>
          </section>
        </aside>
      </section>
    </main>
  )
}

function CloudIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9H17a5 5 0 0 1 .5 10Z" />
    </svg>
  )
}

function BotIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="7" width="16" height="13" rx="3" />
      <path d="M12 3v4" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
      <path d="M8 16c1.2 1 2.8 1 4 0 1.2 1 2.8 1 4 0" />
    </svg>
  )
}

export default Actions