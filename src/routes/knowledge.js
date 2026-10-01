const express = require('express');
const mongoose = require('mongoose');
const Document = require('../models/KnowledgeDocument');
const { ingest, retrieve, workspace } = require('../services/knowledge');
const authorize = require('../middleware/authorization');
const router = express.Router();
router.use(authorize, require('../middleware/operationsLimit'));
router.get('/', async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);
        if (!Number.isInteger(page) || page < 1 || page > 100) return res.status(400).json({ error: 'Invalid page' });
        const rows = await Document.find({ workspace: workspace() }).sort({ indexedAt: -1 }).skip((page - 1) * 20).limit(21).select('-chunks -contentHash -__v').lean();
        res.json({ workspace: workspace(), method: 'local_lexical', items: rows.slice(0, 20), hasNext: rows.length > 20 });
    } catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
    try {
        const value = await require('../services/embeddings').indexVectors(ingest(req.body, req.actor));
        const doc = await Document.findOneAndUpdate({ workspace: value.workspace, contentHash: value.contentHash }, { $set: value }, { upsert: true, returnDocument: 'after' });
        res.status(201).json({ id: doc._id, title: doc.title, chunks: doc.chunks.length, indexedAt: doc.indexedAt, method: doc.method });
    } catch (error) { if (error.code === 11000) return res.status(409).json({ error: 'Concurrent duplicate ingestion; refresh indexed sources' }); if (error.status) return res.status(error.status).json({ error: error.message }); next(error); }
});
router.get('/search', async (req, res, next) => {
    try {
        if (typeof req.query.q !== 'string' || !req.query.q.trim() || req.query.q.length > 500) return res.status(400).json({ error: 'q must be 1–500 characters' });
        res.json(await retrieve(req.query.q));
    } catch (error) { next(error); }
});
router.post('/:id/reindex', async (req, res, next) => {
 try {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid document ID' });
  const doc = await Document.findOne({ _id: req.params.id, workspace: workspace() }).lean();
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const value = await require('../services/embeddings').indexVectors({ chunks: doc.chunks.map(c => ({ section: c.section, ordinal: c.ordinal, text: c.text })), method: 'local_lexical' });
  await Document.updateOne({ _id: doc._id }, { $set: { ...value, indexedAt: new Date() } }); res.json({ id: doc._id, status: value.embeddingStatus, method: value.method });
 } catch (e) { next(e); }
});
router.delete('/:id', async (req, res, next) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: 'Invalid document ID' });
        const result = await Document.deleteOne({ _id: req.params.id, workspace: workspace() });
        if (!result.deletedCount) return res.status(404).json({ error: 'Document not found in configured workspace' });
        res.status(204).end();
    } catch (error) { next(error); }
});
module.exports = router;
