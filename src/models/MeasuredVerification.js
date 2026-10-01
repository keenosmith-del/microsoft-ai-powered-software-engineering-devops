const mongoose = require('mongoose');
const schema = new mongoose.Schema({
 incidentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, changeId: String, proposalId: String,
 requestedBy: String, criteria: mongoose.Schema.Types.Mixed, baseline: mongoose.Schema.Types.Mixed,
 comparison: mongoose.Schema.Types.Mixed, evaluation: mongoose.Schema.Types.Mixed, evaluatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model('MeasuredVerification', schema);
