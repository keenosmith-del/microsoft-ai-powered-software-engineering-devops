const express = require('express');
const { randomBytes } = require('node:crypto');
const Session = require('../models/OperationSession');
const auth = require('../middleware/authorization');
const router = express.Router();
const cookieOptions = () => `Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
function trustedOrigin(req) {
 const allowed = (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://127.0.0.1:5173')).split(',');
 return allowed.includes(req.get('Origin'));
}
router.post('/', (req, res, next) => { req.actor = `session-login:${req.ip}`; require('../middleware/operationsLimit')(req, res, next); }, async (req, res, next) => {
 try {
  if (!trustedOrigin(req)) return res.status(403).json({ code: 'ORIGIN_FORBIDDEN', error: 'Session login requires a configured frontend Origin' });
  const identity = auth.authenticate(req.body?.token);
  if (!identity) return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Valid operations credential required' });
  const previous = auth.cookie(req); if (previous) await Session.deleteOne({ keyHash: auth.hash(previous) });
  const key = randomBytes(32).toString('hex'); const csrf = randomBytes(32).toString('hex');
  const ttl = Math.min(86400, Math.max(60, Number(process.env.OPERATIONS_SESSION_SECONDS) || 28800));
  const expiresAt = new Date(Date.now() + ttl * 1000);
  await Session.create({ keyHash: auth.hash(key), csrf, actor: identity.actor, role: identity.role, credentialHash: auth.hash(identity.token), expiresAt });
  res.set('Set-Cookie', `ops_session=${key}; ${cookieOptions()}; Max-Age=${ttl}`);
  res.set('Cache-Control', 'no-store'); res.json({ actor: identity.actor, role: identity.role, csrf, expiresAt });
 } catch (e) { next(e); }
});
router.get('/', auth, (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ actor: req.actor, role: req.role, csrf: req.session?.csrf || null, expiresAt: req.session?.expiresAt || null }); });
router.delete('/', auth, async (req, res, next) => {
 try { const key = auth.cookie(req); if (key) await Session.deleteOne({ keyHash: auth.hash(key) }); res.set('Set-Cookie', `ops_session=; ${cookieOptions()}; Max-Age=0`); res.status(204).end(); }
 catch (e) { next(e); }
});
module.exports = router;
