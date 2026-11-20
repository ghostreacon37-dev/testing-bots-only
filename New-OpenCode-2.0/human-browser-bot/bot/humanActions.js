// human-actions.js — Real human-like mouse and click simulation
// Every click uses real page.mouse.down()/page.mouse.up() events.
// Mouse moves along curved Bezier paths with velocity variance, jitter, and hesitation.

const { rand, randFloat, sleep, chance, clamp } = require('./utils');

const OVERSHOOT_PROBABILITY = 0.25;

module.exports = {
  humanMove,
  humanClick,
  humanScroll,
  humanHover,
  humanMicroActions,
  humanTextSelection,
  humanPause,
  humanReadPage,
  humanTabSwitch,
  humanBlurWindow,
  humanTypeLike,
  humanMisclick,
  humanBackNavigate,
  jsFallbackClick,
};

/* -------------------------------------------------------------------------- */
/*  Low-level timing                                                          */
/* -------------------------------------------------------------------------- */

function clampedRand(min, max, bias = 0.5) {
  const u = Math.pow(Math.random(), 1 / (bias * 2 + 0.1));
  return Math.floor(min + u * (max - min + 1));
}

/* -------------------------------------------------------------------------- */
/*  Mouse movement — cubic Bezier curve with velocity variance                */
/* -------------------------------------------------------------------------- */

async function humanMove(page, x, y, {
  steps = 14,
  speed = 1.0,
  jitterChance = 0.15,
  pauseChance = 0.10,
  debug = false,
} = {}) {
  const start = await page.evaluate(() => {
    try { return { x: window._lastMouseX || 0, y: window._lastMouseY || 0 }; }
    catch { return { x: 0, y: 0 }; }
  }).catch(() => ({ x: 0, y: 0 }));

  const nSteps = Math.max(8, Math.floor(steps * speed));
  const points = generateCurvePoints(start.x, start.y, x, y, nSteps);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    await page.mouse.move(Math.round(p.x), Math.round(p.y)).catch(() => {});

    const t = i / Math.max(points.length - 1, 1);
    const ease = Math.sin(t * Math.PI); // 0 at ends, 1 in middle (ease-in/ease-out)
    const baseDelay = rand(6, 20) / speed;
    const delay = baseDelay * (0.5 + 0.5 * ease);

    // Micro-jitter: tiny unintended twitch mid-move
    if (chance(jitterChance) && i > 0 && i < points.length - 1) {
      await page.mouse.move(p.x + rand(-3, 3), p.y + rand(-3, 3)).catch(() => {});
      await sleep(rand(12, 50));
    }

    // Hesitation pause mid-move
    if (chance(pauseChance) && i > 2 && i < points.length - 3) {
      await sleep(rand(60, 220));
    }

    await sleep(Math.max(delay, 3));
  }

  await page.evaluate((xx, yy) => {
    window._lastMouseX = xx;
    window._lastMouseY = yy;
  }, x, y).catch(() => {});
}

function generateCurvePoints(x1, y1, x2, y2, steps) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const spread = Math.max(dx, dy);

  const cx1 = mx + rand(-spread * 0.35, spread * 0.35) || rand(-100, 100);
  const cy1 = my + rand(-spread * 0.45, spread * 0.45) || rand(-100, 100);
  const cx2 = mx + rand(-spread * 0.35, spread * 0.35) || rand(-100, 100);
  const cy2 = my + rand(-spread * 0.45, spread * 0.45) || rand(-100, 100);

  let endX = x2;
  let endY = y2;
  if (chance(OVERSHOOT_PROBABILITY)) {
    endX += rand(-18, 18);
    endY += rand(-18, 18);
  }

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({ x: cubicBezier(t, x1, cx1, cx2, endX), y: cubicBezier(t, y1, cy1, cy2, endY) });
  }
  return pts;
}

function cubicBezier(t, p0, p1, p2, p3) {
  const c = 1 - t;
  return c * c * c * p0 + 3 * c * c * t * p1 + 3 * c * t * t * p2 + t * t * t * p3;
}

/* -------------------------------------------------------------------------- */
/*  Real human click — move, hesitate, press, release                         */
/* -------------------------------------------------------------------------- */

