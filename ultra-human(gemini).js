/**
 * testbot_v2.js
 * * Features:
 * - Real random mouse clicks on clickable elements
 * - Complete cookie and session clearing after each run
 * - Stealth human mimicry (scrolling, moving, clicking)
 */

const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const path = require('path');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/* ---------- helpers ---------- */
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const UA_LIST = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

/* ---------- New: Random Element Clicker ---------- */
async function randomClicker(page) {
    try {
        // Find elements that look clickable but aren't necessarily links
        const clickable = await page.$$('button, [role="button"], div.btn, span.click');
        if (clickable.length > 0) {
            const target = clickable[rand(0, clickable.length - 1)];
            const isVisible = await target.isIntersectingViewport();
            if (isVisible && Math.random() > 0.5) { // 50% chance to actually click
                await target.click({ delay: rand(50, 150) });
            }
        }
    } catch (e) { /* ignore click errors */ }
}

/* ---------- Human Actions ---------- */
async function microMouseAndClick(page) {
    const vw = page.viewport() || { width: 1280, height: 720 };
    for (let i = 0; i < rand(3, 7); i++) {
        const x = rand(50, vw.width - 50);
        const y = rand(50, vw.height - 50);
        await page.mouse.move(x, y, { steps: rand(5, 15) });
        if (Math.random() > 0.8) await randomClicker(page); // Occasional random interaction
        await sleep(rand(500, 1500));
    }
}

async function partialRandomScroll(page) {
    const bursts = rand(2, 4);
    for (let b = 0; b < bursts; b++) {
        await page.evaluate(y => window.scrollBy(0, y), rand(100, 400));
        await microMouseAndClick(page);
        await sleep(rand(1000, 3000));
    }
}

/* ---------- CLI parsing ---------- */
function parseArgs() {
    const argv = process.argv.slice(2);
    const cfg = {
        target: null, referrer: null, runs: 1, forever: false, interval: 10000,
        minRefWait: 60000, maxRefWait: 120000, minTargetWait: 60000, maxTargetWait: 200000,
        minTabs: 2, maxTabs: 5, confirmOwned: false, headless: false
    };
    for (const a of argv) {
        if (!cfg.target && !a.startsWith('--')) cfg.target = a;
        else if (!cfg.referrer && !a.startsWith('--')) cfg.referrer = a;
        else if (a.startsWith('--runs=')) cfg.runs = parseInt(a.split('=')[1]);
        else if (a === '--forever') cfg.forever = true;
        else if (a === '--confirm-owned') cfg.confirmOwned = true;
        else if (a === '--headless') cfg.headless = true;
    }
    return cfg;
}

/* ---------- Main Loop ---------- */
(async () => {
    const cfg = parseArgs();
    if (!cfg.target || !cfg.referrer || !cfg.confirmOwned) {
        console.log("Error: Missing target, referrer, or --confirm-owned");
        process.exit(1);
    }

    const targetHost = new URL(cfg.target).hostname;
    let run = 0;

    while (cfg.forever || run < cfg.runs) {
        run++;
        console.log(`\n--- Starting Run ${run} ---`);
        
        const profileDir = path.join(__dirname, `temp_profile_${Date.now()}`);
        const browser = await puppeteer.launch({
            headless: cfg.headless,
            userDataDir: profileDir,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process']
        });

        try {
            const tabsCount = rand(cfg.minTabs, cfg.maxTabs);
            for (let i = 0; i < tabsCount; i++) {
                const page = await browser.newPage();
                await page.setUserAgent(UA_LIST[rand(0, UA_LIST.length - 1)]);
                
                // 1. Load Referrer
                console.log(`Tab ${i+1}: Loading Referrer...`);
                await page.goto(cfg.referrer, { waitUntil: 'networkidle2' });
                await sleep(rand(cfg.minRefWait, cfg.maxRefWait));
                await microMouseAndClick(page);

                // 2. Click to Target
                console.log(`Tab ${i+1}: Clicking to Target...`);
                const clicked = await page.evaluate((host) => {
                    const links = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes(host));
                    if (links.length > 0) { links[0].click(); return true; }
                    return false;
                }, targetHost);

                if (!clicked) await page.goto(cfg.target, { referer: cfg.referrer });

                // 3. Stay on target and interact
                await sleep(rand(cfg.minTargetWait, cfg.maxTargetWait));
                await partialRandomScroll(page);
                await randomClicker(page);

                // 4. Close individual tab
                await page.close();
            }
        } catch (err) {
            console.error("Run Error:", err.message);
        } finally {
            // --- CLEANUP PROCESS ---
            const pages = await browser.pages();
            for (const p of pages) await p.deleteCookie(...(await p.cookies())); // Clear Cookies
            await browser.close();
            
            // Delete the temp profile directory to clear cache/storage completely
            if (fs.existsSync(profileDir)) {
                fs.rmSync(profileDir, { recursive: true, force: true });
            }
            console.log(`Run ${run} finished. All cookies and profiles cleared.`);
        }

        if (cfg.forever || run < cfg.runs) {
            console.log(`Interval sleep...`);
            await sleep(cfg.interval);
        }
    }
})();
