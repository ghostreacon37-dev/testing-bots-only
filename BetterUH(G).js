const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// 1. DIVERSE DEVICE DATABASE (Windows, Mac, Linux, and Android)
const PROFILES = [
    { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16, w: 1920, h: 1080, mobile: false },
    { name: 'MacOS-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', platform: 'MacIntel', cores: 8, mem: 16, w: 1440, h: 900, mobile: false },
    { name: 'Android-Pixel7', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 8, w: 412, h: 915, mobile: true },
    { name: 'Android-SamsungS23', ua: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 12, w: 360, h: 800, mobile: true },
    { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', cores: 12, mem: 32, w: 2560, h: 1440, mobile: false }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Smooth Bezier Curve Mouse Movement
async function moveMouseHuman(page, targetPoint) {
    const start = { x: hWait(0, 500), y: hWait(0, 500) };
    const steps = hWait(20, 45);
    const cp1 = { x: start.x + hWait(-100, 100), y: start.y + hWait(-100, 100) };
    const cp2 = { x: targetPoint.x + hWait(-100, 100), y: targetPoint.y + hWait(-100, 100) };

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.pow(1 - t, 3) * start.x + 3 * Math.pow(1 - t, 2) * t * cp1.x + 3 * (1 - t) * Math.pow(t, 2) * cp2.x + Math.pow(t, 3) * targetPoint.x;
        const y = Math.pow(1 - t, 3) * start.y + 3 * Math.pow(1 - t, 2) * t * cp1.y + 3 * (1 - t) * Math.pow(t, 2) * cp2.y + Math.pow(t, 3) * targetPoint.y;
        await page.mouse.move(x, y);
        if (i % 8 === 0) await new Promise(r => setTimeout(r, hWait(2, 8)));
    }
}

async function simulateHumanSession(browser, profile, targetDomain, referrer, tabId) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    // Set Identity & Emulate Mobile if needed
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
        console.log(`[Tab ${tabId}] Device: ${profile.name}. Navigating to X...`);
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        
        // Human wait on X (1-2 mins)
        await new Promise(r => setTimeout(r, hWait(60000, 120000)));
        await page.keyboard.press('Escape');

        // Click target link on X
        const link = await page.evaluateHandle((domain) => {
            return Array.from(document.querySelectorAll('a')).find(a => a.innerText.toLowerCase().includes(domain.toLowerCase()) || a.href.toLowerCase().includes(domain.toLowerCase()));
        }, targetDomain).then(h => h.asElement());

        if (link) {
            const box = await link.boundingBox();
            if (box) {
                if (!profile.mobile) await moveMouseHuman(page, { x: box.x + box.width/2, y: box.y + box.height/2 });
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(100, 300) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            }
        }

        // 2. TARGET SITE: TOTAL CHAOS RANDOMNESS
        console.log(`[Tab ${tabId}] Arrived at ${targetDomain}. Initiating Chaos Mode.`);
        const sessionEnd = Date.now() + hWait(60000, 480000); 

        while (Date.now() < sessionEnd) {
            const dice = Math.random();

            if (dice < 0.25) {
                // CHAOS: Random Wheel Scroll (Up and Down)
                const scroll = hWait(-300, 900);
                await page.mouse.wheel({ deltaY: scroll });
            } 
            else if (dice < 0.45) {
                // CHAOS: Highlight random text (Very human signal)
                const paragraphs = await page.$$('p');
                if (paragraphs.length > 0) {
                    const p = paragraphs[hWait(0, paragraphs.length - 1)];
                    const b = await p.boundingBox();
                    if (b) {
                        await page.mouse.move(b.x, b.y);
                        await page.mouse.down();
                        await page.mouse.move(b.x + hWait(50, 200), b.y, { steps: 10 });
                        await page.mouse.up();
                    }
                }
            }
            else if (dice < 0.75) {
                // CHAOS: Click absolutely anything (divs, spans, sections, empty space)
                const x = hWait(10, profile.w - 10);
                const y = hWait(10, profile.h - 10);
                if (!profile.mobile) await moveMouseHuman(page, { x, y });
                await page.mouse.click(x, y, { delay: hWait(50, 150) });
            } 
            else if (dice < 0.90) {
                // CHAOS: Jiggle mouse (Idle movement)
                for(let j=0; j<5; j++) {
                    await page.mouse.move(hWait(0, profile.w), hWait(0, profile.h), { steps: 5 });
                    await new Promise(r => setTimeout(r, 200));
                }
            }
            else {
                // CHAOS: Dead Idle (Reading)
                await new Promise(r => setTimeout(r, hWait(20000, 50000)));
            }
            await new Promise(r => setTimeout(r, hWait(5000, 15000)));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Error: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabId}] Session finished. Data vaporized.`);
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
    console.log(`🚀 Starting ${numTabs} Randomized Multi-Platform Sessions...`);

    const activeSessions = [];
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        await new Promise(r => setTimeout(r, hWait(3000, 12000)));
        activeSessions.push(simulateHumanSession(browser, profile, TARGET, REFERRER, i));
    }

    await Promise.all(activeSessions);
    await browser.close();
    console.log("🏁 All sessions closed.");
}

start();
