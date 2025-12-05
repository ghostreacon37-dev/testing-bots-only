/**
 * webbot.js
 * UX testing bot (safe LEGIT testing).
 * - Every tab starts from a specific X (Twitter) post URL
 * - Clicks the link inside the post to your site
 * - 2-12 random tabs per run (EVERY tab starts at the X post)
 * - Device + UA randomization
 * - Human-like mouse gestures, scrolling, small clicks
 * - Redirect-aware: if your site redirects elsewhere, behaves humanly there
 * - Clears cookies/cache/localStorage between runs (using incognito contexts)
 * - Logs session summaries to logs/
 *
 * IMPORTANT: Use this for testing/QA only. Do not use to manipulate ad metrics.
 */

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const UserAgent = require("user-agents");
const fs = require("fs-extra");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

puppeteer.use(StealthPlugin());

const CONFIG = {
  TARGET_POST: "https://x.com/GhostReacondev/status/1981679871513575623?s=20", // X post that contains your link
  TARGET_DOMAIN: "learnwithblog.xyz",
  MIN_TABS: 2,
  MAX_TABS: 12,
  MIN_ENGAGEMENT_MIN: 2,   // minutes
  MAX_ENGAGEMENT_MIN: 12,  // minutes
  TAB_START_DELAY_MS: { min: 500, max: 2500 }, // stagger tab starts
  RUN_DELAY_MS: { min: 3000, max: 10000 }, // delay between runs
  LOG_DIR: path.join(__dirname, "logs"),
  HEADLESS: false, // set true on server if you accept detection tradeoffs
  MAX_INTERNAL_NAV_CLICKS: 5,
};

fs.ensureDirSync(CONFIG.LOG_DIR);

