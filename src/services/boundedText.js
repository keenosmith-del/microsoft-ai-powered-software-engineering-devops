const { redact } = require('./redaction');
async function boundedText(response, { bytes = 65536, env = process.env } = {}) {
 const type = response.headers.get('content-type') || '';
 if (type && !/^(text\/|application\/(json|octet-stream))/i.test(type)) { await response.body?.cancel(); throw Object.assign(new Error('Unsupported evidence content'), { status: 422 }); }
 if (!response.body) throw Object.assign(new Error('Evidence body unavailable'), { status: 502 });
 const reader = response.body.getReader(); const chunks = []; let length = 0, truncated = false;
 try {
  while (true) { const { value, done } = await reader.read(); if (done) break; const remaining = bytes - length; chunks.push(value.subarray(0, remaining)); length += Math.min(value.length, remaining); if (value.length >= remaining) { truncated = true; await reader.cancel(); break; } }
 } finally { reader.releaseLock(); }
 const buffer = Buffer.concat(chunks); if (buffer.includes(0)) throw Object.assign(new Error('Binary evidence is unsupported'), { status: 422 });
 let decoded; try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(buffer, { stream: truncated }); } catch { throw Object.assign(new Error('Unsupported evidence encoding'), { status: 422 }); }
 return { content: redact(decoded, env).replace(/\u001b\[[0-9;]*m/g, ''), truncated, bytes: length };
}
module.exports = { boundedText };
