// page-actions.js — Main browser automation entry point
// Mirrors OpenCode bot's pageActions.js structure

const path = require('path');
const config = require('./config');
const { humanClick, humanScroll, humanMicroActions, humanHover, humanTextSelection } = require('./humanActions');
const { runTabFlow } = require('./flows');
const { sleep, rand } = require('./utils');

/**
 * Main entry point for the human browser bot
 * Usage: node page-actions.js <target_url> <referrer_url> [options]
 *
 * Steps executed:
 * Step 1: Go to website, wait 5-60sec, click Open
 * Step 2: Wait 10-25sec, click Next, handle Scroll Down if appears, wait 5-10sec
 * Step 3: Click Open, reload site, 67/100 probability, scroll for humanize, wait 3-13sec
 * Step 4: Click Continue, wait 3-7sec
 * Step 5: Click Go to Link, wait 2-12sec
 * Step 6: Click Open Link, continue browse like a human
 */

async function main() {
  // Parse command line arguments
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
    console.error('Options: --debug, --confirm-owned, --runs=N, --interval=ms');
    process.exit(1);
  }

  // Confirm ownership (safety check)
  if (options.confirmOwned !== true && options.c === undefined) {
    console.error('ERROR: This script requires --confirm-owned. Only run on domains you own or have permission to test.');
    process.exit(1);
  }

  // Set up Puppeteer with stealth plugin
  const puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());

  // Configure wait times from config
  const cfg = {
    target: targetUrl,
    referrer: referrerUrl,
    debug: options.debug || false,
    confirmOwned: options.confirmOwned === true,
    minRefWait: 5000,
    maxRefWait: 60000,
    minTargetWait: 3000,
    maxTargetWait: 13000,
    ...config, // spread all config values
  };

  console.log(`Starting human browser bot — target: ${cfg.target}`);
  console.log(`Referrer: ${cfg.referrer}`);
  console.log(`Runs: ${options.runs || 1}${options.forever ? ' (forever)' : ''}`);
  console.log(`Proxy mode: ${options.proxy ? 'enabled' : 'disabled'}`);
  console.log(`Debug mode: ${cfg.debug}`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: options.headless !== false, // default to headless unless --headless disabled
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Run multiple runs if specified
  let run = 0;
  const totalRuns = options.forever ? Infinity : (options.runs || 1);

  while (!options.forever || run < totalRuns) {
    run++;
    console.log(`\n=== Run ${run} ===`);

    // Create a new tab/page
    const page = await browser.newPage();
    // Set realistic viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Run the tab flow (all 6 steps)
    const result = await runTabFlow({ puppeteer, page, cfg, run, tabIndex: 1 });

    console.log(`  Run ${run} result: tab${result.tab} success=${result.success} step=${result.step}`);
    console.log(`  Final URL: ${await page.url()}`);

    // Close the page
    await page.close();

    if (options.forever || run < totalRuns) {
      const interval = options.interval || 30000;
      console.log(`Waiting ${interval}ms before next run...`);
      await sleep(interval);
    }
  }

  console.log('All runs complete. See logs above for details.');
  await browser.close();
  process.exit(0);
}

module.exports = { main, runTabFlow };

// Run as a standalone CLI script only when invoked directly, not when required.
if (require.main === module) {
  main().catch((e) => {
    console.error('Fatal error:', e && e.message ? e.message : e);
    process.exit(1);
  });
}