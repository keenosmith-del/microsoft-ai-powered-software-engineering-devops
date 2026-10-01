const { test } = require('node:test');
const assert = require('node:assert/strict');
const boundary = require('../src/middleware/legacyBoundary');
test('legacy boundary requires explicit local mode and never bypasses production authentication', () => {
 const old = { env: process.env.NODE_ENV, mode: process.env.OPERATIONS_LOCAL_MODE, token: process.env.OPERATIONS_API_TOKEN, actor: process.env.OPERATIONS_REVIEWER_ID };
 let status, accepted = 0;
 const res = { status(value) { status = value; return this; }, json() {} };
 const req = { get: () => '' };
 try {
  delete process.env.OPERATIONS_API_TOKEN; process.env.NODE_ENV = 'development'; delete process.env.OPERATIONS_LOCAL_MODE;
  boundary(req, res, () => accepted++); assert.equal(status, 503);
  process.env.OPERATIONS_LOCAL_MODE = 'true'; boundary(req, res, () => accepted++); assert.equal(accepted, 1);
  process.env.NODE_ENV = 'production'; boundary(req, res, () => accepted++); assert.equal(accepted, 1); assert.equal(status, 503);
  process.env.OPERATIONS_API_TOKEN = 'test-only-token-more-than-thirty-two-characters'; process.env.OPERATIONS_REVIEWER_ID = 'test-actor';
  boundary(req, res, () => accepted++); assert.equal(status, 401);
 } finally {
  for (const [key, value] of Object.entries({ NODE_ENV: old.env, OPERATIONS_LOCAL_MODE: old.mode, OPERATIONS_API_TOKEN: old.token, OPERATIONS_REVIEWER_ID: old.actor })) {
   if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
 }
});
