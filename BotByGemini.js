const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// 1. DIVERSE DEVICE DATABASE (Now with Orientation variety)
const PROFILES = [
    { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16, w: 1920, h: 1080, mobile: false },
    { name: 'Android-Pixel7-Portrait', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 8, w: 412, h: 915, mobile: true },
    { name: 'Android-Samsung-Landscape', ua: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 12, w: 800, h: 360, mobile: true },
    { name: 'MacOS-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', platform: 'MacIntel', cores: 8, mem: 16, w: 1440, h: 900, mobile: false }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Smooth Bezier Curve Mouse Movement
async function humanMove(page, targetPoint) {
    const start = { x: hWait(0, 400), y: hWait(0, 400) };
    const steps = hWait(15, 30);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = start.x + (targetPoint.x - start.x) * t;
        const y = start.y + (targetPoint.y - start.y) * t;
        await page.mouse.move(x, y);
        if (i % 5 === 0) await new Promise(r => setTimeout(r, hWait(2, 6)));
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

    // Hardware Spoofing
    await page.evaluateOnNewDocument((p) => {
        Object.defineProperty(navigator, 'platform', { get: () => p.platform });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => p.cores });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => p.mem });
        delete navigator.__proto__.webdriver;
    }, profile);

    try {
        // --- PHASE 1: X.COM (Keep it exactly as it was) ---
        console.log(`[Tab ${tabId}] Profile: ${profile.name}. Navigating to X.`);
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

        // --- PHASE 2: LEARNWITHBLOG.XYZ (Advanced Human Behavior) ---
        const loadWait = hWait(1000, 37000);
        console.log(`[Tab ${tabId}] Waiting ${loadWait/1000}s for site to be ready.`);
        await new Promise(r => setTimeout(r, loadWait));

        const engagementLimit = hWait(0, 570000); 
        const sessionEnd = Date.now() + engagementLimit;

        while (Date.now() < sessionEnd) {
            const dice = Math.random();

            if (dice < 0.3) {
                // ACTION: Real Scroll (Reading)
                const scrollAmt = hWait(-200, 1000);
                await page.mouse.wheel({ deltaY: scrollAmt });
            } 
            else if (dice < 0.65) {
                // ACTION: Targeted Human Click (Clicks REAL things)
                const elements = await page.$$('p, h1, h2, img, a, span, button');
                if (elements.length > 0) {
                    const el = elements[hWait(0, elements.length - 1)];
                    const b = await el.boundingBox();
                    if (b && b.width > 0 && b.height > 0) {
                        console.log(`[Tab ${tabId}] Real Click on element at ${Math.round(b.x)}, ${Math.round(b.y)}`);
                        if (!profile.mobile) await humanMove(page, { x: b.x + b.width/2, y: b.y + b.height/2 });
                        await page.mouse.click(b.x + b.width/2, b.y + b.height/2, { delay: hWait(100, 250) });
                        await new Promise(r => setTimeout(r, hWait(3000, 8000))); 
                    }
                }
            } 
            else if (dice < 0.8) {
                // ACTION: Impatient "Rage Click" (Clicks empty area 3 times fast)
                const rx = hWait(50, 300);
                const ry = hWait(50, 300);
                console.log(`[Tab ${tabId}] Impatient clicking...`);
                for(let i=0; i<3; i++) {
                    await page.mouse.click(rx, ry, { delay: 50 });
                    await new Promise(r => setTimeout(r, 100));
                }
            }
            else {
                // ACTION: Reading Pause
                await new Promise(r => setTimeout(r, hWait(10000, 40000)));
            }
            await new Promise(r => setTimeout(r, hWait(3000, 10000)));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Error occurred: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabId}] Session ended. Context wiped.`);
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
    const pool = [];
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        await new Promise(r => setTimeout(r, hWait(2000, 15000)));
        pool.push(simulateHumanSession(browser, profile, TARGET, REFERRER, i));
    }
    await Promise.all(pool);
    await browser.close();
}

start();
