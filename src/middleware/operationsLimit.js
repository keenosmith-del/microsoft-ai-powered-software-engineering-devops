const windows = new Map();
const streams = new Map();
module.exports = function operationsLimit(req, res, next) {
    const key = req.actor;
    const now = Date.now();
    const previous = windows.get(key);
    const window = previous && now - previous.at < 60000 ? previous : { at: now, count: 0 };
    windows.set(key, window);
    const streaming = req.path.endsWith('/events') && req.query.format !== 'json';
    window.count++;
    if (window.count > 120 || (streaming && (streams.get(key) || 0) >= 10)) {
        res.set('Retry-After', '60'); return res.status(429).json({ code: 'RATE_LIMITED', error: 'Operations request limit reached; retry shortly' });
    }
    if (streaming) { streams.set(key, (streams.get(key) || 0) + 1); res.once('close', () => streams.set(key, Math.max(0, (streams.get(key) || 0) - 1))); }
    next();
};
