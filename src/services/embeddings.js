const { boundedText } = require('./boundedText');
function createEmbeddings({ env = process.env, fetcher = fetch } = {}) {
 const model = env.KNOWLEDGE_EMBEDDING_MODEL, dimension = Number(env.KNOWLEDGE_EMBEDDING_DIMENSION);
 const configured = Boolean(model && Number.isInteger(dimension) && dimension > 0 && dimension <= 4096);
 async function embed(texts) {
  if (!configured) throw Object.assign(new Error('Configure an installed local embedding model and dimension'), { status: 503, code: 'EMBEDDINGS_NOT_CONFIGURED' });
  if (!Array.isArray(texts) || !texts.length || texts.length > 8 || texts.some(v => typeof v !== 'string' || v.length > 2200)) throw Object.assign(new Error('Embedding batch exceeds bound'), { status: 400 });
  // Operator-configured loopback Ollama endpoint only; no model download or URL from a client.
  const endpoint = new URL(env.KNOWLEDGE_EMBEDDING_URL || 'http://127.0.0.1:11434');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname) || endpoint.protocol !== 'http:' || endpoint.username || endpoint.password || endpoint.pathname !== '/') throw Object.assign(new Error('Embedding endpoint must be a loopback origin'), { status: 503 });
  try {
   const r = await fetcher(`${endpoint.origin}/api/embed`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, input: texts, truncate: false, keep_alive: '5m' }) });
   if (!r.ok) throw new Error(); const body = await boundedText(r, { bytes: 1048576, env: {} }); if (body.truncated) throw new Error();
   const { embeddings } = JSON.parse(body.content);
   if (embeddings?.length !== texts.length || embeddings.some(v => !Array.isArray(v) || v.length !== dimension || v.some(n => !Number.isFinite(n)) || !v.some(n => n !== 0))) throw new Error();
   return embeddings;
  } catch { throw Object.assign(new Error('Local embeddings unavailable or incompatible with configured model dimension; install model separately'), { status: 503, code: 'EMBEDDINGS_UNAVAILABLE' }); }
 }
 return { configured, model, dimension, provider: 'ollama-local', embed };
}
function cosine(a, b) {
 if (a.length !== b.length || !a.length) return null;
 const norm = Math.sqrt(a.reduce((s, n) => s + n * n, 0) * b.reduce((s, n) => s + n * n, 0));
 return norm ? a.reduce((s, n, i) => s + n * b[i], 0) / norm : null;
}
async function indexVectors(value, env = process.env) {
 const adapter = createEmbeddings({ env });
 if (!adapter.configured) return { ...value, embeddingStatus: 'not-configured' };
 try {
  const vectors = []; for (let i = 0; i < value.chunks.length; i += 8) vectors.push(...await adapter.embed(value.chunks.slice(i, i + 8).map(c => c.text)));
  return { ...value, chunks: value.chunks.map((c, i) => ({ ...c, vector: vectors[i] })), embeddingStatus: 'indexed', embeddingModel: adapter.model, embeddingDimension: adapter.dimension, embeddingProvider: adapter.provider, method: 'local_semantic' };
 } catch { return { ...value, embeddingStatus: 'unavailable' }; }
}
module.exports = { createEmbeddings, cosine, indexVectors };
