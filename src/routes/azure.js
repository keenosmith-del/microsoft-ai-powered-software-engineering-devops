const express = require('express');
const { createAzureDiagnostics } = require('../services/azureDiagnostics');
const router = express.Router();
const azure = createAzureDiagnostics();
for (const field of ['inventory', 'groups', 'activity']) router.get(`/${field}`, async (req, res) => {
    try { res.json(await azure[field](req.query.group, req.query.hours)); }
    catch (error) { res.status(error.status || 502).json({ success: false, error: error.message, code: error.code || 'AZURE_DIAGNOSTICS_ERROR' }); }
});
const measurements = require('../services/azureMeasurements').createAzureMeasurements();
router.get('/metric-definitions', require('../middleware/authorization'), async (req, res, next) => { try { res.json(await measurements.definitions(req.query.resourceId)); } catch (e) { next(e); } });
for (const method of ['metrics', 'query']) router.post(`/${method}`, require('../middleware/authorization'), require('../middleware/operationsLimit'), async (req, res, next) => { try { res.json(await measurements[method](req.body)); } catch (e) { next(e); } });
module.exports = router;
