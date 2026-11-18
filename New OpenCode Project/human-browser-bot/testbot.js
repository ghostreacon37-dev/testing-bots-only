// testbot.js — Human-like browser automation bot
// Custom redirect method replacement for x.com-style redirects
// Modular structure inspired by OpenCode bot (site-tester-bot)

// Usage:
// node testbot.js <target_url> <referrer_url> [options]
//
// Example:
// node testbot.js https://example.com https://referrer.example.com/page --confirm-owned --debug

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { parseArgs, usage } = require('./bot/config');
const { ProfileManager } = require('./bot/profileManager');
const { ProxyManager } = require('./bot/proxyManager');
const { runTabFlow } = require('./bot/flows');
const { sleep, rand } = require('./bot/utils');
const { ensureCSV } = require('./bot/logger');
const { createSession } = require('./bot/browserFactory');

async function main() {
  const cfg = parseArgs();

  if (!cfg.target || !cfg.referrer) {
    console.error(usage());
    process.exit(1);
  }
  if (!cfg.confirmOwned) {
    console.error('ERROR: This script requires --confirm-owned. Only run on domains you own or have permission to test.');
    process.exit(1);
  }

  cfg.targetHost = new URL(cfg.target).hostname;

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

  console.log(`Starting human browser bot — target: ${cfg.target}, referrer: ${cfg.referrer}`);
  console.log(`Runs: ${cfg.runs}${cfg.forever ? ' (forever)' : ''}, interval=${cfg.interval}ms`);
  if (cfg.fixedInstances) {
    console.log(`Using fixed instances: ${cfg.fixedInstances}`);
  } else {
    console.log(`Tabs per run: random ${cfg.minTabs}..${cfg.maxTabs}`);
  }
  console.log(`Proxy mode: ${cfg.proxyMode ? 'enabled' : 'disabled'} ${cfg.oneBrowserPerTab ? '(one browser per tab)' : '(single browser)'}`);
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
    const sessions = []; // track { browser, page } for cleanup

    if (cfg.oneBrowserPerTab) {
      // Each tab gets its own browser + page so it can have its own proxy.
      for (let t = 0; t < tabCount; t++) {
        const session = await createSession({ puppeteer, profileManager, proxyManager, cfg, tabIndex: t + 1 });
        sessions.push(session);
        flows.push(
          runTabFlow({ puppeteer, page: session.page, cfg, run, tabIndex: t + 1 })
        );
        await sleep(rand(300, 1200)); // stagger launches
      }
    } else {
      // Shared browser with multiple tabs (pages); no per-tab proxy support.
      const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
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
      for (let t = 0; t < tabCount; t++) {
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        const ua = profileManager && profileManager.getRandomUa ? profileManager.getRandomUa() : null;
        if (ua) {
          await page.setUserAgent(ua).catch(() => {});
          if (cfg.debug) console.log(`  tab[${t + 1}] UA: ${ua.slice(0, 40)}...`);
        }
        flows.push(
          runTabFlow({ puppeteer, page, cfg, run, tabIndex: t + 1 })
        );
        await sleep(rand(300, 1200));
      }
    }

    const results = await Promise.allSettled(flows);

    // Close every browser/page created this run.
    for (const session of sessions) {
      if (session.page) {
        try { await session.page.close(); } catch (_) {}
      }
      if (session.browser) {
        try { await session.browser.close(); } catch (_) {}
      }
    }

    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        const v = r.value;
        const errPart = v.error ? ` error="${v.error}"` : '';
        console.log(` - tab${v.tab}: clicked=${v.clicked} postOpened=${v.postOpened} url=${v.finalUrl}${errPart}`);
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