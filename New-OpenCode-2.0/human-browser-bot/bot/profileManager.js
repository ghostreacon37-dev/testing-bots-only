// profileManager.js — Manages user-agent profiles for the bot

const fs = require('fs');
const { rand } = require('./utils');

const DEFAULT_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

class ProfileManager {
  constructor(uaFile) {
    this.uaFile = uaFile;
    this.uas = this._loadUas();
  }

  _loadUas() {
    if (!this.uaFile) return DEFAULT_UAS.slice();
    try {
      if (!fs.existsSync(this.uaFile)) {
        console.log(`  UA file not found: ${this.uaFile}, using defaults`);
        return DEFAULT_UAS.slice();
      }
      const raw = fs.readFileSync(this.uaFile, 'utf8');
      const uas = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
      return uas.length > 0 ? uas : DEFAULT_UAS.slice();
    } catch (e) {
      console.log(`  Failed to read UA file: ${e && e.message}, using defaults`);
      return DEFAULT_UAS.slice();
    }
  }

  getUaList() {
    return this.uas;
  }

  getRandomUa() {
    const list = this.getUaList();
    return list[rand(0, list.length - 1)];
  }
}

module.exports = { ProfileManager };
