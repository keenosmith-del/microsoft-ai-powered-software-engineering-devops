const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true },
    runId: { type: String, required: true },
    reviewId: String,
    owner: { type: String, default: '' },
    planningVersion: Number,
    requestHash: String,
    requestKey: { type: String, unique: true, sparse: true },
    title: { type: String, required: true },
    action: { type: String, required: true },
    rationale: { type: String, required: true },
    validationPlan: { type: String, required: true },
    target: { type: String, required: true },
    risk: { type: String, enum: ['low', 'medium', 'high'], required: true },
    requestedBy: { type: String, required: true },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    executionStatus: { type: String, default: 'disabled', enum: ['disabled'] },
    version: { type: Number, default: 0 },
    review: { actor: String, at: Date, comment: String },
    audit: [{ _id: false, actor: String, at: Date, action: String, version: Number }],
}, { timestamps: true });
module.exports = mongoose.model('RemediationProposal', schema);
