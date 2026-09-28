const express = require('express');
const Incident = require('../models/Incident');
const { runInvestigation } = require('../services/agentRuntime');

const router = express.Router();
const allowedSeverities = new Set(['Critical', 'High', 'Medium', 'Low']);

router.post('/', async (req, res) => {
    const { problem, severity = 'Medium' } = req.body;

    if (!allowedSeverities.has(severity)) {
        return res.status(400).json({
            error: 'severity must be Critical, High, Medium, or Low',
        });
    }

    if (typeof problem !== 'string' || !problem.trim()) {
        return res.status(400).json({
            error: 'problem is required and must be a non-empty string',
        });
    }

    const description = problem.trim();

    try {
        const incident = await Incident.create({
            title: description.length > 80
                ? `${description.substring(0, 77)}...`
                : description,
            description,
            service: 'Engineering Operations API',
            severity,
            status: 'Investigating',
            analysis: '',
            investigation: '',
            actions: '',
            rootCause: 'Pending investigation',
        });

        try {
            const result = await runInvestigation(description);
            incident.analysis = result.analysis || '';
            incident.investigation = result.investigation || '';
            incident.actions = result.actions || '';
            incident.investigationError = '';
            incident.actionStatus = 'Recommended';
            incident.status = 'Open';
            await incident.save();

            return res.json({ ...result, incidentId: incident._id });
        } catch (error) {
            incident.investigationError = error.message || 'Agent runtime unavailable';
            await incident.save();

            return res.status(502).json({
                success: false,
                error: incident.investigationError,
                incidentId: incident._id,
            });
        }
    } catch (error) {
        console.error('Analysis or incident persistence failed:', error);
        return res.status(502).json({
            success: false,
            error: 'Failed to create investigation',
        });
    }
});

module.exports = router;
