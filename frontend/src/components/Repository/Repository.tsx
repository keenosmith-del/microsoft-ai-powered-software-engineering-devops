import './Repository.css'

function Repository() {
  return (
    <main className="repository-page">
      <section className="repository-header">
        <div>
          <span className="eyebrow">REPOSITORY INTELLIGENCE</span>
          <h1>Repository</h1>
          <p>
            Inspect repository state, recent changes, branches, and engineering
            evidence used during AI-powered investigations.
          </p>
        </div>

        <div className="repository-status">
          <span className="repository-status-dot" />
          <div>
            <span>Connection</span>
            <strong>Connected</strong>
          </div>
        </div>
      </section>

      <section className="repository-overview">
        <article className="repository-metric">
          <span className="repository-metric-label">REPOSITORY</span>
          <strong>ai-engineering-operations</strong>
          <span>GitHub repository</span>
        </article>

        <article className="repository-metric">
          <span className="repository-metric-label">BRANCH</span>
          <strong>main</strong>
          <span>Current working branch</span>
        </article>

        <article className="repository-metric">
          <span className="repository-metric-label">STATUS</span>
          <strong>Clean</strong>
          <span>No uncommitted changes</span>
        </article>

        <article className="repository-metric">
          <span className="repository-metric-label">EVIDENCE</span>
          <strong>Available</strong>
          <span>Repository context enabled</span>
        </article>
      </section>

      <section className="repository-grid">
        <div className="repository-main-column">
          <section className="repository-panel">
            <div className="repository-panel-header">
              <div>
                <span className="eyebrow">RECENT COMMITS</span>
                <h2>Repository history</h2>
              </div>

              <span className="repository-panel-meta">Latest activity</span>
            </div>

            <div className="commit-list">
              <article className="commit-row">
                <div className="commit-index">01</div>

                <div className="commit-content">
                  <strong>Implement repository intelligence UI</strong>

                  <div className="commit-meta">
                    <span>main</span>
                    <span>·</span>
                    <span>Recent commit</span>
                  </div>
                </div>

                <code>8f31c2a</code>
              </article>

              <article className="commit-row">
                <div className="commit-index">02</div>

                <div className="commit-content">
                  <strong>Add engineering operations dashboard</strong>

                  <div className="commit-meta">
                    <span>main</span>
                    <span>·</span>
                    <span>Previous commit</span>
                  </div>
                </div>

                <code>52a91de</code>
              </article>

              <article className="commit-row">
                <div className="commit-index">03</div>

                <div className="commit-content">
                  <strong>Configure agent runtime integration</strong>

                  <div className="commit-meta">
                    <span>main</span>
                    <span>·</span>
                    <span>Previous commit</span>
                  </div>
                </div>

                <code>31d7b84</code>
              </article>

              <article className="commit-row">
                <div className="commit-index">04</div>

                <div className="commit-content">
                  <strong>Establish project foundation</strong>

                  <div className="commit-meta">
                    <span>main</span>
                    <span>·</span>
                    <span>Previous commit</span>
                  </div>
                </div>

                <code>19c4e72</code>
              </article>
            </div>
          </section>

          <section className="repository-panel">
            <div className="repository-panel-header">
              <div>
                <span className="eyebrow">RECENT CHANGES</span>
                <h2>Change surface</h2>
              </div>

              <span className="repository-panel-meta">Working tree</span>
            </div>

            <div className="change-summary">
              <div className="change-stat">
                <span className="change-stat-value">0</span>
                <span>Modified</span>
              </div>

              <div className="change-stat">
                <span className="change-stat-value">0</span>
                <span>Added</span>
              </div>

              <div className="change-stat">
                <span className="change-stat-value">0</span>
                <span>Deleted</span>
              </div>

              <div className="change-stat">
                <span className="change-stat-value">Clean</span>
                <span>Working tree</span>
              </div>
            </div>

            <div className="change-empty">
              <span className="change-empty-mark">00</span>

              <div>
                <h3>No uncommitted changes</h3>
                <p>
                  The repository currently has no detected working-tree
                  changes.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="repository-sidebar">
          <section className="repository-panel">
            <div className="repository-panel-header">
              <div>
                <span className="eyebrow">BRANCHES</span>
                <h2>Repository branches</h2>
              </div>
            </div>

            <div className="branch-list">
              <div className="branch-row branch-row-active">
                <div>
                  <strong>main</strong>
                  <span>Current branch</span>
                </div>

                <span className="branch-status">Active</span>
              </div>

              <div className="branch-row">
                <div>
                  <strong>development</strong>
                  <span>Development branch</span>
                </div>

                <span className="branch-status">Tracked</span>
              </div>
            </div>
          </section>

          <section className="repository-panel">
            <div className="repository-panel-header">
              <div>
                <span className="eyebrow">REPOSITORY CONTEXT</span>
                <h2>Available evidence</h2>
              </div>
            </div>

            <div className="evidence-list">
              <div>
                <span>Source files</span>
                <strong>Available</strong>
              </div>

              <div>
                <span>Git history</span>
                <strong>Available</strong>
              </div>

              <div>
                <span>Commit diffs</span>
                <strong>Available</strong>
              </div>

              <div>
                <span>Branch state</span>
                <strong>Available</strong>
              </div>
            </div>
          </section>

          <section className="repository-panel repository-principle">
            <span className="eyebrow">ENGINEERING PRINCIPLE</span>

            <p>
              Repository evidence should provide concrete context before an
              agent forms hypotheses about an engineering incident.
            </p>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default Repository