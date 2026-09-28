const express = require('express');
const Incident = require('../models/Incident');

const router = express.Router();

const allowedTransitions = {
    Recommended: 'In progress',
    'In progress': 'Awaiting verification',
    'Awaiting verification': 'Verified',
};

function extractAction(recommendation) {
    const section = recommendation.match(
        /##\s+Action\s*\n([\s\S]*?)(?=\n##\s|$)/i,
    );
    return (section?.[1] || recommendation).trim();
}

function toAction(incident) {
    const action = extractAction(incident.actions);
    const firstSentence = action.split(/(?<=[.!?])\s+/)[0];

    return {
        id: String(incident._id),
        incidentId: String(incident._id),
        incidentTitle: incident.title,
        service: incident.service,
        severity: incident.severity,
        title: firstSentence.slice(0, 120) || 'Engineering action recommendation',
        description: action,
        recommendation: incident.actions,
        source: 'Engineering Action Agent',
        status: incident.actionStatus || 'Recommended',
        incidentStatus: incident.status,
        updatedAt: incident.updatedAt,
    };
}

router.get('/', async (_req, res) => {
    try {
        const incidents = await Incident.find({
            actions: { $exists: true, $nin: ['', null] },
        }).sort({ updatedAt: -1 });

        res.json(incidents.map(toAction));
    } catch (error) {
        console.error('Failed to fetch engineering actions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch engineering actions',
        });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id);

        if (!incident || !incident.actions) {
            return res.status(404).json({
                success: false,
                error: 'Engineering action not found',
            });
        }

        const currentStatus = incident.actionStatus || 'Recommended';
        const nextStatus = allowedTransitions[currentStatus];

        if (!nextStatus || req.body.status !== nextStatus) {
            return res.status(409).json({
                success: false,
                error: `Action cannot move from ${currentStatus} to ${req.body.status}`,
                expectedStatus: nextStatus || null,
            });
        }

        incident.actionStatus = nextStatus;
        if (nextStatus === 'Awaiting verification') {
            incident.status = 'Awaiting review';
        }
        await incident.save();

        res.json(toAction(incident));
    } catch (error) {
        console.error('Failed to update engineering action:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update engineering action',
        });
    }
});

module.exports = router;
