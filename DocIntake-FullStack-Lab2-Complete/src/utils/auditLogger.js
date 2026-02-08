
const fs = require('fs').promises;
const path = require('path');
const AUDIT_LOG = path.join(__dirname, '../../data/audit.log');

async function appendAudit(entry) {
  // entry: object -> stringify one-line json per event
  const line = JSON.stringify(entry) + '\n';
  await fs.appendFile(AUDIT_LOG, line, 'utf8');
}

module.exports = { appendAudit };
