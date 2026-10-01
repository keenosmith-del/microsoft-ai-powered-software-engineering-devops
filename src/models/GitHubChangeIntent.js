const mongoose = require('mongoose');
const schema = new mongoose.Schema({
 proposalId: { type: mongoose.Schema.Types.ObjectId, required: true }, proposalVersion: Number, reviewId: String,
 incidentId: mongoose.Schema.Types.ObjectId, actor: String, key: { type: String, required: true, unique: true },
 repository: String, baseBranch: String, baseSha: String, branch: String, changes: mongoose.Schema.Types.Mixed,
 diff: String, hash: String, state: { type: String, default: 'prepared' }, leaseUntil: Date,
 treeSha: String, commitSha: String, prUrl: String, prNumber: Number,
 audit: [{ _id: false, actor: String, action: String, at: Date }],
}, { timestamps: true }); module.exports = mongoose.model('GitHubChangeIntent', schema);
