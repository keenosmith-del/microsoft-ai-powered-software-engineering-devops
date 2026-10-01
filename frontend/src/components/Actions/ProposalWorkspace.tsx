import ReviewedChange from './ReviewedChange'
import { useEffect, useState } from 'react'
import { listProposals, type RemediationProposal } from '../../services/api'
export default function ProposalWorkspace({ incidentId }: { incidentId?: string }) {
  const [rows, setRows] = useState<RemediationProposal[]>([])
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [hasNext, setHasNext] = useState(false)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    void listProposals('', page, incidentId).then(data => { if (active) { setRows(data.items); setHasNext(data.hasNext); setError('') } }).catch(failure => { if (active) { setRows([]); setError(failure instanceof Error ? failure.message : 'Proposal request failed') } }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [page, incidentId, version])
  return <section className="actions-panel phase2-workspace">
    <div className="actions-panel-header"><div><span className="eyebrow">CONTROLLED REMEDIATION</span><h2>Proposals and approvals</h2></div></div>
    <p>Open the linked incident to review findings, prepare or approve a proposal, record external changes and verify recovery. Approval is enforced by the server.</p>
    <button disabled={busy} onClick={() => { setBusy(true); setVersion(value => value + 1) }}>Load proposals</button>
    {busy && <p role="status">Loading proposals…</p>}{error && <p role="alert">{error}</p>}
    {!busy && !error && rows.length === 0 && <p>No persisted proposals.</p>}
    {rows.map(proposal => <article className="action-card" key={proposal._id}><h3>{proposal.title}</h3><p>{proposal.risk} risk · {proposal.approvalStatus} · Owner: {proposal.owner || 'Unassigned'}</p><p>Target: {proposal.target}</p><a href={`/incidents/${proposal.incidentId}`}>Open incident and remediation history</a><details><summary>Proposed change and validation</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{proposal.action}</pre><p>{proposal.rationale}</p><pre style={{ whiteSpace: 'pre-wrap' }}>{proposal.validationPlan}</pre></details>{proposal.approvalStatus === 'approved' && <ReviewedChange proposalId={proposal._id} />}<details><summary>Approval audit</summary>{proposal.audit.map(entry => <p key={entry.version}>{entry.actor} · {entry.action} · {new Date(entry.at).toLocaleString()} · Version {entry.version}</p>)}</details></article>)}
    <p>Page {page} <button disabled={busy || page === 1} onClick={() => { setBusy(true); setPage(value => value - 1) }}>Previous proposals</button> <button disabled={busy || !hasNext || page >= 100} onClick={() => { setBusy(true); setPage(value => value + 1) }}>Next proposals</button></p>
  </section>
}
