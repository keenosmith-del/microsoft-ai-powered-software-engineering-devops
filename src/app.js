require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDatabase = require('./config/database');

const app = express();

const incidentRoutes = require('./routes/incidents');
const analysisRoutes = require('./routes/analysis');
const repositoryRoutes = require('./routes/repository');
const actionRoutes = require('./routes/actions');
const platformRoutes = require('./routes/platform');

const PORT = process.env.PORT || 5050;

const { randomUUID } = require('node:crypto');
const origins = (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://127.0.0.1:5173')).split(',').filter(Boolean);
app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set('X-Request-ID', req.requestId);
    const send = res.json.bind(res);
    res.json = body => send(res.statusCode >= 400 && body && !Array.isArray(body) ? { ...body, code: body.code || `HTTP_${res.statusCode}`, requestId: req.requestId } : body);
    next();
});
app.use(cors({ origin: (origin, callback) => callback(null, !origin || origins.includes(origin)), credentials: true, exposedHeaders: ['X-Request-ID'] }));
app.use(express.json({ limit: '256kb' }));

app.use('/api/session', require('./routes/session'));
app.use('/api/incidents/:id/workflow', require('./routes/incidentWorkflow'));
app.use('/api/incidents/:id/investigations', require('./routes/incidentInvestigations'));
app.use('/api/incidents', require('./middleware/legacyBoundary'), incidentRoutes);
app.use('/api/analyse', require('./middleware/legacyBoundary'), analysisRoutes);
app.use('/api/repository', repositoryRoutes);
app.use('/api/actions', require('./middleware/legacyBoundary'), actionRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/engineering', require('./routes/engineering'));
app.use('/api/azure', require('./routes/azure'));
app.use('/api/investigations', require('./routes/investigations'));
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/remediation', require('./routes/remediation'));


app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ai-engineering-operations',
        environment: process.env.NODE_ENV || 'development',
    });
});

app.use((error, _req, res, _next) => {
    res.status(Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 503).json({ code: error.code || 'REQUEST_FAILED', error: error.status && error.status < 500 ? error.message : 'Request failed; verify input and service connectivity' });
});

async function startServer() {
    await connectDatabase();

    await Promise.all(['Incident', 'InvestigationRun', 'KnowledgeDocument', 'RemediationProposal', 'WorkerState', 'IncidentWorkflow', 'OperationSession'].map(name => require(`./models/${name}`).init()));
    if (process.env.INVESTIGATION_WORKER_ENABLED === 'true') {
        const worker = require('./services/investigationWorker').createInvestigationWorker();
        worker.start();
        process.once('SIGTERM', () => worker.stop());
        process.once('SIGINT', () => worker.stop());
    }

    app.listen(PORT, () => {
        console.log(`AI Engineering Operations API running on port ${PORT}`);
    });
}

if (require.main === module) startServer().catch(() => { console.error('API startup failed; verify MongoDB connectivity and index permissions'); process.exitCode = 1; });

module.exports = app;
