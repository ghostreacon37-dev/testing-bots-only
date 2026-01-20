const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// 1. DIVERSIFIED BROWSER PROFILES (Chrome, Edge, Safari, Android)
const PROFILES = [
    { name: 'Chrome-Windows', vendor: 'Google Inc.', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16, w: 1920, h: 1080, mobile: false },
    { name: 'Edge-Windows', vendor: 'Microsoft', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', cores: 12, mem: 32, w: 2560, h: 1440, mobile: false },
    { name: 'Safari-Mac', vendor: 'Apple Computer, Inc.', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', platform: 'MacIntel', cores: 8, mem: 16, w: 1440, h: 900, mobile: false },
    { name: 'Chrome-Android-Pixel', vendor: 'Google Inc.', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 8, w: 412, h: 915, mobile: true }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

async function humanMove(page, targetPoint) {
    const steps = hWait(10, 20);
    await page.mouse.move(targetPoint.x, targetPoint.y, { steps: steps });
}

async function simulateHumanSession(browser, profile, targetDomain, referrer, tabId) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    
    await page.setUserAgent(profile.ua);
    await page.setViewport({ width: profile.w, height: profile.h, isMobile: profile.mobile, hasTouch: profile.mobile });

    await page.evaluateOnNewDocument((p) => {
        Object.defineProperty(navigator, 'vendor', { get: () => p.vendor });
        Object.defineProperty(navigator, 'platform', { get: () => p.platform });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => p.cores });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => p.mem });
        delete navigator.__proto__.webdriver;
    }, profile);

    try {
        // --- PHASE 1: X.COM (Untouched Redirection) ---
        console.log(`[Tab ${tabId}] Starting session as ${profile.name}`);
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, hWait(60000, 120000))); 
        await page.keyboard.press('Escape');

        const link = await page.evaluateHandle((domain) => {
            return Array.from(document.querySelectorAll('a')).find(a => a.innerText.toLowerCase().includes(domain.toLowerCase()) || a.href.toLowerCase().includes(domain.toLowerCase()));
        }, targetDomain).then(h => h.asElement());

        if (link) {
            const box = await link.boundingBox();
            if (box) {
                if (!profile.mobile) await humanMove(page, { x: box.x + box.width/2, y: box.y + box.height/2 });
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(150, 400) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }).catch(() => {});
            }
        }

        // --- PHASE 2: LEARNWITHBLOG.XYZ (Adaptive Engagement) ---
        const loadWait = hWait(5000, 30000); 
        await new Promise(r => setTimeout(r, loadWait));

        const sessionEnd = Date.now() + hWait(10000, 570000); 

        while (Date.now() < sessionEnd) {
            const dice = Math.random();

            if (dice < 0.4) {
                // ADAPTIVE SCROLLING: Slower for text, faster for gaps
                const scrollDepth = hWait(150, 500);
                console.log(`[Tab ${tabId}] Reading scroll...`);
                // Smooth scroll emulation
                for (let i = 0; i < 5; i++) {
                    await page.mouse.wheel({ deltaY: scrollDepth / 5 });
                    await new Promise(r => setTimeout(r, hWait(100, 300))); 
                }
            } 
            else if (dice < 0.8) {
                // PHYSICAL CLICK: Targets real elements
                const elements = await page.$$('a, button, p, h2, img, span, li');
                if (elements.length > 0) {
                    const el = elements[hWait(0, elements.length - 1)];
                    const b = await el.boundingBox();
                    
                    if (b && b.width > 2 && b.height > 2) {
                        // Scroll element into view first (like a human focusing)
                        await page.evaluate((y) => window.scrollBy(0, y - 300), b.y);
                        await new Promise(r => setTimeout(r, hWait(1000, 3000)));

                        console.log(`[Tab ${tabId}] Engaging with content at ${Math.round(b.x)}, ${Math.round(b.y)}`);
                        if (!profile.mobile) await humanMove(page, { x: b.x + b.width/2, y: b.y + b.height/2 });
                        await page.mouse.click(b.x + b.width/2, b.y + b.height/2, { delay: hWait(100, 350) });
                        
                        // Stay on the new content/position for a bit
                        await new Promise(r => setTimeout(r, hWait(5000, 15000)));
                    }
                }
            } 
            else {
                // IDLE/FIDGET: Random mouse movements or long pauses
                if (!profile.mobile) {
                    await humanMove(page, { x: hWait(100, 800), y: hWait(100, 800) });
                }
                await new Promise(r => setTimeout(r, hWait(10000, 30000)));
            }
            await new Promise(r => setTimeout(r, hWait(3000, 8000)));
        }

        // --- PHASE 3: RANDOM RETURN ---
        if (Math.random() < 0.3) {
            console.log(`[Tab ${tabId}] Returning to X.`);
            await page.goBack().catch(() => {});
            await new Promise(r => setTimeout(r, 8000));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Log: ${err.message}`);
    } finally {
        await context.close();
    }
}

async function start() {
    const TARGET = "learnwithblog.xyz";
    const REFERRER = "https://x.com/GhostReacondev/status/2013213212175724818?s=20";
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const numTabs = hWait(2, 9);
    const active = [];
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        await new Promise(r => setTimeout(r, hWait(2000, 15000)));
        active.push(simulateHumanSession(browser, profile, TARGET, REFERRER, i));
    }
    await Promise.all(active);
    await browser.close();
}

start();
