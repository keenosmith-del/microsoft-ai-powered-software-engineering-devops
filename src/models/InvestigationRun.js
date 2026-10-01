const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const schema = new mongoose.Schema({
    runId: { type: String, default: randomUUID, unique: true },
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
    requestedBy: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    triggerSource: { type: String, enum: ['manual'], default: 'manual' },
    status: { type: String, enum: ['queued', 'running', 'completed', 'failed', 'cancelled'], default: 'queued', index: true },
    currentStage: { type: String, default: 'queued' },
    executionVersion: { type: Number, default: 1 },
    correlationId: { type: String, default: randomUUID },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    leaseOwner: String,
    leaseUntil: Date,
    startedAt: Date,
    completedAt: Date,
    elapsedMs: Number,
    deployment: String,
    result: { analysis: String, investigation: String, actions: String },
    error: String,
    retrievalStatus: String,
    operationalEvidenceIds: [String],
    toolActivity: [{ _id: false, name: String, stage: String, deployment: String, inputTokens: Number, outputTokens: Number, totalTokens: Number, at: Date, durationMs: Number, outcome: String, error: String }],
    evidenceReferences: [{ _id: false, documentId: String, section: String, ordinal: Number, indexedAt: Date, sourceUrl: String }],
    context: { notes: String },
    cancellation: { requestedBy: String, requestedAt: Date, detail: String },
    events: [{ _id: false, id: Number, status: String, stage: String, at: Date, detail: String, elapsedMs: Number }],
}, { timestamps: true });
schema.index({ incidentId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ status: 1, leaseUntil: 1, nextAttemptAt: 1 });
module.exports = mongoose.model('InvestigationRun', schema);
