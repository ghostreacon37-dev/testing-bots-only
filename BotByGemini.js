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
        // --- PHASE 1: X.COM (Untouched) ---
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

        // --- PHASE 2: LEARNWITHBLOG.XYZ (FIXED CLICKING ENGINE) ---
        console.log(`[Tab ${tabId}] Entered Target Site. Waiting for content...`);
        await new Promise(r => setTimeout(r, hWait(5000, 37000)));

        const sessionEnd = Date.now() + hWait(10000, 570000); 

        while (Date.now() < sessionEnd) {
            // Force browser to "wake up" and find elements
            const elements = await page.$$('a, button, h1, h2, p, img');
            
            if (elements.length > 0) {
                // Pick a random element
                const target = elements[hWait(0, elements.length - 1)];
                
                // 1. Scroll it into view (crucial for clicking)
                await target.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                await new Promise(r => setTimeout(r, hWait(2000, 5000)));

                // 2. Get fresh coordinates after scrolling
                const box = await target.boundingBox();
                
                if (box && box.width > 0 && box.height > 0) {
                    console.log(`[Tab ${tabId}] Executing real click at: ${Math.round(box.x)}, ${Math.round(box.y)}`);
                    
                    // 3. Perform a physical mouse click on the coordinates
                    await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { 
                        delay: hWait(100, 300),
                        button: 'left'
                    });

                    // 4. Random reading time after a click
                    await new Promise(r => setTimeout(r, hWait(5000, 20000)));
                }
            }

            // Random scrolling behavior
            await page.mouse.wheel({ deltaY: hWait(200, 500) });
            await new Promise(r => setTimeout(r, hWait(3000, 10000)));
        }

        // --- PHASE 3: RANDOM BACK ---
        if (Math.random() < 0.3) {
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
        await new Promise(r => setTimeout(r, hWait(5000, 15000)));
    }
}

start();