const DEVICES = [
  "iPhone 13", "iPhone SE", "Pixel 7", "iPad Mini", "Galaxy S20", "Desktop"
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* Human-like mouse move */
async function humanMoveMouse(page, fromX, fromY, toX, toY, steps = 20) {
  const dx = (toX - fromX) / steps;
  const dy = (toY - fromY) / steps;
  let x = fromX, y = fromY;
  for (let i = 0; i < steps; i++) {
    x += dx + (Math.random() - 0.5) * 6;
    y += dy + (Math.random() - 0.5) * 6;
    try {
      await page.mouse.move(Math.round(x), Math.round(y), { steps: 1 });
      await delay(randomInt(8, 40));
    } catch (e) { break; }
  }
}

/* Smooth human-like scroll */
async function humanScroll(page) {
  const steps = randomInt(6, 22);
  for (let i = 0; i < steps; i++) {
    const distance = randomInt(100, 800);
    await page.evaluate((d) => window.scrollBy({ left: 0, top: d, behavior: "smooth" }), distance);
    await delay(randomInt(400, 2200));
    if (Math.random() < 0.12) {
      // small random up-scroll sometimes
      await page.evaluate(() => window.scrollBy({ left: 0, top: -Math.random() * 200, behavior: "smooth" }));
      await delay(randomInt(300, 900));
    }
  }
}

/* Find and click link that contains TARGET_DOMAIN inside the X post */
async function findAndClickTargetLinkOnPost(page, targetDomain) {
  // Wait for anchors to appear, then query inside the tweet area
  await page.waitForTimeout(randomInt(1000, 2500));
  // Attempt a few strategies to locate the anchor safely
  const href = await page.evaluate((targetDomain) => {
    // Strategy: find anchors containing the target domain in href
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    for (const a of anchors) {
      try {
        const href = a.href || "";
        if (href.includes(targetDomain)) return href;
      } catch {}
    }
    return null;
  }, targetDomain);

  if (!href) throw new Error("Nahi mila mittar");

  // Click it by selector matching href (safer)
  const anchorSelector = `a[href^="${href}"], a[href*="${targetDomain}"]`;
  await page.waitForSelector(anchorSelector, { timeout: 20000 });
  // Scroll to link & click with human-like motion
  const box = await page.$eval(anchorSelector, el => {
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
  });
  // move mouse near the element then click
  const x = Math.round(box.x + Math.max(8, Math.random() * (box.w - 16)));
  const y = Math.round(box.y + Math.max(8, Math.random() * (box.h - 16)));
  await humanMoveMouse(page, randomInt(100, 500), randomInt(100, 400), x, y, randomInt(6, 18));
  await delay(randomInt(80, 260));
  await page.mouse.click(x, y);
}
/* Click some safe internal links on the target domain */
async function clickSomeInternalLinks(page, domain) {
  try {
    const links = await page.$$eval("a[href]", els =>
      els.map(a => ({ href: a.href, id: a.id || "", cls: a.className || "", text: a.innerText || "" }))
    );
    // filter internal and safe
    const internal = links
      .filter(l => {
        try {
          return new URL(l.href).hostname.includes(domain);
        } catch {
          return false;
        }
      })
    if (!internal.length) return;
    // shuffle and click up to MAX_INTERNAL_NAV_CLICKS
    for (let i = 0; i < Math.min(internal.length, randomInt(0, CONFIG.MAX_INTERNAL_NAV_CLICKS)); i++) {
      const item = internal.splice(randomInt(0, internal.length - 1), 1)[0];
      try {
        // navigate by goto (safer) with a small chance of a click instead
        if (Math.random() < 0.5) {
          await page.goto(item.href, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
        } else {
          // find element and click
          const sel = `a[href="${item.href}"]`;
          const exists = await page.$(sel);
          if (exists) {
            const box = await page.$eval(sel, el => {
              const r = el.getBoundingClientRect();
              return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
            });
            await humanMoveMouse(page, randomInt(200, 800), randomInt(200, 600), Math.round(box.x + box.w/2), Math.round(box.y + box.h/2), randomInt(6, 18));
            await delay(randomInt(50, 200));
            await page.click(sel).catch(() => {});
          } else {
            await page.goto(item.href, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
          }
        }
        await humanScroll(page);
        await delay(randomInt(800, 4000));
      } catch (e) {
        // ignore navigation failures
      }
    }
  } catch (e) {
    // ignore
  }
}

/* A single tab/session flow:
   - open X post
   - find & click target link inside post
   - behave on target (or on redirected site)
   - clear session data by closing incognito context
*/
async function singleTabFlow(browser, opts) {
  const sessionId = uuidv4();
  const log = { sessionId, start: new Date().toISOString(), device: opts.device, userAgent: opts.ua, events: [] };

  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();
  try {
    // UA + viewport
    await page.setUserAgent(opts.ua);
    if (opts.device === "Desktop 1080p") {
      await page.setViewport({ width: 1366 + randomInt(0, 400), height: 768 + randomInt(0, 300) });
    } else {
      const dev = puppeteer.devices[opts.device];
      if (dev) await page.emulate(dev);
    }

    // small random delay
    await delay(randomInt(400, 1700));

    log.events.push({ t: new Date().toISOString(), event: "open_post", url: CONFIG.TARGET_POST });
    await page.goto(CONFIG.TARGET_POST, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
    await delay(randomInt(1500, 4000));

    // try find & click
    try {
      await findAndClickTargetLinkOnPost(page, CONFIG.TARGET_DOMAIN);
      log.events.push({ t: new Date().toISOString(), event: "clicked_post_link" });
    } catch (err) {
      log.events.push({ t: new Date().toISOString(), event: "link_not_found", error: String(err) });
      // give up this tab gracefully
      await context.close();
      log.end = new Date().toISOString();
      log.success = false;
      await fs.writeJson(path.join(CONFIG.LOG_DIR, `session-${sessionId}.json`), log, { spaces: 2 }).catch(()=>{});
      return log;
    }

    // wait for navigation to finish
    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
    log.events.push({ t: new Date().toISOString(), event: "landed_on", url: page.url() });

    // engagement time (2 - 12 minutes)
    const engagementMs = randomInt(CONFIG.MIN_ENGAGEMENT_MIN * 60000, CONFIG.MAX_ENGAGEMENT_MIN * 60000);
    const endTime = Date.now() + engagementMs;
    log.events.push({ t: new Date().toISOString(), event: "engagement_start", ms: engagementMs });

    while (Date.now() < endTime) {
      try {
        // perform human-like movements & scrolls
        const view = await page.viewport();
        const sx = randomInt(50, view.width - 50);
        const sy = randomInt(50, Math.max(200, view.height - 50));
        const tx = randomInt(50, view.width - 50);
        const ty = randomInt(50, Math.max(200, view.height - 50));
        await humanMoveMouse(page, sx, sy, tx, ty, randomInt(6, 20));
        await delay(randomInt(200, 1200));
        await humanScroll(page);

        // detect if redirected away from target domain
        const curHost = (() => { try { return new URL(page.url()).hostname; } catch { return ""; } })();
        if (!curHost.includes(CONFIG.TARGET_DOMAIN)) {
          // behave on external site too: scroll, wait, maybe click safe internal links
          log.events.push({ t: new Date().toISOString(), event: "redirect_detected", url: page.url() });
          await humanScroll(page);
          await delay(randomInt(3000, 12000));
          // try safe internal link clicks on the new domain occasionally
          if (Math.random() < 0.4) await clickSomeInternalLinks(page, curHost);
        } else {
          // on your domain: sometimes click internal links (but avoid ads)
          if (Math.random() < 0.45) await clickSomeInternalLinks(page, CONFIG.TARGET_DOMAIN);
          else await delay(randomInt(1000, 8000));
        }
      } catch (e) {
        // ignore occasional errors and continue
      }
    }

    log.events.push({ t: new Date().toISOString(), event: "engagement_end", url: page.url() });

    // clear cookies/cache/localStorage via CDP
    try {
      const client = await page.target().createCDPSession();
      await client.send("Network.clearBrowserCookies");
      await client.send("Network.clearBrowserCache");
      await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} });
      log.events.push({ t: new Date().toISOString(), event: "cleared_storage" });
    } catch (e) {
      // ignore
    }

    await context.close();
    log.end = new Date().toISOString();
    log.success = true;
  } catch (err) {
    try { await context.close(); } catch(e){}
    log.end = new Date().toISOString();
    log.success = false;
    log.error = String(err);
  } finally {
    await fs.writeJson(path.join(CONFIG.LOG_DIR, `session-${sessionId}.json`), log, { spaces: 2 }).catch(()=>{});
    return log;
  }
}

/* Launch one run: open N tabs (each starts from the X post and clicks the link) */
async function runOnce() {
  const tabCount = randomInt(CONFIG.MIN_TABS, CONFIG.MAX_TABS);
  const browser = await puppeteer.launch({
    headless: CONFIG.HEADLESS,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"]
  });

  const sessions = [];
  for (let i = 0; i < tabCount; i++) {
    const device = pick(DEVICES);
    const ua = new UserAgent().toString();
    // stagger tab starts
    await delay(randomInt(CONFIG.TAB_START_DELAY_MS.min, CONFIG.TAB_START_DELAY_MS.max));
    sessions.push(singleTabFlow(browser, { device, ua }));
  }

  // wait for all tabs to complete
  const results = await Promise.all(sessions);
  await browser.close();

  // write run summary
  const summary = { runAt: new Date().toISOString(), tabs: tabCount, resultsSummary: results.map(r => ({ id: r.sessionId, success: r.success })) };
  await fs.writeJson(path.join(CONFIG.LOG_DIR, `run-summary-${Date.now()}.json`), summary, { spaces: 2 }).catch(()=>{});
  console.log("Run finished. Tabs:", tabCount);
  return summary;
}

(async function mainLoop() {
  console.log("Starting QA bot (every tab starts from X post). Logs:", CONFIG.LOG_DIR);
  while (true) {
    try {
      await runOnce();
    } catch (e) {
      console.error("Run error:", e);
    }
    // random delay before next run
    await delay(randomInt(CONFIG.RUN_DELAY_MS.min, CONFIG.RUN_DELAY_MS.max));
  }
})();
