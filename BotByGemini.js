const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const PROFILES = [
    { name: 'Win-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', w: 1920, h: 1080 },
    { name: 'Mac-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', w: 1440, h: 900 }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Advanced Mouse Movement
 * Simulates human motor "jitter" and curved paths.
 */
async function moveMouseHuman(page, targetPoint) {
    const start = { x: hWait(100, 500), y: hWait(100, 500) };
    const steps = hWait(25, 55);
    // Control points for the curve
    const cp1 = { x: start.x + hWait(-100, 100), y: start.y + hWait(-100, 100) };
    const cp2 = { x: targetPoint.x + hWait(-100, 100), y: targetPoint.y + hWait(-100, 100) };

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.pow(1 - t, 3) * start.x + 3 * Math.pow(1 - t, 2) * t * cp1.x + 3 * (1 - t) * Math.pow(t, 2) * cp2.x + Math.pow(t, 3) * targetPoint.x;
        const y = Math.pow(1 - t, 3) * start.y + 3 * Math.pow(1 - t, 2) * t * cp1.y + 3 * (1 - t) * Math.pow(t, 2) * cp2.y + Math.pow(t, 3) * targetPoint.y;
        await page.mouse.move(x, y);
        if (i % 10 === 0) await new Promise(r => setTimeout(r, hWait(5, 15)));
    }
}

async function simulateHumanSession(browser, profile, targetDomain, referrer, tabId) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setUserAgent(profile.ua);
    await page.setViewport({ width: profile.w, height: profile.h });

    try {
        console.log(`[Tab ${tabId}] Profile: ${profile.name} - Navigating to X.`);
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        
        // 1. Initial wait on X (1-2 mins or random)
        const initialWait = hWait(60000, 120000);
        console.log(`[Tab ${tabId}] Waiting ${initialWait/1000}s on X post.`);
        await new Promise(r => setTimeout(r, initialWait));
        await page.keyboard.press('Escape');

        // 2. Find "Learnwithblog.xyz" text and CLICK
        const link = await page.evaluateHandle((domain) => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors.find(a => a.innerText.toLowerCase().includes(domain.toLowerCase()) || a.href.toLowerCase().includes(domain.toLowerCase()));
        }, targetDomain).then(h => h.asElement());

        if (link) {
            const box = await link.boundingBox();
            if (box) {
                await moveMouseHuman(page, { x: box.x + box.width/2, y: box.y + box.height/2 });
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(100, 300) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            }
        } else {
            // Force jump if X is being difficult
            await page.goto(`https://${targetDomain}`, { referer: referrer, waitUntil: 'networkidle2' });
        }

        // 3. TARGET SITE BEHAVIOR (The "Workable" Part)
        console.log(`[Tab ${tabId}] Arrived at ${targetDomain}. Starting Deep Engagement.`);
        const sessionEnd = Date.now() + hWait(60000, 480000); // 1s to 8min

        while (Date.now() < sessionEnd) {
            const dice = Math.random();

            if (dice < 0.3) {
                // HOVER: Move mouse over content/images without clicking
                const headers = await page.$$('h1, h2, p, img');
                if (headers.length > 0) {
                    const el = headers[hWait(0, headers.length - 1)];
                    const b = await el.boundingBox();
                    if (b) {
                        console.log(`[Tab ${tabId}] Hovering over content...`);
                        await moveMouseHuman(page, { x: b.x + b.width/2, y: b.y + b.height/2 });
                    }
                }
            } 
            else if (dice < 0.6) {
                // RANDOM CLICK: Find an internal post or link on your site and click it
                const internalLinks = await page.$$(`a[href*="${targetDomain}"]`);
                if (internalLinks.length > 0) {
                    const pick = internalLinks[hWait(0, internalLinks.length - 1)];
                    const b = await pick.boundingBox();
                    if (b) {
                        console.log(`[Tab ${tabId}] Clicking random internal post/link.`);
                        await moveMouseHuman(page, { x: b.x + b.width/2, y: b.y + b.height/2 });
                        await pick.click().catch(() => {});
                        await new Promise(r => setTimeout(r, hWait(5000, 15000))); // Wait for page to load
                    }
                }
            } 
            else {
                // SCROLL: Heavy vs Light scrolling
                const scrollDepth = hWait(200, 900);
                console.log(`[Tab ${tabId}] Scrolling ${scrollDepth}px...`);
                await page.mouse.wheel({ deltaY: scrollDepth });
            }

            // Human pause between actions
            await new Promise(r => setTimeout(r, hWait(10000, 30000)));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Session stopped: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabId}] Data Wiped. Browser Context Destroyed.`);
    }
}

async function start() {
    const TARGET = "learnwithblog.xyz";
    const REFERRER = "https://x.com/GhostReacondev/status/2013213212175724818?s=20";
    
    const browser = await puppeteer.launch({
        headless: false, // Visible for better human simulation
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const numTabs = hWait(2, 9);
    console.log(`🚀 Sequence Started: ${numTabs} Tabs requested.`);

    const tabGroup = [];
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        // Staggered arrival
        await new Promise(r => setTimeout(r, hWait(2000, 8000)));
        tabGroup.push(simulateHumanSession(browser, profile, TARGET, REFERRER, i));
    }

    await Promise.all(tabGroup);
    await browser.close();
    console.log("🏁 All sessions complete. Clean shutdown.");
}

start();
