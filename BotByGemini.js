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
        // --- PHASE 1: X.COM ---
        console.log(`[Tab ${tabId}] Moving to X...`);
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, hWait(60000, 120000))); 
        await page.keyboard.press('Escape');

        const xLink = await page.evaluateHandle((domain) => {
            return Array.from(document.querySelectorAll('a')).find(a => a.href && a.href.includes(domain));
        }, targetDomain).then(h => h.asElement());

        if (xLink) {
            await xLink.scrollIntoView();
            const box = await xLink.boundingBox();
            if (box) {
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(150, 400) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }).catch(() => {});
            }
        }

        // --- PHASE 2: LEARNWITHBLOG.XYZ (THE FIX) ---
        console.log(`[Tab ${tabId}] Arrived at Blog. Starting Internal Hunt...`);
        
        // Wait for body to be ready
        await page.waitForSelector('body');
        await new Promise(r => setTimeout(r, hWait(10000, 20000)));

        // NEW: Scroll down first to load "Lazy Loaded" links
        await page.mouse.wheel({ deltaY: 1200 });
        await new Promise(r => setTimeout(r, 3000));

        // NEW: More aggressive internal link finder
        const internalPost = await page.evaluateHandle(() => {
            const currentHost = window.location.hostname;
            // Get all links that go to the same site but aren't just the homepage "/" or "#"
            const allLinks = Array.from(document.querySelectorAll('a[href]'));
            const validLinks = allLinks.filter(a => {
                const href = a.getAttribute('href');
                return (a.href.includes(currentHost) && 
                        href !== '/' && 
                        href !== '#' && 
                        !href.startsWith('javascript:'));
            });
            
            // Prioritize links that look like articles (usually have more text)
            validLinks.sort((a, b) => b.innerText.length - a.innerText.length);
            return validLinks[Math.floor(Math.random() * Math.min(validLinks.length, 5))]; 
        }).then(h => h.asElement());

        if (internalPost) {
            console.log(`[Tab ${tabId}] Target link found. Moving Mouse...`);
            
            // 1. Move mouse to the link location
            await internalPost.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
            await new Promise(r => setTimeout(r, 3000));

            const box = await internalPost.boundingBox();
            if (box) {
                // 2. Physical Hover + Click
                await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 20 });
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(200, 500) });
                console.log(`[Tab ${tabId}] CLICKED! Waiting for post to load...`);
                
                // Wait for the new page
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
                    console.log(`[Tab ${tabId}] Navigation took too long, but click was sent.`);
                });
            }
        } else {
            console.log(`[Tab ${tabId}] FAILED: No internal links detected.`);
        }

        // --- PHASE 3: STAY & ACT HUMAN ---
        const sessionEnd = Date.now() + hWait(60000, 240000); 
        while (Date.now() < sessionEnd) {
            await page.mouse.wheel({ deltaY: hWait(300, 700) });
            await new Promise(r => setTimeout(r, hWait(10000, 20000)));
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

    const numTabs = hWait(2, 4);
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        simulateHumanSession(browser, profile, TARGET, REFERRER, i);
        await new Promise(r => setTimeout(r, hWait(10000, 20000)));
    }
}

start();
