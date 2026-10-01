const mongoose = require('mongoose');
const schema = new mongoose.Schema({
 signalId: { type: String, required: true, unique: true }, provider: String, providerEventId: String,
 type: String, sourceResource: String, severity: String, observedAt: Date, receivedAt: { type: Date, default: Date.now },
 references: mongoose.Schema.Types.Mixed, summary: String, deduplicationKey: { type: String, required: true, unique: true },
 correlationKey: String, state: { type: String, default: 'detected' }, incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
 lastProcessedAt: Date, processingErrors: [String], audit: [{ _id: false, action: String, actor: String, at: Date }],
}, { timestamps: true });
schema.index({ observedAt: -1 });
module.exports = mongoose.model('EngineeringSignal', schema);
