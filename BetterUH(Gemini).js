const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const PROFILES = [
    { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16, w: 1920, h: 1080, mobile: false },
    { name: 'Android-Pixel7-Portrait', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 8, w: 412, h: 915, mobile: true },
    { name: 'Android-Samsung-Landscape', ua: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 12, w: 800, h: 360, mobile: true },
    { name: 'MacOS-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', platform: 'MacIntel', cores: 8, mem: 16, w: 1440, h: 900, mobile: false }
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
        // --- PHASE 1: X.COM (UNTOUCHED - AS REQUESTED) ---
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

        // --- PHASE 2: LEARNWITHBLOG.XYZ (NEW REMADE ENGAGEMENT) ---
        
        // Step A: Load Buffer (1-37 seconds)
        const loadDelay = hWait(1000, 37000);
        console.log(`[Tab ${tabId}] Landed. Remade Chaos Engine waiting ${loadDelay/1000}s to start.`);
        await new Promise(r => setTimeout(r, loadDelay));

        // Step B: Define Session Length (0-570 seconds)
        const totalDuration = hWait(0, 570000);
        const sessionExpiry = Date.now() + totalDuration;
        
        if (totalDuration === 0) { console.log(`[Tab ${tabId}] Instant exit triggered.`); return; }

        while (Date.now() < sessionExpiry) {
            const actionType = Math.random();

            if (actionType < 0.25) {
                // ACTION: HUMAN SCROLLING
                const direction = Math.random() > 0.2 ? hWait(200, 900) : hWait(-200, -500); // 80% down, 20% up
                console.log(`[Tab ${tabId}] Physical scrolling...`);
                await page.mouse.wheel({ deltaY: direction });
            } 
            else if (actionType < 0.55) {
                // ACTION: PHYSICAL ELEMENT CLICKING (Real human behavior)
                // We pick random visible elements to ensure the click is NOT on empty space
                const targets = await page.$$('p, h1, h2, a, img, li, span');
                if (targets.length > 0) {
                    const el = targets[hWait(0, targets.length - 1)];
                    const b = await el.boundingBox();
                    if (b && b.width > 0 && b.height > 0) {
                        const targetX = b.x + b.width / 2;
                        const targetY = b.y + b.height / 2;
                        
                        console.log(`[Tab ${tabId}] Real interaction at: ${Math.round(targetX)}, ${Math.round(targetY)}`);
                        
                        if (!profile.mobile) await humanMove(page, { x: targetX, y: targetY });
                        await page.mouse.click(targetX, targetY, { delay: hWait(100, 400) });
                        
                        // Extra wait if a new page or element triggered
                        await new Promise(r => setTimeout(r, hWait(2000, 6000)));
                    }
                }
            } 
            else if (actionType < 0.75 && !profile.mobile) {
                // ACTION: MOUSE HOVER/WIGGLE (Desktop Curiosity)
                const hx = hWait(0, profile.w);
                const hy = hWait(0, profile.h);
                await humanMove(page, { x: hx, y: hy });
                if (Math.random() > 0.5) {
                    // Small wiggle
                    await page.mouse.move(hx + 5, hy + 5);
                    await page.mouse.move(hx, hy);
                }
            } 
            else if (actionType < 0.90) {
                // ACTION: TEXT SELECTION / FOCUS
                const paras = await page.$$('p');
                if (paras.length > 0) {
                    const p = paras[hWait(0, paras.length - 1)];
                    const pb = await p.boundingBox();
                    if (pb) {
                        await page.mouse.move(pb.x, pb.y);
                        await page.mouse.down();
                        await page.mouse.move(pb.x + hWait(20, 100), pb.y, { steps: 5 });
                        await page.mouse.up();
                    }
                }
            }
            else {
                // ACTION: IDLE READING
                console.log(`[Tab ${tabId}] User is reading content...`);
                await new Promise(r => setTimeout(r, hWait(10000, 35000)));
            }

            // Small gap between every "Human decision"
            await new Promise(r => setTimeout(r, hWait(4000, 15000)));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Session interruption: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabId}] Data purged.`);
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
        await new Promise(r => setTimeout(r, hWait(3000, 15000)));
        activeSessions.push(simulateHumanSession(browser, profile, TARGET, REFERRER, i));
    }
    await Promise.all(activeSessions);
    await browser.close();
}

start();
