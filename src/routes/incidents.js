const express = require('express');
const Incident = require('../models/Incident');
const { runInvestigation } = require('../services/agentRuntime');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const incidents = await Incident.find()
            .sort({ createdAt: -1 });

        res.json(incidents);
    } catch (error) {
        console.error('Failed to fetch incidents:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch incidents',
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id);

        if (!incident) {
            return res.status(404).json({
                success: false,
                error: 'Incident not found',
            });
        }

        res.json(incident);
    } catch (error) {
        console.error('Failed to fetch incident:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch incident',
        });
    }
});

router.post('/:id/retry', async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id);

        if (!incident) {
            return res.status(404).json({ success: false, error: 'Incident not found' });
        }

        if (incident.status !== 'Investigating' || !incident.investigationError) {
            return res.status(409).json({
                success: false,
                error: 'Only a failed investigation can be retried.',
            });
        }

        incident.investigationError = '';
        incident.analysis = '';
        incident.investigation = '';
        incident.actions = '';
        await incident.save();

        try {
            const result = await runInvestigation(incident.description);
            incident.analysis = result.analysis || '';
            incident.investigation = result.investigation || '';
            incident.actions = result.actions || '';
            incident.actionStatus = 'Recommended';
            incident.status = 'Open';
            incident.investigationError = '';
            await incident.save();
            return res.json(incident);
        } catch (error) {
            incident.investigationError = error.message || 'Agent runtime request failed';
            await incident.save();
            return res.status(502).json({
                success: false,
                error: incident.investigationError,
                incidentId: incident._id,
            });
        }
    } catch (error) {
        console.error('Failed to retry incident investigation:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retry incident investigation',
        });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        const incident = await Incident.findById(req.params.id);

        if (!incident) {
            return res.status(404).json({
                success: false,
                error: 'Incident not found',
            });
        }

        if (status === 'Resolved') {
            if (!['Open', 'Awaiting review'].includes(incident.status)) {
                return res.status(409).json({
                    success: false,
                    error: 'Only an analyzed incident can be resolved.',
                });
            }

            if (incident.actions && incident.actionStatus !== 'Verified') {
                return res.status(409).json({
                    success: false,
                    error: 'Verify the linked engineering action before resolving this incident.',
                });
            }
        } else if (status === 'Open' && incident.status === 'Resolved') {
            if (incident.actions) incident.actionStatus = 'Recommended';
        } else {
            return res.status(409).json({
                success: false,
                error: `Incident cannot move from ${incident.status} to ${status}.`,
            });
        }

        incident.status = status;

        await incident.save();

        res.json(incident);
    } catch (error) {
        console.error('Failed to update incident status:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to update incident status',
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        if (Object.keys(body).some(key => !['title', 'description', 'service', 'severity'].includes(key)) ||
            !['title', 'description'].every(key => typeof body[key] === 'string' && body[key].trim() && body[key].length <= (key === 'title' ? 200 : 100000)) ||
            (body.service !== undefined && (typeof body.service !== 'string' || !body.service.trim() || body.service.length > 200)) ||
            (body.severity !== undefined && !['Critical', 'High', 'Medium', 'Low'].includes(body.severity))) {
            return res.status(400).json({ error: 'Supply title, description, optional service and severity; lifecycle fields cannot be supplied' });
        }
        const incident = await Incident.create({ ...body, status: 'Open' });

        res.status(201).json(incident);
    } catch (error) {
        console.error('Failed to create incident:', error);

        res.status(400).json({
            success: false,
            error: 'Failed to create incident',
            detail: error.message,
        });
    }
});

module.exports = router;
