// human-actions.js — Advanced human-like mouse, keyboard, and browsing simulation
// Uses Bezier curves with velocity variance, micro-jitters, hesitation patterns,
// reading estimation, text selection, tab switching, and window focus events.

const { rand, randFloat, sleep, chance, clamp } = require('./utils');

const OVERSHOOT_PROBABILITY = 0.30;

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
};

/* -------------------------------------------------------------------------- */
/*  Low-level timing                                                          */
/* -------------------------------------------------------------------------- */

// Normal (Gaussian-ish) random via Box-Muller transform — better than uniform
// for human-like timing clusters around a mean.
function gaussianRandom(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

function clampedRand(min, max, bias = 0.5) {
  // bias: 0.5 = uniform, <0.5 favors min, >0.5 favors max
  const u = Math.pow(Math.random(), 1 / (bias * 2 + 0.1));
  return Math.floor(min + u * (max - min + 1));
}

/* -------------------------------------------------------------------------- */
/*  Mouse movement — Bezier with velocity variance                            */
/* -------------------------------------------------------------------------- */

/**
 * Move mouse from current position to (x, y) along a natural curved path.
 * Humans accelerate, decelerate, jitter, and occasionally pause mid-move.
 */
async function humanMove(page, x, y, {
  steps = 16,
  speed = 1.0,
  jitterChance = 0.18,
  pauseChance = 0.12,
  debug = false,
} = {}) {
  const start = await page.evaluate(() => {
    try {
      return { x: window._lastMouseX || 0, y: window._lastMouseY || 0 };
    } catch { return { x: 0, y: 0 }; }
  }).catch(() => ({ x: 0, y: 0 }));

  const nSteps = Math.max(8, Math.floor(steps * speed));
  const points = generateCurvePoints(start.x, start.y, x, y, nSteps);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    await page.mouse.move(Math.round(p.x), Math.round(p.y)).catch(() => {});

    // Variable sleep: slower near start/end (ease-in/ease-out), faster in middle
    const t = i / Math.max(points.length - 1, 1);
    const ease = Math.sin(t * Math.PI); // 0 at ends, 1 in middle
    const baseDelay = rand(6, 22) / speed;
    const delay = baseDelay * (0.5 + 0.5 * ease);

    // Occasional micro-jitter (tiny unintended twitch)
    if (chance(jitterChance) && i > 0 && i < points.length - 1) {
      await page.mouse.move(
        p.x + rand(-3, 3),
        p.y + rand(-3, 3)
      ).catch(() => {});
      await sleep(rand(15, 60));
    }

    // Occasional hesitation pause mid-move
    if (chance(pauseChance) && i > 2 && i < points.length - 3) {
      await sleep(rand(80, 300));
    }

    await sleep(Math.max(delay, 4));
  }

  await page.evaluate((xx, yy) => {
    window._lastMouseX = xx;
    window._lastMouseY = yy;
  }, x, y).catch(() => {});
}

/**
 * Generate points along a smooth cubic Bezier with two control points,
 * plus optional overshoot-and-correction at the end.
 */
function generateCurvePoints(x1, y1, x2, y2, steps) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const spread = Math.max(dx, dy);

  // Two control points for an S-like curve (more natural than single quadratic)
  const cx1 = mx + rand(-spread * 0.35, spread * 0.35) || rand(-120, 120);
  const cy1 = my + rand(-spread * 0.45, spread * 0.45) || rand(-120, 120);
  const cx2 = mx + rand(-spread * 0.35, spread * 0.35) || rand(-120, 120);
  const cy2 = my + rand(-spread * 0.45, spread * 0.45) || rand(-120, 120);

  let endX = x2;
  let endY = y2;
  if (chance(OVERSHOOT_PROBABILITY)) {
    endX += rand(-20, 20);
    endY += rand(-20, 20);
  }

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = cubicBezier(t, x1, cx1, cx2, endX);
    const y = cubicBezier(t, y1, cy1, cy2, endY);
    pts.push({ x, y });
  }
  return pts;
}

function cubicBezier(t, p0, p1, p2, p3) {
  const c = 1 - t;
  return (
    c * c * c * p0 +
    3 * c * c * t * p1 +
    3 * c * t * t * p2 +
    t * t * t * p3
  );
}

/* -------------------------------------------------------------------------- */
/*  Clicking — human-like                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Click an element or coordinates with realistic pre-click behavior:
 * move to target, optional hesitation / double-take, variable press duration.
 */
