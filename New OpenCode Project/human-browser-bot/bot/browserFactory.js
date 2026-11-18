// browserFactory.js — Creates and destroys browser sessions (pages)
// Used when running multiple tabs in a single shared browser instance.

const { rand } = require('./utils');

/**
 * Launch a browser and create a page for a tab/session.
 * Applies a random user-agent and optional proxy server.
 *
 * @param {Object} opts
 * @param {Object} opts.puppeteer - puppeteer-extra instance (stealth already applied)
 * @param {Object} opts.profileManager - ProfileManager instance for UAs
 * @param {Object} opts.proxyManager - ProxyManager instance (optional)
 * @param {Object} opts.cfg - parsed CLI config
 * @param {number} opts.tabIndex - index of this tab (for logging)
 * @returns {Promise<{ browser, page }>}
 */
async function createSession({ puppeteer, profileManager, proxyManager, cfg, tabIndex }) {
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ];

  const proxy = proxyManager && proxyManager.getProxy ? proxyManager.getProxy() : null;
  if (proxy) {
    launchArgs.push(`--proxy-server=${proxy}`);
    if (cfg.debug) console.log(`  tab[${tabIndex}] using proxy: ${proxy}`);
  }

  const ua = profileManager && profileManager.getRandomUa
    ? profileManager.getRandomUa()
    : null;

  const browser = await puppeteer.launch({
    headless: cfg.headless !== false,
    args: launchArgs,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  if (ua) {
    await page.setUserAgent(ua).catch(() => {});
  }
  if (cfg.debug) {
    console.log(`  tab[${tabIndex}] session created (UA: ${ua ? ua.slice(0, 40) + '...' : 'default'})`);
  }

  return { browser, page };
}

/**
 * Close a browser session created by createSession.
 * @param {{ browser, page }} session
 */
async function destroySession(session) {
  if (!session) return;
  try {
    if (session.page) {
      try { await session.page.close(); } catch (_) {}
    }
    if (session.browser) {
      await session.browser.close();
    }
  } catch (_) {}
}

module.exports = { createSession, destroySession };