async function humanClick(page, selector, {
  debug = false,
  minPressMs = 35,
  maxPressMs = 180,
  preClickPauseMin = 50,
  preClickPauseMax = 350,
} = {}) {
  let x, y;

  if (selector && typeof selector === 'object' && typeof selector.x === 'number' && typeof selector.y === 'number') {
    x = selector.x; y = selector.y;
  } else {
    let el;
    if (typeof selector === 'string') {
      try { el = await page.$(selector); } catch (_) { return false; }
    } else { el = selector; }
    if (!el) {
      if (debug) console.log('  humanClick: element not found');
      return false;
    }
    await scrollElementIntoView(el).catch(() => {});
    await sleep(rand(100, 250));
    const box = await el.boundingBox().catch(() => null);
    if (box) {
      const margin = Math.min(4, Math.floor(box.width / 4), Math.floor(box.height / 4));
      x = clamp(rand(box.x + margin, box.x + box.width - margin), box.x + 1, box.x + box.width - 1);
      y = clamp(rand(box.y + margin, box.y + box.height - margin), box.y + 1, box.y + box.height - 1);
    } else {
      // boundingBox failed — try JS fallback click directly on the element
      const jsClicked = await jsFallbackClick(page, el, { debug });
      return jsClicked;
    }
  }

  // Pre-click hesitation: hover near target, maybe move away slightly then back (curious human)
  if (chance(0.20)) {
    await humanMove(page, x + rand(-6, 6), y + rand(-6, 6), { steps: rand(5, 12), speed: randFloat(0.7, 1.1) });
    await sleep(rand(preClickPauseMin, preClickPauseMax));
    if (chance(0.5)) {
      await humanMove(page, x + rand(-12, 12), y + rand(-12, 12), { steps: rand(4, 9), speed: randFloat(0.8, 1.2) });
      await sleep(rand(60, 160));
      await humanMove(page, x, y, { steps: rand(5, 11), speed: randFloat(0.7, 1.3) });
    }
  } else {
    await humanMove(page, x, y, { steps: rand(8, 22), speed: randFloat(0.7, 1.3) });
  }

  await sleep(rand(50, 240)); // dwell before press

  // REAL mouse down/up at the calculated coordinates
  await page.mouse.down().catch(() => {});
  await sleep(clampedRand(minPressMs, maxPressMs, 0.5)); // hold press
  await page.mouse.up().catch(() => {});             // REAL mouse up
  await sleep(rand(90, 400));                        // dwell after release
  return true;
}

/**
 * Fallback click using JavaScript to dispatch mouse events directly on the element.
 * Used when boundingBox fails but we still want to trigger a real click.
 */
async function jsFallbackClick(page, el, { debug = false } = {}) {
  try {
    const result = await page.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Dispatch mousedown, mouseup, click
      element.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true, cancelable: true, clientX: cx, clientY: cy
      }));
      element.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true, cancelable: true, clientX: cx, clientY: cy
      }));
      element.dispatchEvent(new MouseEvent('click', {
        bubbles: true, cancelable: true, clientX: cx, clientY: cy
      }));
      return true;
    }, el);
    if (debug && result) console.log('  jsFallbackClick: dispatched click events');
    return result;
  } catch (_) { return false; }
}

/* -------------------------------------------------------------------------- */
/*  Hover                                                                     */
/* -------------------------------------------------------------------------- */

async function humanHover(page, selector = null, { debug = false } = {}) {
  let el;
  if (typeof selector === 'string' && selector) {
    el = await page.$(selector).catch(() => null);
  }
  if (!el) {
    const selectors = 'a, button, h1, h2, h3, p, li, img, article';
    try {
      const els = await page.$$(selectors);
      if (els.length) {
        const idx = rand(0, Math.min(els.length - 1, 35));
        const candidate = els[idx];
        const box = await candidate.boundingBox().catch(() => null);
        if (box && box.width > 5 && box.height > 5 && box.y > -60) el = candidate;
      }
    } catch (_) {}
  }
  if (!el) return false;
  const box = await el.boundingBox().catch(() => null);
  if (!box) return false;
  const x = clamp(rand(box.x + 3, box.x + box.width - 3), box.x, box.x + box.width);
  const y = clamp(rand(box.y + 3, box.y + box.height - 3), box.y, box.y + box.height);
  await humanMove(page, x, y, { steps: rand(6, 16), speed: randFloat(0.7, 1.2) });
  await page.hover(el).catch(() => {});
  await sleep(rand(200, 1400));
  return true;
}

/* -------------------------------------------------------------------------- */
/*  Scrolling — human-like with acceleration/deceleration                     */
/* -------------------------------------------------------------------------- */

async function humanScroll(page, { maxBursts = 4, maxViewports = 2, debug = false } = {}) {
  const viewport = page.viewport() || { height: 800 };
  const fullHeight = await page.evaluate(() => {
    try { return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight); }
    catch { return 0; }
  }).catch(() => 0);

  const targetScroll = Math.min(fullHeight, viewport.height * maxViewports * randFloat(0.35, 1.0));
  const bursts = rand(2, maxBursts);
  let scrolled = 0;

  for (let b = 0; b < bursts && scrolled < targetScroll; b++) {
    const remaining = targetScroll - scrolled;
    let step = rand(45, Math.floor(viewport.height / 2));
    if (step > remaining) step = Math.max(25, remaining);

    if (chance(0.15) && b > 0 && scrolled > 0) {
      const back = rand(15, 90);
      await smoothScrollBy(page, -back, rand(4, 9));
      await sleep(rand(250, 800));
      scrolled -= back;
    }

    const times = rand(1, 3);
    for (let t = 0; t < times && scrolled < targetScroll; t++) {
      await smoothScrollBy(page, step, rand(3, 11));
      scrolled += Math.abs(step);
      await sleep(rand(300, 1400));
    }
    await sleep(rand(400, 1800));
  }
}

