const mongoose = require('mongoose');
const { initialWorkflow } = require('../services/incidentWorkflow');
const schema = new mongoose.Schema({
 incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true, unique: true },
 version: { type: Number, required: true, default: 0 },
 workflow: { type: mongoose.Schema.Types.Mixed, default: initialWorkflow },
}, { timestamps: true });
module.exports = mongoose.model('IncidentWorkflow', schema);
