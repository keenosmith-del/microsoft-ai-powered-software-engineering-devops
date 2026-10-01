const authorize = require('./authorization');
module.exports = function legacyBoundary(req, res, next) {
 // Compatibility is deliberately opt-in and cannot be enabled in production.
 if (process.env.NODE_ENV !== 'production' && process.env.OPERATIONS_LOCAL_MODE === 'true') return next();
 return authorize(req, res, next);
};
