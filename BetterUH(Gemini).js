const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const DEVICES = [
    { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, mobile: false },
    { name: 'Pixel-8', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true },
    { name: 'iPhone-15', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 393, h: 852, mobile: true }
    // ... (You can keep your previous 12+ devices here)
];

const jitter = (ms) => new Promise(r => setTimeout(r, ms + (Math.random() * (ms * 0.4))));

async function startSession() {
    const TARGET_DOMAIN = "learnwithblog.xyz";
    const REFERRER_URL = "https://x.com/GhostReacondev/status/2013213212175724818";
    
    // 1. RANDOM FAILURE MODE (The "Bored Human")
    // 15% of the time, the bot will visit Twitter but "forget" to click your link.
    const willActuallyClick = Math.random() > 0.15;
    
    const dev = DEVICES[Math.floor(Math.random() * DEVICES.length)];
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });

    const page = await browser.newPage();
    
    // 2. ENVIRONMENT NOISE (Randomize Languages/Timezones)
    const langs = [['en-US', 'en'], ['en-GB', 'en'], ['en-CA', 'en']];
    await page.setExtraHTTPHeaders({ 'Accept-Language': langs[Math.floor(Math.random() * langs.length)].join(',') });

    if (dev.mobile) {
        await page.setViewport({ width: dev.w, height: dev.h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    } else {
        await page.setViewport({ width: dev.w, height: dev.h });
    }

    await page.setUserAgent(dev.ua);

    // Deep Masking
    await page.evaluateOnNewDocument((dev) => {
        // Mask WebGL
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
            if (param === 37445) return dev.vendor;
            if (param === 37446) return dev.renderer;
            return getParameter.apply(this, arguments);
        };
        // Break the "perfect" font fingerprint
        const originalQuery = window.matchMedia;
        window.matchMedia = (query) => {
            if (query.includes('prefers-reduced-motion')) return { matches: Math.random() > 0.8 };
            return originalQuery(query);
        };
    }, dev);

    try {
        await page.goto(REFERRER_URL, { waitUntil: 'networkidle2' });
        console.log(`Session Started: ${dev.name}. Will click: ${willActuallyClick}`);

        // 3. VARIABLE INTERACTION (Clumsy Scrolling)
        for(let i=0; i < 4; i++) {
            // Sometimes scroll up, sometimes down (like someone re-reading)
            const dir = Math.random() > 0.2 ? 1 : -1;
            await page.mouse.wheel({ deltaY: (Math.floor(Math.random() * 400) + 100) * dir });
            await jitter(3000);
        }

        if (!willActuallyClick) {
            console.log("Simulating 'Boredom' - Leaving site early.");
            await jitter(5000);
            return await browser.close();
        }

        const link = await page.$(`a[href*="${TARGET_DOMAIN}"]`);
        if (link) {
            const box = await link.boundingBox();
            // Move mouse to a random spot FIRST, then the link
            await page.mouse.move(Math.random() * dev.w, Math.random() * dev.h);
            await jitter(500);
            await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: 200 });
        }

        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // --- KEYBOARD & ENTROPY ON BLOG ---
        // Occasionally "search" for something or press keys
        if (Math.random() > 0.7) {
            await page.keyboard.press('PageDown');
            await jitter(1000);
            await page.keyboard.press('ArrowDown');
        }

        const sessionEnd = Date.now() + (Math.random() * 180000 + 60000); // 1-4 minutes
        while (Date.now() < sessionEnd) {
            // Chaotic movement: Sometimes hover, sometimes scroll, sometimes stay still
            const act = Math.random();
            if (act < 0.5) {
                await page.mouse.wheel({ deltaY: Math.random() * 300 });
            } else if (act < 0.7) {
                // Micro-hover over random text
                await page.mouse.move(Math.random() * dev.w, Math.random() * dev.h);
            } else if (act < 0.85) {
                // Internal navigation
                const internal = await page.$$('a[href*="' + TARGET_DOMAIN + '"]');
                if (internal.length > 0) {
                    await internal[Math.floor(Math.random() * internal.length)].click().catch(() => {});
                    await jitter(4000);
                }
            }
            await jitter(15000); // Humans pause to read
        }

        console.log("Session complete.");

    } catch (e) {
        console.log("Caught or Error:", e.message);
    } finally {
        await browser.close();
    }
}

startSession();
