/**
 * testbot_ultra_human.js
 * Comprehensive UI Tester with High-Fidelity Human Mimicry
 */

const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const path = require('path');
puppeteer.use(require('puppeteer-extra-plugin-stealth')());

/* ---------- Configuration & Helpers ---------- */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const UA_LIST = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/604.1',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

/* ---------- Advanced Human Physics (Mouse & Keyboard) ---------- */

// Moves mouse in a curved, shaky path like a human hand
async function humanMove(page, targetX, targetY) {
  try {
    const start = await page.evaluate(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
    const steps = rand(15, 30);
    // Control point for Bezier Curve
    const cp1x = (start.x + targetX) / 2 + (Math.random() * 200 - 100);
    const cp1y = (start.y + targetY) / 2 + (Math.random() * 200 - 100);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * cp1x + t * t * targetX;
      const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * cp1y + t * t * targetY;
      await page.mouse.move(x + rand(-2, 2), y + rand(-2, 2)); // Add slight "shake"
      await sleep(rand(5, 15));
    }
  } catch (e) {}
}

// Types with mistakes and variable speed
async function humanType(page, selector, text) {
  await page.focus(selector);
  for (const char of text) {
    if (Math.random() < 0.05) { // 5% chance of typo
      await page.keyboard.type(String.fromCharCode(97 + Math.floor(Math.random() * 26)));
      await sleep(rand(100, 300));
      await page.keyboard.press('Backspace');
    }
    await page.keyboard.type(char);
    await sleep(rand(50, 250));
  }
}

async function humanClick(page, element) {
  const box = await element.boundingBox();
  if (box) {
    await humanMove(page, box.x + box.width / 2, box.y + box.height / 2);
    await sleep(rand(600, 1500)); // "Hover/Think" time
    await page.mouse.down();
    await sleep(rand(40, 120));
    await page.mouse.up();
  }
}

/* ---------- The Brain: Decision Making Loop ---------- */

async function performHumanActions(page, durationMs, isTargetSite = false) {
  const end = Date.now() + durationMs;
  while (Date.now() < end) {
    const dice = Math.random();

    if (dice > 0.85) {
      // Action: Natural Smooth Scroll
      const amount = rand(200, 600) * (Math.random() > 0.15 ? 1 : -0.3);
      await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), amount);
      await sleep(rand(2000, 4000));

    } else if (dice > 0.70) {
      // Action: Window Focus/Fidget
      if (Math.random() > 0.5) {
          await page.evaluate(() => window.scrollBy(0, 10)); // Tiny micro-scroll
          await sleep(50);
          await page.evaluate(() => window.scrollBy(0, -10));
      }
      await humanMove(page, rand(100, 800), rand(100, 600));

    } else if (dice > 0.60 && isTargetSite) {
      // Action: Highlight text to "read"
      await page.mouse.click(rand(200, 500), rand(200, 500), { clickCount: 3 });
      await sleep(rand(1500, 3000));
      await page.mouse.click(1, 1); // Clear highlight

    } else if (dice > 0.50) {
      // Action: Resize window slightly (common human behavior)
      const width = rand(1000, 1400);
      const height = rand(700, 900);
      await page.setViewport({ width, height });

    } else {
      // Action: Idle/Reading
      await sleep(rand(3000, 8000));
    }
  }
}

/* ---------- Main Bot Flow ---------- */

async function startSession(cfg, runNum, tabIndex) {
  const host = new URL(cfg.target).hostname;
  const browser = await puppeteer.launch({
    headless: !!cfg.headless,
    args: ['--no-sandbox', '--disable-web-security']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA_LIST[rand(0, UA_LIST.length - 1)]);
    await page.setViewport({ width: 1366, height: 768 });

    // 1. Visit Referrer
    console.log(`[R${runNum} T${tabIndex}] Opening Referrer: ${cfg.referrer}`);
    await page.goto(cfg.referrer, { waitUntil: 'networkidle2' });
    await performHumanActions(page, rand(20000, 40000)); 

    // 2. Click through to Target
    const targetLink = await page.evaluateHandle((h) => {
      return Array.from(document.querySelectorAll('a')).find(a => a.href.includes(h));
    }, host);

    if (targetLink.asElement()) {
      await humanClick(page, targetLink.asElement());
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    } else {
      await page.goto(cfg.target, { referer: cfg.referrer });
    }

    // 3. Human activity on target (learnwithblog.xyz)
    console.log(`[R${runNum} T${tabIndex}] On target site. Starting behavioral testing...`);
    await performHumanActions(page, rand(cfg.minWait, cfg.maxWait), true);

    // 4. Random Internal Navigation
    const internal = await page.$$('a[href^="/"], a[href*="' + host + '"]');
    if (internal.length > 0) {
      const pick = internal[rand(0, Math.min(internal.length - 1, 15))];
      await humanClick(page, pick);
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await performHumanActions(page, rand(30000, 60000), true);
    }

    await browser.close();
  } catch (err) {
    console.error(`Tab ${tabIndex} error:`, err.message);
    await browser.close();
  }
}

// Execute
(async () => {
  const cfg = {
    target: process.argv[2] || "https://learnwithblog.xyz",
    referrer: process.argv[3] || "https://t.co/example",
    runs: 3,
    minWait: 60000,
    maxWait: 120000,
    headless: false
  };

  for (let r = 1; r <= cfg.runs; r++) {
    console.log(`\n--- Starting Run ${r} ---`);
    const tabCount = rand(2, 3);
    const sessions = [];
    for (let t = 1; t <= tabCount; t++) {
      sessions.push(startSession(cfg, r, t));
      await sleep(rand(8000, 20000)); // Natural gap between users joining
    }
    await Promise.all(sessions);
    console.log(`Run ${r} finished. Cooling down...`);
    await sleep(30000);
  }
})();
