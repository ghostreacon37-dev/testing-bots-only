const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// 1. DIVERSE DEVICE DATABASE (Android + Desktop)
const PROFILES = [
    { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16, w: 1920, h: 1080, mobile: false },
    { name: 'Android-Pixel7', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 8, w: 412, h: 915, mobile: true },
    { name: 'MacOS-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', platform: 'MacIntel', cores: 8, mem: 16, w: 1440, h: 900, mobile: false },
    { name: 'Android-SamsungS23', ua: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 12, w: 360, h: 800, mobile: true },
    { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', cores: 12, mem: 32, w: 1920, h: 1080, mobile: false }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Smooth Bezier Curve Mouse Movement for Desktop
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
    
    // Set Identity & Fingerprint
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
        // --- PHASE 1: X.COM (The Bridge) ---
        console.log(`[Tab ${tabId}] Profile: ${profile.name}. Navigating to X.`);
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        
        await new Promise(r => setTimeout(r, hWait(60000, 120000))); // 1-2 min wait on X
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

        // --- PHASE 2: LEARNWITHBLOG.XYZ (The Chaos Engagement) ---
        // 1. Variable Load Wait (1-37 seconds)
        const loadWait = hWait(1000, 37000);
        console.log(`[Tab ${tabId}] Arrived at Blog. Waiting ${loadWait/1000}s to load content.`);
        await new Promise(r => setTimeout(r, loadWait));

        // 2. Engagement Timer (0-570 seconds)
        const engagementLimit = hWait(0, 570000); 
        const sessionEnd = Date.now() + engagementLimit;
        console.log(`[Tab ${tabId}] Engagement session started: ${Math.floor(engagementLimit/1000)} seconds.`);

        if (engagementLimit === 0) {
            console.log(`[Tab ${tabId}] Random skip (Exit immediately).`);
        }

        while (Date.now() < sessionEnd) {
            const dice = Math.random();

            if (dice < 0.3) {
                // ACTION: Random Scrolling
                console.log(`[Tab ${tabId}] Scrolling...`);
                await page.mouse.wheel({ deltaY: hWait(-300, 800) });
            } 
            else if (dice < 0.6) {
                // ACTION: Click REAL elements (Chaos clicking on site)
                const elements = await page.$$('p, h1, h2, img, a, span, div, li');
                if (elements.length > 0) {
                    const el = elements[hWait(0, elements.length - 1)];
                    const b = await el.boundingBox();
                    if (b && b.width > 0 && b.height > 0) {
                        console.log(`[Tab ${tabId}] Random interaction at ${Math.round(b.x)}, ${Math.round(b.y)}`);
                        if (!profile.mobile) await humanMove(page, { x: b.x + b.width/2, y: b.y + b.height/2 });
                        await page.mouse.click(b.x + b.width/2, b.y + b.height/2, { delay: hWait(80, 200) });
                        // Brief pause to allow any clicked links/popups to process
                        await new Promise(r => setTimeout(r, hWait(2000, 5000)));
                    }
                }
            } 
            else if (!profile.mobile && dice < 0.8) {
                // ACTION: Real Mouse Hover (Desktop Only)
                const hx = hWait(0, profile.w);
                const hy = hWait(0, profile.h);
                await humanMove(page, { x: hx, y: hy });
            }
            else if (dice < 0.9) {
                // ACTION: Highlight text (Reading behavior)
                const paras = await page.$$('p');
                if (paras.length > 0) {
                    const p = paras[hWait(0, paras.length - 1)];
                    const pb = await p.boundingBox();
                    if (pb) {
                        await page.mouse.move(pb.x, pb.y);
                        await page.mouse.down();
                        await page.mouse.move(pb.x + hWait(40, 180), pb.y, { steps: 10 });
                        await page.mouse.up();
                    }
                }
            }
            else {
                // ACTION: Reading Pause (Idle)
                console.log(`[Tab ${tabId}] Thinking/Reading...`);
                await new Promise(r => setTimeout(r, hWait(10000, 30000)));
            }

            // Staggered delay between different chaos actions
            await new Promise(r => setTimeout(r, hWait(3000, 12000)));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Error: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabId}] Browser Data Purged.`);
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
        // Staggered Arrival
        await new Promise(r => setTimeout(r, hWait(2000, 15000)));
        active.push(simulateHumanSession(browser, profile, TARGET, REFERRER, i));
    }
    await Promise.all(active);
    await browser.close();
    console.log("🏁 All tasks complete.");
}

start();
