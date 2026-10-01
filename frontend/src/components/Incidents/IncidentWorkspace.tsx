import { useEffect, useState } from 'react'
import { indexIncidentReport, setOperationsToken, getIncidentWorkflow, updateIncidentWorkflow, getInvestigationRuns, listProposals, type IncidentWorkflow, type InvestigationRun, type RemediationProposal } from '../../services/api'
export default function IncidentWorkspace({ incidentId }: { incidentId: string }) {
 const [token, setToken] = useState('')
 const [connected, setConnected] = useState('')
 const [workflow, setWorkflow] = useState<IncidentWorkflow | null>(null)
 const [runs, setRuns] = useState<InvestigationRun[]>([])
 const [proposals, setProposals] = useState<RemediationProposal[]>([])
 const [notes, setNotes] = useState('')
 const [reference, setReference] = useState('')
 const [observation, setObservation] = useState('')
 const [criteria, setCriteria] = useState('')
 const [risks, setRisks] = useState('')
 const [report, setReport] = useState('')
 const [indexed, setIndexed] = useState('')
 const [runId, setRunId] = useState('')
 const [proposalId, setProposalId] = useState('')
 const [error, setError] = useState('')
 const [busy, setBusy] = useState(false)
 const [revision, setRevision] = useState(0)
 useEffect(() => {
  if (!connected) return
  let active = true
  const load = async () => {
   try {
    const [w, r, p] = await Promise.all([getIncidentWorkflow(connected, incidentId), getInvestigationRuns(connected, 1, undefined, incidentId), listProposals(connected)])
    if (active) { setWorkflow(w); setRuns(r.items); setProposals(p.items.filter(item => item.incidentId === incidentId)); setError('') }
   } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Workspace unavailable') }
  }
  void load(); const timer = window.setInterval(() => void load(), 5000)
  return () => { active = false; window.clearInterval(timer) }
 }, [connected, incidentId, revision])
 const act = async (action: string, fields: Record<string, unknown> = {}) => {
  if (!workflow || busy) return
  setBusy(true)
  try { setWorkflow(await updateIncidentWorkflow(connected, incidentId, { version: workflow.version, action, notes, ...fields })); setError('') }
  catch (e) { setError(e instanceof Error ? e.message : 'Decision failed'); setRevision(value => value + 1) }
  finally { setBusy(false) }
 }
 const evidence = [{ source: 'manual', reference, observation }]
 return <section className="incident-workspace phase2-workspace" aria-label="Incident engineering workflow">
  <span className="eyebrow">HUMAN ENGINEERING WORKSPACE</span><h2>Evidence to resolution.</h2>
  <p>Incident {incidentId}. Decisions are persisted separately from legacy statuses. Verification here records human observations; automated telemetry checks are not available.</p>
  <form onSubmit={e => { e.preventDefault(); setOperationsToken(token); setConnected(token) }}><label>Operations token<input type="password" value={token} autoComplete="off" onChange={e => setToken(e.target.value)} required /></label><button>Connect workspace</button></form>
  {error && <p role="alert">{error}</p>}
  {workflow && connected && <>
   <p role="status">Current stage: {workflow.stage} · Revision {workflow.version}</p>
   <button disabled={busy || !notes || workflow.stage === 'resolved'} onClick={() => void act('reinvestigate')}>Request targeted reinvestigation</button>
   <p>Runs continue after navigation. Execution requires the configured worker and Foundry deployment.</p>
   {runs.map(run => <details key={run.runId}><summary>{run.runId} · {run.status}</summary>{run.error && <p>{run.error}</p>}{run.result && Object.entries(run.result).map(([stage, value]) => <div key={stage}><h3>{stage}</h3><pre>{value}</pre></div>)}</details>)}
   <form onSubmit={e => e.preventDefault()}>
    <label>Decision notes<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={4000} /></label>
    <label>Source evidence URL<input type="url" value={reference} onChange={e => setReference(e.target.value)} /></label>
    <label>Observed evidence<textarea value={observation} onChange={e => setObservation(e.target.value)} maxLength={4000} /></label>
    {['detect', 'investigate', 'review', 'plan'].includes(workflow.stage) && <><label>Completed investigation<select value={runId} onChange={e => setRunId(e.target.value)}><option value="">Select a completed run</option>{runs.filter(run => run.status === 'completed').map(run => <option key={run.runId}>{run.runId}</option>)}</select></label><button disabled={busy || !notes || !runId || !reference || !observation} onClick={() => void act('review', { runId, decision: 'accepted', evidence })}>Accept findings</button><button disabled={busy || !notes || !runId || !reference || !observation} onClick={() => void act('review', { runId, decision: 'rejected', evidence })}>Reject findings</button></>}
    {['plan', 'remediate'].includes(workflow.stage) && <><p>Create and approve a proposal in Actions before recording the external change.</p><label>Approved proposal<select value={proposalId} onChange={e => setProposalId(e.target.value)}><option value="">Select approved proposal</option>{proposals.filter(p => p.approvalStatus === 'approved').map(p => <option key={p._id} value={p._id}>{p.title}</option>)}</select></label><button disabled={busy || !proposalId || !notes || !reference} onClick={() => void act('record-change', { proposalId, reference })}>Record manual change</button></>}
    {workflow.stage === 'verify' && <><label>Verification criteria<textarea value={criteria} onChange={e => setCriteria(e.target.value)} /></label>{['passed', 'failed', 'inconclusive'].map(result => <button key={result} disabled={busy || !notes || !criteria || !reference || !observation} onClick={() => void act('verify', { result, criteria, evidence })}>Record {result}</button>)}<label>Outstanding risks (write “None identified” where appropriate)<textarea value={risks} onChange={e => setRisks(e.target.value)} /></label><button disabled={busy || !notes || !risks || workflow.verifications.at(-1)?.result !== 'passed'} onClick={() => void act('resolve', { outstandingRisks: risks })}>Confirm resolution</button></>}
    {workflow.stage === 'resolved' && <>
     <button disabled={busy || !notes} onClick={() => void act('reopen')}>Reopen incident</button>
     <label>Post-incident report<textarea value={report} onChange={e => setReport(e.target.value)} maxLength={50000} placeholder="Impact, findings and uncertainty, evidence, changes, verification, lessons and preventative actions" /></label>
     <button disabled={busy || !notes || !report} onClick={() => void act('draft-report', { content: report })}>Save report draft</button>
     {workflow.reports?.at(-1)?.status === 'draft' && <><pre>{workflow.reports.at(-1)?.content}</pre><button disabled={busy || !notes} onClick={() => void act('approve-report')}>Approve latest report</button></>}
     {workflow.reports?.at(-1)?.status === 'approved' && <button disabled={busy} onClick={async () => { setBusy(true); try { const result = await indexIncidentReport(connected, incidentId); setIndexed(result.documentId) } catch (e) { setError(e instanceof Error ? e.message : 'Indexing failed') } finally { setBusy(false) } }}>Index approved report in knowledge</button>}
     {indexed && <p role="status">Report indexed as {indexed}. Search its text in Knowledge.</p>}
    </>}
   </form>
   <h3>Decision history</h3>{workflow.audit.length === 0 ? <p>No recorded decisions.</p> : <ol>{workflow.audit.map(entry => <li key={entry.id}>{entry.action} · {entry.actor} · {new Date(entry.at).toLocaleString()}<p>{entry.notes}</p></li>)}</ol>}
  </>}
 </section>
}
