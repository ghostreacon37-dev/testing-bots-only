// logger.js — CSV logging for bot sessions

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'sessions_log.csv');

const HEADER = [
  'timestamp',
  'run',
  'tab',
  'success',
  'step',
  'clicked',
  'postOpened',
  'error',
  'finalUrl',
].join(',') + '\n';

function ensureCSV() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, HEADER, 'utf8');
    }
  } catch (e) {
    console.log(`  logger: could not ensure CSV: ${e && e.message}`);
  }
}

function appendRow(row) {
  try {
    const line = [
      new Date().toISOString(),
      row.run != null ? row.run : '',
      row.tab != null ? row.tab : '',
      row.success != null ? row.success : '',
      row.step != null ? row.step : '',
      row.clicked != null ? row.clicked : '',
      row.postOpened != null ? row.postOpened : '',
      (row.error || '').replace(/,/g, ' ').replace(/\n/g, ' '),
      row.finalUrl || '',
    ].join(',') + '\n';
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (e) {
    console.log(`  logger: could not append row: ${e && e.message}`);
  }
}

module.exports = { ensureCSV, appendRow, LOG_FILE };
