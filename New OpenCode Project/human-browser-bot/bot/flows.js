// flows.js — Step orchestration for the custom redirect method
// Human-like: referrer-first navigation, reading simulation, hesitation,
// tab switching, window blur, misclicks, back-navigation, retries.

const {
  humanClick, humanScroll, humanMicroActions, humanHover,
  humanTextSelection, humanPause, humanReadPage, humanTabSwitch,
  humanBlurWindow, humanMisclick, humanBackNavigate,
} = require('./humanActions');

const config = require('./config');
const { rand, randFloat, chance, sleep } = require('./utils');

/**
 * Main tab flow. Visits referrer first (realistic: human clicked a tracked
 * link somewhere), then proceeds through the redirect steps to target.
 *
 * @param {Object} opts
 * @param {Object} opts.puppeteer - puppeteer-extra instance
 * @param {Object} opts.page - Puppeteer page
 * @param {Object} opts.cfg - parsed config (includes SPEED_PRESETS + speed)
 * @param {Object} opts.browser - browser instance (for tab switching)
 * @param {number} opts.run - current run number
 * @param {number} opts.tabIndex - tab index
 */
async function runTabFlow({ puppeteer, page, cfg, run, browser, tabIndex }) {
  const meta = { tab: tabIndex, run, clicked: 0, postOpened: false, finalUrl: '', success: false, step: 0, error: null };

  const preset = config.SPEED_PRESETS[cfg.speed || 'normal'] || config.SPEED_PRESETS.normal;
  const mult = preset.multiplier;
  const readMult = preset.readMultiplier;

  const skewWait = (min, max, skew) => config.randSkewed(min, max, skew) * mult;

  try {
    // ==================================================================
    // PRE-STEP: Navigate to referrer first
    // ==================================================================
    if (cfg.referrer) {
      if (cfg.debug) console.log(`  tab[${tabIndex}] visiting referrer: ${cfg.referrer}`);
      await safeGoto(page, cfg.referrer, cfg, tabIndex);
      await humanReadPage(page, { debug: cfg.debug, wpmMin: config.reading.wpmMin, wpmMax: config.reading.wpmMax, maxMs: 10000 * readMult });
      await humanMicroActions(page, rand(1500, 4500) * mult, { debug: cfg.debug });
    }

    // ==================================================================
    // STEP 1: Go to target, read/hesitate, click Open
    // ==================================================================
    if (shouldBail(config.abandonment)) { meta.error = 'abandoned'; return meta; }

    await stepNavigateToTarget(page, cfg, tabIndex);
    await humanReadPage(page, { debug: cfg.debug, maxMs: 12000 * readMult });
    await humanMicroActions(page, skewWait(config.step1WaitBeforeOpen.min, config.step1WaitBeforeOpen.max, config.step1WaitBeforeOpen.skew), { debug: cfg.debug });

    const openButton = await findOpenButton(page, cfg.debug);
    if (!openButton) {
      if (cfg.debug) console.log(`  tab[${tabIndex}] step-1: Open button not found`);
      meta.step = 1; return meta;
    }
    await maybeMisclick(page, openButton, cfg.debug);
    await hoverAndHesitate(page, openButton, cfg.debug);
    const clicked = await humanClick(page, openButton, { debug: cfg.debug });
    if (!clicked) { meta.step = 1; return meta; }
    meta.clicked++; meta.step = 1;
    if (cfg.debug) console.log(`  tab[${tabIndex}] step-1: Open clicked`);

    await maybeTabSwitch(page, browser, cfg, tabIndex);
    await maybeBlurWindow(page, cfg, tabIndex);
    await humanPause(page, skewWait(config.step2WaitAfterOpen.min, config.step2WaitAfterOpen.max, config.step2WaitAfterOpen.skew), { debug: cfg.debug });

    // ==================================================================
    // STEP 2: Click Next, handle Scroll Down
    // ==================================================================
    if (shouldBail(config.abandonment)) { meta.error = 'abandoned'; return meta; }

    await sleep(clampedRand(100, 500, 0.5));
    const nextButton = await findNextButton(page, cfg.debug);
    if (nextButton) {
      await hoverAndHesitate(page, nextButton, cfg.debug);
      await humanClick(page, nextButton, { debug: cfg.debug });
      meta.clicked++;
      if (cfg.debug) console.log(`  tab[${tabIndex}] step-2: Next clicked`);
    } else if (cfg.debug) {
      console.log(`  tab[${tabIndex}] step-2: Next button not found`);
    }

    const scrollDownAppears = await checkScrollDown(page, cfg.debug);
    if (scrollDownAppears) {
      await humanScroll(page, { maxBursts: 2, maxViewports: 1, debug: cfg.debug });
      if (cfg.debug) console.log(`  tab[${tabIndex}] step-2: scrolled down`);
    }

    await humanPause(page, skewWait(config.step2ScrollWait.min, config.step2ScrollWait.max, config.step2ScrollWait.skew), { debug: cfg.debug });
    meta.step = 2;

    // ==================================================================
    // STEP 3: Click Open again, reload, probability humanizing
    // ==================================================================
    if (shouldBail(config.abandonment)) { meta.error = 'abandoned'; return meta; }

    const openButton2 = await findOpenButton(page, cfg.debug);
    if (openButton2) {
      await hoverAndHesitate(page, openButton2, cfg.debug);
      await humanClick(page, openButton2, { debug: cfg.debug });
      meta.clicked++;
      if (cfg.debug) console.log(`  tab[${tabIndex}] step-3: Open clicked again`);
    }

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await humanPause(page, 1000, 2200 * mult, { debug: cfg.debug });

    const probCheck = config.checkProbability(config.step3Probability);
    if (cfg.debug) console.log(`  tab[${tabIndex}] step-3 probability: ${config.step3Probability}% → ${probCheck ? 'pass' : 'fail'}`);
    if (probCheck) {
      await humanScroll(page, { maxBursts: rand(2, 4), maxViewports: 2, debug: cfg.debug });
    } else {
      await humanMicroActions(page, rand(1200, 3500) * mult, { debug: cfg.debug });
    }

    await humanPause(page, skewWait(config.step3WaitAfterClick.min, config.step3WaitAfterClick.max, config.step3WaitAfterClick.skew), { debug: cfg.debug });
    meta.step = 3;

    // ==================================================================
    // STEP 4: Click Continue
    // ==================================================================
    if (shouldBail(config.abandonment)) { meta.error = 'abandoned'; return meta; }

    const continueButton = await findContinueButton(page, cfg.debug);
    if (continueButton) {
      await hoverAndHesitate(page, continueButton, cfg.debug);
      await humanClick(page, continueButton, { debug: cfg.debug });
      meta.clicked++;
      if (cfg.debug) console.log(`  tab[${tabIndex}] step-4: Continue clicked`);
    }

    await humanPause(page, skewWait(config.step4WaitAfterContinue.min, config.step4WaitAfterContinue.max, config.step4WaitAfterContinue.skew), { debug: cfg.debug });
    meta.step = 4;

    // ==================================================================
    // STEP 5: Click Go to Link
    // ==================================================================
    if (shouldBail(config.abandonment)) { meta.error = 'abandoned'; return meta; }

    const goToLinkButton = await findGoToLinkButton(page, cfg.debug);
    if (goToLinkButton) {
      await hoverAndHesitate(page, goToLinkButton, cfg.debug);
      await humanClick(page, goToLinkButton, { debug: cfg.debug });
      meta.clicked++;
      if (cfg.debug) console.log(`  tab[${tabIndex}] step-5: Go to Link clicked`);
    }

    await humanPause(page, skewWait(config.step5WaitAfterGoToLink.min, config.step5WaitAfterGoToLink.max, config.step5WaitAfterGoToLink.skew), { debug: cfg.debug });
    meta.step = 5;

    // ==================================================================
    // STEP 6: Click Open Link, then continue browsing like human
    // ==================================================================
    if (shouldBail(config.abandonment)) { meta.error = 'abandoned'; return meta; }

    const openLinkButton = await findOpenLinkButton(page, cfg.debug);
    if (openLinkButton) {
      await hoverAndHesitate(page, openLinkButton, cfg.debug);
      await humanClick(page, openLinkButton, { debug: cfg.debug });
      meta.clicked++;
      if (cfg.debug) console.log(`  tab[${tabIndex}] step-6: Open Link clicked`);
    }

    await humanBackNavigate(page, { debug: cfg.debug });

    const browseDuration = skewWait(config.finalBrowseDuration.min, config.finalBrowseDuration.max, config.finalBrowseDuration.skew);
    if (cfg.debug) console.log(`  tab[${tabIndex}] step-6: browsing for ~${Math.round(browseDuration / 1000)}s`);
    await humanReadPage(page, { debug: cfg.debug, maxMs: browseDuration });

    try { meta.finalUrl = await page.url(); } catch (_) {}
    meta.postOpened = true;
    meta.success = true;
    meta.step = 6;

    return meta;
  } catch (e) {
    if (cfg.debug) console.log(`  tab[${tabIndex}] error at step ${meta.step}:`, e && (e.message || e));
    meta.error = e && (e.message || String(e));
    return meta;
  }
}

