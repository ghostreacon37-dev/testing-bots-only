const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/* --- DEVICE & HARDWARE DATABASE --- */
const DEVICES = [
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', cores: [4, 8, 16], mem: [8, 16], w: 1920, h: 1080 },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Google Inc.', cores: [8, 10], mem: [8, 16, 32], w: 1440, h: 900 },
    { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', platform: 'Linux x86_64', vendor: 'Google Inc.', cores: [4, 6], mem: [4, 8], w: 1366, h: 768 }
];

/* --- BEHAVIORAL MATH --- */
const hWait = (min, max) => {
    const u = 1 - Math.random(), v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    let res = Math.floor((z / 4 + 0.5) * (max - min) + min);
    return Math.max(min, Math.min(max, res));
};

// Generates an arc-like path for the mouse to prevent straight lines
async function bezierMove(page, start, end) {
    const steps = hWait(25, 45);
    const control = { x: (start.x + end.x) / 2 + (Math.random() - 0.5) * 200, y: (start.y + end.y) / 2 + (Math.random() - 0.5) * 200 };
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x;
        const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y;
        await page.mouse.move(x, y);
        if (i % 8 === 0) await new Promise(r => setTimeout(r, hWait(5, 20)));
    }
}

async function startHumanSession(target, referrer) {
    const browser = await puppeteer.launch({
        headless: false, // Visible browsing is harder to detect than headless
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const runCount = Math.floor(Math.random() * 8) + 2; // 2-9 tabs

    for (let i = 0; i < runCount; i++) {
        const dev = DEVICES[Math.floor(Math.random() * DEVICES.length)];
        const context = await browser.createBrowserContext();
        const page = await context.newPage();

        // 1. SPOOF HARDWARE FINGERPRINT
        await page.setUserAgent(dev.ua);
        await page.setViewport({ width: dev.w, height: dev.h, deviceScaleFactor: 1 });
        await page.evaluateOnNewDocument((d) => {
            Object.defineProperty(navigator, 'platform', { get: () => d.platform });
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => d.cores[Math.floor(Math.random() * d.cores.length)] });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => d.mem[Math.floor(Math.random() * d.mem.length)] });
            // Remove the webdriver bridge
            delete navigator.__proto__.webdriver;
        }, dev);

        try {
            // 2. NAVIGATE TO REFERRER
            await page.goto(referrer, { waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, hWait(4000, 12000)));

            // 3. HUMAN CLICK ON TARGET
            const linkSelector = 'a[href*="learnwithblog.xyz"]';
            await page.waitForSelector(linkSelector);
            const link = await page.$(linkSelector);
            const box = await link.boundingBox();
            
            // Move from current position to a random point inside the link
            await bezierMove(page, {x: 100, y: 100}, {x: box.x + Math.random() * box.width, y: box.y + Math.random() * box.height});
            
            await page.mouse.down();
            await new Promise(r => setTimeout(r, hWait(60, 180))); // Realistic click-hold
            await page.mouse.up();

            // 4. STAY & INTERACT (1s to 8min)
            const exitTime = Date.now() + hWait(1000, 480000);
            while (Date.now() < exitTime) {
                const action = Math.random();
                if (action < 0.5) {
                    await page.mouse.wheel({ deltaY: hWait(150, 450) }); // Reading scroll
                } else if (action < 0.7) {
                    // Hover over a random element
                    const elements = await page.$$('p, h2, li');
                    if (elements.length > 0) {
                        const elBox = await elements[Math.floor(Math.random() * elements.length)].boundingBox();
                        if (elBox) await page.mouse.move(elBox.x, elBox.y, { steps: 10 });
                    }
                } else {
                    // Click a random internal link (Stay on site)
                    const internal = await page.$$('a[href^="/"]');
                    if (internal.length > 0) await internal[Math.floor(Math.random() * internal.length)].click();
                }
                await new Promise(r => setTimeout(r, hWait(8000, 25000))); // Pause as if reading
            }

        } catch (e) {
            console.log(`Tab ${i} skipped: ${e.message}`);
        } finally {
            // 5. THE ULTIMATE WIPE
            await context.close(); // Clars cookies, cache, local storage, indexedDB instantly
        }
    }
    await browser.close();
}

// EXECUTE
startHumanSession("https://learnwithblog.xyz", "https://x.com/GhostReacondev/status/2013213212175724818?s=20");
