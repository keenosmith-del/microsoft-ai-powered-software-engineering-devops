import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, RotateCcw } from 'lucide-react'
import {
  getRepository, getRepositoryActivity, getRepositoryJobs,
  type RepositoryActivity, type RepositoryJobs,
  type RepositoryData,
} from '../../services/api'
import './Repository.css'

function Repository() {
  const [branch, setBranch] = useState('')
  const [page, setPage] = useState(1)
  const [activity, setActivity] = useState<RepositoryActivity | null>(null)
  const [activityError, setActivityError] = useState('')
  const [jobs, setJobs] = useState<RepositoryJobs | null>(null)
  const [jobsError, setJobsError] = useState('')
  const [selectedRun, setSelectedRun] = useState<number | null>(null)
  const controller = useRef<AbortController | null>(null)
  const jobController = useRef<AbortController | null>(null)
  const [repository, setRepository] = useState<RepositoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    const timeout = window.setTimeout(() => current.abort(), 30_000)
    setRefreshing(true)
    const [snapshot, operations] = await Promise.allSettled([
      getRepository(branch, page, current.signal), getRepositoryActivity(branch, page, current.signal),
    ])
    window.clearTimeout(timeout)
    if (controller.current !== current) return
    if (current.signal.aborted) { setError('Repository request timed out'); setActivityError('Activity request timed out'); setLoading(false); setRefreshing(false); return }
    if (snapshot.status === 'fulfilled') { setRepository(snapshot.value); setError(''); setUpdatedAt(new Date()) }
    else setError(snapshot.reason instanceof Error ? snapshot.reason.message : 'Repository unavailable')
    if (operations.status === 'fulfilled') { setActivity(operations.value); setActivityError('') }
    else setActivityError(operations.reason instanceof Error ? operations.reason.message : 'Activity unavailable')
    setLoading(false)
    setRefreshing(false)
  }, [branch, page])
  const selectRun = async (id: number) => {
    jobController.current?.abort()
    const current = new AbortController()
    jobController.current = current
    const timer = window.setTimeout(() => current.abort(), 10_000)
    setSelectedRun(id); setJobs(null); setJobsError('')
    try { const result = await getRepositoryJobs(id, current.signal); if (jobController.current === current) setJobs(result) }
    catch (failure) { if (jobController.current === current) setJobsError(failure instanceof Error ? failure.message : 'Jobs unavailable') }
    finally { window.clearTimeout(timer) }
  }

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
      controller.current?.abort()
      jobController.current?.abort()
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

      <div className="repository-header-actions">
        <label>Branch <select aria-label="Repository branch" value={branch || repository?.branch.name || ''} onChange={event => { setBranch(event.target.value); setPage(1); setRepository(null); setActivity(null); setJobs(null); setLoading(true) }}>
          {!repository && <option value={branch}>{branch || 'Default branch'}</option>}
          {repository?.branches.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select></label>
        <button disabled={page === 1 || refreshing} onClick={() => setPage(value => value - 1)}>Previous page</button>
        <span>Page {page}</span>
        <button disabled={refreshing || !repository?.hasNext || page >= 100} onClick={() => setPage(value => value + 1)}>Next page</button>
      </div>
      <section className="repository-panel">
        <div className="repository-panel-header"><div><span className="eyebrow">CI/CD INTELLIGENCE</span><h2>Workflows and deployments</h2></div></div>
        {activityError && <p role="alert">{activityError} · Last activity may be stale</p>}
        {!activity && <p>{refreshing ? 'Loading workflow activity…' : 'Workflow activity unavailable'}</p>}
        {activity && <>
          <div className="evidence-list">{activity.workflows.items?.map(item => <div key={item.id}><a href={item.html_url} target="_blank" rel="noreferrer">{item.name}</a><strong>{item.state}</strong></div>)}</div>
          {activity.workflows.error && <p>{activity.workflows.error}</p>}
          <div className="commit-list">{activity.runs.items?.map(run => <article className="commit-row" key={run.id}><div className="commit-content"><a href={run.html_url} target="_blank" rel="noreferrer">{run.name}</a><div className="commit-meta">{run.head_branch} · {run.head_sha.slice(0, 7)} · {run.conclusion || run.status} · {new Date(run.created_at).toLocaleString()}</div></div><button onClick={() => void selectRun(run.id)}>Inspect jobs</button></article>)}</div>
          {activity.runs.error && <p>{activity.runs.error}</p>}
          {activity.runs.items?.length === 0 && <p>No workflow runs returned for this branch and page.</p>}
          {selectedRun && <div className="evidence-list"><h3>Jobs for run {selectedRun}</h3>{jobsError && <p role="alert">{jobsError}</p>}{!jobs && !jobsError && <p>Loading jobs…</p>}{jobs?.items.map(job => <div key={job.id}><a href={job.html_url} target="_blank" rel="noreferrer">{job.name}</a><strong>{job.conclusion || job.status}</strong><span>{job.steps.filter(step => step.conclusion === 'failure').map(step => step.name).join(', ')}</span></div>)}{jobs?.items.length === 0 && <p>No jobs returned.</p>}{jobs?.hasNext && <p>First 30 jobs shown; open the run on GitHub for remaining jobs.</p>}</div>}
          <h3>Pull requests</h3>{activity.pulls.error && <p>{activity.pulls.error}</p>}<div className="evidence-list">{activity.pulls.items?.map(pr => <div key={pr.number}><a href={pr.html_url} target="_blank" rel="noreferrer">#{pr.number} {pr.title}</a><strong>{pr.state}</strong></div>)}</div>{activity.pulls.items?.length === 0 && <p>No pull requests returned.</p>}
          <h3>Deployment records</h3>{activity.deployments.error && <p>{activity.deployments.error}</p>}<div className="evidence-list">{activity.deployments.items?.map(deployment => <div key={deployment.id}><span>{deployment.environment} · {deployment.sha.slice(0, 7)}</span><strong>{new Date(deployment.created_at).toLocaleString()}</strong></div>)}</div>{activity.deployments.items?.length === 0 && <p>No deployment history returned.</p>}
          <button disabled title="Requires the additive durable investigation backend">Launch investigation</button><p>Investigation launch is unavailable until durable execution and evidence-context validation are implemented.</p>
        </>}
      </section>
      <section className="repository-overview">
        <article className="repository-metric">
          <span className="repository-metric-label">REPOSITORY</span>
          <strong>{loading ? 'Loading…' : repository?.repository.name ?? 'Unavailable'}</strong>
          {repository?.repository.html_url ? <a href={repository.repository.html_url} target="_blank" rel="noreferrer">Open on GitHub <ExternalLink size={11} /></a> : <span>GitHub repository</span>}
        </article>
        <article className="repository-metric">
          <span className="repository-metric-label">SELECTED BRANCH</span>
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