async function smoothScrollBy(page, amount, steps) {
  const stepAmount = Math.round(amount / steps);
  let done = 0;
  for (let i = 0; i < steps; i++) {
    const remaining = amount - done;
    const current = Math.abs(remaining) < Math.abs(stepAmount) ? remaining : stepAmount;
    await page.evaluate((y) => window.scrollBy(0, y), current).catch(() => {});
    done += current;
    await sleep(rand(8, 40));
  }
}

/* -------------------------------------------------------------------------- */
/*  Micro actions — small random human behaviors during waits                 */
/* -------------------------------------------------------------------------- */

async function tinyMicroAction(page) {
  try {
    const viewport = page.viewport() || { width: 1366, height: 768 };
    const action = rand(0, 3);
    if (action === 0) {
      await page.mouse.move(rand(20, viewport.width - 20), rand(20, viewport.height - 20), { steps: rand(3, 7) });
    } else if (action === 1) {
      const dir = chance(0.5) ? 1 : -1;
      await page.evaluate((y) => window.scrollBy(0, y), rand(15, 80) * dir).catch(() => {});
    } else if (action === 2) {
      await page.keyboard.press('Shift').catch(() => {});
    } else {
      await page.evaluate(() => window.scrollBy(0, (Math.random() > 0.5 ? 25 : -25))).catch(() => {});
    }
  } catch (_) {}
}

async function humanMicroActions(page, durationMs, { debug = false } = {}) {
  if (!page) return;
  const started = Date.now();
  while (Date.now() - started < durationMs) {
    const remaining = durationMs - (Date.now() - started);
    if (remaining <= 0) break;
    const actionType = rand(0, 4);
    try {
      switch (actionType) {
        case 0: await randomCursorWander(page, rand(1, 2)); break;
        case 1: await tinyScroll(page); break;
        case 2: await humanHover(page, null, { debug }); break;
        case 3: await tinyMicroAction(page); break;
        default: await sleep(rand(300, 1200));
      }
    } catch (_) {}
    await sleep(Math.min(rand(600, 2200), remaining));
  }
}

async function randomCursorWander(page, points = 2) {
  const vp = page.viewport() || { width: 1366, height: 768 };
  for (let i = 0; i < points; i++) {
    await humanMove(page, rand(0, vp.width), rand(0, vp.height), { steps: rand(5, 14), speed: randFloat(0.6, 1.4) });
    await sleep(rand(60, 300));
  }
}

async function tinyScroll(page) {
  const direction = chance(0.6) ? 1 : -1;
  await page.evaluate((y) => window.scrollBy(0, y), rand(12, 90) * direction).catch(() => {});
}

/* -------------------------------------------------------------------------- */
/*  Reading simulation — pause as if reading content                          */
/* -------------------------------------------------------------------------- */

async function humanReadPage(page, { debug = false, wpmMin = 200, wpmMax = 300, maxMs = 15000 } = {}) {
  if (!page) return;
  try {
    const textLen = await page.evaluate(() => {
      try { return (document.body.innerText || document.body.textContent || '').length; }
      catch { return 0; }
    }).catch(() => 0);

    const words = Math.max(textLen / 6, 40);
    const wpm = rand(wpmMin, wpmMax);
    let total = (words / wpm) * 60000;
    total *= randFloat(0.7, 1.3);
    total = Math.min(Math.max(total, 1500), maxMs);

    if (debug) console.log(`  reading ~${Math.round(words)} words at ~${wpm} wpm → ${Math.round(total / 1000)}s`);

    const started = Date.now();
    while (Date.now() - started < total) {
      const remaining = total - (Date.now() - started);
      if (remaining <= 0) break;
      const chunk = Math.min(clampedRand(600, 1800, 0.6), remaining);
      await sleep(chunk);

      if (chance(0.15)) await humanScroll(page, { maxBursts: 1, maxViewports: 1, debug });
      if (chance(0.20)) await humanTextSelection(page);
      if (chance(0.10)) await humanHover(page, null, { debug });
    }
  } catch (_) {
    await sleep(rand(1500, 3500));
  }
}

/* -------------------------------------------------------------------------- */
/*  Text selection                                                            */
/* -------------------------------------------------------------------------- */

