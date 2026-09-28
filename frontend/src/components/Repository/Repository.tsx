import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, RotateCcw } from 'lucide-react'
import {
  getRepository,
  type RepositoryData,
} from '../../services/api'
import './Repository.css'

function Repository() {
  const [repository, setRepository] = useState<RepositoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await getRepository()
      setRepository(data)
      setError('')
    } catch (loadError) {
      console.error('Failed to load repository:', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Failed to load repository')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setUpdatedAt(new Date())
    }
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

  const connectionLabel = repository
    ? error ? 'Connection issue · showing last data' : refreshing ? 'Refreshing' : 'Connected'
    : loading ? 'Connecting' : 'Unavailable'
  const connectionState = repository
    ? error ? 'degraded' : 'connected'
    : loading ? 'checking' : 'unavailable'
  const latestChanges = repository?.latest_commit_changes

  return (
    <main className="repository-page">
      <section className="repository-header">
        <div>
          <span className="eyebrow">REPOSITORY INTELLIGENCE</span>
          <h1>Repository</h1>
          <p>Inspect the connected repository, recent commits, branches, and source changes available to incident investigations.</p>
        </div>
        <div className="repository-header-actions">
          <div className={`repository-status is-${connectionState}`} role="status">
            <span className="repository-status-dot" />
            <div><span>GitHub connection</span><strong>{connectionLabel}</strong></div>
          </div>
          <button type="button" className="repository-refresh" onClick={handleRefresh} disabled={refreshing}>
            <RotateCcw size={14} />{refreshing ? 'Refreshing' : 'Refresh'}
          </button>
          <small>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : 'Not yet synced'}</small>
        </div>
      </section>

      {error && <div className="repository-error" role="status">{repository ? `Refresh failed: ${error}` : error}</div>}

      <section className="repository-overview">
        <article className="repository-metric">
          <span className="repository-metric-label">REPOSITORY</span>
          <strong>{loading ? 'Loading…' : repository?.repository.name ?? 'Unavailable'}</strong>
          {repository?.repository.html_url ? <a href={repository.repository.html_url} target="_blank" rel="noreferrer">Open on GitHub <ExternalLink size={11} /></a> : <span>GitHub repository</span>}
        </article>
        <article className="repository-metric">
          <span className="repository-metric-label">DEFAULT BRANCH</span>
          <strong>{loading ? 'Loading…' : repository?.branch.name ?? 'Unavailable'}</strong>
          <span>{repository?.branch.sha ? `HEAD ${repository.branch.sha.slice(0, 7)}` : 'Branch reference'}</span>
        </article>
        <article className="repository-metric">
          <span className="repository-metric-label">RECENT COMMITS</span>
          <strong>{repository?.recent_commits.length ?? (loading ? 'Loading…' : 'Unavailable')}</strong>
          <span>{repository?.repository.updated_at ? `Repository updated ${new Date(repository.repository.updated_at).toLocaleDateString()}` : 'Commit history response'}</span>
        </article>
        <article className="repository-metric">
          <span className="repository-metric-label">LANGUAGE</span>
          <strong>{repository?.repository.language ?? (loading ? 'Loading…' : 'Not reported')}</strong>
          <span>{repository ? repository.repository.private ? 'Private repository' : 'Public repository' : 'Repository metadata'}</span>
        </article>
      </section>

      <section className="repository-grid">
        <div className="repository-main-column">
          <section className="repository-panel">
            <div className="repository-panel-header">
              <div><span className="eyebrow">RECENT COMMITS</span><h2>Repository history</h2></div>
              <span className="repository-panel-meta">{repository ? `${repository.recent_commits.length} from ${repository.branch.name}` : 'GitHub activity'}</span>
            </div>
            <div className="commit-list">
              {loading && <div className="change-empty"><div><h3>Loading repository history…</h3><p>Retrieving recent commits from GitHub.</p></div></div>}
              {!loading && !repository && <div className="change-empty"><div><h3>Repository unavailable</h3><p>{error || 'The repository service did not return data.'}</p></div></div>}
              {!loading && repository?.recent_commits.length === 0 && <div className="change-empty"><div><h3>No commits returned</h3><p>The selected repository branch has no recent commit data.</p></div></div>}
              {repository?.recent_commits.map((commit, index) => (
                <article className="commit-row" key={commit.sha}>
                  <div className="commit-index">{String(index + 1).padStart(2, '0')}</div>
                  <div className="commit-content">
                    <strong>{commit.message.split('\n')[0]}</strong>
                    <div className="commit-meta"><span>{commit.author ?? 'Unknown author'}</span><span>·</span><span>{commit.date ? new Date(commit.date).toLocaleString() : 'Unknown date'}</span></div>
                  </div>
                  {commit.url ? <a className="repository-commit-link" href={commit.url} target="_blank" rel="noreferrer">{commit.sha.slice(0, 7)} <ExternalLink size={11} /></a> : <code>{commit.sha.slice(0, 7)}</code>}
                </article>
              ))}
            </div>
          </section>

          <section className="repository-panel">
            <div className="repository-panel-header">
              <div><span className="eyebrow">LATEST COMMIT IMPACT</span><h2>Most recent change set</h2></div>
              <span className="repository-panel-meta">Remote commit · {latestChanges?.sha.slice(0, 7) ?? 'Unavailable'}</span>
            </div>
            {latestChanges ? <>
              <div className="change-summary">
                <div className="change-stat"><span className="change-stat-value">{latestChanges.files_changed}</span><span>Files changed</span></div>
                <div className="change-stat"><span className="change-stat-value">+{latestChanges.additions}</span><span>Additions</span></div>
                <div className="change-stat"><span className="change-stat-value">−{latestChanges.deletions}</span><span>Deletions</span></div>
                <div className="change-stat"><span className="change-stat-value">{repository?.branch.name ?? '—'}</span><span>Branch</span></div>
              </div>
              <div className="latest-file-list">
                {latestChanges.files.map((file) => <div key={file.path ?? 'unknown'}><code>{file.path ?? 'Unknown file'}</code><span>{file.status ?? 'changed'}</span></div>)}
                {latestChanges.files.length === 0 && <div className="change-empty"><p>No changed file details were returned for this commit.</p></div>}
              </div>
            </> : <div className="change-empty"><span className="change-empty-mark">—</span><div><h3>Commit diff unavailable</h3><p>{loading ? 'Loading commit details…' : 'The latest commit summary could not be retrieved.'}</p></div></div>}
          </section>
        </div>

        <aside className="repository-sidebar">
          <section className="repository-panel">
            <div className="repository-panel-header"><div><span className="eyebrow">BRANCHES</span><h2>Remote branch sample</h2></div><span className="repository-panel-meta">First 10</span></div>
            <div className="branch-list">
              {loading && <div className="change-empty"><p>Loading branch list…</p></div>}
              {repository?.branches.map((branch) => {
                const isDefault = branch.name === repository.repository.default_branch
                return <div className={`branch-row${isDefault ? ' branch-row-active' : ''}`} key={branch.name}>
                  <div><strong>{branch.name}</strong><span>{isDefault ? 'Default branch' : `HEAD ${branch.sha?.slice(0, 7) ?? 'unknown'}`}</span></div>
                  <span className="branch-status">{branch.protected ? 'Protected' : isDefault ? 'Default' : 'Tracked'}</span>
                </div>
              })}
              {!loading && repository?.branches.length === 0 && <div className="change-empty"><p>No remote branches returned.</p></div>}
              {!loading && !repository && <div className="change-empty"><p>Branch data unavailable.</p></div>}
            </div>
          </section>

          <section className="repository-panel">
            <div className="repository-panel-header"><div><span className="eyebrow">REPOSITORY CONTEXT</span><h2>Retrieved evidence</h2></div></div>
            <div className="evidence-list">
              <div><span>Repository metadata</span><strong>{repository ? 'Live' : loading ? 'Checking' : 'Unavailable'}</strong></div>
              <div><span>Commit history</span><strong>{repository ? `${repository.recent_commits.length} commits` : loading ? 'Checking' : 'Unavailable'}</strong></div>
              <div><span>Remote branches loaded</span><strong>{repository ? `${repository.branches.length} shown` : loading ? 'Checking' : 'Unavailable'}</strong></div>
              <div><span>Latest commit diff</span><strong>{latestChanges ? `${latestChanges.files_changed} files` : loading ? 'Checking' : 'Unavailable'}</strong></div>
            </div>
          </section>

          <section className="repository-panel repository-principle"><span className="eyebrow">ENGINEERING PRINCIPLE</span><p>Repository evidence should provide concrete context before an agent forms hypotheses about an engineering incident.</p></section>
        </aside>
      </section>
    </main>
  )
}

export default Repository
