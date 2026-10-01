const mongoose = require('mongoose');
const schema = new mongoose.Schema({ keyHash: { type: String, unique: true }, actor: String, role: String, credentialHash: String, csrf: String, expiresAt: { type: Date, expires: 0 } }, { timestamps: true });
module.exports = mongoose.model('OperationSession', schema);
