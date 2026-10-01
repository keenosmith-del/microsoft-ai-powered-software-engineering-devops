function redact(value, env = process.env) {
    let text = String(value);
    for (const [name, secret] of Object.entries(env)) {
        if (/(TOKEN|SECRET|PASSWORD|API_KEY|MONGODB_URI)/i.test(name) && secret && secret.length >= 8) text = text.split(secret).join('[REDACTED]');
    }
    return text.replace(/\b(Bearer\s+)[\w.\-+/=]+/gi, '$1[REDACTED]')
        .replace(/\b((?:api[_-]?key|password|client[_-]?secret|access[_-]?token)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
        .replace(/gh[pousr]_[A-Za-z0-9_]{20,}/g, '[REDACTED]');
}
module.exports = { redact };
