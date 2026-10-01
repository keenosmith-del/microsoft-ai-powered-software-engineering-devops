const { timingSafeEqual, createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
function equal(a, b) { return typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
function credentials() {
 return [
  { token: process.env.OPERATIONS_API_TOKEN, actor: process.env.OPERATIONS_REVIEWER_ID, role: process.env.OPERATIONS_ROLE || 'engineer' },
  { token: process.env.OPERATIONS_APPROVER_TOKEN, actor: process.env.OPERATIONS_APPROVER_ID, role: 'approver' },
 ].filter(v => v.token?.length >= 32 && v.actor && ['viewer', 'engineer', 'approver', 'administrator'].includes(v.role));
}
function authenticate(token) { return credentials().find(v => equal(token, v.token)); }
function cookie(req) { return (req.get('Cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith('ops_session='))?.slice(12); }
async function authorize(req, res, next) {
 try {
  const configured = credentials();
  if (!configured.length) return res.status(503).json({ code: 'AUTH_NOT_CONFIGURED', error: 'Configure strong operations credentials and reviewer identity' });
  const supplied = req.get('Authorization') || '';
  let identity = supplied.startsWith('Bearer ') ? authenticate(supplied.slice(7)) : null;
  const sessionKey = cookie(req);
  if (!identity && !supplied && sessionKey && /^[a-f0-9]{64}$/.test(sessionKey)) {
   const Session = require('../models/OperationSession');
   const session = await Session.findOne({ keyHash: hash(sessionKey), expiresAt: { $gt: new Date() } }).lean();
   if (session && configured.some(v => v.actor === session.actor && v.role === session.role && hash(v.token) === session.credentialHash)) {
    identity = session; req.session = session;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !equal(req.get('X-CSRF-Token'), session.csrf)) return res.status(403).json({ code: 'CSRF_REQUIRED', error: 'Restore session and supply CSRF token' });
   }
  }
  if (!identity) return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Operations session expired or authorization required' });
  req.actor = identity.actor; req.role = identity.role;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && identity.role === 'viewer') return res.status(403).json({ code: 'FORBIDDEN', error: 'Viewer access cannot change engineering records' });
  next();
 } catch (e) { next(e); }
}
module.exports = authorize;
Object.assign(module.exports, { authenticate, hash, cookie, equal });
