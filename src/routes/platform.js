const express = require('express');

const router = express.Router();
const AGENT_RUNTIME_URL =
    process.env.AGENT_RUNTIME_URL || 'http://127.0.0.1:8000';

router.get('/', async (_req, res) => {
    try {
        const response = await fetch(`${AGENT_RUNTIME_URL}/platform`);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Agent runtime platform check failed:', error);
        res.status(502).json({
            success: false,
            error: 'Agent runtime unavailable',
        });
    }
});

module.exports = router;