/* ========================================================================= */
/*  Step helpers                                                             */
/* ========================================================================= */

async function safeGoto(page, url, cfg, tabIndex) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((err) => {
    if (cfg.debug) console.log(`  tab[${tabIndex}] goto failed: ${err && err.message}`);
  });
  await sleep(clampedRand(700, 1600, 0.6));
}

async function stepNavigateToTarget(page, cfg, tabIndex) {
  await safeGoto(page, cfg.target, cfg, tabIndex);
}

async function hoverAndHesitate(page, el, debug) {
  try {
    const box = await el.boundingBox().catch(() => null);
    if (box) {
      const x = clamp(rand(box.x + 4, box.x + box.width - 4), box.x, box.x + box.width);
      const y = clamp(rand(box.y + 4, box.y + box.height - 4), box.y, box.y + box.height);
      await humanMove(page, x, y, { steps: rand(6, 14), speed: randFloat(0.7, 1.2) });
    }
    await sleep(rand(70, 320));
  } catch (_) {}
}

function shouldBail(abandonment) {
  return chance(abandonment.perStepBailChance);
}

function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }
function clampedRand(min, max, bias = 0.5) {
  const u = Math.pow(Math.random(), 1 / (bias * 2 + 0.1));
  return Math.floor(min + u * (max - min + 1));
}

