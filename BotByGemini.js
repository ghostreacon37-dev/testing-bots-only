const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// 1. FULL FINGERPRINT SPOOFING (New Devices/Browsers)
const PROFILES = [
    { vendor: 'Google Inc.', platform: 'Win32', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', w: 1920, h: 1080, cores: 8, mem: 16 },
    { vendor: 'Apple Computer, Inc.', platform: 'MacIntel', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', w: 1440, h: 900, cores: 8, mem: 8 },
    { vendor: 'Google Inc.', platform: 'Linux armv8l', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', w: 412, h: 915, cores: 8, mem: 8, mobile: true },
    { vendor: 'Microsoft', platform: 'Win32', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', w: 2560, h: 1440, cores: 12, mem: 32 }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// REAL MOUSE CLICK ENGINE
async function realHumanClick(page, element) {
    if (!element) return false;
    try {
        await element.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await new Promise(r => setTimeout(r, hWait(1500, 3000))); // Human "Look" time
        const box = await element.boundingBox();
        if (box) {
            // Move mouse in a human curve to the element
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: hWait(15, 25) });
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: hWait(100, 300) });
            return true;
        }
    } catch (e) { return false; }
}

async function runSession(browser, targetDomain, referrer, tabId) {
    const profile = PROFILES[hWait(0, PROFILES.length - 1)];
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    // APPLY FULL FINGERPRINTING
    await page.setUserAgent(profile.ua);
    await page.setViewport({ width: profile.w, height: profile.h, isMobile: !!profile.mobile, hasTouch: !!profile.mobile });
    await page.evaluateOnNewDocument((p) => {
        Object.defineProperty(navigator, 'vendor', { get: () => p.vendor });
        Object.defineProperty(navigator, 'platform', { get: () => p.platform });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => p.cores });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => p.mem });
    }, profile);

    try {
        // STEP 1: REFERRER (X.COM)
        console.log(`[Tab ${tabId}] Landing on X.com...`);
        await page.goto(referrer, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, hWait(60000, 120000))); // Friend's 1-2 min wait
        
        // Find Link to Target
        const targetLink = await page.evaluateHandle((domain) => {
            return Array.from(document.querySelectorAll('a')).find(a => a.href.includes(domain));
        }, targetDomain).then(h => h.asElement());

        if (targetLink) {
            await realHumanClick(page, targetLink);
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
        }

        // STEP 2: TARGET SITE (LEARNWITHBLOG.XYZ)
        console.log(`[Tab ${tabId}] Entered Blog. Applying Human Randomness...`);
        
        // FRIEND'S LOGIC: Stay on Homepage first
        await new Promise(r => setTimeout(r, hWait(10000, 30000)));
        await page.mouse.wheel({ deltaY: hWait(300, 600) });

        // FRIEND'S LOGIC: Find Random Internal Post
        const postLink = await page.evaluateHandle(() => {
            const links = Array.from(document.querySelectorAll('a[href]'))
                .filter(a => a.href.includes(location.hostname) && a.href !== location.origin + '/' && !a.href.endsWith('#'));
            return links[Math.floor(Math.random() * links.length)];
        }).then(h => h.asElement());

        if (postLink) {
            console.log(`[Tab ${tabId}] Clicking internal post with real mouse...`);
            await realHumanClick(page, postLink);
            await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
        }

        // STEP 3: FULL HUMAN RANDOMNESS ON POST
        const sessionEndTime = Date.now() + hWait(60000, 270000); // 1 to 4.5 mins
        while (Date.now() < sessionEndTime) {
            const dice = Math.random();
            if (dice < 0.5) {
                await page.mouse.wheel({ deltaY: hWait(200, 500) }); // Human scroll
            } else if (dice < 0.8) {
                // Random Curiosity Click (Real Mouse)
                const rx = hWait(50, profile.w - 50);
                const ry = hWait(100, profile.h - 100);
                await page.mouse.click(rx, ry, { delay: hWait(100, 200) });
            } else {
                await new Promise(r => setTimeout(r, hWait(10000, 25000))); // Reading pause
            }
            await new Promise(r => setTimeout(r, hWait(4000, 10000)));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Session Error: ${err.message}`);
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

    const tabsCount = hWait(2, 6);
    for (let i = 1; i <= tabsCount; i++) {
        runSession(browser, TARGET, REFERRER, i);
        await new Promise(r => setTimeout(r, hWait(10000, 25000))); // Staggered entry
    }
}

start();
