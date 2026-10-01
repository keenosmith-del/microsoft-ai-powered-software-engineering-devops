const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('node:fs');
async function database() {
 const systemBinary = process.env.MONGOMS_SYSTEM_BINARY || (fs.existsSync('/opt/homebrew/bin/mongod') ? '/opt/homebrew/bin/mongod' : undefined);
 return MongoMemoryServer.create({ binary: systemBinary ? { systemBinary } : undefined });
}
module.exports = database;
