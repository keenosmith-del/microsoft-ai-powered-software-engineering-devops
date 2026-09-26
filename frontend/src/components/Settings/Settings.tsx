import {
  Bell,
  Cloud,
  Database,
  Lock,
  Monitor,
  Server,
  SlidersHorizontal,
} from 'lucide-react'
import './Settings.css'

function Settings() {
  return (
    <main className="settings-page">
      <section className="settings-header">
        <div>
          <span className="settings-eyebrow">SYSTEM CONFIGURATION</span>

          <h1>Settings</h1>

          <p>
            Configure the AI Engineering Operations environment, integrations,
            runtime behaviour, and operational preferences.
          </p>
        </div>

        <div className="settings-status">
          <span className="settings-status-dot" />
          <span>Configuration Active</span>
        </div>
      </section>

      <section className="settings-grid">

        <article className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              <Server size={18} strokeWidth={1.7} />
            </div>

            <div>
              <span>RUNTIME</span>
              <h2>Application Runtime</h2>
            </div>
          </div>

          <div className="settings-list">
            <div className="settings-row">
              <div>
                <strong>API Runtime</strong>
                <span>Primary application gateway</span>
              </div>

              <b>Node / Express</b>
            </div>

            <div className="settings-row">
              <div>
                <strong>Agent Runtime</strong>
                <span>AI orchestration service</span>
              </div>

              <b>Python / FastAPI</b>
            </div>

            <div className="settings-row">
              <div>
                <strong>API Port</strong>
                <span>Local gateway endpoint</span>
              </div>

              <b>5050</b>
            </div>

            <div className="settings-row">
              <div>
                <strong>Agent Runtime Port</strong>
                <span>Local orchestration endpoint</span>
              </div>

              <b>8000</b>
            </div>
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              <Cloud size={18} strokeWidth={1.7} />
            </div>

            <div>
              <span>AI PLATFORM</span>
              <h2>Microsoft Foundry</h2>
            </div>
          </div>

          <div className="settings-list">
            <div className="settings-row">
              <div>
                <strong>AI Platform</strong>
                <span>Model inference provider</span>
              </div>

              <b>Microsoft Foundry</b>
            </div>

            <div className="settings-row">
              <div>
                <strong>Deployment</strong>
                <span>Configured model deployment</span>
              </div>

              <b>gpt-5.6-sol</b>
            </div>

            <div className="settings-row">
              <div>
                <strong>Authentication</strong>
                <span>Azure credential provider</span>
              </div>

              <b>DefaultAzureCredential</b>
            </div>
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
            </div>

            <div>
              <span>INTEGRATION</span>
              <h2>Repository</h2>
            </div>
          </div>

          <div className="settings-list">
            <div className="settings-row">
              <div>
                <strong>GitHub</strong>
                <span>Repository integration</span>
              </div>

              <b className="settings-connected">Connected</b>
            </div>

            <div className="settings-row">
              <div>
                <strong>Repository Context</strong>
                <span>Code and repository evidence</span>
              </div>

              <b>Enabled</b>
            </div>

            <div className="settings-row">
              <div>
                <strong>Git History</strong>
                <span>Commit and diff analysis</span>
              </div>

              <b>Enabled</b>
            </div>
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              <Database size={18} strokeWidth={1.7} />
            </div>

            <div>
              <span>ENGINEERING CONTEXT</span>
              <h2>Evidence Sources</h2>
            </div>
          </div>

          <div className="settings-list">
            <div className="settings-row">
              <div>
                <strong>Repository Evidence</strong>
                <span>Source code and architecture</span>
              </div>

              <b>Available</b>
            </div>

            <div className="settings-row">
              <div>
                <strong>Git Evidence</strong>
                <span>Recent commits and changes</span>
              </div>

              <b>Available</b>
            </div>

            <div className="settings-row">
              <div>
                <strong>Azure Evidence</strong>
                <span>Cloud resource context</span>
              </div>

              <b>Available</b>
            </div>

            <div className="settings-row">
              <div>
                <strong>Foundry Evidence</strong>
                <span>Model inference context</span>
              </div>

              <b>Available</b>
            </div>
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              <SlidersHorizontal size={18} strokeWidth={1.7} />
            </div>

            <div>
              <span>OPERATIONS</span>
              <h2>Behaviour</h2>
            </div>
          </div>

          <div className="settings-options">
            <label className="settings-option">
              <div>
                <strong>Evidence-first analysis</strong>
                <span>
                  Require available evidence before conclusions are generated.
                </span>
              </div>

              <input type="checkbox" defaultChecked />
            </label>

            <label className="settings-option">
              <div>
                <strong>Repository context</strong>
                <span>
                  Include repository evidence in engineering investigations.
                </span>
              </div>

              <input type="checkbox" defaultChecked />
            </label>

            <label className="settings-option">
              <div>
                <strong>Azure context</strong>
                <span>
                  Include Azure resource evidence in investigations.
                </span>
              </div>

              <input type="checkbox" defaultChecked />
            </label>
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              <Monitor size={18} strokeWidth={1.7} />
            </div>

            <div>
              <span>INTERFACE</span>
              <h2>Console Preferences</h2>
            </div>
          </div>

          <div className="settings-options">
            <label className="settings-option">
              <div>
                <strong>Compact navigation</strong>
                <span>
                  Use the collapsed sidebar layout on smaller screens.
                </span>
              </div>

              <input type="checkbox" defaultChecked />
            </label>

            <label className="settings-option">
              <div>
                <strong>System status</strong>
                <span>
                  Display operational status throughout the console.
                </span>
              </div>

              <input type="checkbox" defaultChecked />
            </label>
          </div>
        </article>

      </section>

      <section className="settings-security">
        <div className="settings-security-icon">
          <Lock size={18} strokeWidth={1.7} />
        </div>

        <div>
          <span className="settings-eyebrow">SECURITY</span>
          <h2>Credentials remain outside the interface</h2>
          <p>
            Authentication credentials and secrets are managed through the
            application environment and Azure identity mechanisms rather than
            being exposed through the console.
          </p>
        </div>
      </section>

      <section className="settings-footer-panel">
        <div className="settings-footer-icon">
          <Bell size={17} strokeWidth={1.7} />
        </div>

        <div>
          <strong>Operational notifications</strong>
          <span>
            Notification and alert integrations will be configured when the
            backend and cloud operations layer are connected.
          </span>
        </div>

        <span className="settings-coming-soon">
          NOT CONFIGURED
        </span>
      </section>
    </main>
  )
}

export default Settings