/* -------------------------------------------------------------------------- */
/*  Human "error" wrappers                                                    */
/* -------------------------------------------------------------------------- */

async function maybeMisclick(page, el, debug) {
  if (!chance(0.06)) return false;
  try {
    const box = await el.boundingBox().catch(() => null);
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

async function maybeTabSwitch(page, browser, cfg, tabIndex) {
  if (!chance(config.reading.tabSwitchChance)) return;
  try {
    const pages = await browser.pages();
    const others = pages.filter(p => p !== page);
    if (others.length === 0) return;
    const target = others[rand(0, others.length - 1)];
    await target.bringToFront().catch(() => {});
    if (cfg.debug) console.log(`  tab[${tabIndex}] switched away briefly`);
    await sleep(rand(1200, 3200));
    await page.bringToFront().catch(() => {});
  } catch (_) {}
}

async function maybeBlurWindow(page, cfg, tabIndex) {
  if (!chance(config.reading.windowBlurChance)) return;
  try {
    await page.evaluate(() => { window.dispatchEvent(new FocusEvent('blur')); }).catch(() => {});
    await sleep(rand(600, 1700));
    await page.evaluate(() => { window.dispatchEvent(new FocusEvent('focus')); }).catch(() => {});
    if (cfg.debug) console.log(`  tab[${tabIndex}] window blurred & refocused`);
  } catch (_) {}
}

/* ========================================================================= */
/*  Element finders — multi-strategy detection                               */
/* ========================================================================= */

async function findOpenButton(page, debug) {
  try {
    const els = await page.$$('button, a, [role="button"]').catch(() => []);
    for (const el of els) {
      try {
        const signal = await el.evaluate((node) => {
          const t = (node.innerText || node.textContent || '').toLowerCase().trim();
          const aria = (node.getAttribute('aria-label') || '').toLowerCase().trim();
          const cls = (node.className || '').toLowerCase();
          const id = (node.id || '').toLowerCase();
          const href = (node.getAttribute('href') || '').toLowerCase();
          return t + ' ' + aria + ' ' + cls + ' ' + id + ' ' + href;
        });
        if (signal.includes('open') || signal.includes('go') || signal.includes('start') || signal.includes('enter')) {
          const box = await el.boundingBox().catch(() => null);
          if (box && box.width > 45 && box.height > 5) return el;
        }
      } catch (_) {}
    }
    const all = await page.$$('button').catch(() => []);
    if (all.length) return all[0];
    return null;
  } catch (e) {
    if (debug) console.log('  findOpenButton error:', e && e.message);
    return null;
  }
}

async function findNextButton(page, debug) {
  try {
    const els = await page.$$('button, a, [role="button"]').catch(() => []);
    for (const el of els) {
      try {
        const signal = await el.evaluate((node) => {
          const t = (node.innerText || node.textContent || '').toLowerCase().trim();
          const aria = (node.getAttribute('aria-label') || '').toLowerCase().trim();
          return t + ' ' + aria;
        });
        if (signal.includes('next')) {
          const box = await el.boundingBox().catch(() => null);
          if (box && box.width > 45 && box.height > 5) return el;
        }
      } catch (_) {}
    }
    return null;
  } catch (e) {
    if (debug) console.log('  findNextButton error:', e && e.message);
    return null;
  }
}

async function checkScrollDown(page, debug) {
  try {
    const els = await page.$$('div, span, p, a, button, [role="button"]').catch(() => []);
    for (const el of els) {
      try {
        const signal = await el.evaluate((node) => {
          const t = (node.innerText || node.textContent || '').toLowerCase().trim();
          const aria = (node.getAttribute('aria-label') || '').toLowerCase().trim();
          return t + ' ' + aria;
        });
        if (signal.includes('scroll down') || signal.includes('scroll') || signal.includes('down')) {
          const box = await el.boundingBox().catch(() => null);
          if (box && box.width > 45 && box.height > 5) return true;
        }
      } catch (_) {}
    }
    return false;
  } catch (e) {
    if (debug) console.log('  checkScrollDown error:', e && e.message);
    return false;
  }
}

async function findContinueButton(page, debug) {
  try {
    const els = await page.$$('button, a, div, span, [role="button"]').catch(() => []);
    for (const el of els) {
      try {
        const signal = await el.evaluate((node) => {
          const t = (node.innerText || node.textContent || '').toLowerCase().trim();
          const aria = (node.getAttribute('aria-label') || '').toLowerCase().trim();
          return t + ' ' + aria;
        });
        if (signal.includes('continue')) {
          const box = await el.boundingBox().catch(() => null);
          if (box && box.width > 45 && box.height > 5) return el;
        }
      } catch (_) {}
    }
    return null;
  } catch (e) {
    if (debug) console.log('  findContinueButton error:', e && e.message);
    return null;
  }
}

async function findGoToLinkButton(page, debug) {
  try {
    const els = await page.$$('button, a, [role="button"]').catch(() => []);
    for (const el of els) {
      try {
        const signal = await el.evaluate((node) => {
          const t = (node.innerText || node.textContent || '').toLowerCase().trim();
          const aria = (node.getAttribute('aria-label') || '').toLowerCase().trim();
          const href = (node.getAttribute('href') || '').toLowerCase();
          return t + ' ' + aria + ' ' + href;
        });
        if (signal.includes('go to link') || signal.includes('goto') || signal.includes('visit') || signal.includes('proceed')) {
          const box = await el.boundingBox().catch(() => null);
          if (box && box.width > 45 && box.height > 5) return el;
        }
      } catch (_) {}
    }
    return null;
  } catch (e) {
    if (debug) console.log('  findGoToLinkButton error:', e && e.message);
    return null;
  }
}

async function findOpenLinkButton(page, debug) {
  try {
    const els = await page.$$('button, a, [role="button"]').catch(() => []);
    for (const el of els) {
      try {
        const signal = await el.evaluate((node) => {
          const t = (node.innerText || node.textContent || '').toLowerCase().trim();
          const aria = (node.getAttribute('aria-label') || '').toLowerCase().trim();
          const href = (node.getAttribute('href') || '').toLowerCase();
          return t + ' ' + aria + ' ' + href;
        });
        if (signal.includes('open link') || signal.includes('open')) {
          const box = await el.boundingBox().catch(() => null);
          if (box && box.width > 45 && box.height > 5) return el;
        }
      } catch (_) {}
    }
    const clickable = await page.$$('button, a[href]').catch(() => []);
    if (clickable.length) return clickable[0];
    return null;
  } catch (e) {
    if (debug) console.log('  findOpenLinkButton error:', e && e.message);
    return null;
  }
}

module.exports = { runTabFlow };
