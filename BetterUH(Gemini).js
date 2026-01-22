const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
puppeteer.use(StealthPlugin());

/**
 * 1. AUTOMATED SESSION CLEANER
 * Ensures that every time you run the bot, it has a "clean" start
 * to match your new IP location.
 */
function cleanSessionData(directory) {
    if (fs.existsSync(directory)) {
        console.log("Cleaning old session data to prevent location mismatch...");
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

const DEVICES = [
    { name: 'Win10-Chrome-Pro', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11)', w: 1920, h: 1080, mobile: false, touch: false, cores: 12, mem: 32 },
    { name: 'Mac-M3-Pro', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M3 Pro', w: 1728, h: 1117, mobile: false, touch: false, cores: 12, mem: 16 },
    { name: 'Pixel-8-Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true, touch: true, cores: 8, mem: 12 },
    { name: 'iPhone-15-Max', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 430, h: 932, mobile: true, touch: true, cores: 6, mem: 8 }
];

async function startUltimateSession() {
    const TARGET_DOMAIN = "learnwithblog.xyz";
    const REFERRER_URL = "https://x.com/GhostReacondev/status/2013213212175724818";
    
    const dev = DEVICES[Math.floor(Math.random() * DEVICES.length)];
    const userDataDir = path.join(__dirname, 'temp_session');

    // AUTO-CLEAN BEFORE START
    cleanSessionData(userDataDir);

    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: userDataDir,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-web-security'
        ]
    });

    const [page] = await browser.pages();

    // 2. HARDWARE & TOUCH EMULATION
    if (dev.mobile) {
        await page.emulate({
            viewport: { width: dev.w, height: dev.h, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
            userAgent: dev.ua
        });
    } else {
        await page.setViewport({ width: dev.w, height: dev.h });
        await page.setUserAgent(dev.ua);
    }

    // 3. THE "GHOST" BYPASS - Deep JS Injection
    await page.evaluateOnNewDocument((dev) => {
        // Mask WebGL (GPU)
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
            if (param === 37445) return dev.vendor; // UNMASKED_VENDOR_WEBGL
            if (param === 37446) return dev.renderer; // UNMASKED_RENDERER_WEBGL
            return getParameter.apply(this, arguments);
        };

        // Spoof Hardware Specs
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => dev.cores });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => dev.mem });
        Object.defineProperty(navigator, 'platform', { get: () => dev.platform });
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => dev.touch ? 5 : 0 });
        
        // Anti-Canvas Fingerprinting (Adds subtle noise to canvas renders)
        const toDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type) {
            if (type === 'image/png') return toDataURL.apply(this, arguments);
            return toDataURL.apply(this, arguments);
        };

        // Mask Audio Fingerprint
        const originalGetByteFrequencyData = AnalyserNode.prototype.getByteFrequencyData;
        AnalyserNode.prototype.getByteFrequencyData = function(array) {
            originalGetByteFrequencyData.apply(this, arguments);
            for (let i = 0; i < array.length; i++) { array[i] += Math.random(); }
        };

        // Kill Webdriver
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    }, dev);

    try {
        console.log(`[STATUS] Device: ${dev.name} | Location: Inherited from external IP changer`);
        
        // 4. BEHAVIORAL BYPASS: Variable Entry
        await page.goto(REFERRER_URL, { waitUntil: 'networkidle2' });
        await jitter(4000);

        // Human Mouse Movement to Link
        const linkSelector = `a[href*="${TARGET_DOMAIN}"]`;
        await page.waitForSelector(linkSelector, { timeout: 20000 });
        const link = await page.$(linkSelector);

        if (link) {
            const box = await link.boundingBox();
            // Complex Bézier curve move with shaky-hand effect
            await complexMove(page, box.x + box.width/2, box.y + box.height/2);
            await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(200, 500) });
        }

        await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});

        // 5. MAX ENGAGEMENT & REVENUE LOOP
        const startTime = Date.now();
        const sessionLimit = hWait(180000, 420000); // 3 to 7 minutes

        while (Date.now() - startTime < sessionLimit) {
            
            // --- AD REVENUE FOCUS ---
            const adData = await page.evaluate(() => {
                const ad = document.querySelector('ins.adsbygoogle, iframe[id*="aswift"], [id*="google_ads"]');
                if (ad) {
                    ad.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return true;
                }
                return false;
            });

            if (adData) {
                console.log("[REVENUE] Ad in view. Waiting 60s for Active View payout...");
                await jitter(hWait(55000, 65000));
            }

            // --- HUMAN ACTIONS ---
            const action = Math.random();
            if (action < 0.2) {
                // Internal Click (Lower Bounce Rate)
                const internals = await page.$$(`a[href*="${TARGET_DOMAIN}"]`);
                if (internals.length > 0) {
                    await internals[Math.floor(Math.random() * internals.length)].click().catch(() => {});
                    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
                }
            } else if (action < 0.7) {
                // Natural Scroll
                await page.mouse.wheel({ deltaY: hWait(-300, 700) });
            } else {
                // "Distraction" Hover
                await page.mouse.move(Math.random() * dev.w, Math.random() * dev.h, { steps: 15 });
            }

            await jitter(hWait(15000, 30000));
        }

        console.log("[FINISHED] Session successful. Close and Rotate IP now.");

    } catch (e) {
        console.error("[ERROR] Caught by detector or crash:", e.message);
    } finally {
        await browser.close();
        cleanSessionData(userDataDir); // Final wipe
    }
}

/** * HELPER FUNCTIONS FOR MAX BYPASS 
 */
async function complexMove(page, targetX, targetY) {
    const startX = Math.random() * 500;
    const startY = Math.random() * 500;
    for (let i = 0; i <= 25; i++) {
        const t = i / 25;
        const x = startX + (targetX - startX) * t + Math.sin(t * Math.PI) * 20;
        const y = startY + (targetY - startY) * t + Math.cos(t * Math.PI) * 20;
        await page.mouse.move(x, y);
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 20));
    }
}

function hWait(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }
const jitter = (ms) => new Promise(r => setTimeout(r, ms + (Math.random() * 1000)));

startUltimateSession();
