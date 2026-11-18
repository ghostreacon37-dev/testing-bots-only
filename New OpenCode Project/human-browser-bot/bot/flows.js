// flows.js — Step orchestration for the custom redirect method
// Mirrors OpenCode bot's flows.js structure

const path = require('path');
const {
  humanClick, humanScroll, humanMicroActions, humanHover, humanTextSelection
} = require('./humanActions');

const config = require('./config');

async function runTabFlow({ puppeteer, page, cfg, run, tabIndex }) {
  const started = Date.now();
  let refClicked = false;

  // ============================================================
  // STEP 1: Go to website and wait, then click Open
  // ============================================================
  try {
    // Navigate to the target website
    await page.goto(cfg.target, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((err) => {
      if (cfg.debug) console.log(`tab[${tabIndex}] goto failed: ${err && err.message}`);
    });

    // Wait 5-60 seconds before clicking Open (human-like)
    const wait1 = config.randMinMax(config.step1WaitBeforeOpen.min, config.step1WaitBeforeOpen.max);
    if (cfg.debug) console.log(`  step-1 wait ~${Math.round(wait1 / 1000)}s before Open`);
    await humanMicroActions(page, wait1, { debug: cfg.debug });

    // Click on Open button (scan whole page and click)
    const openButton = await findOpenButton(page, cfg.debug);
    if (!openButton) {
      if (cfg.debug) console.log(`  step-1: Open button not found on tab[${tabIndex}]`);
      return { tab: tabIndex, success: false, step: 1 };
    }
    const clicked = await humanClick(page, openButton, { debug: cfg.debug });
    if (!clicked) {
      if (cfg.debug) console.log(`  step-1: Failed to click Open on tab[${tabIndex}]`);
      return { tab: tabIndex, success: false, step: 1 };
    }
    if (cfg.debug) console.log(`  step-1: Open button clicked on tab[${tabIndex}]`);

    // Wait 10-25 seconds after clicking Open
    const wait2 = config.randMinMax(config.step2WaitAfterOpen.min, config.step2WaitAfterOpen.max);
    if (cfg.debug) console.log(`  step-2 wait ~${Math.round(wait2 / 1000)}s after Open`);
    await humanMicroActions(page, wait2, { debug: cfg.debug });

    // ============================================================
    // STEP 2: Click Next button, handle Scroll Down if appears
    // ============================================================
    // Wait and click Next button
    await sleep(rand(100, 500)); // small pause
    const nextButton = await findNextButton(page, cfg.debug);
    if (nextButton) {
      await humanClick(page, nextButton, { debug: cfg.debug });
      if (cfg.debug) console.log(`  step-2: Next button clicked on tab[${tabIndex}]`);
    } else if (cfg.debug) {
      console.log(`  step-2: Next button not found on tab[${tabIndex}], attempting fallback`);
    }

    // If "Scroll Down" appears, click it
    const scrollDownAppears = await checkScrollDown(page, cfg.debug);
    if (scrollDownAppears) {
      await humanScroll(page, { maxBursts: 3, maxViewports: 1 });
      if (cfg.debug) console.log(`  step-2: Scroll Down appeared and clicked on tab[${tabIndex}]`);
    }

    // Wait 5-10 seconds after Step 2
    const wait3 = config.randMinMax(config.step2ScrollWait.min, config.step2ScrollWait.max);
    if (cfg.debug) console.log(`  step-2 extra wait ~${Math.round(wait3 / 1000)}s`);
    await humanPause(page, wait3, wait3 + 1000, { debug: cfg.debug });
  } catch (e) {
    if (cfg.debug) console.log(`  step-1/2 error on tab[${tabIndex}]:`, e && (e.message || e));
    return { tab: tabIndex, success: false, step: 1, error: e && e.message };
  }

  // ============================================================
  // STEP 3: Click Open button, reload site, 67/100 probability
  // ============================================================
  try {
    // Click Open button again
    const openButton2 = await findOpenButton(page, cfg.debug);
    if (openButton2) {
      await humanClick(page, openButton2, { debug: cfg.debug });
      if (cfg.debug) console.log(`  step-3: Open button clicked again on tab[${tabIndex}]`);
    }

    // Reload the site
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});

    // 67/100 probability - human-like behavior
    const probCheck = config.checkProbability(config.step3Probability);
    if (cfg.debug) console.log(`  step-3 probability check: ${config.step3Probability}% → ${probCheck ? 'passed' : 'failed'}`);

    // If probability fails, we still continue but with different behavior
    // If probability passes, scroll down for more humanize things
    if (probCheck) {
      await humanScroll(page, { maxBursts: rand(2, 5), maxViewports: 2 });
      if (cfg.debug) console.log(`  step-3: 67/100 probability passed, scrolled for humanize on tab[${tabIndex}]`);
    } else {
      if (cfg.debug) console.log(`  step-3: 67/100 probability failed, skipping scroll on tab[${tabIndex}]`);
    }

    // Wait 3-13 seconds
    const wait4 = config.randMinMax(config.step3WaitAfterClick.min, config.step3WaitAfterClick.max);
    if (cfg.debug) console.log(`  step-3 wait ~${Math.round(wait4 / 1000)}s`);
    await humanPause(page, wait4, wait4 + 500, { debug: cfg.debug });
  } catch (e) {
    if (cfg.debug) console.log(`  step-3 error on tab[${tabIndex}]:`, e && (e.message || e));
  }

  // ============================================================
  // STEP 4: Click Continue button and wait
  // ============================================================
  try {
    const continueButton = await findContinueButton(page, cfg.debug);
    if (continueButton) {
      await humanClick(page, continueButton, { debug: cfg.debug });
      if (cfg.debug) console.log(`  step-4: Continue button clicked on tab[${tabIndex}]`);
    }

    // Wait 3-7 seconds
    const wait5 = config.randMinMax(config.step4WaitAfterContinue.min, config.step4WaitAfterContinue.max);
    if (cfg.debug) console.log(`  step-4 wait ~${Math.round(wait5 / 1000)}s`);
    await humanPause(page, wait5, wait5 + 500, { debug: cfg.debug });
  } catch (e) {
    if (cfg.debug) console.log(`  step-4 error on tab[${tabIndex}]:`, e && (e.message || e));
  }

  // ============================================================
  // STEP 5: Click Go to Link button and wait
  // ============================================================
  try {
    const goToLinkButton = await findGoToLinkButton(page, cfg.debug);
    if (goToLinkButton) {
      await humanClick(page, goToLinkButton, { debug: cfg.debug });
      if (cfg.debug) console.log(`  step-5: Go to Link button clicked on tab[${tabIndex}]`);
    }

    // Wait 2-12 seconds
    const wait6 = config.randMinMax(config.step5WaitAfterGoToLink.min, config.step5WaitAfterGoToLink.max);
    if (cfg.debug) console.log(`  step-5 wait ~${Math.round(wait6 / 1000)}s`);
    await humanPause(page, wait6, wait6 + 500, { debug: cfg.debug });
  } catch (e) {
    if (cfg.debug) console.log(`  step-5 error on tab[${tabIndex}]:`, e && (e.message || e));
  }

  // ============================================================
  // STEP 6: Click Open Link and continue browse like example
  // ============================================================
  try {
    const openLinkButton = await findOpenLinkButton(page, cfg.debug);
    if (openLinkButton) {
      await humanClick(page, openLinkButton, { debug: cfg.debug });
      if (cfg.debug) console.log(`  step-6: Open Link button clicked on tab[${tabIndex}]`);
    }

    // Continue browsing like a human - random micro actions
    const browseDuration = config.randMinMax(3000, 15000); // 3-15 sec typical browsing
    if (cfg.debug) console.log(`  step-6: Browsing for ~${Math.round(browseDuration / 1000)}s like a real human`);
    await humanMicroActions(page, browseDuration, { debug: cfg.debug });
  } catch (e) {
    if (cfg.debug) console.log(`  step-6 error on tab[${tabIndex}]:`, e && (e.message || e));
  }

  return { tab: tabIndex, success: true, step: 6 };
}

