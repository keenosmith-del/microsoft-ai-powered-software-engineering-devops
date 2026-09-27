const express = require('express');

const router = express.Router();

const AGENT_RUNTIME_URL =
    process.env.AGENT_RUNTIME_URL || 'http://127.0.0.1:8000';

router.get('/', async (req, res) => {
    try {
        const response = await fetch(
            `${AGENT_RUNTIME_URL}/repository`
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                'Agent runtime repository request failed:',
                response.status,
                data
            );

            return res.status(502).json({
                success: false,
                error: 'Repository request failed',
                detail:
                    data.detail ||
                    data.error ||
                    'Unknown runtime error',
            });
        }

        res.json(data);
    } catch (error) {
        console.error(
            'Failed to retrieve repository data:',
            error
        );

        res.status(502).json({
            success: false,
            error: 'Agent runtime unavailable',
        });
    }
});

module.exports = router;