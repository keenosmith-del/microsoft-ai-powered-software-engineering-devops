// Read-only verification. Never prints credentials, response bodies, incident text or tokens.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { createEngineeringService } = require('../src/services/engineering');
async function main() {
    let database;
    try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
        await mongoose.connection.db.admin().ping({ maxTimeMS: 3000 });
        database = 'operational';
    } catch { database = process.env.MONGODB_URI ? 'unavailable' : 'not_configured'; }
    const snapshot = await createEngineeringService()();
    const api = snapshot.services.find(service => service.id === 'api');
    try { const response = await fetch(`http://127.0.0.1:${process.env.PORT || 5050}/health`, { signal: AbortSignal.timeout(3000) }); api.status = response.ok ? 'operational' : 'unavailable'; api.detail = 'Actual configured gateway health request'; } catch { api.status = 'unavailable'; api.detail = 'Configured gateway is not listening or did not respond'; }
    console.log(JSON.stringify({ checkedAt: snapshot.checkedAt, database, services: snapshot.services, metrics: snapshot.metrics, dataError: snapshot.dataError }, null, 2));
    await mongoose.disconnect();
}
main().catch(() => { console.error('Verification failed; no sensitive diagnostics printed'); process.exitCode = 1; });
