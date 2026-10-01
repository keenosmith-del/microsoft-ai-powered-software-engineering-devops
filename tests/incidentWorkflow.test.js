const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transition, initialWorkflow } = require('../src/services/incidentWorkflow');
const evidence = [{ source: 'manual', reference: 'https://example.test/evidence', observation: 'Observed recovery against the incident criteria' }];
const context = { actor: 'test-engineer', completedRun: { runId: 'run-1' }, approvedProposal: { _id: 'proposal-1', runId: 'run-1' }, at: new Date('2026-10-01T10:00:00Z') };
function step(workflow, action, fields = {}, ctx = context) { return transition(workflow, { action, notes: 'Test human decision', ...fields }, ctx); }
test('complete human workflow preserves evidence and requires deliberate resolution', () => {
 let w = initialWorkflow();
 w = step(w, 'review', { decision: 'accepted', runId: 'run-1', evidence });
 assert.equal(w.stage, 'plan');
 w = step(w, 'record-change', { proposalId: 'proposal-1', reference: 'https://example.test/change' });
 assert.equal(w.stage, 'verify');
 w = step(w, 'verify', { result: 'passed', criteria: 'Original failure no longer occurs', evidence });
 assert.equal(w.stage, 'verify');
 w = step(w, 'resolve', { outstandingRisks: 'Monitor for recurrence' });
 assert.equal(w.stage, 'resolved'); assert.equal(w.resolutions.length, 1);
 w = step(w, 'reopen');
 assert.equal(w.stage, 'detect'); assert.equal(w.verifications.length, 1); assert.equal(w.resolutions.length, 1);
 assert.throws(() => step(w, 'resolve'), /stage/);
 assert.equal(w.audit.length, 5); assert.equal(w.version, 5);
});
test('rejected findings cannot progress to remediation; reviews need source evidence', () => {
 const w = step(initialWorkflow(), 'review', { decision: 'rejected', runId: 'run-1', evidence });
 assert.equal(w.stage, 'investigate');
 assert.throws(() => step(w, 'record-change', { proposalId: 'proposal-1', reference: 'https://example.test/change' }), /stage/);
 assert.throws(() => step(initialWorkflow(), 'review', { decision: 'accepted', runId: 'run-1', evidence: [] }), /evidence/);
});
test('failed and inconclusive verification cannot resolve; reinvestigation preserves history', () => {
 let w = step(initialWorkflow(), 'review', { decision: 'accepted', runId: 'run-1', evidence });
 w = step(w, 'record-change', { proposalId: 'proposal-1', reference: 'https://example.test/change' });
 const failed = step(w, 'verify', { result: 'failed', criteria: 'Recovery', evidence });
 assert.equal(failed.stage, 'remediate'); assert.throws(() => step(failed, 'resolve'), /stage/);
 const inconclusive = step(w, 'verify', { result: 'inconclusive', criteria: 'Recovery', evidence });
 assert.throws(() => step(inconclusive, 'resolve'), /passed verification/);
 assert.equal(step(inconclusive, 'reinvestigate').verifications.length, 1);
});
test('unapproved or unrelated changes and unsafe evidence are rejected', () => {
 const w = step(initialWorkflow(), 'review', { decision: 'accepted', runId: 'run-1', evidence });
 assert.throws(() => step(w, 'record-change', { proposalId: 'proposal-1', reference: 'https://example.test/change' }, { ...context, approvedProposal: null }), /approved proposal/);
 assert.throws(() => step(w, 'review', { decision: 'accepted', runId: 'run-1', evidence: [{ source: 'manual', reference: 'javascript:alert(1)', observation: 'x' }] }), /reference/);
 assert.throws(() => step(w, 'unknown'), /action/);
 assert.equal(w.version, 1);
});
test('reports require resolution and human approval; reopening retains approved reports', () => {
 let w = initialWorkflow();
 assert.throws(() => step(w, 'draft-report', { content: 'Report' }), /stage/);
 w = step(w, 'review', { decision: 'accepted', runId: 'run-1', evidence });
 w = step(w, 'record-change', { proposalId: 'proposal-1', reference: 'https://example.test/change' });
 w = step(w, 'verify', { result: 'passed', criteria: 'Recovery', evidence });
 w = step(w, 'resolve', { outstandingRisks: 'Monitor' });
 assert.throws(() => step(w, 'approve-report'), /draft report/);
 w = step(w, 'draft-report', { content: '# Lessons\nEvidence-backed test fixture report.' });
 w = step(w, 'approve-report');
 assert.equal(w.reports[0].approvedBy, context.actor);
 assert.throws(() => step(w, 'approve-report'), /draft report/);
 w = step(w, 'reopen'); assert.equal(w.reports[0].status, 'approved');
});
