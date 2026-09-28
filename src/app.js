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

app.use(cors());
app.use(express.json());

app.use('/api/incidents', incidentRoutes);
app.use('/api/analyse', analysisRoutes);
app.use('/api/repository', repositoryRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/platform', platformRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ai-engineering-operations',
        environment: process.env.NODE_ENV || 'development',
    });
});

async function startServer() {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`AI Engineering Operations API running on port ${PORT}`);
    });
}

startServer();
