import { useEffect, useState } from 'react'
import { getIncident, getIncidentWorkflow, updateIncidentWorkflow, getInvestigationRuns, listProposals, createProposal, reviewProposal, editProposal, cancelInvestigation, indexIncidentReport, restoreSession, watchRun, type Incident, type IncidentWorkflow, type InvestigationRun, type RemediationProposal } from '../../services/api'
export default function IncidentWorkspace({ incidentId }: { incidentId: string }) {
 const [incident, setIncident] = useState<Incident | null>(null)
 const [workflow, setWorkflow] = useState<IncidentWorkflow | null>(null)
 const [runs, setRuns] = useState<InvestigationRun[]>([]); const [runPage, setRunPage] = useState(1); const [moreRuns, setMoreRuns] = useState(false)
 const [proposals, setProposals] = useState<RemediationProposal[]>([]); const [proposalPage, setProposalPage] = useState(1); const [moreProposals, setMoreProposals] = useState(false)
 const [notes, setNotes] = useState(''); const [reference, setReference] = useState(''); const [observation, setObservation] = useState(''); const [criteria, setCriteria] = useState(''); const [risks, setRisks] = useState('')
 const [performedBy, setPerformedBy] = useState(''); const [performedAt, setPerformedAt] = useState(''); const [runId, setRunId] = useState(''); const [proposalId, setProposalId] = useState(''); const [report, setReport] = useState(''); const [indexed, setIndexed] = useState('')
 const [actionError, setActionError] = useState('')
 const [role, setRole] = useState('viewer'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0)
 const [requestKey, setRequestKey] = useState(() => crypto.randomUUID()); const [proposalKey, setProposalKey] = useState(() => crypto.randomUUID())
 useEffect(() => {
  let active = true
  const load = async () => {
   try {
    const [i, w, r, p, session] = await Promise.all([getIncident(incidentId), getIncidentWorkflow('', incidentId), getInvestigationRuns('', runPage, undefined, incidentId), listProposals('', proposalPage, incidentId), restoreSession()])
    if (active) { setIncident(i); setWorkflow(w); setRuns(r.items); setMoreRuns(r.hasNext); setProposals(p.items); setMoreProposals(p.hasNext); setRole(session.role); setError(''); setLoading(false) }
   } catch (e) { if (active) { setError(e instanceof Error ? e.message : 'Workspace unavailable'); setLoading(false) } }
  }
  void load(); const timer = window.setInterval(() => void load(), 3000)
  const auth = () => { setIncident(null); setWorkflow(null); setLoading(true); void load() }; window.addEventListener('ops-auth-changed', auth)
  const expired = () => { setIncident(null); setWorkflow(null); setError('Operations session expired or authorization required') }; window.addEventListener('ops-session-expired', expired)
  return () => { active = false; clearInterval(timer); window.removeEventListener('ops-auth-changed', auth); window.removeEventListener('ops-session-expired', expired) }
 }, [incidentId, runPage, proposalPage, revision])
 const activeRunId = (incident as Incident & { activeRun?: InvestigationRun })?.activeRun?.runId
 useEffect(() => { if (!activeRunId) return; const controller = new AbortController(); void watchRun(activeRunId, controller.signal, () => setRevision(v => v + 1)); return () => controller.abort() }, [activeRunId])
 const execute = async (operation: () => Promise<unknown>) => {
  if (busy) return
  setBusy(true); setActionError('')
  try { await operation(); setRevision(v => v + 1) }
  catch (e) { setActionError(e instanceof Error ? e.message : 'Operation failed'); setRevision(v => v + 1) }
  finally { setBusy(false) }
 }
 const act = (action: string, fields: Record<string, unknown> = {}) => execute(async () => {
  if (!workflow) return
  const value = await updateIncidentWorkflow('', incidentId, { version: workflow.version, action, notes, ...fields, ...(action === 'reinvestigate' ? { requestKey } : {}) })
  setWorkflow(value); if (action === 'reinvestigate') setRequestKey(crypto.randomUUID())
 })
 const evidence = [{ source: 'manual', reference, observation }]
 const canWrite = role !== 'viewer'; const canApprove = ['approver', 'administrator'].includes(role)
 const accepted = workflow?.reviews.find(r => r.id === workflow.currentReviewId)
 const stage = workflow?.stage
 return <main className="incident-workspace phase2-workspace" aria-label="Incident engineering workspace">
  <span className="eyebrow">INCIDENT WORKSPACE</span><h1>{incident?.title || 'Incident'}</h1>
  {loading && <p role="status">Loading incident history…</p>}
  {error && <p role="alert">{error}</p>}{actionError && <p role="alert">{actionError}</p>}
  <button onClick={() => setRevision(v => v + 1)} disabled={busy}>Refresh workspace</button>
  {incident && workflow && <>
   <p data-testid="canonical-status" role="status">{incident.status}</p><p>{incident.service} · {incident.severity} · Revision {workflow.version}</p>
   <h2>Investigation history</h2>
   {activeRunId && <p role="status">Active run {activeRunId}. Live updates use persisted events; polling remains available.</p>}
   {runs.length === 0 && <p>No investigation runs. Legacy outputs, if present, remain below.</p>}
   {runs.map(run => <details key={run.runId} open={run.runId === activeRunId}><summary>{run.runId} · {run.status} · {run.currentStage}</summary>{run.error && <p>{run.error}</p>}<ol>{run.events.map(event => <li key={event.id}>{event.stage} · {event.status}{event.elapsedMs !== undefined ? ` · ${event.elapsedMs} ms` : ''}</li>)}</ol>{['queued', 'running'].includes(run.status) && <button disabled={busy || !canWrite} onClick={() => void execute(() => cancelInvestigation('', run.runId))}>Cancel investigation</button>}{run.result && Object.entries(run.result).map(([name, value]) => <section key={name}><h3>{name}</h3><pre>{value}</pre></section>)}</details>)}
   <p><button disabled={runPage === 1} onClick={() => setRunPage(v => v - 1)}>Previous runs</button> Page {runPage} <button disabled={!moreRuns} onClick={() => setRunPage(v => v + 1)}>Older runs</button></p>
   {incident.analysis && <details><summary>Preserved legacy findings</summary><pre>{incident.analysis}</pre><pre>{incident.investigation}</pre><pre>{incident.actions}</pre></details>}
   <h2>Findings review history</h2>{workflow.reviews.map(review => <details key={review.id}><summary>{review.decision} · {review.runId}</summary>{review.evidence?.map((item, index) => <p key={index}><a href={item.reference} target="_blank" rel="noreferrer">{item.source}</a> · {item.observation}</p>)}</details>)}
   <h2>Engineering decision</h2>
   <label>Decision notes<textarea aria-label="Decision notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={4000} /></label>
   {!['resolved', 'investigate'].includes(stage || '') && <button disabled={busy || !notes || !canWrite} onClick={() => void act('reinvestigate')}>Request targeted reinvestigation</button>}
   {['review', 'plan'].includes(stage || '') && <>
    <p>{accepted ? `Accepted findings: ${accepted.runId}` : 'Findings require a human decision. Confidence is not proof.'}</p>
    <label>Completed investigation<select aria-label="Completed investigation" value={runId} onChange={e => setRunId(e.target.value)}><option value="">Select current completed run</option>{runs.filter(r => r.status === 'completed' && (!workflow.lastRunId || r.runId === workflow.lastRunId)).map(r => <option key={r.runId}>{r.runId}</option>)}</select></label>
    <label>Evidence URL<input type="url" aria-label="Evidence URL" value={reference} onChange={e => setReference(e.target.value)} /></label><label>Evidence observation<textarea aria-label="Evidence observation" value={observation} onChange={e => setObservation(e.target.value)} /></label>
    <button disabled={busy || !canWrite || !notes || !runId || !reference || !observation} onClick={() => void act('review', { runId, decision: 'accepted', evidence })}>Accept findings</button>
    <button disabled={busy || !canWrite || !notes || !runId || !reference || !observation} onClick={() => void act('review', { runId, decision: 'rejected', evidence })}>Reject findings</button>
   </>}
   {accepted && ['review', 'plan'].includes(stage || '') && <form aria-label="Create remediation proposal" onSubmit={e => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>; void execute(async () => { await createProposal('', { incidentId, runId: accepted.runId, title: data.title, action: data.action, rationale: data.rationale, validationPlan: data.validationPlan, target: data.target, owner: data.owner, risk: data.risk }, proposalKey); setProposalKey(crypto.randomUUID()) }) }}>
    <h2>Plan remediation</h2>{['title', 'action', 'rationale', 'validationPlan', 'target', 'owner'].map(field => <label key={field}>Proposal {field}<input name={field} required /></label>)}<label>Proposal risk<select name="risk"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><button disabled={busy || !canWrite}>Create proposal</button>
   </form>}
   <h2>Remediation proposals</h2>{proposals.length === 0 && <p>No proposals for this incident.</p>}
   {proposals.map(p => <section key={p._id}><h3>{p.title}</h3><p>{p.owner || 'Unassigned'} · {p.approvalStatus} · Remote execution disabled</p><details><summary>Action and validation</summary><pre>{p.action}</pre><p>{p.rationale}</p><p>{p.validationPlan}</p></details>
    {p.approvalStatus !== 'approved' && <form onSubmit={e => { e.preventDefault(); const fields = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>; void execute(() => editProposal(p, fields)) }}>{(['title', 'owner', 'action', 'rationale', 'validationPlan', 'target'] as const).map(field => <label key={field}>Edit proposal {field}<input name={field} defaultValue={p[field]} required /></label>)}<button disabled={busy || !canWrite}>Save draft changes</button></form>}
    {p.approvalStatus === 'pending' && canApprove && <><button disabled={busy || !notes || !accepted || p.reviewId !== accepted.id} onClick={() => void execute(() => reviewProposal('', p, 'approved', notes))}>Approve proposal</button><button disabled={busy || !notes} onClick={() => void execute(() => reviewProposal('', p, 'rejected', notes))}>Reject proposal</button></>}
    {p.approvalStatus === 'approved' && p.reviewId === accepted?.id && ['plan', 'remediate'].includes(stage || '') && <button disabled={busy || !notes || !canWrite} onClick={() => { setProposalId(p._id); void act('start-remediation', { proposalId: p._id }) }}>Begin manual remediation</button>}
   </section>)}
   <p><button disabled={proposalPage === 1} onClick={() => setProposalPage(v => v - 1)}>Previous proposals</button> Page {proposalPage} <button disabled={!moreProposals} onClick={() => setProposalPage(v => v + 1)}>Older proposals</button></p>
   {stage === 'remediate' && <><h2>Record externally performed change</h2><label>Approved proposal<select aria-label="Approved proposal" value={proposalId} onChange={e => setProposalId(e.target.value)}><option value="">Select approved proposal</option>{proposals.filter(p => p.approvalStatus === 'approved' && p.reviewId === accepted?.id).map(p => <option value={p._id} key={p._id}>{p.title}</option>)}</select></label><label>Change reference URL<input type="url" aria-label="Change reference URL" value={reference} onChange={e => setReference(e.target.value)} /></label><label>Performed by<input aria-label="Performed by" value={performedBy} onChange={e => setPerformedBy(e.target.value)} /></label><label>Performed at<input type="datetime-local" aria-label="Performed at" value={performedAt} onChange={e => setPerformedAt(e.target.value)} /></label><button disabled={busy || !canWrite || !notes || !proposalId || !reference || !performedBy || !performedAt} onClick={() => void act('record-change', { proposalId, reference, performedBy, performedAt: new Date(performedAt).toISOString() })}>Record manual change</button></>}
   {stage === 'verify' && <><h2>Verify the original problem</h2><p>Manual observations are human-recorded evidence, not automatically measured Azure recovery.</p><label>Verification criteria<textarea aria-label="Verification criteria" value={criteria} onChange={e => setCriteria(e.target.value)} /></label><label>Verification evidence URL<input type="url" aria-label="Verification evidence URL" value={reference} onChange={e => setReference(e.target.value)} /></label><label>Verification observation<textarea aria-label="Verification observation" value={observation} onChange={e => setObservation(e.target.value)} /></label>{['passed', 'failed', 'inconclusive'].map(result => <button key={result} disabled={busy || !canWrite || !notes || !criteria || !reference || !observation} onClick={() => void act('verify', { result, criteria, evidence })}>Record {result}</button>)}<button disabled={busy || !canWrite || !notes} onClick={() => void act('return-remediation')}>Return to remediation</button><label>Outstanding risks<textarea aria-label="Outstanding risks" value={risks} onChange={e => setRisks(e.target.value)} /></label><button disabled={busy || !canWrite || !notes || !risks || workflow.verifications.at(-1)?.result !== 'passed'} onClick={() => void act('resolve', { outstandingRisks: risks })}>Confirm resolution</button></>}
   {stage === 'resolved' && <><button disabled={busy || !canWrite || !notes} onClick={() => void act('reopen')}>Reopen incident</button><label>Post-incident report<textarea aria-label="Post-incident report" value={report} onChange={e => setReport(e.target.value)} /></label><button disabled={busy || !canWrite || !notes || !report} onClick={() => void act('draft-report', { content: report })}>Save report draft</button>{workflow.reports?.at(-1)?.status === 'draft' && <><pre>{workflow.reports.at(-1)?.content}</pre><button disabled={busy || !canApprove || !notes} onClick={() => void act('approve-report')}>Approve latest report</button></>}{workflow.reports?.at(-1)?.status === 'approved' && <button disabled={busy || !canWrite} onClick={() => void execute(async () => { const value = await indexIncidentReport('', incidentId); setIndexed(value.documentId) })}>Index approved report</button>}{indexed && <p>Indexed knowledge document {indexed}</p>}</>}
   <h2>Manual change history</h2>{workflow.changes.map(change => <p key={change.id}>{change.notes} · {change.performedBy} · {change.performedAt && new Date(change.performedAt).toLocaleString()} {change.reference && <a href={change.reference} target="_blank" rel="noreferrer">Change reference</a>}</p>)}
   <h2>Verification history</h2>{workflow.verifications.map(v => <details key={v.id}><summary>{v.result} · {v.criteria}</summary>{v.evidence?.map((item, index) => <p key={index}><a href={item.reference} target="_blank" rel="noreferrer">{item.source}</a> · {item.observation}</p>)}</details>)}
   <h2>Audit timeline</h2><ol>{[...workflow.audit].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map(v => <li key={v.id}>{v.action} · {v.actor} · {new Date(v.at).toLocaleString()}<p>{v.notes}</p></li>)}</ol>
  </>}
 </main>
}
