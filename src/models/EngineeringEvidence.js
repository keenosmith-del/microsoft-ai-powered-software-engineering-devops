const mongoose = require('mongoose');
const schema = new mongoose.Schema({
 evidenceId: { type: String, required: true, unique: true }, incidentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
 runId: { type: String, index: true }, signalId: String, provider: String, type: String, repository: String, branch: String,
 resourceId: String, subscriptionId: String, unit: String, aggregation: String, window: mongoose.Schema.Types.Mixed,
 commitSha: String, workflowRunId: String, jobId: String, deploymentId: String, sourceUrl: String,
 observedAt: Date, retrievedAt: { type: Date, default: Date.now }, content: String, truncated: Boolean,
 relationship: { type: String, enum: ['directly-linked', 'temporally-related', 'potentially-relevant', 'unknown'] },
}, { timestamps: true });
schema.index({ incidentId: 1, runId: 1, signalId: 1, type: 1, jobId: 1 }, { unique: true });
module.exports = mongoose.model('EngineeringEvidence', schema);
