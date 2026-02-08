// src/routes/documents.js
const express = require('express');
const router = express.Router();
const { deleteDocumentHandler } = require('../controllers/documentsController');

// other routes: GET, POST, PUT, PATCH ...
router.delete('/:id', deleteDocumentHandler);

module.exports = router;
