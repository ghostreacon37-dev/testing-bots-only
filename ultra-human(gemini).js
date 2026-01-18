/**
 * learnwithblog_ultra_bot.js
 * Specialized for human-like interaction on learnwithblog.xyz
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

/* ---------- Human Simulation Helpers ---------- */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Moves mouse in a curve rather than a straight line
async function moveMouseHuman(page) {
    const vw = page.viewport().width;
    const vh = page.viewport().height;
    const x = rand(100, vw - 100);
    const y = rand(100, vh - 100);
    
    // Puppeteer's mouse move with 'steps' mimics a curve/jitter
    await page.mouse.move(x, y, { steps: rand(15, 30) }); 
}

async function simulateReading(page) {
    const scrolls = rand(3, 6);
    for (let i = 0; i < scrolls; i++) {
        const scrollAmt = rand(200, 500);
        await page.evaluate((amt) => window.scrollBy(0, amt), scrollAmt);
        
        // 15% chance to scroll back up slightly
        if (Math.random() > 0.85) {
            await page.evaluate(() => window.scrollBy(0, -150));
            await sleep(rand(1000, 2000));
        }
        
        await moveMouseHuman(page);
        await sleep(rand(3000, 8000)); // Time spent "reading"
    }
}

async function clickRandomElement(page) {
    try {
        // Specifically look for articles or links on learnwithblog.xyz
        const elements = await page.$$('article a, .entry-title a, .read-more, button');
        if (elements.length > 0) {
            const el = elements[rand(0, elements.length - 1)];
            await el.hover();
            await sleep(rand(500, 1200));
            await el.click({ delay: rand(50, 150) });
            console.log("   - Interaction: Clicked an internal element.");
            return true;
        }
    } catch (e) {
        return false;
    }
}

/* ---------- Main Automation ---------- */
async function runSession(target, referrer, runId) {
    const profileDir = path.join(__dirname, `session_cache_${Date.now()}`);
    const browser = await puppeteer.launch({
        headless: false, // Set to true if you don't want to watch
        userDataDir: profileDir,
        args: ['--no-sandbox', '--start-maximized']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // 1. Visit Referrer
        console.log(`[Run ${runId}] Navigating to Referrer...`);
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(rand(10000, 20000));
        await moveMouseHuman(page);

        // 2. Find Link to Target
        const targetHost = new URL(target).hostname;
        const linked = await page.evaluate((host) => {
            const a = Array.from(document.querySelectorAll('a')).find(el => el.href.includes(host));
            if (a) { a.click(); return true; }
            return false;
        }, targetHost);

        if (!linked) {
            console.log("   - Link not found on referrer, forcing navigation with headers.");
            await page.goto(target, { referer: referrer, waitUntil: 'networkidle2' });
        } else {
            console.log("   - Success: Clicked link from referrer.");
            await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
        }

        // 3. Behavior on learnwithblog.xyz
        console.log("   - Simulating behavior on target site...");
        await simulateReading(page);
        
        // Click an internal post to increase engagement depth
        await clickRandomElement(page);
        await sleep(rand(5000, 10000));
        await simulateReading(page);

    } catch (err) {
        console.log(`   - Error in session: ${err.message}`);
    } finally {
        // --- CLEANUP ---
        const pages = await browser.pages();
        for (const p of pages) {
            const client = await p.target().createCDPSession();
            await client.send('Network.clearBrowserCookies');
            await client.send('Network.clearBrowserCache');
        }
        await browser.close();
        
        if (fs.existsSync(profileDir)) {
            fs.rmSync(profileDir, { recursive: true, force: true });
        }
        console.log(`[Run ${runId}] Session closed and data wiped.\n`);
    }
}

/* ---------- Execution ---------- */
const targetUrl = 'https://learnwithblog.xyz';
const referrerUrl = 'https://x.com/GhostReacondev/status/1981679871513575623'; // Example from your friend
const totalRuns = 5;

(async () => {
    for (let i = 1; i <= totalRuns; i++) {
        await runSession(targetUrl, referrerUrl, i);
        const wait = rand(15000, 45000);
        console.log(`Waiting ${wait/1000}s before next run...`);
        await sleep(wait);
    }
    console.log("All tasks complete.");
})();
