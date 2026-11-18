// browserFactory.js — Creates and destroys browser sessions (pages)
// Realistic fingerprints: randomized viewport, UA, language, timezone, platform,
// screen dimensions, plus anti-automation stealth overrides.

const { rand, randFloat } = require('./utils');

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
  { width: 1600, height: 900 },
  { width: 1280, height: 1024 },
  { width: 1920, height: 1200 },
];

const LANGUAGES = [
  'en-US,en',
  'en-GB,en',
  'en-US,en;q=0.9',
  'en-CA,en',
  'en-AU,en',
  'en-US,en;q=0.8,es;q=0.6',
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'];

async function createSession({ puppeteer, profileManager, proxyManager, cfg, tabIndex }) {
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-position=0,0',
    '--disable-dev-shm-usage',
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
    defaultViewport: null,
  });

  const page = await browser.newPage();

  const viewport = cfg.randomViewport !== false
    ? VIEWPORTS[rand(0, VIEWPORTS.length - 1)]
    : { width: 1366, height: 768 };
  await page.setViewport(viewport);

  if (ua) {
    await page.setUserAgent(ua).catch(() => {});
  }

  const acceptLang = LANGUAGES[rand(0, LANGUAGES.length - 1)];
  await page.setExtraHTTPHeaders({ 'Accept-Language': acceptLang }).catch(() => {});

  const platform = PLATFORMS[rand(0, PLATFORMS.length - 1)];
  const timezone = TIMEZONES[rand(0, TIMEZONES.length - 1)];

  // Stealth: override navigator properties to reduce automation detection
  await page.evaluateOnNewDocument(({ lang, tz, platform }) => {
    Object.defineProperty(navigator, 'languages', { get: () => lang.split(','), configurable: true });
    Object.defineProperty(navigator, 'language', { get: () => lang.split(',')[0], configurable: true });
    Object.defineProperty(navigator, 'platform', { get: () => platform, configurable: true });
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
    try {
      Object.defineProperty(window, 'chrome', {
        get: () => ({ runtime: {} }),
        configurable: true,
      });
    } catch (_) {}
    try {
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({ query: () => Promise.resolve({ state: 'granted' }) }),
        configurable: true,
      });
    } catch (_) {}
    try {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => rand(2, 8), configurable: true });
    } catch (_) {}
    try {
      Object.defineProperty(navigator, 'deviceMemory', { get: () => rand(2, 8), configurable: true });
    } catch (_) {}
    try {
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => platform === 'Win32' ? rand(0, 1) : 0, configurable: true });
    } catch (_) {}
  }, { lang: acceptLang, tz: timezone, platform });

  if (cfg.debug) {
    console.log(`  tab[${tabIndex}] session created (viewport=${viewport.width}x${viewport.height}, UA: ${ua ? ua.slice(0, 40) + '...' : 'default'})`);
  }

  return { browser, page };
}

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
