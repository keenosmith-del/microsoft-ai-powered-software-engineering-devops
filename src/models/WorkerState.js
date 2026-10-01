const mongoose = require('mongoose');
const schema = new mongoose.Schema({ workerId: { type: String, unique: true }, heartbeatAt: Date, status: { type: String, enum: ['active', 'stopped'] } });
module.exports = mongoose.model('WorkerState', schema);
