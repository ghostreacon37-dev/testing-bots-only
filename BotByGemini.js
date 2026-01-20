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
    
    // Fingerprinting
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
        // --- PHASE 1: X.COM (FAST REDIRECT) ---
        console.log(`[Tab ${tabId}] X.com: Quick Redirect Mode...`);
        await page.goto(referrer, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait just enough for the link to exist
        await new Promise(r => setTimeout(r, hWait(5000, 10000))); 
        
        const xLink = await page.evaluateHandle((domain) => {
            return Array.from(document.querySelectorAll('a')).find(a => a.href && a.href.includes(domain));
        }, targetDomain).then(h => h.asElement());

        if (xLink) {
            const box = await xLink.boundingBox();
            if (box) {
                // Direct click to move to the blog
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            }
        }

        // --- PHASE 2: LEARNWITHBLOG.XYZ (FULL HUMAN MODE) ---
        console.log(`[Tab ${tabId}] Blog reached. Starting Deep Human Behavior...`);
        
        // 1. Initial Reading Wait
        await new Promise(r => setTimeout(r, hWait(10000, 25000)));

        // 2. INTERNAL POST DISCOVERY & CLICK
        const findAndClickInternal = async () => {
            const post = await page.evaluateHandle(() => {
                const links = Array.from(document.querySelectorAll('a[href]'))
                    .filter(a => a.href.includes(window.location.hostname) && 
                                 a.href !== window.location.origin + '/' && 
                                 !a.href.includes('#'));
                return links[Math.floor(Math.random() * links.length)];
            }).then(h => h.asElement());

            if (post) {
                // Physical Mouse Behavior: Scroll -> Wait -> Move -> Click
                await post.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                await new Promise(r => setTimeout(r, hWait(2000, 4000)));
                
                const box = await post.boundingBox();
                if (box) {
                    await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 25 });
                    await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(100, 400) });
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
                    return true;
                }
            }
            return false;
        };

        // Click the first internal post
        await findAndClickInternal();

        // 3. CONTINUOUS HUMAN INTERACTION LOOP
        const sessionEnd = Date.now() + hWait(120000, 480000); // Stay for 2-8 mins
        while (Date.now() < sessionEnd) {
            const roll = Math.random();

            if (roll < 0.5) {
                // Action: Natural Scroll
                console.log(`[Tab ${tabId}] Human scrolling...`);
                await page.mouse.wheel({ deltaY: hWait(400, 800) });
            } 
            else if (roll < 0.7) {
                // Action: Fidget Click (Non-link elements)
                console.log(`[Tab ${tabId}] Human fidgeting...`);
                const elements = await page.$$('p, img, h2');
                if (elements.length > 0) {
                    const el = elements[hWait(0, elements.length - 1)];
                    const b = await el.boundingBox();
                    if (b) await page.mouse.click(b.x + b.width/2, b.y + b.height/2);
                }
            } 
            else if (roll < 0.8) {
                // Action: Move to another post (Deep navigation)
                console.log(`[Tab ${tabId}] Navigating deeper...`);
                await findAndClickInternal();
            }

            await new Promise(r => setTimeout(r, hWait(8000, 20000)));
        }

        console.log(`[Tab ${tabId}] Session complete.`);

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
