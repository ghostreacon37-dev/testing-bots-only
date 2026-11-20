// page-actions.js — Standalone CLI entry point for the custom redirect bot
// Follows the exact 6-step redirect flow (same as testbot.js but single-tab mode).

const path = require('path');
const config = require('./config');
const { humanClick, humanScroll, humanMicroActions, humanHover, humanTextSelection } = require('./humanActions');
const { runTabFlow } = require('./flows');
const { sleep, rand } = require('./utils');

async function main() {
  const args = process.argv.slice(2);
  const targetUrl = args[0];
  const referrerUrl = args[1];
  const options = {};

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value ? value : true;
    }
  }

  if (!targetUrl || !referrerUrl) {
    console.error('Usage: node page-actions.js <target_url> <referrer_url> [options]');
    console.error('Options: --debug, --confirm-owned, --runs=N, --interval=ms, --headless=false');
    process.exit(1);
  }

  if (options.confirmOwned !== true && options.c === undefined) {
    console.error('ERROR: This script requires --confirm-owned. Only run on domains you own or have permission to test.');
    process.exit(1);
  }

  const puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());

  const cfg = {
    target: targetUrl,
    referrer: referrerUrl,
    debug: options.debug || false,
    confirmOwned: options.confirmOwned === true,
    speed: options.speed || 'normal',
    headless: options.headless !== false,
    randomViewport: options['no-random-viewport'] ? false : true,
    ...config,
  };

  console.log(`Starting custom redirect bot — target: ${cfg.target}`);
  console.log(`Referrer: ${cfg.referrer}`);
  console.log(`Runs: ${options.runs || 1}${options.forever ? ' (forever)' : ''}`);
  console.log(`Speed: ${cfg.speed}, headless: ${cfg.headless}`);

  const browser = await puppeteer.launch({
    headless: cfg.headless !== false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-infobars', '--window-position=0,0'],
  });

  let run = 0;
  const totalRuns = options.forever ? Infinity : (options.runs || 1);

  while (!options.forever || run < totalRuns) {
    run++;
    console.log(`\n=== Run ${run} ===`);

    const page = await browser.newPage();
    const VIEWPORTS = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1280, height: 720 },
      { width: 1600, height: 900 },
    ];
    const viewport = cfg.randomViewport !== false
      ? VIEWPORTS[rand(0, VIEWPORTS.length - 1)]
      : { width: 1366, height: 768 };
    await page.setViewport(viewport);

    const result = await runTabFlow({ puppeteer, page, cfg, run, browser, tabIndex: 1 });

    console.log(`  Run ${result.run} result: tab${result.tab} success=${result.success} step=${result.step}`);
    console.log(`  Final URL: ${await page.url()}`);

    await page.close();

    if (options.forever || run < totalRuns) {
      const interval = options.interval || 20000;
      console.log(`Waiting ${interval}ms before next run...`);
      await sleep(interval);
    }
  }

  console.log('All runs complete.');
  await browser.close();
  process.exit(0);
}

module.exports = { main, runTabFlow };

if (require.main === module) {
  main().catch((e) => {
    console.error('Fatal error:', e && e.message ? e.message : e);
    process.exit(1);
  });
}
