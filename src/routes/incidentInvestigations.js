const express = require('express');
const mongoose = require('mongoose');
const Run = require('../models/InvestigationRun');
const authorize = require('../middleware/authorization');
const investigations = require('./investigations');
const router = express.Router({ mergeParams: true });
router.use(authorize, require('../middleware/operationsLimit'));
router.post('/', investigations.submit);
router.get('/', async (req, res, next) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid incident ID' });
        const rows = await Run.find({ incidentId: req.params.id }).sort({ createdAt: -1 }).limit(21).select('-leaseOwner -leaseUntil -idempotencyKey -__v').lean();
        res.json({ items: rows.slice(0, 20), hasNext: rows.length > 20 });
    } catch (error) { next(error); }
});
module.exports = router;
