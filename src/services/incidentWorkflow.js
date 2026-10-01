const { randomUUID } = require('node:crypto');
const { redact } = require('./redaction');
function initialWorkflow() { return { stage: 'detect', version: 0, reviews: [], changes: [], verifications: [], resolutions: [], reports: [], audit: [] }; }
function invalid(message) { throw Object.assign(new Error(message), { status: 409 }); }
function text(value, name, max = 4000) {
 if (typeof value !== 'string' || !value.trim() || value.length > max) invalid(`Supply ${name} (1–${max} characters)`);
 return redact(value.trim());
}
function reference(value) {
 const raw = text(value, 'source reference', 2000);
 let url; try { url = new URL(raw); } catch { invalid('Evidence reference must be an HTTP(S) URL'); }
 if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || [...url.searchParams.keys()].some(key => /^(sig|token|key|code|password|secret)$/i.test(key))) invalid('Unsafe evidence reference');
 return raw;
}
function evidence(items) {
 if (!Array.isArray(items) || !items.length || items.length > 20) invalid('Supply 1–20 evidence observations');
 return items.map(item => {
  if (!item || typeof item !== 'object' || Object.keys(item).some(key => !['source', 'reference', 'observation'].includes(key))) invalid('Invalid evidence observation');
  return ({ source: text(item.source, 'evidence source', 100), reference: reference(item.reference), observation: text(item.observation, 'observation') });
 });
}
function transition(existing, body, { actor, at = new Date(), completedRun, approvedProposal } = {}) {
 const w = structuredClone(existing || initialWorkflow());
 if (!actor) invalid('Authenticated actor required');
 const notes = text(body.notes, 'decision notes');
 const entry = { id: randomUUID(), actor, at, notes };
 const allowed = stages => { if (!stages.includes(w.stage)) invalid(`Action is not valid in stage ${w.stage}`); };
 switch (body.action) {
  case 'review': {
   allowed(['detect', 'investigate', 'review', 'plan']);
   if (!completedRun || completedRun.runId !== body.runId) invalid('Review requires a completed investigation belonging to this incident');
   if (!['accepted', 'rejected'].includes(body.decision)) invalid('Review decision must be accepted or rejected');
   w.reviews.push({ ...entry, runId: body.runId, decision: body.decision, evidence: evidence(body.evidence) });
   w.stage = body.decision === 'accepted' ? 'plan' : 'investigate'; break;
  }
  case 'record-change': {
   allowed(['plan', 'remediate']);
   const accepted = w.reviews.at(-1);
   if (!approvedProposal || String(approvedProposal._id) !== body.proposalId || accepted?.decision !== 'accepted' || approvedProposal.runId !== accepted.runId) invalid('Change requires an approved proposal linked to accepted findings');
   w.changes.push({ ...entry, proposalId: body.proposalId, reference: reference(body.reference), runId: accepted.runId });
   w.stage = 'verify'; break;
  }
  case 'verify': {
   allowed(['verify']);
   if (!['passed', 'failed', 'inconclusive'].includes(body.result)) invalid('Verification result must be passed, failed or inconclusive');
   const change = w.changes.at(-1); if (!change) invalid('Verification requires a recorded change');
   w.verifications.push({ ...entry, changeId: change.id, criteria: text(body.criteria, 'verification criteria'), result: body.result, evidence: evidence(body.evidence), source: 'human-recorded' });
   w.stage = body.result === 'failed' ? 'remediate' : 'verify'; break;
  }
  case 'resolve': {
   allowed(['verify']);
   const verification = w.verifications.at(-1);
   if (verification?.result !== 'passed' || verification.changeId !== w.changes.at(-1)?.id) invalid('Resolution requires passed verification for the current change');
   w.resolutions.push({ ...entry, verificationId: verification.id, outstandingRisks: text(body.outstandingRisks, 'outstanding risks') });
   w.stage = 'resolved'; break;
  }
  case 'draft-report': {
   allowed(['resolved']);
   w.reports ||= [];
   w.reports.push({ ...entry, content: text(body.content, 'post-incident report', 50000), status: 'draft' });
   break;
  }
  case 'approve-report': {
   allowed(['resolved']);
   const report = w.reports?.at(-1);
   if (!report || report.status !== 'draft') invalid('Approval requires a draft report');
   report.status = 'approved'; report.approvedBy = actor; report.approvedAt = at;
   break;
  }
  case 'reopen': allowed(['resolved']); w.stage = 'detect'; break;
  case 'reinvestigate':
   allowed(['detect', 'investigate', 'review', 'plan', 'remediate', 'verify']);
   if (w.pendingInvestigation) invalid('An investigation submission is already pending');
   w.stage = 'investigate';
   w.pendingInvestigation = { runId: randomUUID(), actor, at, notes };
   break;
  default: invalid('Unknown workflow action');
 }
 w.version += 1;
 w.audit.push({ ...entry, action: body.action, stage: w.stage, version: w.version });
 return w;
}
module.exports = { initialWorkflow, transition };
