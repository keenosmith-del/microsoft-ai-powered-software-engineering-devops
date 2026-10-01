const express = require('express'); const mongoose = require('mongoose');
const Model = require('../models/MeasuredVerification');
const router = express.Router(); router.use(require('../middleware/authorization'), require('../middleware/operationsLimit'));
router.param('id', (req, res, next, id) => { if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ error: 'Invalid incident ID' }); next(); });
router.get('/incidents/:id', async (req, res, next) => { try { await require('../services/incidentLifecycle').read(req.params.id); res.json({ items: await Model.find({ incidentId: req.params.id }).sort({ evaluatedAt: -1 }).limit(100).lean() }); } catch (e) { next(e); } });
router.post('/incidents/:id', async (req, res, next) => {
 try {
  const { resourceId, metric, aggregation, baselineWindow, comparisonWindow, rule } = req.body;
  const { workflow } = await require('../services/incidentLifecycle').read(req.params.id);
  const change = workflow.changes.at(-1);
  if (workflow.stage !== 'verify' || !change) throw Object.assign(new Error('Record an approved actual change before measured verification'), { status: 409 });
  const { windowBounds, createAzureMeasurements } = require('../services/azureMeasurements');
  const a = windowBounds(baselineWindow?.start, baselineWindow?.end), b = windowBounds(comparisonWindow?.start, comparisonWindow?.end);
  require('../services/measuredVerification').evaluate({}, {}, rule); // validate rule before provider calls
  if (Date.parse(a.end) > Date.parse(change.performedAt) || Date.parse(b.start) < Date.parse(change.performedAt)) throw Object.assign(new Error('Windows must bracket the recorded change'), { status: 400 });
  const adapter = req.app.locals.azureMeasurements || createAzureMeasurements();
  const collect = async window => { try { return await adapter.metrics({ resourceId, metric, aggregation, ...window }); } catch (e) { if (e.status === 400 || e.code === 'INVALID_SCOPE' || e.code === 'UNSUPPORTED_METRIC') throw e; return { provider: 'azure-monitor', resourceId, metric, aggregation, window, status: e.code || 'query-failed', missingData: true, observations: [] }; } };
  const baseline = await collect(a), comparison = await collect(b);
  const evaluation = require('../services/measuredVerification').evaluate(baseline, comparison, rule);
  const current = await require('../services/incidentLifecycle').read(req.params.id);
  if (current.workflow.stage !== 'verify' || current.workflow.changes.at(-1)?.id !== change.id) throw Object.assign(new Error('Change changed during measurement; refresh'), { status: 409 });
  res.status(201).json(await Model.create({ incidentId: req.params.id, changeId: change.id, proposalId: change.proposalId, requestedBy: req.actor, criteria: rule, baseline, comparison, evaluation }));
 } catch (e) { next(e); }
}); module.exports = router;
