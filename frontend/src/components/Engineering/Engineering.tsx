import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitCommit,
  GitPullRequest,
  Server,
  Terminal,
} from 'lucide-react'
import './Engineering.css'

function Engineering() {
  return (
    <section className="engineering-page">
      <div className="engineering-header">
        <div>
          <span className="eyebrow">ENGINEERING</span>

          <h1>Engineering intelligence</h1>

          <p>
            Monitor application health, repository activity, infrastructure
            context, and engineering signals from a single operational view.
          </p>
        </div>

        <div className="engineering-runtime">
          <div className="runtime-indicator">
            <span className="runtime-dot" />
            Runtime operational
          </div>

          <span>Python / FastAPI</span>
        </div>
      </div>

      <div className="engineering-metrics">
        <article className="engineering-metric">
          <div className="engineering-metric-icon">
            <Activity size={17} strokeWidth={1.6} />
          </div>

          <div>
            <span>APPLICATION HEALTH</span>
            <strong>Operational</strong>
            <small>No active health signals</small>
          </div>
        </article>

        <article className="engineering-metric">
          <div className="engineering-metric-icon">
            <GitCommit size={17} strokeWidth={1.6} />
          </div>

          <div>
            <span>RECENT COMMITS</span>
            <strong>Connected</strong>
            <small>Repository history available</small>
          </div>
        </article>

        <article className="engineering-metric">
          <div className="engineering-metric-icon">
            <Server size={17} strokeWidth={1.6} />
          </div>

          <div>
            <span>INFRASTRUCTURE</span>
            <strong>Connected</strong>
            <small>Azure context available</small>
          </div>
        </article>

        <article className="engineering-metric">
          <div className="engineering-metric-icon">
            <AlertTriangle size={17} strokeWidth={1.6} />
          </div>

          <div>
            <span>ACTIVE SIGNALS</span>
            <strong>0</strong>
            <small>No unresolved engineering signals</small>
          </div>
        </article>
      </div>

      <div className="engineering-grid">
        <section className="engineering-panel engineering-health">
          <div className="engineering-panel-header">
            <div>
              <span className="eyebrow">SYSTEM HEALTH</span>
              <h2>Application health</h2>
            </div>

            <span className="panel-status">
              <span className="panel-status-dot" />
              Operational
            </span>
          </div>

          <div className="health-overview">
            <div className="health-score">
              <strong>100%</strong>
              <span>Current health</span>
            </div>

            <div className="health-services">
              <div className="health-service">
                <div>
                  <span>API Gateway</span>
                  <small>Node.js / Express</small>
                </div>

                <CheckCircle2 size={16} strokeWidth={1.5} />
              </div>

              <div className="health-service">
                <div>
                  <span>Agent Runtime</span>
                  <small>Python / FastAPI</small>
                </div>

                <CheckCircle2 size={16} strokeWidth={1.5} />
              </div>

              <div className="health-service">
                <div>
                  <span>AI Platform</span>
                  <small>Microsoft Foundry</small>
                </div>

                <CheckCircle2 size={16} strokeWidth={1.5} />
              </div>

              <div className="health-service">
                <div>
                  <span>Repository</span>
                  <small>GitHub</small>
                </div>

                <CheckCircle2 size={16} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </section>

        <section className="engineering-panel">
          <div className="engineering-panel-header">
            <div>
              <span className="eyebrow">ENGINEERING SIGNALS</span>
              <h2>Current signals</h2>
            </div>

            <span className="signal-count">0 active</span>
          </div>

          <div className="engineering-empty-state">
            <div className="engineering-empty-icon">
              <CheckCircle2 size={20} strokeWidth={1.4} />
            </div>

            <h3>No active engineering signals</h3>

            <p>
              Application, repository, and infrastructure signals will appear
              here when detected.
            </p>
          </div>
        </section>
      </div>

      <div className="engineering-grid">
        <section className="engineering-panel">
          <div className="engineering-panel-header">
            <div>
              <span className="eyebrow">REPOSITORY</span>
              <h2>Repository activity</h2>
            </div>

            <GitPullRequest size={17} strokeWidth={1.5} />
          </div>

          <div className="repository-placeholder">
            <GitCommit size={18} strokeWidth={1.4} />

            <div>
              <strong>Repository activity ready</strong>

              <span>
                Recent commits, branches, pull requests, and code changes will
                appear here.
              </span>
            </div>
          </div>
        </section>

        <section className="engineering-panel">
          <div className="engineering-panel-header">
            <div>
              <span className="eyebrow">ENGINEERING TOOLS</span>
              <h2>Available context</h2>
            </div>

            <Terminal size={17} strokeWidth={1.5} />
          </div>

          <div className="engineering-context-list">
            <div>
              <span>Source code</span>
              <strong>Available</strong>
            </div>

            <div>
              <span>Git history</span>
              <strong>Available</strong>
            </div>

            <div>
              <span>Azure resources</span>
              <strong>Available</strong>
            </div>

            <div>
              <span>Agent analysis</span>
              <strong>Ready</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}

export default Engineering