import { useEffect, useState } from 'react'
import {
  getRepository,
  type RepositoryData,
} from '../../services/api'

import './Repository.css'

function Repository() {
  const [repository, setRepository] = useState<RepositoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRepository() {
      try {
        const data = await getRepository()
        setRepository(data)
      } catch (error) {
        console.error(
          'Failed to load repository:',
          error,
        )

        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load repository',
        )
      } finally {
        setLoading(false)
      }
    }

    loadRepository()
  }, [])
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
          <strong>
            {loading
              ? 'Loading...'
              : repository?.repository.name || 'Unavailable'}
          </strong>

          <span>GitHub repository</span>
        </article>

        <article className="repository-metric">
          <span className="repository-metric-label">BRANCH</span>
          <strong>
            {loading
              ? 'Loading...'
              : repository?.branch.name || 'Unavailable'}
          </strong>

          <span>Current repository branch</span>
        </article>

        <article className="repository-metric">
          <span className="repository-metric-label">STATUS</span>
          <strong>
            {loading ? 'Loading...' : 'Tracked'}
          </strong>

          <span>Remote repository state available</span>
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
              {loading && (
                <div className="change-empty">
                  <div>
                    <h3>Loading repository history...</h3>
                    <p>
                      Retrieving recent commits from GitHub.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="change-empty">
                  <div>
                    <h3>Repository unavailable</h3>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {!loading &&
                !error &&
                repository?.recent_commits.map((commit, index) => (
                  <article
                    className="commit-row"
                    key={commit.sha}
                  >
                    <div className="commit-index">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="commit-content">
                      <strong>
                        {commit.message.split('\n')[0]}
                      </strong>

                      <div className="commit-meta">
                        <span>
                          {repository.branch.name}
                        </span>

                        <span>·</span>

                        <span>
                          {commit.date
                            ? new Date(commit.date).toLocaleString()
                            : 'Unknown date'}
                        </span>
                      </div>
                    </div>

                    <code>
                      {commit.sha.substring(0, 7)}
                    </code>
                  </article>
                ))}
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