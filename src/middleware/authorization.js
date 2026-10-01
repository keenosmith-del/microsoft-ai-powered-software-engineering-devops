const { timingSafeEqual } = require('node:crypto');
function authorize(req, res, next) {
    const configured = process.env.OPERATIONS_API_TOKEN;
    const identity = process.env.OPERATIONS_REVIEWER_ID;
    if (!configured || configured.length < 32 || !identity) return res.status(503).json({ code: 'AUTH_NOT_CONFIGURED', error: 'Configure OPERATIONS_API_TOKEN (at least 32 characters) and OPERATIONS_REVIEWER_ID; new state-changing operations are disabled' });
    const supplied = req.get('Authorization') || '';
    const expected = `Bearer ${configured}`;
    if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Valid operations authorization required' });
    req.actor = identity;
    next();
}
module.exports = authorize;
