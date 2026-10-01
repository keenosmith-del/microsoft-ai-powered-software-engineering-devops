const mongoose = require('mongoose');
async function main() {
 await mongoose.connect(process.env.TEST_WORKER_MONGODB_URI);
 const worker = require('../src/services/investigationWorker').createInvestigationWorker({ retrieval: async () => ({ results: [] }), statusWriter: async () => {}, fetcher: async () => { await new Promise(resolve => setTimeout(resolve, 30000)); return require('./runtimeFixture')(); } });
 await worker.tick(); await mongoose.disconnect();
}
main().catch(() => process.exit(1));
