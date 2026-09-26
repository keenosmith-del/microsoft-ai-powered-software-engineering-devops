require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

const PORT = process.env.PORT || 5050;
const AGENT_RUNTIME_URL =
    process.env.AGENT_RUNTIME_URL || 'http://127.0.0.1:8000';

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ai-engineering-operations',
        environment: process.env.NODE_ENV || 'development',
    });
});

app.post('/api/analyse', async (req, res) => {
    try {
        const { problem } = req.body;

        if (!problem || typeof problem !== 'string') {
            return res.status(400).json({
                error: 'problem is required and must be a string',
            });
        }

        const response = await fetch(`${AGENT_RUNTIME_URL}/analyse`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                problem,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(
                'Agent runtime returned an error:',
                response.status,
                data
            );

            return res.status(502).json({
                success: false,
                error: 'Agent runtime request failed',
                detail: data.detail || data.error || 'Unknown runtime error',
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Agent runtime request failed:', error);

        res.status(502).json({
            success: false,
            error: 'Agent runtime unavailable',
        });
    }
});

app.listen(PORT, () => {
    console.log(`AI Engineering Operations API running on port ${PORT}`);
});