async function humanClick(page, selector, {
  debug = false,
  minPressMs = 40,
  maxPressMs = 220,
  preClickPauseMin = 60,
  preClickPauseMax = 450,
} = {}) {
  let x, y;

  if (selector && typeof selector === 'object' && typeof selector.x === 'number' && typeof selector.y === 'number') {
    x = selector.x;
    y = selector.y;
  } else {
    let el;
    if (typeof selector === 'string') {
      try { el = await page.$(selector); } catch (_) { return false; }
    } else {
      el = selector;
    }
    if (!el) {
      if (debug) console.log('  humanClick: element not found', selector);
      return false;
    }
    await scrollElementIntoView(el).catch(() => {});
    await sleep(rand(120, 300));
    const box = await el.boundingBox().catch(() => null);
    if (!box) return false;
    const margin = Math.min(4, Math.floor(box.width / 4), Math.floor(box.height / 4));
    x = clamp(rand(box.x + margin, box.x + box.width - margin), box.x + 1, box.x + box.width - 1);
    y = clamp(rand(box.y + margin, box.y + box.height - margin), box.y + 1, box.y + box.height - 1);
  }

  // Optional pre-click hesitation: hover near target, maybe move away slightly, then back
  if (chance(0.22)) {
    await humanMove(page, x + rand(-8, 8), y + rand(-8, 8), { steps: rand(6, 14), speed: randFloat(0.6, 1.1) });
    await sleep(rand(preClickPauseMin, preClickPauseMax));
    if (chance(0.5)) {
      await humanMove(page, x + rand(-15, 15), y + rand(-15, 15), { steps: rand(4, 10), speed: randFloat(0.8, 1.2) });
      await sleep(rand(80, 200));
      await humanMove(page, x, y, { steps: rand(5, 12), speed: randFloat(0.7, 1.3) });
    }
  } else {
    await humanMove(page, x, y, { steps: rand(8, 25), speed: randFloat(0.7, 1.3) });
  }

  await sleep(rand(60, 300)); // dwell before press
  await page.mouse.down().catch(() => {});
  await sleep(clampedRand(minPressMs, maxPressMs, 0.5));
  await page.mouse.up().catch(() => {});
  await sleep(rand(100, 500)); // dwell after release
  return true;
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
        const idx = rand(0, Math.min(els.length - 1, 40));
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
  await humanMove(page, x, y, { steps: rand(6, 18), speed: randFloat(0.7, 1.2) });
  await page.hover(el).catch(() => {});
  await sleep(rand(250, 1800)); // hover dwell
  return true;
}

/* -------------------------------------------------------------------------- */
/*  Scrolling — human-like with acceleration/deceleration                     */
/* -------------------------------------------------------------------------- */

async function humanScroll(page, { maxBursts = 5, maxViewports = 2, debug = false } = {}) {
  const viewport = page.viewport() || { height: 800 };
  const fullHeight = await page.evaluate(() => {
    try {
      return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    } catch { return 0; }
  }).catch(() => 0);

  // Scroll between 40% and 100% of available range
  const targetScroll = Math.min(fullHeight, viewport.height * maxViewports * randFloat(0.35, 1.0));
  const bursts = rand(2, maxBursts);
  let scrolled = 0;
  let direction = 1; // 1 = down, -1 = up

  for (let b = 0; b < bursts && scrolled < targetScroll; b++) {
    const remaining = targetScroll - scrolled;
    let step = rand(50, Math.floor(viewport.height / 2));
    if (step > remaining) step = Math.max(25, remaining);

    // Occasional back-scroll (re-reading)
    if (chance(0.18) && b > 0 && scrolled > 0) {
      const back = rand(20, 100);
      await smoothScrollBy(page, -back, rand(4, 10));
      await sleep(rand(300, 900));
      scrolled -= back;
    }

    const times = rand(1, 4);
    for (let t = 0; t < times && scrolled < targetScroll; t++) {
      await smoothScrollBy(page, step * direction, rand(3, 12));
      scrolled += Math.abs(step);
      await sleep(rand(350, 1600));
    }
    await sleep(rand(500, 2200));
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
    await sleep(rand(10, 45));
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
      await page.mouse.move(rand(20, viewport.width - 20), rand(20, viewport.height - 20), { steps: rand(3, 8) });
    } else if (action === 1) {
      const dir = chance(0.5) ? 1 : -1;
      await page.evaluate((y) => window.scrollBy(0, y), rand(20, 90) * dir).catch(() => {});
    } else if (action === 2) {
      // tiny random key tap that does nothing visible (e.g., Shift release)
      await page.keyboard.press('Shift').catch(() => {});
    } else {
      await page.evaluate(() => window.scrollBy(0, (Math.random() > 0.5 ? 30 : -30))).catch(() => {});
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
        case 0:
          await randomCursorWander(page, rand(1, 3));
          break;
        case 1:
          await tinyScroll(page);
          break;
        case 2:
          await humanHover(page, null, { debug });
          break;
        case 3:
          await tinyMicroAction(page);
          break;
        default:
          await sleep(rand(400, 1600));
      }
    } catch (_) {}
    await sleep(Math.min(rand(700, 3000), remaining));
  }
}

