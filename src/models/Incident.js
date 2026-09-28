const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        service: {
            type: String,
            default: 'Engineering Operations API',
            trim: true,
        },

        severity: {
            type: String,
            enum: ['Critical', 'High', 'Medium', 'Low'],
            default: 'Medium',
        },

        status: {
            type: String,
            enum: [
                'Investigating',
                'Open',
                'Awaiting review',
                'Resolved',
            ],
            default: 'Investigating',
        },

        analysis: {
            type: String,
            default: '',
        },

        investigation: {
            type: String,
            default: '',
        },

        actions: {
            type: String,
            default: '',
        },

        investigationError: {
            type: String,
            default: '',
        },

        actionStatus: {
            type: String,
            enum: [
                'Recommended',
                'In progress',
                'Awaiting verification',
                'Verified',
            ],
            default: 'Recommended',
        },

        rootCause: {
            type: String,
            default: 'Pending investigation',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Incident', incidentSchema);
