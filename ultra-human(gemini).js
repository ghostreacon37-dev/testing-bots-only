const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/** * DEVICE DATABASE 
 * Each tab mimics a completely different set of hardware specs.
 */
const DEVICES = [
    { name: 'Windows-Desktop-HighEnd', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 16, mem: 32, w: 1920, h: 1080 },
    { name: 'Macbook-Air-M2', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', platform: 'MacIntel', cores: 8, mem: 16, w: 1440, h: 900 },
    { name: 'Dell-XPS-Linux', ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Linux x86_64', cores: 8, mem: 16, w: 1366, h: 768 }
];

/* --- UTILITIES --- */
const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Moves the mouse in a curved arc rather than a robotic straight line
async function bezierMove(page, start, end) {
    const steps = hWait(30, 60);
    const control = { 
        x: (start.x + end.x) / 2 + (Math.random() - 0.5) * 400, 
        y: (start.y + end.y) / 2 + (Math.random() - 0.5) * 400 
    };
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x;
        const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y;
        await page.mouse.move(x, y);
        if (i % 10 === 0) await new Promise(r => setTimeout(r, hWait(2, 8)));
    }
}

async function startUltimateSession() {
    const TARGET_URL = "https://learnwithblog.xyz";
    const REFERRER_URL = "https://x.com/GhostReacondev/status/2013213212175724818?s=20";
    
    console.log("🚀 Initializing Stealth Engine...");
    const browser = await puppeteer.launch({
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const totalTabs = hWait(2, 9);
    console.log(`📊 Run started: Processing ${totalTabs} randomized tabs.`);

    for (let i = 1; i <= totalTabs; i++) {
        const dev = DEVICES[hWait(0, DEVICES.length - 1)];
        const context = await browser.createBrowserContext(); // Full data isolation
        const page = await context.newPage();

        // 1. SPOOFING HARDWARE & WEBDRIVER
        await page.setUserAgent(dev.ua);
        await page.setViewport({ width: dev.w, height: dev.h });
        await page.evaluateOnNewDocument((d) => {
            Object.defineProperty(navigator, 'platform', { get: () => d.platform });
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => d.cores });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => d.mem });
            delete navigator.__proto__.webdriver;
        }, dev);

        try {
            console.log(`Tab ${i}: [${dev.name}] Navigating to X...`);
            await page.goto(REFERRER_URL, { waitUntil: 'networkidle2', timeout: 60000 });
            await new Promise(r => setTimeout(r, hWait(6000, 12000)));

            // 2. FIND & CLICK LINK
            const linkSelector = 'a[href*="learnwithblog.xyz"]';
            const link = await page.$(linkSelector);

            if (link) {
                const box = await link.boundingBox();
                if (box) {
                    await bezierMove(page, {x: hWait(0, 200), y: hWait(0, 200)}, {x: box.x + box.width/2, y: box.y + box.height/2});
                    await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(80, 200) });
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
                }
            }

            // 3. FAIL-SAFE: If X blocked the click or link was missing
            const currentUrl = await page.url();
            if (!currentUrl.includes("learnwithblog.xyz")) {
                console.log(`Tab ${i}: Click blocked. Using Stealth Referer Bypass...`);
                await page.goto(TARGET_URL, { waitUntil: 'networkidle2', referer: REFERRER_URL });
            }

            console.log(`Tab ${i}: Landed on ${await page.url()}`);

            // 4. HUMAN ENGAGEMENT LOOP (1s to 8min)
            const sessionEnd = Date.now() + hWait(1000, 480000); 
            while (Date.now() < sessionEnd) {
                const action = Math.random();
                if (action < 0.4) {
                    await page.mouse.wheel({ deltaY: hWait(300, 700) }); // Reading scroll
                } else if (action < 0.6) {
                    // Accidental "Noise" Click on non-link
                    const x = hWait(50, dev.w - 50);
                    const y = hWait(50, dev.h - 50);
                    await page.mouse.click(x, y, { delay: hWait(50, 150) });
                } else if (action < 0.8) {
                    // Internal Navigation Click
                    const internal = await page.$$('a[href^="/"], a[href*="learnwithblog.xyz"]');
                    if (internal.length > 0) {
                        const randomLink = internal[hWait(0, internal.length - 1)];
                        await randomLink.click().catch(() => {});
                        await new Promise(r => setTimeout(r, hWait(4000, 8000))); 
                    }
                } else {
                    await page.mouse.move(hWait(0, dev.w), hWait(0, dev.h), { steps: 10 });
                }
                await new Promise(r => setTimeout(r, hWait(10000, 35000))); 
            }

            console.log(`Tab ${i}: Session complete. Wiping data.`);

        } catch (err) {
            console.error(`Tab ${i} Failed: ${err.message}`);
        } finally {
            await context.close(); // Clears all cookies/history for this tab
        }
    }

    await browser.close();
    console.log("✅ All sessions finished. Browser closed.");
}

startUltimateSession();
