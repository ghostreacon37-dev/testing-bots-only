// logger.js — CSV logging for bot sessions
// Creates sessions_log.csv with a header row and provides an append helper.

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

/**
 * Ensure the session log CSV exists with a header row.
 * Safe to call multiple times; will not overwrite an existing file.
 */
function ensureCSV() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, HEADER, 'utf8');
    }
  } catch (e) {
    console.log(`  logger: could not ensure CSV: ${e && e.message}`);
  }
}

/**
 * Append a single session result row to the CSV.
 */
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
