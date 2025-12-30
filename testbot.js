/**
 * testbot.js (UX / behavior testing only)
 * HUMAN‑VARIATION EDITION
 * ONLY for domains you own or have permission to test
 */

const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const path = require('path');
puppeteer.use(require('puppeteer-extra-plugin-stealth')());

/* ---------- helpers ---------- */
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ---------- human behavior profiles ---------- */
const BEHAVIORS = ['reader', 'skimmer', 'bouncer', 'idle', 'confused'];
function pickBehavior() {
  return BEHAVIORS[rand(0, BEHAVIORS.length - 1)];
}

/* ---------- user agents / viewports ---------- */
const UA_LIST = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 Version/16.6 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1'
];

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 412, height: 915 },
  { width: 390, height: 844 },
  { width: 1024, height: 768 }
];

/* ---------- micro actions ---------- */
async function microMouse(page, moves = 4) {
  const v = page.viewport() || { width: 800, height: 600 };
  for (let i = 0; i < moves; i++) {
    await page.mouse.move(
      rand(5, v.width - 5),
      rand(5, v.height - 5),
      { steps: rand(2, 10) }
    );
    await sleep(rand(100, 600));
  }
}

async function humanScroll(page) {
  const steps = rand(1, 6);
  for (let i = 0; i < steps; i++) {
    await page.evaluate(y => window.scrollBy(0, y), rand(-300, 700));
    await sleep(rand(400, 2500));
  }
}

async function maybeIdle() {
  if (Math.random() < 0.25) {
    await sleep(rand(15000, 60000));
    return true;
  }
  return false;
}

async function maybeResize(page) {
  if (Math.random() < 0.1) {
    await page.setViewport({
      width: rand(360, 1600),
      height: rand(600, 1000)
    });
  }
}

async function maybeMisclick(page) {
  if (Math.random() < 0.15) {
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a, button'))
        .filter(e => e.offsetParent !== null);
      if (els.length) els[Math.floor(Math.random() * els.length)].click();
    });
    await sleep(rand(2000, 5000));
  }
}

function shouldBounce(rate = 0.35) {
  return Math.random() < rate;
}

/* ---------- logging ---------- */
function appendCSV(row) {
  const csv = path.join(process.cwd(), 'sessions_log.csv');
  if (!fs.existsSync(csv)) {
    fs.writeFileSync(
      csv,
      'timestamp,run,tab,behavior,final_url,duration_ms\n'
    );
  }
  fs.appendFileSync(csv, row.map(v => `"${v}"`).join(',') + '\n');
}

/* ---------- main ---------- */
(async () => {
  const target = process.argv[2];
  const referrer = process.argv[3];

  if (!target || !referrer || !process.argv.includes('--confirm-owned')) {
    console.error('Usage: node testbot.js <target> <referrer> --confirm-owned');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const behavior = pickBehavior();
  const start = Date.now();

  await page.setUserAgent(UA_LIST[rand(0, UA_LIST.length - 1)]);
  await page.setViewport(VIEWPORTS[rand(0, VIEWPORTS.length - 1)]);
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  /* ---- referrer ---- */
  await page.goto(referrer, { waitUntil: 'domcontentloaded' });

  if (behavior === 'idle') {
    await sleep(rand(30000, 90000));
  } else {
    await humanScroll(page);
    await microMouse(page);
  }

  if (behavior === 'bouncer' && shouldBounce(0.6)) {
    appendCSV([new Date().toISOString(), 1, 'tab1', behavior, referrer, Date.now() - start]);
    await browser.close();
    return;
  }

  /* ---- target ---- */
  await page.goto(target, { waitUntil: 'domcontentloaded', referer: referrer });

  if (await maybeIdle()) {
    appendCSV([new Date().toISOString(), 1, 'tab1', behavior, target, Date.now() - start]);
    await browser.close();
    return;
  }

  await maybeResize(page);
  await humanScroll(page);
  await maybeMisclick(page);

  /* ---- internal navigation ---- */
  if (behavior !== 'bouncer') {
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'))
        .filter(a => a.href.includes(location.hostname));
      if (links.length) {
        links[Math.floor(Math.random() * links.length)].click();
      }
    });
    await sleep(rand(8000, 30000));
    await humanScroll(page);
  }

  appendCSV([
    new Date().toISOString(),
    1,
    'tab1',
    behavior,
    await page.url(),
    Date.now() - start
  ]);

  await browser.close();
})();
