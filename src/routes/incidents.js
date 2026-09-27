const express = require('express');
const Incident = require('../models/Incident');

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

router.post('/', async (req, res) => {
    try {
        const incident = await Incident.create(req.body);

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