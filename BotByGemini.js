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

// PHYSICAL CLICK ENGINE (Scrolls, Moves, then Clicks)
async function physicalClick(page, element, profile) {
    if (!element) return false;
    try {
        await element.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await new Promise(r => setTimeout(r, hWait(2000, 4000)));
        const box = await element.boundingBox();
        if (box && box.width > 0) {
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            if (!profile.mobile) {
                await page.mouse.move(cx, cy, { steps: hWait(15, 25) });
            }
            await page.mouse.click(cx, cy, { delay: hWait(100, 350) });
            return true;
        }
    } catch (e) { return false; }
    return false;
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
        // --- PHASE 1: X.COM (Friend's Logic + Real Click) ---
        console.log(`[Tab ${tabId}] Starting: ${profile.name}`);
        await page.goto(referrer, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, hWait(60000, 120000)));
        await page.keyboard.press('Escape');

        const xLink = await page.evaluateHandle((domain) => {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            return anchors.find(a => a.href && a.href.includes(domain));
        }, targetDomain).then(h => h.asElement());

        if (xLink) {
            await physicalClick(page, xLink, profile);
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }).catch(() => {});
        }

        // --- PHASE 2: LEARNWITHBLOG.XYZ (Random Human Behavior) ---
        await new Promise(r => setTimeout(r, hWait(5000, 20000)));
        
        const sessionEnd = Date.now() + hWait(120000, 500000); // 2 to 8 mins
        console.log(`[Tab ${tabId}] Blog session started. Active interactions enabled.`);

        while (Date.now() < sessionEnd) {
            const actionDice = Math.random();

            if (actionDice < 0.4) {
                // ACTION: HUMAN SCROLL
                console.log(`[Tab ${tabId}] Scrolling...`);
                await page.mouse.wheel({ deltaY: hWait(300, 700) });
            } 
            else if (actionDice < 0.7) {
                // ACTION: RANDOM ELEMENT CLICK (Friend's Style Finding)
                const elements = await page.$$('p, h2, img, span, li');
                if (elements.length > 0) {
                    const el = elements[hWait(0, elements.length - 1)];
                    console.log(`[Tab ${tabId}] Random human interaction click.`);
                    await physicalClick(page, el, profile);
                }
            } 
            else if (actionDice < 0.9) {
                // ACTION: INTERNAL NAVIGATION (Moving to another post)
                const internalLink = await page.evaluateHandle(() => {
                    const links = Array.from(document.querySelectorAll('a[href]'))
                        .filter(h => h.href && h.href.includes(location.hostname) && h.href !== location.origin + '/' && !h.href.endsWith('#'));
                    return links[Math.floor(Math.random() * links.length)];
                }).then(h => h.asElement());

                if (internalLink) {
                    console.log(`[Tab ${tabId}] Navigating to next internal post.`);
                    await physicalClick(page, internalLink, profile);
                    await new Promise(r => setTimeout(r, hWait(5000, 10000)));
                }
            }
            else {
                // ACTION: IDLE READING
                console.log(`[Tab ${tabId}] Reading pause...`);
                await new Promise(r => setTimeout(r, hWait(15000, 35000)));
            }

            // Small randomized delay between all "thoughts"
            await new Promise(r => setTimeout(r, hWait(4000, 12000)));
        }

        // --- PHASE 3: RETURN TO X (Random) ---
        if (Math.random() < 0.3) {
            console.log(`[Tab ${tabId}] Returning to X.`);
            await page.goBack().catch(() => {});
            await new Promise(r => setTimeout(r, 6000));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Error: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabId}] Session finished.`);
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
        await new Promise(r => setTimeout(r, hWait(8000, 20000))); // Staggered starts
    }
}

start();