async function humanTextSelection(page) {
  try {
    const para = await page.$('p, article, section, div');
    if (!para) return;
    const box = await para.boundingBox().catch(() => null);
    if (!box) return;
    const startX = box.x + rand(5, Math.max(10, box.width - 10));
    const startY = box.y + rand(5, Math.max(10, box.height - 10));
    const endX = clamp(startX + rand(-120, 120), box.x + 2, box.x + box.width - 2);
    const endY = clamp(startY + rand(-45, 45), box.y + 2, box.y + box.height - 2);
    await humanMove(page, startX, startY, { steps: rand(6, 13) });
    await page.mouse.down().catch(() => {});
    await sleep(rand(50, 180));
    await humanMove(page, endX, endY, { steps: rand(6, 18) });
    await page.mouse.up().catch(() => {});
    await sleep(rand(180, 700));
  } catch (_) {}
}

/* -------------------------------------------------------------------------- */
/*  Pause — random wait with micro actions                                    */
/* -------------------------------------------------------------------------- */

async function humanPause(page, minMs, maxMs, { debug = false } = {}) {
  const total = clampedRand(minMs, maxMs, 0.5);
  if (debug) console.log(`  human pause ~${Math.round(total / 1000)}s`);
  if (!page || total < 400) { await sleep(total); return; }
  const started = Date.now();
  while (Date.now() - started < total) {
    const remaining = total - (Date.now() - started);
    if (remaining <= 0) break;
    const chunk = Math.min(clampedRand(250, 1000, 0.6), remaining);
    if (chance(0.12) && chunk > 500) await tinyMicroAction(page);
    await sleep(chunk);
  }
}

/* -------------------------------------------------------------------------- */
/*  Tab switching                                                             */
/* -------------------------------------------------------------------------- */

async function humanTabSwitch(page, browser, { debug = false } = {}) {
  try {
    const pages = browser.pages ? await browser.pages() : [];
    if (pages.length < 2) return false;
    const others = pages.filter(p => p !== page);
    if (others.length === 0) return false;
    const target = others[rand(0, others.length - 1)];
    await target.bringToFront().catch(() => {});
    await sleep(rand(1200, 3200));
    await page.bringToFront().catch(() => {});
    if (debug) console.log('  tab switch away and back');
    return true;
  } catch (_) { return false; }
}

/* -------------------------------------------------------------------------- */
/*  Window blur / focus                                                       */
/* -------------------------------------------------------------------------- */

async function humanBlurWindow(page, { debug = false } = {}) {
  try {
    await page.evaluate(() => { window.dispatchEvent(new FocusEvent('blur')); }).catch(() => {});
    await sleep(rand(600, 1800));
    await page.evaluate(() => { window.dispatchEvent(new FocusEvent('focus')); }).catch(() => {});
    if (debug) console.log('  window blur & refocus');
  } catch (_) {}
}

/* -------------------------------------------------------------------------- */
/*  Human "errors" — misclick and back navigation                             */
/* -------------------------------------------------------------------------- */

async function humanMisclick(page, targetEl, { debug = false } = {}) {
  if (!chance(0.06)) return false;
  try {
    const box = await targetEl.boundingBox().catch(() => null);
    if (!box) return false;
    const mx = box.x + rand(-box.width * 0.55, -box.width * 0.15);
    const my = box.y + rand(-box.height * 0.55, -box.height * 0.15);
    await humanMove(page, mx, my, { steps: rand(6, 13), speed: randFloat(0.7, 1.2) });
    await sleep(rand(70, 200));
    await page.mouse.down().catch(() => {});
    await sleep(rand(25, 90));
    await page.mouse.up().catch(() => {});
    await sleep(rand(180, 450));
    if (debug) console.log('  human misclick (off-target), correcting');
    return true;
  } catch (_) { return false; }
}

async function humanBackNavigate(page, { debug = false } = {}) {
  if (!chance(0.04)) return false;
  try {
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleep(rand(1500, 3500));
    await page.goForward({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleep(rand(800, 1800));
    if (debug) console.log('  human back-then-forward navigation');
    return true;
  } catch (_) { return false; }
}

/* -------------------------------------------------------------------------- */
/*  Typing simulation                                                         */
/* -------------------------------------------------------------------------- */

async function humanTypeLike(page, text, { minDelayMs = 22, maxDelayMs = 100 } = {}) {
  for (const ch of text) {
    await page.keyboard.type(ch).catch(() => {});
    const base = rand(minDelayMs, maxDelayMs);
    const delay = '.!?,'.includes(ch) ? base * randFloat(1.4, 2.6) : base;
    await sleep(delay);
    if (chance(0.025)) await sleep(rand(250, 700));
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

async function scrollElementIntoView(el) {
  await el.evaluate((node) => {
    node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  });
}
