const names = ['software-engineering', 'incident-investigation', 'engineering-action'];
async function consume(response, onEvent) {
 if (!response.body || !response.headers?.get('content-type')?.includes('application/x-ndjson')) throw Object.assign(new Error('Agent runtime returned invalid structured output'), { permanent: true });
 const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '', bytes = 0, index = 0, running = false;
 const result = {};
 try {
  while (true) {
   const { done, value } = await reader.read();
   if (done) break;
   bytes += value.length; if (bytes > 1000000) throw new Error('Runtime stream too large');
   buffer += decoder.decode(value, { stream: true });
   let newline;
   while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1); if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.stage !== names[index] || !['running', 'completed', 'failed'].includes(event.status) || !Number.isFinite(Date.parse(event.at))) throw new Error('Invalid runtime stage sequence');
    if (event.status === 'running') { if (running) throw new Error('Duplicate stage start'); running = true; }
    else {
     if (!running || !Number.isInteger(event.elapsedMs) || event.elapsedMs < 0) throw new Error('Missing stage timing');
     if (event.status === 'completed') {
      if (typeof event.output !== 'string' || !event.output.trim() || event.output.length > 200000) throw Object.assign(new Error('Agent runtime returned invalid structured output'), { permanent: true });
      result[['analysis', 'investigation', 'actions'][index]] = event.output;
     }
    }
    await onEvent(event);
    if (event.status === 'failed') throw new Error('Agent stage failed');
    if (event.status === 'completed') { index++; running = false; }
   }
   if (buffer.length > 300000) throw new Error('Runtime event too large');
  }
  if (buffer.trim() || index !== 3) throw new Error('Runtime stream incomplete');
  return result;
 } finally { await reader.cancel().catch(() => {}); }
}
module.exports = { consume, names };
