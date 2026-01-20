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

    await page.evaluateOnNewDocument((p) => {
        Object.defineProperty(navigator, 'platform', { get: () => p.platform });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => p.cores });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => p.mem });
        delete navigator.__proto__.webdriver;
    }, profile);

    try {
        // --- PHASE 1: X.COM (UNTOUCHED) ---
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

        // --- PHASE 2: LEARNWITHBLOG.XYZ (EXTREME RANDOMNESS REMAKE) ---
        const loadDelay = hWait(1000, 37000);
        await new Promise(r => setTimeout(r, loadDelay));

        const totalDuration = hWait(0, 570000);
        const sessionExpiry = Date.now() + totalDuration;
        
        if (totalDuration === 0) return;

        while (Date.now() < sessionExpiry) {
            const actionType = Math.random();

            if (actionType < 0.25) {
                // CHAOS 1: Jittery Scrolling (Down then slightly Up)
                console.log(`[Tab ${tabId}] Reading & scrolling...`);
                await page.mouse.wheel({ deltaY: hWait(300, 700) });
                await new Promise(r => setTimeout(r, hWait(500, 2000)));
                if (Math.random() > 0.7) await page.mouse.wheel({ deltaY: hWait(-100, -200) });
            } 
            else if (actionType < 0.60) {
                // CHAOS 2: Real Element Clicks vs Empty Space Clicks
                if (Math.random() > 0.3) {
                    // Click a real element (link, image, paragraph)
                    const targets = await page.$$('p, h1, h2, a, img, span');
                    if (targets.length > 0) {
                        const el = targets[hWait(0, targets.length - 1)];
                        const b = await el.boundingBox();
                        if (b && b.width > 0) {
                            if (!profile.mobile) await humanMove(page, { x: b.x + b.width/2, y: b.y + b.height/2 });
                            await page.mouse.click(b.x + b.width/2, b.y + b.height/2, { delay: hWait(100, 300) });
                        }
                    }
                } else {
                    // Click completely empty random space (Natural human fidgeting)
                    const rx = hWait(10, profile.w - 10);
                    const ry = hWait(10, profile.h - 10);
                    await page.mouse.click(rx, ry, { delay: hWait(50, 150) });
                }
            } 
            else if (actionType < 0.85 && !profile.mobile) {
                // CHAOS 3: Curiosity Hovering (Desktop)
                // Moving the mouse over the page as if looking at things
                for(let i=0; i < hWait(1, 3); i++) {
                    await humanMove(page, { x: hWait(0, profile.w), y: hWait(0, profile.h) });
                    await new Promise(r => setTimeout(r, hWait(500, 2000)));
                }
            }
            else {
                // CHAOS 4: Long Dead Idle (Deep Reading)
                console.log(`[Tab ${tabId}] Deep reading pause...`);
                await new Promise(r => setTimeout(r, hWait(15000, 45000)));
            }

            // Variable delay between "thoughts"
            await new Promise(r => setTimeout(r, hWait(3000, 10000)));
        }

        // --- PHASE 3: RETURN TO X (Randomly) ---
        if (Math.random() < 0.35) {
            console.log(`[Tab ${tabId}] Returning to X.`);
            await page.goBack({ waitUntil: 'networkidle2' }).catch(() => {});
            await new Promise(r => setTimeout(r, hWait(5000, 12000)));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Log: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabId}] Data wiped.`);
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
    const activeSessions = [];
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        await new Promise(r => setTimeout(r, hWait(2000, 12000)));
        activeSessions.push(simulateHumanSession(browser, profile, TARGET, REFERRER, i));
    }
    await Promise.all(activeSessions);
    await browser.close();
}

start();
