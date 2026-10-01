const express = require('express'); const mongoose = require('mongoose'); const { createHash, randomUUID } = require('node:crypto');
const Intent = require('../models/GitHubChangeIntent'); const Proposal = require('../models/RemediationProposal');
const { createGitHubChanges, policy } = require('../services/githubChanges');
const router = express.Router(); router.use(require('../middleware/authorization'), require('../middleware/operationsLimit'));
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };
async function approved(id) {
 if (!mongoose.isObjectIdOrHexString(id)) fail('Invalid proposal ID', 400);
 const proposal = await Proposal.findById(id).lean(); if (!proposal) fail('Proposal not found', 404);
 const { workflow } = await require('../services/incidentLifecycle').read(proposal.incidentId);
 const review = workflow.reviews.find(v => v.id === workflow.currentReviewId);
 if (proposal.approvalStatus !== 'approved' || review?.decision !== 'accepted' || proposal.reviewId !== review.id || String(workflow.currentProposalId) !== String(proposal._id) || !['plan', 'remediate'].includes(workflow.stage)) fail('Current accepted review and approved linked proposal required');
 return proposal;
}
router.get('/proposals/:id', async (req, res, next) => { try { if (!mongoose.isObjectIdOrHexString(req.params.id)) fail('Invalid proposal ID', 400); res.json({ enabled: process.env.GITHUB_WRITE_ENABLED === 'true', items: await Intent.find({ proposalId: req.params.id }).select('-changes -key -leaseUntil').sort({ createdAt: -1 }).limit(20).lean() }); } catch (e) { next(e); } });
router.post('/proposals/:id/prepare', async (req, res, next) => {
 try {
  const p = await approved(req.params.id); const key = req.get('Idempotency-Key'); if (!/^[\w-]{8,100}$/.test(key || '')) fail('Supply Idempotency-Key', 400);
  const identity = createHash('sha256').update(`${req.actor}:${p._id}:${key}`).digest('hex');
  const existing = await Intent.findOne({ key: identity });
  if (existing) { if (existing.baseBranch !== req.body.baseBranch || JSON.stringify(existing.changes.map(c => ({ path: c.path, content: c.content }))) !== JSON.stringify(req.body.changes)) fail('Key reused with different changes'); return res.json(existing); }
  const preview = await createGitHubChanges().preview(req.body);
  res.status(201).json(await Intent.create({ ...preview, proposalId: p._id, incidentId: p.incidentId, proposalVersion: p.version, reviewId: p.reviewId, actor: req.actor, key: identity, baseBranch: req.body.baseBranch, branch: `codex/remediation-${randomUUID()}`, audit: [{ actor: req.actor, action: 'prepared', at: new Date() }] }));
 } catch (e) { next(e); }
});
router.get('/:id/status', async (req, res, next) => {
 try {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) fail('Invalid intent ID', 400);
  const intent = await Intent.findById(req.params.id).lean(); if (!intent) fail('Intent not found', 404);
  if (!intent.prNumber) fail('No actual PR has been recorded');
  if (intent.repository !== `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPOSITORY}`) fail('Historical PR repository differs from configured read scope');
  const github = require('../services/githubIntelligence').createGitHubIntelligence();
  const values = await Promise.allSettled([github.pullDetails(intent.prNumber), github.checks(intent.commitSha, 1)]);
  res.json({ url: intent.prUrl, retrievedAt: new Date(), pull: values[0].status === 'fulfilled' ? values[0].value : { status: 'unavailable' }, checks: values[1].status === 'fulfilled' ? values[1].value : { status: 'unavailable' } });
 } catch (e) { next(e); }
});
router.post('/:id/confirm', async (req, res, next) => {
 let intent, ownedLease;
 try {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) fail('Invalid intent ID', 400);
  intent = await Intent.findById(req.params.id); if (!intent) fail('Intent not found', 404);
  if (intent.actor !== req.actor || req.body.confirm !== true || req.body.hash !== intent.hash) fail('Explicit confirmation of the prepared diff by its engineer is required', 403);
  const repository = policy({ baseBranch: intent.baseBranch, changes: intent.changes.map(c => ({ path: c.path, content: c.content })) });
  if (repository !== intent.repository) fail('Configured repository changed; prepare a new intent');
  const p = await approved(intent.proposalId); if (p.version !== intent.proposalVersion || p.reviewId !== intent.reviewId) fail('Approval changed; prepare a new intent');
  if (intent.prUrl) return res.json({ url: intent.prUrl, number: intent.prNumber, state: intent.state });
  const lease = new Date(Date.now() + 120000);
  const claimed = await Intent.updateOne({ _id: intent._id, $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lt: new Date() } }] }, { $set: { leaseUntil: lease }, $push: { audit: { actor: req.actor, action: 'confirmed', at: new Date() } } });
  if (!claimed.matchedCount) fail('Write already in progress; inspect status before retry');
  ownedLease = lease;
  const adapter = createGitHubChanges();
  const write = async (path, body) => {
   if (Date.now() + 15000 >= ownedLease.getTime() || !await Intent.exists({ _id: intent._id, leaseUntil: ownedLease })) fail('Write claim expired; inspect status and retry');
   const current = await approved(intent.proposalId);
   if (current.version !== intent.proposalVersion || current.reviewId !== intent.reviewId) fail('Approval changed');
   if (Date.now() + 15000 >= ownedLease.getTime()) fail('Write claim expired; inspect status and retry');
   return adapter.request(path, body);
  };
  const baseRef = await adapter.request(`/git/ref/heads/${encodeURIComponent(intent.baseBranch)}`);
  if (baseRef.object.sha !== intent.baseSha) fail('Base branch changed; prepare and review a new diff');
  // Git tree/commit creation is content-addressed, so lost replies can safely retry.
  if (!intent.treeSha) { const commit = await adapter.request(`/git/commits/${intent.baseSha}`); const tree = await write('/git/trees', { base_tree: commit.tree.sha, tree: intent.changes.map(c => ({ path: c.path, mode: '100644', type: 'blob', content: c.content })) }); intent.treeSha = tree.sha; await intent.save(); }
  if (!intent.commitSha) { const commit = await write('/git/commits', { message: `Reviewed remediation ${intent.proposalId}`, tree: intent.treeSha, parents: [intent.baseSha] }); intent.commitSha = commit.sha; await intent.save(); }
  // Reconcile lost branch-create response by reading the dedicated branch.
  await approved(intent.proposalId);
  let branch; try { branch = await adapter.request(`/git/ref/heads/${encodeURIComponent(intent.branch)}`); } catch { branch = await write('/git/refs', { ref: `refs/heads/${intent.branch}`, sha: intent.commitSha }); }
  if (branch.object.sha !== intent.commitSha) fail('Dedicated branch changed externally; manual review required');
  await approved(intent.proposalId);
  const pulls = await adapter.request(`/pulls?state=all&head=${encodeURIComponent(`${process.env.GITHUB_OWNER}:${intent.branch}`)}`);
  let pr = pulls.find(v => v.head?.ref === intent.branch);
  if (!pr) pr = await write('/pulls', { title: `Reviewed remediation: ${p.title}`, body: `Human-reviewed proposal ${p._id}; incident ${intent.incidentId}. Validate: ${p.validationPlan}`, head: intent.branch, base: intent.baseBranch, draft: true });
  intent.prUrl = pr.html_url; intent.prNumber = pr.number; intent.state = 'draft-pr-created'; intent.audit.push({ actor: req.actor, action: 'draft-pr-created', at: new Date() }); await intent.save();
  res.json({ url: intent.prUrl, number: intent.prNumber, state: intent.state });
 } catch (e) { next(e); }
 finally { if (intent?._id && ownedLease) await Intent.updateOne({ _id: intent._id, leaseUntil: ownedLease }, { $unset: { leaseUntil: 1 } }).catch(() => {}); }
}); module.exports = router;
