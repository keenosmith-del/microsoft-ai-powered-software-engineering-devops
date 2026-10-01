const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    workspace: { type: String, required: true, index: true },
    title: { type: String, required: true },
    sourceUrl: String,
    contentHash: { type: String, required: true },
    requestedBy: { type: String, required: true },
    chunks: [{ _id: false, section: String, ordinal: Number, text: String, vector: [Number] }],
    indexedAt: { type: Date, default: Date.now },
    embeddingStatus: String, embeddingModel: String, embeddingDimension: Number, embeddingProvider: String,
    method: { type: String, default: 'local_lexical' },
}, { timestamps: true });
schema.index({ workspace: 1, contentHash: 1 }, { unique: true });
module.exports = mongoose.model('KnowledgeDocument', schema);
