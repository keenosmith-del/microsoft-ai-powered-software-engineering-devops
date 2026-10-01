const express = require('express');
const router = express.Router();
const service = require('../services/signals');
router.post('/github', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res, next) => {
 try {
  service.verifySignature(req.body, req.get('X-Hub-Signature-256'), process.env.GITHUB_WEBHOOK_SECRET);
  let value; try { value = JSON.parse(req.body.toString('utf8')); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
  res.status(202).json(await service.ingest(service.normalizeGitHub(value, req.get('X-GitHub-Event'), req.get('X-GitHub-Delivery'))));
 } catch (e) { next(e); }
});
router.post('/azure', express.json({ limit: '64kb' }), async (req, res, next) => {
 try {
  const secret = process.env.AZURE_ALERT_RELAY_TOKEN;
  if (!secret || secret.length < 32) throw Object.assign(new Error('Authenticated alert relay not configured'), { status: 503 });
  if (!require('../middleware/authorization').equal(req.get('Authorization'), `Bearer ${secret}`)) throw Object.assign(new Error('Invalid alert relay authentication'), { status: 401 });
  res.status(202).json(await service.ingest(service.normalizeAzure(req.body)));
 } catch (e) { next(e); }
});
router.use(express.json({ limit: '32kb' }), require('../middleware/authorization'), require('../middleware/operationsLimit'));
router.get('/', async (req, res, next) => {
 try {
  const page = Number(req.query.page || 1); if (!Number.isInteger(page) || page < 1 || page > 100) throw Object.assign(new Error('Invalid page'), { status: 400 });
  const rows = await require('../models/EngineeringSignal').find().sort({ observedAt: -1 }).skip((page - 1) * 20).limit(21).lean(); res.json({ items: rows.slice(0, 20), hasNext: rows.length > 20, page });
 } catch (e) { next(e); }
});
router.post('/github/poll', async (req, res, next) => { try { res.json(await require('../services/signalPolling').createSignalPolling().poll()); } catch (e) { next(e); } });
router.post('/github/runs/:id', async (req, res, next) => {
 try {
  if (!/^\d{1,20}$/.test(req.params.id)) throw Object.assign(new Error('Invalid run ID'), { status: 400 });
  const run = await require('../services/githubIntelligence').createGitHubIntelligence().run(req.params.id);
  const value = service.normalizeGitHub({ repository: { full_name: `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPOSITORY}` }, action: 'completed', workflow_run: run }, 'workflow_run', `read-run-${req.params.id}`);
  if (!value) throw Object.assign(new Error('Run has no supported completed failure'), { status: 409 });
  res.status(201).json(await service.ingest(value));
 } catch (e) { next(e); }
});
router.post('/:id/incident', async (req, res, next) => { try { res.json(await service.associate(req.params.id, req.body, req.actor)); } catch (e) { next(e); } });
module.exports = router;
