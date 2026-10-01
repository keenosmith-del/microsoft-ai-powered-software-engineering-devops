const express = require('express');
const lifecycle = require('../services/incidentLifecycle');
const router = express.Router();
// Compatibility entry now queues durable execution instead of running a second lifecycle.
router.post('/', async (req, res, next) => {
 try {
  const { problem, severity = 'Medium' } = req.body || {};
  if (typeof problem !== 'string') lifecycle.fail('problem is required', 400);
  const incident = await lifecycle.create({ title: problem.trim().slice(0, 80), description: problem, severity, investigate: true }, req.actor || 'explicit-local-development', req.get('Idempotency-Key'));
  res.status(202).json({ ...incident, incidentId: incident._id, success: true, execution: 'durable' });
 } catch (e) { next(e); }
});
module.exports = router;
