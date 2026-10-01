const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
require('dotenv').config({ quiet: true });
const enabled = process.env.PHASE2_PERSISTENCE_TEST === 'true';
const dbName = `p2v_${randomUUID().replaceAll('-', '')}`;
if (enabled) {
 before(async () => { await mongoose.connect(process.env.PHASE2_TEST_MONGODB_URI || process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 5000 }); await Promise.all(['Incident', 'IncidentWorkflow', 'InvestigationRun'].map(name => require(`../src/models/${name}`).init())); });
 after(async () => { try { if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase(); } finally { await mongoose.disconnect(); } });
}
test('optional configured MongoDB supports canonical idempotent creation and queue projection', { skip: !enabled }, async () => {
 const lifecycle = require('../src/services/incidentLifecycle'); const key = randomUUID(); const body = { title: 'Configured DB fixture', description: 'Isolated test only', investigate: true };
 const a = await lifecycle.create(body, 'test-reviewer', key); const b = await lifecycle.create(body, 'test-reviewer', key);
 assert.equal(String(a._id), String(b._id)); assert.equal(a.status, 'Investigating'); assert.equal(await require('../src/models/InvestigationRun').countDocuments({ incidentId: a._id }), 1);
});
