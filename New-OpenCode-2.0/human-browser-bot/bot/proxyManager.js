// proxyManager.js — Manages proxy lists for the bot

const fs = require('fs');
const { rand } = require('./utils');

class ProxyManager {
  constructor(proxyFile, rotation = false) {
    this.proxyFile = proxyFile;
    this.rotation = rotation === true;
    this.proxies = this._loadProxies();
    this._index = 0;
  }

  _loadProxies() {
    if (!this.proxyFile) return [];
    try {
      if (!fs.existsSync(this.proxyFile)) {
        console.log(`  Proxy file not found: ${this.proxyFile}`);
        return [];
      }
      const raw = fs.readFileSync(this.proxyFile, 'utf8');
      const proxies = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
      return proxies;
    } catch (e) {
      console.log(`  Failed to read proxy file: ${e && e.message}`);
      return [];
    }
  }

  hasProxies() {
    return this.proxies.length > 0;
  }

  getProxy() {
    if (!this.hasProxies()) return null;
    if (this.rotation) {
      const proxy = this.proxies[this._index % this.proxies.length];
      this._index++;
      return proxy;
    }
    return this.proxies[rand(0, this.proxies.length - 1)];
  }
}

module.exports = { ProxyManager };
