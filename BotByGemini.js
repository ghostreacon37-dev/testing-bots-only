const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const PROFILES = [
    { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16, w: 1920, h: 1080, mobile: false },
    { name: 'Android-Pixel7', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 8, w: 412, h: 915, mobile: true },
    { name: 'MacOS-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', platform: 'MacIntel', cores: 8, mem: 16, w: 1440, h: 900, mobile: false },
    { name: 'Android-SamsungS23', ua: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 12, w: 360, h: 800, mobile: true }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

async function humanMove(page, targetPoint) {
    const start = { x: hWait(0, 500), y: hWait(0, 500) };
    const steps = hWait(15, 35);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = start.x + (targetPoint.x - start.x) * t;
        const y = start.y + (targetPoint.y - start.y) * t;
        await page.mouse.move(x, y);
        if (i % 5 === 0) await new Promise(r => setTimeout(r, hWait(1, 5)));
    }
}

async function simulateHumanSession(browser, profile, targetDomain, referrer, tabId) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setUserAgent(profile.ua);
    
    if (profile.mobile) {
        await page.setViewport({ width: profile.w, height: profile.h, isMobile: true, hasTouch: true });
    } else {
        await page.setViewport({ width: profile.w, height: profile.h });
    }

    await page.evaluateOnNewDocument((p) => {
        Object.defineProperty(navigator, 'platform', { get: () => p.platform });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => p.cores });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => p.mem });
        delete navigator.__proto__.webdriver;
    }, profile);

    try {
        // --- X.com PART (Unchanged as requested) ---
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
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(100, 300) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }).catch(() => {});
            }
        }

        // --- Learnwithblog.xyz PART (FIXED CLICKING) ---
        const loadWait = hWait(1000, 37000);
        console.log(`[Tab ${tabId}] Landed on site. Loading for ${loadWait/1000}s...`);
        await new Promise(r => setTimeout(r, loadWait));

        const sessionEnd = Date.now() + hWait(0, 570000); 
        
        while (Date.now() < sessionEnd) {
            const dice = Math.random();

            if (dice < 0.4) {
                // 1. RANDOM SCROLL
                await page.mouse.wheel({ deltaY: hWait(-300, 800) });
            } 
            else {
                // 2. FIXED CLICK: Find an actual element to click
                const clickable = await page.$$('p, h1, h2, a, img, span, div');
                if (clickable.length > 0) {
                    const el = clickable[hWait(0, clickable.length - 1)];
                    const b = await el.boundingBox();
                    
                    // Only click if it's actually on the screen
                    if (b && b.x > 0 && b.y > 0 && b.width > 0) {
                        console.log(`[Tab ${tabId}] Human click on element at ${Math.round(b.x)}, ${Math.round(b.y)}`);
                        if (!profile.mobile) await humanMove(page, { x: b.x + b.width/2, y: b.y + b.height/2 });
                        await page.mouse.click(b.x + b.width/2, b.y + b.height/2, { delay: hWait(50, 200) });
                    }
                }
            }
            
            // Random Wait between actions
            await new Promise(r => setTimeout(r, hWait(5000, 20000)));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Stopped: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabId}] Wiped & Closed.`);
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
        await new Promise(r => setTimeout(r, hWait(2000, 10000)));
        active.push(simulateHumanSession(browser, profile, TARGET, REFERRER, i));
    }
    await Promise.all(active);
    await browser.close();
}

start();
