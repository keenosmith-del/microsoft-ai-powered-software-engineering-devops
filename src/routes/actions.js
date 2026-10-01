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
        const incidents = await Incident.find().sort({ updatedAt: -1 }).limit(500);

        const lifecycle = require('../services/incidentLifecycle');
        const records = await Promise.all(incidents.map(incident => lifecycle.read(incident._id)));
        const actions = await Promise.all(records.map(async incident => {
            const run = await require('../models/InvestigationRun').findOne({ incidentId: incident._id, status: 'completed' }).sort({ createdAt: -1 }).lean();
            return { ...incident, actions: run?.result?.actions || incident.actions };
        }));
        res.json(actions.filter(incident => incident.actions).map(incident => ({ ...toAction(incident), incidentStatus: incident.status, status: incident.workflow.stage === 'resolved' ? 'Verified' : incident.workflow.stage === 'verify' ? 'Awaiting verification' : incident.workflow.stage === 'remediate' ? 'In progress' : 'Recommended' })));
    } catch (error) {
        console.error('Failed to fetch engineering actions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch engineering actions',
        });
    }
});

router.patch('/:id/status', (_req, res) => res.status(409).json({ code: 'LIFECYCLE_ACTION_REQUIRED', error: 'Use the incident workspace to review findings, record approved changes and supply verification evidence; status-only action changes are disabled' }));

module.exports = router;
