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
        // --- PHASE 1: X.COM (Keep as is) ---
        console.log(`[Tab ${tabId}] Going to X...`);
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, hWait(60000, 120000))); 
        await page.keyboard.press('Escape');

        const link = await page.evaluateHandle((domain) => {
            return Array.from(document.querySelectorAll('a')).find(a => a.innerText.toLowerCase().includes(domain.toLowerCase()) || a.href.toLowerCase().includes(domain.toLowerCase()));
        }, targetDomain).then(h => h.asElement());

        if (link) {
            await link.scrollIntoView();
            const box = await link.boundingBox();
            if (box) {
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(150, 400) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }).catch(() => {});
            }
        }

        // --- PHASE 2: LEARNWITHBLOG.XYZ (UPGRADED HUMAN BEHAVIOR) ---
        console.log(`[Tab ${tabId}] Entered Blog. Starting real human sequence...`);
        
        // 1. Initial "Scanning" Wait (Simulates reading the header/hero section)
        await new Promise(r => setTimeout(r, hWait(8000, 25000)));

        // 2. FIND INTERNAL POST (Friend's logic)
        const internalPost = await page.evaluateHandle(() => {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            const internalLinks = anchors.filter(a => 
                a.href.includes(window.location.hostname) && 
                a.href !== window.location.origin + '/' && 
                !a.href.includes('#')
            );
            return internalLinks[Math.floor(Math.random() * internalLinks.length)];
        }).then(h => h.asElement());

        if (internalPost) {
            console.log(`[Tab ${tabId}] Found internal post. Executing physical mouse click.`);
            
            // Scroll to it naturally
            await internalPost.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
            await new Promise(r => setTimeout(r, hWait(2000, 4000)));

            const box = await internalPost.boundingBox();
            if (box) {
                // Physical Mouse Click
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(100, 300) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            }
        }

        // 3. POST-CLICK RANDOMNESS (Stay on the new page and act human)
        const sessionEnd = Date.now() + hWait(60000, 300000); // 1 to 5 minutes stay
        while (Date.now() < sessionEnd) {
            // Randomly Scroll
            await page.mouse.wheel({ deltaY: hWait(200, 600) });
            
            // Random "Fidget" Click (30% chance - click a non-link element like text or image)
            if (Math.random() < 0.3) {
                const elements = await page.$$('p, h1, h2, img');
                if (elements.length > 0) {
                    const el = elements[hWait(0, elements.length - 1)];
                    const b = await el.boundingBox();
                    if (b) await page.mouse.click(b.x + b.width/2, b.y + b.height/2, { delay: hWait(100, 200) });
                }
            }

            await new Promise(r => setTimeout(r, hWait(10000, 25000)));
        }

        // --- PHASE 3: RANDOM BACK ---
        if (Math.random() < 0.3) {
            console.log(`[Tab ${tabId}] Going back to X.`);
            await page.goBack().catch(() => {});
            await new Promise(r => setTimeout(r, 5000));
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
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    const numTabs = hWait(2, 6);
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        simulateHumanSession(browser, profile, TARGET, REFERRER, i);
        await new Promise(r => setTimeout(r, hWait(8000, 20000)));
    }
}

start();