async function randomCursorWander(page, points = 3) {
  const vp = page.viewport() || { width: 1366, height: 768 };
  for (let i = 0; i < points; i++) {
    const x = rand(0, vp.width);
    const y = rand(0, vp.height);
    await humanMove(page, x, y, { steps: rand(5, 18), speed: randFloat(0.6, 1.4) });
    await sleep(rand(80, 400));
  }
}

async function tinyScroll(page) {
  const direction = chance(0.6) ? 1 : -1;
  const amount = rand(15, 110) * direction;
  await page.evaluate((y) => window.scrollBy(0, y), amount).catch(() => {});
}

/* -------------------------------------------------------------------------- */
/*  Reading simulation — pause as if reading content                          */
/* -------------------------------------------------------------------------- */

/**
 * Simulate reading the page: estimate reading time based on visible text
 * length, then pause while doing small reading behaviors (scroll, hover,
 * text selection, occasional re-read).
 */
async function humanReadPage(page, { debug = false, wpmMin = 180, wpmMax = 320 } = {}) {
  if (!page) return;
  try {
    const textLen = await page.evaluate(() => {
      try {
        // Get visible text length from body (approx word proxy)
        const text = document.body.innerText || document.body.textContent || '';
        return text.length;
      } catch { return 0; }
    }).catch(() => 0);

    const words = Math.max(textLen / 6, 50); // ~6 chars per word, min 50 words
    const wpm = rand(wpmMin, wpmMax);
    const baseMs = (words / wpm) * 60000;

    // Add variance: humans read in bursts, not constant
    const total = Math.max(baseMs * randFloat(0.7, 1.4), 2000);
    if (debug) console.log(`  reading ~${Math.round(words)} words at ~${wpm} wpm → ${Math.round(total / 1000)}s`);

    const started = Date.now();
    while (Date.now() - started < total) {
      const remaining = total - (Date.now() - started);
      if (remaining <= 0) break;

      // Small chunks with micro behaviors between
      const chunk = Math.min(clampedRand(800, 2500, 0.6), remaining);
      await sleep(chunk);

      if (chance(0.20)) {
        // occasional re-scroll (re-reading)
        await humanScroll(page, { maxBursts: 1, maxViewports: 1, debug });
      }
      if (chance(0.25)) {
        // occasional text selection
        await humanTextSelection(page);
      }
      if (chance(0.12)) {
        // hover a random paragraph/link
        await humanHover(page, null, { debug });
      }
    }
  } catch (_) {
    await sleep(rand(2000, 5000));
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
    const endX = clamp(startX + rand(-140, 140), box.x + 2, box.x + box.width - 2);
    const endY = clamp(startY + rand(-50, 50), box.y + 2, box.y + box.height - 2);
    await humanMove(page, startX, startY, { steps: rand(6, 14) });
    await page.mouse.down().catch(() => {});
    await sleep(rand(60, 200));
    await humanMove(page, endX, endY, { steps: rand(6, 20) });
    await page.mouse.up().catch(() => {});
    await sleep(rand(200, 900));
  } catch (_) {}
}

/* -------------------------------------------------------------------------- */
/*  Pause — random wait with micro actions                                    */
/* -------------------------------------------------------------------------- */

async function humanPause(page, minMs, maxMs, { debug = false } = {}) {
  const total = clampedRand(minMs, maxMs, 0.5);
  if (debug) console.log(`  human pause ~${Math.round(total / 1000)}s`);
  if (!page || total < 500) {
    await sleep(total);
    return;
  }
  const started = Date.now();
  while (Date.now() - started < total) {
    const remaining = total - (Date.now() - started);
    if (remaining <= 0) break;
    const chunk = Math.min(clampedRand(300, 1200, 0.6), remaining);
    if (chance(0.15) && chunk > 600) {
      await tinyMicroAction(page);
    }
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
    await sleep(rand(1500, 4000)); // dwell on other tab
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
    await page.evaluate(() => {
      window.dispatchEvent(new FocusEvent('blur'));
      document.dispatchEvent(new VisibilityStateEvent ? new Event('visibilitychange') : new Event('visibilitychange'));
    }).catch(() => {});
    await sleep(rand(800, 2500));
    await page.evaluate(() => {
      window.dispatchEvent(new FocusEvent('focus'));
    }).catch(() => {});
    if (debug) console.log('  window blur & refocus');
  } catch (_) {}
}

/* -------------------------------------------------------------------------- */
/*  Typing simulation                                                         */
/* -------------------------------------------------------------------------- */

async function humanTypeLike(page, text, { minDelayMs = 25, maxDelayMs = 120 } = {}) {
  for (const ch of text) {
    await page.keyboard.type(ch).catch(() => {});
    // Variable delay: faster for common letters, slower after punctuation
    const base = rand(minDelayMs, maxDelayMs);
    const delay = ('.!?,'.includes(ch)) ? base * randFloat(1.5, 3.0) : base;
    await sleep(delay);
    if (chance(0.03)) {
      // occasional typo pause (backspace simulation skipped to avoid complexity)
      await sleep(rand(300, 800));
    }
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
