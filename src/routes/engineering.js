const express = require('express');
const { createEngineeringService } = require('../services/engineering');
const router = express.Router();
const overview = createEngineeringService();
for (const field of ['overview', 'health', 'signals', 'activity', 'metrics']) {
    router.get(`/${field}`, async (_req, res, next) => {
        try {
            const data = await overview();
            res.set('Cache-Control', 'no-store').json(field === 'overview' ? data : {
                checkedAt: data.checkedAt, cached: data.cached, dataError: data.dataError,
                [field]: data[field === 'health' ? 'services' : field],
            });
        } catch (error) { next(error); }
    });
}
module.exports = router;
