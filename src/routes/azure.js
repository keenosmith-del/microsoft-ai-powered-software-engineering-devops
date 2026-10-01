const express = require('express');
const { createAzureDiagnostics } = require('../services/azureDiagnostics');
const router = express.Router();
const azure = createAzureDiagnostics();
for (const field of ['inventory', 'groups', 'activity']) router.get(`/${field}`, async (req, res) => {
    try { res.json(await azure[field](req.query.group, req.query.hours)); }
    catch (error) { res.status(error.status || 502).json({ success: false, error: error.message, code: error.code || 'AZURE_DIAGNOSTICS_ERROR' }); }
});
module.exports = router;
