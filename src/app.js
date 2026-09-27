require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDatabase = require('./config/database');

const app = express();

const incidentRoutes = require('./routes/incidents');
const Incident = require('./models/Incident');

const repositoryRoutes = require('./routes/repository');

const PORT = process.env.PORT || 5050;
const AGENT_RUNTIME_URL =
    process.env.AGENT_RUNTIME_URL || 'http://127.0.0.1:8000';

app.use(cors());
app.use(express.json());

app.use('/api/incidents', incidentRoutes);
app.use('/api/repository', repositoryRoutes);

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

        const incident = await Incident.create({
            title: problem.length > 80
                ? `${problem.substring(0, 77)}...`
                : problem,
            description: problem,
            service: 'Engineering Operations API',
            severity: 'High',
            status: 'Investigating',
            analysis: data.analysis || '',
            investigation: data.investigation || '',
            actions: data.actions || '',
            rootCause: 'Pending investigation',
        });

        res.json({
            ...data,
            incidentId: incident._id,
        });
    } catch (error) {
        console.error('Analysis or incident persistence failed:', error);

        res.status(502).json({
            success: false,
            error: 'Agent runtime unavailable',
        });
    }
});

async function startServer() {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`AI Engineering Operations API running on port ${PORT}`);
    });
}

startServer();