/**
 * Find the Open button on the page (scan whole page)
 */
async function findOpenButton(page, debug) {
  try {
    // Scan for buttons with "Open" text or containing "open"
    const buttons = await page.$$('button, a').catch(() => []);
    for (const btn of buttons) {
      try {
        const text = await btn.evaluate((node) => node.innerText || node.textContent || '').catch(() => '');
        const lowerText = text.toLowerCase().trim();
        if (lowerText.includes('open') || lowerText.includes('go') || lowerText.includes('start')) {
          const box = await btn.boundingBox();
          if (box && box.width > 50 && box.height > 5) {
            return btn;
          }
        }
      } catch (_) {}
    }
    // Fallback: look for any button with "Open" in its attributes
    const allButtons = await page.$$('button');
    if (allButtons.length) {
      return allButtons[0]; // Return first button as fallback
    }
    return null;
  } catch (e) {
    if (debug) console.log('  findOpenButton error:', e && e.message);
    return null;
  }
}

/**
 * Find the Next button on the page
 */
async function findNextButton(page, debug) {
  try {
    const buttons = await page.$$('button, a').catch(() => []);
    for (const btn of buttons) {
      try {
        const text = await btn.evaluate((node) => node.innerText || node.textContent || '').catch(() => '');
        const lowerText = text.toLowerCase().trim();
        if (lowerText.includes('next')) {
          const box = await btn.boundingBox();
          if (box && box.width > 50 && box.height > 5) {
            return btn;
          }
        }
      } catch (_) {}
    }
    return null;
  } catch (e) {
    if (debug) console.log('  findNextButton error:', e && e.message);
    return null;
  }
}

