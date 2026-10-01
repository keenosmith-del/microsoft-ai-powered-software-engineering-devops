const { createHash } = require('node:crypto');
const Document = require('../models/KnowledgeDocument');
const { redact } = require('./redaction');
function chunks(text) {
    let section = 'Document';
    const result = [];
    let buffer = '';
    const flush = () => { if (buffer.trim()) result.push({ section, ordinal: result.length, text: buffer.trim() }); buffer = ''; };
    for (const line of text.split('\n')) {
        const heading = line.match(/^#{1,6}\s+(.+)$/);
        if (heading) { flush(); section = heading[1].slice(0, 200); }
        for (let offset = 0; offset < line.length || offset === 0; offset += 1500) {
            const part = line.slice(offset, offset + 1500);
            if (buffer.length + part.length > 2000) flush();
            buffer += `${part}\n`;
        }
    }
    flush(); return result;
}
const words = text => new Set(text.toLowerCase().match(/[a-z0-9_]{3,}/g) || []);
function rank(documents, query, limit = 5) {
    const terms = words(query);
    return documents.flatMap(document => document.chunks.map(chunk => {
        const found = words(`${document.title} ${chunk.text}`);
        const matched = [...terms].filter(term => found.has(term));
        return { documentId: String(document._id), title: document.title, sourceUrl: document.sourceUrl || null, indexedAt: document.indexedAt, section: chunk.section, ordinal: chunk.ordinal, text: chunk.text, score: matched.length / Math.max(1, terms.size), method: 'local_lexical' };
    })).filter(hit => hit.score > 0).sort((a, b) => b.score - a.score || a.documentId.localeCompare(b.documentId) || a.ordinal - b.ordinal).slice(0, limit);
}
function workspace(env = process.env) { return env.KNOWLEDGE_WORKSPACE || `${env.GITHUB_OWNER || 'local'}/${env.GITHUB_REPOSITORY || 'workspace'}`; }
async function retrieve(query, env = process.env) {
    const docs = await Document.find({ workspace: workspace(env) }).sort({ indexedAt: -1 }).limit(101).maxTimeMS(3000).lean();
    const { createEmbeddings, cosine } = require('./embeddings');
    const adapter = createEmbeddings({ env });
    let fallbackReason = 'Embeddings not configured';
    if (adapter.configured) {
        try {
            const [vector] = await adapter.embed([query]);
            const compatible = docs.slice(0, 100).filter(d => d.embeddingStatus === 'indexed' && d.embeddingModel === adapter.model && d.embeddingDimension === adapter.dimension);
            if (compatible.length) {
                const results = compatible.flatMap(d => d.chunks.map(c => ({ documentId: String(d._id), title: d.title, sourceUrl: d.sourceUrl || null, indexedAt: d.indexedAt, section: c.section, ordinal: c.ordinal, text: c.text, score: cosine(vector, c.vector || []), method: 'local_semantic' }))).filter(v => v.score !== null).sort((a, b) => b.score - a.score).slice(0, 5);
                return { method: 'local_semantic', embeddingModel: adapter.model, dimension: adapter.dimension, indexedDocumentsExamined: compatible.length, truncated: docs.length > 100, results };
            }
            fallbackReason = 'No compatible vector index; reindex sources';
        } catch { fallbackReason = 'Local embedding model unavailable'; }
    }
    return { method: 'local_lexical', fallbackReason, indexedDocumentsExamined: Math.min(docs.length, 100), truncated: docs.length > 100, results: rank(docs.slice(0, 100), query) };
}
function ingest(body, actor, env = process.env) {
    if (!body || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 100000 || Object.keys(body).some(key => !['title', 'text', 'sourceUrl'].includes(key))) throw Object.assign(new Error('Supply title (1–200 characters), text (1–100000 characters) and optional HTTPS sourceUrl'), { status: 400 });
    if (body.sourceUrl) {
        try { const url = new URL(body.sourceUrl); if (typeof body.sourceUrl !== 'string' || body.sourceUrl.length > 2048 || [...url.searchParams.keys()].some(key => /^(sig|token|key|code|password|secret)$/i.test(key)) || url.protocol !== 'https:' || url.username || url.password) throw new Error(); }
        catch { throw Object.assign(new Error('sourceUrl must be an HTTPS URL without credentials'), { status: 400 }); }
    }
    const text = redact(body.text, env);
    return { workspace: workspace(env), title: redact(body.title.trim(), env), sourceUrl: body.sourceUrl || null, requestedBy: actor, contentHash: createHash('sha256').update(text).digest('hex'), chunks: chunks(text), indexedAt: new Date(), method: 'local_lexical' };
}
module.exports = { chunks, rank, retrieve, ingest, workspace };
