const express = require('express'); const mongoose = require('mongoose');
const router = express.Router(); router.use(require('../middleware/authorization'), require('../middleware/operationsLimit'));
router.get('/incidents/:id', async (req, res, next) => {
 try {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) throw Object.assign(new Error('Invalid incident ID'), { status: 400 });
  await require('../services/incidentLifecycle').read(req.params.id);
  if (req.query.runId && !/^[\w-]{1,100}$/.test(req.query.runId)) throw Object.assign(new Error('Invalid run ID'), { status: 400 });
  const items = await require('../models/EngineeringEvidence').find({ incidentId: req.params.id, ...(req.query.runId ? { runId: req.query.runId } : {}) }).sort({ retrievedAt: -1 }).limit(100).lean(); res.json({ items, truncated: items.length === 100 });
 } catch (e) { next(e); }
}); module.exports = router;
