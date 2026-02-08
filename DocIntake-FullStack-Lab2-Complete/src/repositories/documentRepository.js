// src/repositories/documentRepository.js
const fs = require('fs').promises;
const path = require('path');

const META_PATH = path.join(__dirname, '../../data/documents.json');
const ARCHIVE_PATH = path.join(__dirname, '../../data/archive.json');
const CONTENT_DIR = path.join(__dirname, '../../data/content'); // change if uploads/ used

async function readMetadata() {
  try {
    const raw = await fs.readFile(META_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeMetadata(arr) {
  await fs.writeFile(META_PATH, JSON.stringify(arr, null, 2), 'utf8');
}

async function readArchive() {
  try {
    const raw = await fs.readFile(ARCHIVE_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeArchive(arr) {
  await fs.writeFile(ARCHIVE_PATH, JSON.stringify(arr, null, 2), 'utf8');
}

/**
 * Archive metadata and delete physical content file for a document only if status === 'REJECTED'
 * @param {Object} opts { id, performedBy, reason }
 * @returns archived metadata object (the moved record)
 */
async function archiveAndDeleteDocumentById({ id, performedBy = 'system', reason = '' }) {
  // Load metadata (non-blocking file IO using promises)
  const docs = await readMetadata();
  const idx = docs.findIndex(d => String(d.id) === String(id));
  if (idx === -1) {
    const err = new Error(`Document with id ${id} not found`);
    err.code = 'NOT_FOUND';
    throw err;
  }

  const doc = docs[idx];

  // Enforce allowed deletion only when REJECTED
  if (!doc.status || doc.status.toUpperCase() !== 'REJECTED') {
    const err = new Error(`Document id ${id} cannot be deleted — status is ${doc.status}`);
    err.code = 'NOT_ALLOWED';
    throw err;
  }

  // Delete content file if exists
  if (doc.filename) {
    const contentPath = path.join(CONTENT_DIR, doc.filename);
    try {
      await fs.unlink(contentPath);
    } catch (unlinkErr) {
      // If file doesn't exist, we still proceed to archive metadata, but log the error up
      if (unlinkErr.code !== 'ENOENT') {
        // some other FS error: rethrow
        throw unlinkErr;
      }
      // if ENOENT, continue — content file already gone
    }
  }

  // Remove from active metadata array
  docs.splice(idx, 1);
  await writeMetadata(docs);

  // Append archival metadata with deletion audit info
  const archived = {
    ...doc,
    archivedAt: new Date().toISOString(),
    archivedBy: performedBy,
    deletionReason: reason
  };
  const archiveArr = await readArchive();
  archiveArr.push(archived);
  await writeArchive(archiveArr);

  return archived;
}

module.exports = { archiveAndDeleteDocumentById, readMetadata, writeMetadata };