/**
 * Check if "Scroll Down" element appears on the page
 */
async function checkScrollDown(page, debug) {
  try {
    // Look for elements with "scroll down", "down", "continue" text
    const elements = await page.$$('div, span, p, a, button').catch(() => []);
    for (const el of elements) {
      try {
        const text = await el.evaluate((node) => node.innerText || node.textContent || '').catch(() => '');
        const lowerText = text.toLowerCase().trim();
        if (lowerText.includes('scroll down') || lowerText.includes('scroll') || lowerText.includes('down')) {
          const box = await el.boundingBox();
          if (box && box.width > 50 && box.height > 5) {
            return true;
          }
        }
      } catch (_) {}
    }
    return false;
  } catch (e) {
    if (debug) console.log('  checkScrollDown error:', e && e.message);
    return false;
  }
}

/**
 * Find the Continue button on the page
 */
async function findContinueButton(page, debug) {
  try {
    const elements = await page.$$('button, a, div, span').catch(() => []);
    for (const el of elements) {
      try {
        const text = await el.evaluate((node) => node.innerText || node.textContent || '').catch(() => '');
        const lowerText = text.toLowerCase().trim();
        if (lowerText.includes('continue')) {
          const box = await el.boundingBox();
          if (box && box.width > 50 && box.height > 5) {
            return el;
          }
        }
      } catch (_) {}
    }
    return null;
  } catch (e) {
    if (debug) console.log('  findContinueButton error:', e && e.message);
    return null;
  }
}

/**
 * Find the Go to Link button on the page
 */
async function findGoToLinkButton(page, debug) {
  try {
    const elements = await page.$$('button, a').catch(() => []);
    for (const el of elements) {
      try {
        const text = await el.evaluate((node) => node.innerText || node.textContent || '').catch(() => '');
        const lowerText = text.toLowerCase().trim();
        if (lowerText.includes('go to link') || lowerText.includes('goto') || lowerText.includes('visit')) {
          const box = await el.boundingBox();
          if (box && box.width > 50 && box.height > 5) {
            return el;
          }
        }
      } catch (_) {}
    }
    return null;
  } catch (e) {
    if (debug) console.log('  findGoToLinkButton error:', e && e.message);
    return null;
  }
}

/**
 * Find the Open Link button on the page
 */
async function findOpenLinkButton(page, debug) {
  try {
    // Look for buttons with "Open Link" or similar
    const elements = await page.$$('button, a').catch(() => []);
    for (const el of elements) {
      try {
        const text = await el.evaluate((node) => node.innerText || node.textContent || '').catch(() => '');
        const lowerText = text.toLowerCase().trim();
        if (lowerText.includes('open link') || lowerText.includes('open')) {
          const box = await el.boundingBox();
          if (box && box.width > 50 && box.height > 5) {
            return el;
          }
        }
      } catch (_) {}
    }
    // Fallback: first clickable element
    const clickable = await page.$$('button, a[href]').catch(() => []);
    if (clickable.length) return clickable[0];
    return null;
  } catch (e) {
    if (debug) console.log('  findOpenLinkButton error:', e && e.message);
    return null;
  }
}

module.exports = { runTabFlow };