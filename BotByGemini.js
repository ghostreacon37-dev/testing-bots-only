const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const PROFILES = [
    { name: 'Chrome-Windows', vendor: 'Google Inc.', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16, w: 1920, h: 1080, mobile: false },
    { name: 'Edge-Windows', vendor: 'Microsoft', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', cores: 12, mem: 32, w: 2560, h: 1440, mobile: false },
    { name: 'Safari-Mac', vendor: 'Apple Computer, Inc.', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', platform: 'MacIntel', cores: 8, mem: 16, w: 1440, h: 900, mobile: false },
    { name: 'Chrome-Android-Pixel', vendor: 'Google Inc.', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 8, w: 412, h: 915, mobile: true }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

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
        // --- PHASE 1: X.COM REDIRECTION (MY CODE - UNTOUCHED) ---
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, hWait(60000, 120000))); 
        await page.keyboard.press('Escape');

        const xLink = await page.evaluateHandle((domain) => {
            return Array.from(document.querySelectorAll('a')).find(a => a.href && a.href.includes(domain));
        }, targetDomain).then(h => h.asElement());

        if (xLink) {
            const box = await xLink.boundingBox();
            if (box) {
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(100, 300) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }).catch(() => {});
            }
        }

        // --- PHASE 2: INSIDE LEARNWITHBLOG.XYZ (FRIEND'S CLICKING LOGIC REPLACEMENT) ---
        
        // 1. Initial wait on arrival
        await new Promise(r => setTimeout(r, hWait(5000, 15000)));

        // 2. FRIEND'S INTERNAL CLICK LOGIC: Find a random internal post
        // This is the part you said works better
        const internalPostHref = await page.evaluate(() => {
            try {
                const links = Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.href)
                    .filter(h => h && h.includes(location.hostname) && h !== location.origin + '/' && !h.endsWith('#'));
                if (!links.length) return null;
                return links[Math.floor(Math.random() * links.length)];
            } catch { return null; }
        });

        if (internalPostHref) {
            console.log(`[Tab ${tabId}] Moving to internal post: ${internalPostHref}`);
            // Use MY physical engine to execute YOUR FRIEND'S found link
            await page.goto(internalPostHref, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
        }

        // 3. HUMAN BEHAVIOR WHILE ON THE POST (MY RANDOMNESS)
        const sessionEnd = Date.now() + hWait(60000, 300000); 
        while (Date.now() < sessionEnd) {
            // Random Scrolling
            await page.mouse.wheel({ deltaY: hWait(200, 500) });
            
            // Random Human "Fidget" Clicks
            if (Math.random() > 0.7) {
                await page.mouse.click(hWait(100, 400), hWait(200, 500), { delay: hWait(50, 150) });
            }
            
            await new Promise(r => setTimeout(r, hWait(5000, 15000)));
        }

        // --- PHASE 3: RETURN TO X (MY CODE - UNTOUCHED) ---
        if (Math.random() < 0.3) {
            await page.goBack().catch(() => {});
            await new Promise(r => setTimeout(r, 5000));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Error: ${err.message}`);
    } finally {
        await context.close();
    }
}

async function start() {
    const TARGET = "learnwithblog.xyz";
    const REFERRER = "https://x.com/GhostReacondev/status/2013213212175724818?s=20";
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
    });

    const numTabs = hWait(2, 5);
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        simulateHumanSession(browser, profile, TARGET, REFERRER, i);
        await new Promise(r => setTimeout(r, hWait(5000, 15000)));
    }
}

start();
