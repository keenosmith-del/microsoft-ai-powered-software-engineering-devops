const express = require('express');
const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const lifecycle = require('../services/incidentLifecycle');
const router = express.Router();
router.get('/', async (_req, res, next) => {
 try { const rows = await Incident.find().sort({ createdAt: -1 }).limit(500).lean(); res.json(await Promise.all(rows.map(row => lifecycle.read(row._id)))); }
 catch (e) { next(e); }
});
router.param('id', (req, res, next, id) => { if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ error: 'Invalid incident ID' }); next(); });
router.get('/:id', async (req, res, next) => { try { res.json(await lifecycle.read(req.params.id)); } catch (e) { next(e); } });
router.post('/', async (req, res, next) => {
 try { const incident = await lifecycle.create(req.body, req.actor || 'explicit-local-development', req.get('Idempotency-Key')); res.status(incident.submissionStatus === 'pending' ? 202 : 201).json(incident); }
 catch (e) { next(e); }
});
router.post('/:id/retry', async (req, res, next) => {
 try { await lifecycle.submit(req.params.id, req.actor || 'explicit-local-development', req.get('Idempotency-Key'), req.body.notes || 'Human retry requested'); res.status(202).json(await lifecycle.read(req.params.id)); }
 catch (e) { next(e); }
});
router.patch('/:id/status', async (req, res, next) => {
 try {
  if (req.body.status === 'Open') {
   const current = await lifecycle.read(req.params.id);
   if (current.status !== 'Resolved') lifecycle.fail('Only reopening is supported through the compatibility status route');
   await lifecycle.change(req.params.id, req.body.version, { action: 'reopen', notes: req.body.notes }, req.actor || 'explicit-local-development');
   return res.json(await lifecycle.read(req.params.id));
  }
  lifecycle.fail('Status-only mutation is disabled; use reviewed workflow decisions with evidence and current version');
 } catch (e) { next(e); }
});
module.exports = router;
