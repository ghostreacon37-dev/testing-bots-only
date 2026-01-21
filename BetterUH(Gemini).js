const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * 12+ DEVICE FLEET (2026 Updated Fingerprints)
 * Includes high-end and mid-range mobile/desktop devices
 */
const DEVICES = [
    // --- DESKTOPS ---
    { name: 'Win10-Chrome-Nvidia', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, mobile: false },
    { name: 'MacOS-M2-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, mobile: false },
    { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)', w: 2560, h: 1440, mobile: false },
    
    // --- ANDROID DEVICES ---
    { name: 'Pixel-8-Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true },
    { name: 'Samsung-S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 384, h: 854, mobile: true },
    { name: 'Samsung-A54', ua: 'Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Mali-G68 MC4', w: 412, h: 915, mobile: true },
    { name: 'OnePlus-12', ua: 'Mozilla/5.0 (Linux; Android 14; CPH2581) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 412, h: 915, mobile: true },
    { name: 'Xiaomi-14', ua: 'Mozilla/5.0 (Linux; Android 14; 23127PN0CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 393, h: 852, mobile: true },

    // --- iOS DEVICES ---
    { name: 'iPhone-15-Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 393, h: 852, mobile: true },
    { name: 'iPhone-14', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 390, h: 844, mobile: true },
    { name: 'iPad-Pro-M2', ua: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPad', vendor: 'Apple Inc.', renderer: 'Apple M2 GPU', w: 1024, h: 1366, mobile: true },
    { name: 'iPhone-SE-3', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 375, h: 667, mobile: true }
];

const jitter = (ms) => new Promise(r => setTimeout(r, ms + (Math.random() * (ms * 0.3))));

async function startSession() {
    const TARGET_DOMAIN = "learnwithblog.xyz";
    const REFERRER_URL = "https://x.com/GhostReacondev/status/2013213212175724818";

    // Select random device from the 12+ list
    const dev = DEVICES[Math.floor(Math.random() * DEVICES.length)];
    console.log(`Launching session as: ${dev.name}`);

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            dev.mobile ? '--force-device-scale-factor=2' : '--start-maximized'
        ]
    });

    const page = await browser.newPage();

    // --- MOBILE EMULATION ---
    if (dev.mobile) {
        // This is crucial for Android/iOS bypass: enables touch events
        await page.setViewport({ 
            width: dev.w, 
            height: dev.h, 
            isMobile: true, 
            hasTouch: true, 
            deviceScaleFactor: 2 
        });
    } else {
        await page.setViewport({ width: dev.w, height: dev.h });
    }

    await page.setUserAgent(dev.ua);

    // --- DEEP FINGERPRINT OVERRIDE ---
    await page.evaluateOnNewDocument((dev) => {
        // Mask WebGL Hardware
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return dev.vendor;
            if (parameter === 37446) return dev.renderer;
            return getParameter.apply(this, arguments);
        };

        // Mask Platform and Webdriver
        Object.defineProperty(navigator, 'platform', { get: () => dev.platform });
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // Hide Puppeteer-specific properties
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    }, dev);

    try {
        await page.goto(REFERRER_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Human scrolling on Twitter
        for(let i=0; i < Math.floor(Math.random() * 3) + 2; i++) {
            await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 500) + 300 });
            await jitter(2500);
        }

        const linkSelector = `a[href*="${TARGET_DOMAIN}"]`;
        await page.waitForSelector(linkSelector, { timeout: 10000 });
        const link = await page.$(linkSelector);
        
        if (link) {
            const box = await link.boundingBox();
            // Move and click (Click simulates touch on mobile viewport)
            await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: Math.random() * 200 + 150 });
            console.log("Link clicked. Navigating to blog...");
        }

        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // --- ON SITE ENGAGEMENT ---
        const sessionLength = Math.floor(Math.random() * 5) + 5; // 5 to 10 actions
        for (let i = 0; i < sessionLength; i++) {
            // Scroll down
            await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 400) + 100 });
            // Random pause (reading time)
            await jitter(Math.floor(Math.random() * 15000) + 10000); 
            
            // 30% chance to click something else on the site
            if (Math.random() < 0.3) {
                const internals = await page.$$('a');
                if (internals.length > 0) {
                    const idx = Math.floor(Math.random() * internals.length);
                    await internals[idx].click().catch(() => {});
                    await jitter(5000);
                }
            }
        }

        console.log("Session Finished Successfully.");

    } catch (err) {
        console.log("Bot halted or caught: ", err.message);
    } finally {
        await browser.close();
    }
}

startSession();
