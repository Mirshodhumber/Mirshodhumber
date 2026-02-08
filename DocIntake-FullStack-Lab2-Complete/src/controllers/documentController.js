// src/controllers/documentsController.js
const path = require('path');
const { archiveAndDeleteDocumentById } = require('../repositories/documentRepository');
const { appendAudit } = require('../utils/auditLogger');

async function deleteDocumentHandler(req, res) {
  const id = req.params.id;
  const performedBy = req.headers['x-user'] || 'unknown'; // optional
  const reason = req.body?.reason || 'No reason provided';

  try {
    // This function throws if doc not found or not in REJECTED state
    const archivalRecord = await archiveAndDeleteDocumentById({ id, performedBy, reason });

    await appendAudit({
      action: 'DELETE_DOCUMENT',
      id,
      performedBy,
      reason,
      result: 'SUCCESS',
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      message: 'Document content physically removed and metadata archived.',
      archivedMetadata: archivalRecord
    });
  } catch (err) {
    // err.message will indicate reason (not found / not rejected / fs errors)
    await appendAudit({
      action: 'DELETE_DOCUMENT',
      id,
      performedBy,
      reason,
      result: 'FAIL',
      error: err.message,
      timestamp: new Date().toISOString()
    });

    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
    if (err.code === 'NOT_ALLOWED') return res.status(400).json({ error: err.message });
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

module.exports = { deleteDocumentHandler };
