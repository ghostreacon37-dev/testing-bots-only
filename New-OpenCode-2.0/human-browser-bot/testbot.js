// testbot.js — Custom redirect method bot (x.com replacement)
// Follows the exact 6-step redirect flow with human-like behavior.
//
// Usage:
//   node testbot.js <target_url> <referrer_url> [options]
//
// Example:
//   node testbot.js https://example.com https://referrer.example.com/page --confirm-owned --debug --headless=false --speed=normal

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { parseArgs, usage, SPEED_PRESETS } = require('./bot/config');
const { ProfileManager } = require('./bot/profileManager');
const { ProxyManager } = require('./bot/proxyManager');
const { runTabFlow } = require('./bot/flows');
const { sleep, rand } = require('./bot/utils');
const { ensureCSV } = require('./bot/logger');
const { createSession, destroySession } = require('./bot/browserFactory');

async function main() {
  const stepConfig = require('./bot/config');
  const cliCfg = parseArgs();
  const cfg = { ...stepConfig, ...cliCfg };

  const preset = SPEED_PRESETS[cfg.speed || 'normal'] || SPEED_PRESETS.normal;
  cfg._speedMult = preset.multiplier;
  cfg._readMult = preset.readMultiplier;

  if (!cfg.target || !cfg.referrer) {
    console.error(usage());
    process.exit(1);
  }
  if (!cfg.confirmOwned) {
    console.error('ERROR: This script requires --confirm-owned. Only run on domains you own or have permission to test.');
    process.exit(1);
  }

  try { cfg.targetHost = new URL(cfg.target).hostname; } catch (_) {
    console.error('ERROR: Invalid target URL');
    process.exit(1);
  }

  if (cfg.proxyMode && !cfg.proxyFile) {
    console.error('ERROR: --proxy enabled but no proxy file specified. Use --proxy-file=proxies.txt');
    process.exit(1);
  }

  const profileManager = new ProfileManager(cfg.uaFile);
  const proxyManager = new ProxyManager(cfg.proxyMode ? cfg.proxyFile : null, cfg.proxyRotation);

  if (cfg.proxyMode && !proxyManager.hasProxies()) {
    console.error(`ERROR: No proxies found in ${cfg.proxyFile}`);
    process.exit(1);
  }

  ensureCSV();

  console.log(`Starting custom redirect bot — target: ${cfg.target}, referrer: ${cfg.referrer}`);
  console.log(`Runs: ${cfg.runs}${cfg.forever ? ' (forever)' : ''}, interval=${cfg.interval}ms, speed=${cfg.speed}`);
  if (cfg.fixedInstances) {
    console.log(`Using fixed instances: ${cfg.fixedInstances}`);
  } else {
    console.log(`Tabs per run: random ${cfg.minTabs}..${cfg.maxTabs}`);
  }
  console.log(`Proxy mode: ${cfg.proxyMode ? 'enabled' : 'disabled'} ${cfg.oneBrowserPerTab ? '(one browser per tab)' : '(shared browser)'}`);
  console.log(`Total UA profiles loaded: ${profileManager.getUaList().length}`);
  if (cfg.proxyMode) console.log(`Total proxies loaded: ${proxyManager.proxies.length}`);

  let run = 0;
  let stop = false;
  process.on('SIGINT', () => { console.log('\nSIGINT received — stopping after current run'); stop = true; });
  process.on('SIGTERM', () => { console.log('\nSIGTERM received — stopping after current run'); stop = true; });

  while (!stop && (cfg.forever || run < cfg.runs)) {
    run++;
    console.log(`\n=== Run ${run} ===`);

    const tabCount = cfg.fixedInstances ? cfg.fixedInstances : rand(cfg.minTabs, cfg.maxTabs);
    const flows = [];
    const sessions = [];

    if (cfg.oneBrowserPerTab) {
      for (let t = 0; t < tabCount; t++) {
        const session = await createSession({ puppeteer, profileManager, proxyManager, cfg, tabIndex: t + 1 });
        sessions.push(session);
        flows.push(
          runTabFlow({ puppeteer, page: session.page, cfg, run, browser: session.browser, tabIndex: t + 1 })
        );
        await sleep(rand(300, 1200));
      }
    } else {
      const launchArgs = [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', '--disable-infobars', '--window-position=0,0',
      ];
      const proxy = proxyManager && proxyManager.getProxy ? proxyManager.getProxy() : null;
      if (proxy) {
        launchArgs.push(`--proxy-server=${proxy}`);
        if (cfg.debug) console.log(`  shared browser using proxy: ${proxy}`);
      }
      const browser = await puppeteer.launch({
        headless: cfg.headless !== false,
        args: launchArgs,
      });
      sessions.push({ browser });

      const VIEWPORTS = [
        { width: 1366, height: 768 },
        { width: 1920, height: 1080 },
        { width: 1440, height: 900 },
        { width: 1536, height: 864 },
        { width: 1280, height: 720 },
        { width: 1600, height: 900 },
      ];
      const LANGUAGES = ['en-US,en', 'en-GB,en', 'en-US,en;q=0.9', 'en-CA,en', 'en-AU,en'];
      const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'];

      for (let t = 0; t < tabCount; t++) {
        const page = await browser.newPage();
        const viewport = cfg.randomViewport !== false
          ? VIEWPORTS[rand(0, VIEWPORTS.length - 1)]
          : { width: 1366, height: 768 };
        await page.setViewport(viewport);

        const ua = profileManager && profileManager.getRandomUa ? profileManager.getRandomUa() : null;
        if (ua) {
          await page.setUserAgent(ua).catch(() => {});
          if (cfg.debug) console.log(`  tab[${t + 1}] UA: ${ua.slice(0, 40)}...`);
        }

        const acceptLang = LANGUAGES[rand(0, LANGUAGES.length - 1)];
        await page.setExtraHTTPHeaders({ 'Accept-Language': acceptLang }).catch(() => {});

        const platform = ['Win32', 'MacIntel', 'Linux x86_64'][rand(0, 2)];
        const timezone = TIMEZONES[rand(0, TIMEZONES.length - 1)];
        await page.evaluateOnNewDocument(({ lang, tz, platform }) => {
          Object.defineProperty(navigator, 'languages', { get: () => lang.split(','), configurable: true });
          Object.defineProperty(navigator, 'language', { get: () => lang.split(',')[0], configurable: true });
          Object.defineProperty(navigator, 'platform', { get: () => platform, configurable: true });
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
          try {
            Object.defineProperty(window, 'chrome', { get: () => ({ runtime: {} }), configurable: true });
          } catch (_) {}
          try {
            Object.defineProperty(navigator, 'permissions', {
              get: () => ({ query: () => Promise.resolve({ state: 'granted' }) }),
              configurable: true,
            });
          } catch (_) {}
        }, { lang: acceptLang, tz: timezone, platform });

        if (cfg.debug) {
          console.log(`  tab[${t + 1}] session created (viewport=${viewport.width}x${viewport.height})`);
        }

        flows.push(
          runTabFlow({ puppeteer, page, cfg, run, browser, tabIndex: t + 1 })
        );
        await sleep(rand(300, 1200));
      }
    }

    const results = await Promise.allSettled(flows);

    for (const session of sessions) {
      if (session.page) { try { await session.page.close(); } catch (_) {} }
      if (session.browser) { try { await session.browser.close(); } catch (_) {} }
    }

    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        const v = r.value;
        const errPart = v.error ? ` error="${v.error}"` : '';
        console.log(` - tab${v.tab}: clicked=${v.clicked} postOpened=${v.postOpened} url=${v.finalUrl} step=${v.step}${errPart}`);
      } else {
        console.log(' - tab failed:', r.reason);
      }
    });

    if (cfg.forever || run < cfg.runs) {
      if (stop) break;
      console.log(`Waiting ${cfg.interval}ms before next run...`);
      await sleep(cfg.interval);
    }
  }

  console.log('All runs complete. See sessions_log.csv for details.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal error:', e && e.message ? e.message : e);
  process.exit(1);
});
