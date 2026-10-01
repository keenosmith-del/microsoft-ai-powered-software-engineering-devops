import { useState } from 'react'
import { listProposals, createProposal, reviewProposal, type RemediationProposal } from '../../services/api'
export default function ProposalWorkspace() {
  const [token, setToken] = useState('')
  const [rows, setRows] = useState<RemediationProposal[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState('')
  const [hasNext, setHasNext] = useState(false)
  const load = async () => { const data = await listProposals(token); setRows(data.items); setHasNext(data.hasNext) }
  const action = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); setError('') } catch (failure) { setError(failure instanceof Error ? failure.message : 'Proposal request failed') } finally { setBusy(false) } }
  return <section className="actions-panel phase2-workspace">
    <div className="actions-panel-header"><div><span className="eyebrow">CONTROLLED REMEDIATION</span><h2>Proposals and approvals</h2></div></div>
    <form onSubmit={event => { event.preventDefault(); void action(load) }}><label>Operations token <input type="password" value={token} autoComplete="off" onChange={event => { setToken(event.target.value); setRows(null) }} /></label><button disabled={busy}>Load proposals</button></form>
    <p>All new operations require backend authorization. Approval records never execute changes. Remote PR creation, Azure writes, deployment and arbitrary commands are disabled.</p>
    {error && <p role="alert">{error}</p>}
    <details><summary>Create proposal from a completed investigation</summary><form onSubmit={event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>; void action(async () => { await createProposal(token, { incidentId: data.incidentId, runId: data.runId, title: data.title, action: data.action, rationale: data.rationale, validationPlan: data.validationPlan, target: data.target, risk: data.risk }); await load() }) }}>
      {['incidentId', 'runId', 'title', 'target'].map(field => <label key={field}>{field}<input name={field} required maxLength={field === 'title' ? 200 : 10000} /></label>)}
      {['action', 'rationale', 'validationPlan'].map(field => <label key={field}>{field}<textarea name={field} required maxLength={10000} rows={3} /></label>)}
      <label>Risk <select name="risk"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><button disabled={busy || !token}>Create persisted proposal</button>
    </form></details>
    <label>Review comment <input value={comment} onChange={event => setComment(event.target.value)} maxLength={2000} /></label>
    {rows?.length === 0 && <p>No persisted proposals.</p>}{rows?.map(proposal => <article className="action-card" key={proposal._id}><h3>{proposal.title}</h3><p>{proposal.risk} risk · {proposal.approvalStatus} · Execution disabled</p><p>Target: {proposal.target}</p><details><summary>Preview action and validation</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{proposal.action}</pre><p>{proposal.rationale}</p><pre style={{ whiteSpace: 'pre-wrap' }}>{proposal.validationPlan}</pre><p>Incident: {proposal.incidentId} · Run: {proposal.runId}</p></details>{proposal.approvalStatus === 'pending' && <>{(['approved', 'rejected'] as const).map(decision => <button key={decision} disabled={busy || !comment.trim()} onClick={() => void action(async () => { await reviewProposal(token, proposal, decision, comment); await load() })}>{decision === 'approved' ? 'Approve proposal' : 'Reject proposal'}</button>)}</>}<details><summary>Audit history</summary>{proposal.audit.map(entry => <p key={entry.version}>{entry.actor} · {entry.action} · {new Date(entry.at).toLocaleString()} · Version {entry.version}</p>)}</details></article>)}
    {hasNext && <p>First 20 proposals shown. Additional pages are available through the API.</p>}
  </section>
}
