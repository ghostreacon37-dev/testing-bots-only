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
    const steps = hWait(15, 40);
    const cp1 = { x: start.x + hWait(-100, 100), y: start.y + hWait(-100, 100) };
    const cp2 = { x: targetPoint.x + hWait(-100, 100), y: targetPoint.y + hWait(-100, 100) };

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.pow(1 - t, 3) * start.x + 3 * Math.pow(1 - t, 2) * t * cp1.x + 3 * (1 - t) * Math.pow(t, 2) * cp2.x + Math.pow(t, 3) * targetPoint.x;
        const y = Math.pow(1 - t, 3) * start.y + 3 * Math.pow(1 - t, 2) * t * cp1.y + 3 * (1 - t) * Math.pow(t, 2) * cp2.y + Math.pow(t, 3) * targetPoint.y;
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
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(80, 250) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            }
        }

        // --- TRANSITION: Wait 1-37 seconds for your site to load ---
        const loadWait = hWait(1000, 37000);
        console.log(`[Tab ${tabId}] Landed on target. Waiting ${loadWait/1000}s for site stability.`);
        await new Promise(r => setTimeout(r, loadWait));

        // --- ENGAGEMENT: 0 to 570 seconds ---
        const engagementLimit = hWait(0, 570000); 
        const sessionEnd = Date.now() + engagementLimit;
        console.log(`[Tab ${tabId}] Engagement started. Planned duration: ${Math.floor(engagementLimit/1000)}s.`);

        if (engagementLimit === 0) {
            console.log(`[Tab ${tabId}] Randomly skipped engagement (Zero stay time).`);
        }

        while (Date.now() < sessionEnd) {
            const dice = Math.random();

            if (dice < 0.35) {
                // Random Scroll (Reading behavior)
                const scrollValue = hWait(-400, 1000);
                await page.mouse.wheel({ deltaY: scrollValue });
            } 
            else if (dice < 0.70) {
                // Random Human Click (Images, text, or just empty space)
                const rx = hWait(10, profile.w - 10);
                const ry = hWait(10, profile.h - 10);
                if (!profile.mobile) await humanMove(page, { x: rx, y: ry });
                await page.mouse.click(rx, ry, { delay: hWait(50, 150) });
            } 
            else if (!profile.mobile && dice < 0.85) {
                // Hover (Desktop only)
                const hx = hWait(0, profile.w);
                const hy = hWait(0, profile.h);
                await humanMove(page, { x: hx, y: hy });
            }
            else {
                // Idle / Thinking
                await new Promise(r => setTimeout(r, hWait(5000, 25000)));
            }
            await new Promise(r => setTimeout(r, hWait(2000, 10000)));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Stopped: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabId}] Wiped.`);
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
    const tabs = [];
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        await new Promise(r => setTimeout(r, hWait(2000, 12000)));
        tabs.push(simulateHumanSession(browser, profile, TARGET, REFERRER, i));
    }

    await Promise.all(tabs);
    await browser.close();
}

start();
