const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const DEVICES = [
    { name: 'Win-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', w: 1920, h: 1080 },
    { name: 'Mac-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', w: 1440, h: 900 }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// 
async function bezierMove(page, start, end) {
    const steps = hWait(25, 50);
    const control = { x: (start.x + end.x) / 2 + hWait(-200, 200), y: (start.y + end.y) / 2 + hWait(-200, 200) };
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x;
        const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y;
        await page.mouse.move(x, y);
        if (i % 10 === 0) await new Promise(r => setTimeout(r, hWait(5, 15)));
    }
}

async function runSingleTab(browser, dev, targetDomain, referrer, tabIndex) {
    // Create a fresh "Incognito" context for every single tab
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    
    await page.setUserAgent(dev.ua);
    await page.setViewport({ width: dev.w, height: dev.h });

    try {
        console.log(`[Tab ${tabIndex}] Navigating to X: ${referrer}`);
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        
        // Wait for X to load and clear any "Login" popups
        await new Promise(r => setTimeout(r, hWait(7000, 12000)));
        await page.keyboard.press('Escape');

        // Scroll a bit so the link is visible in the tweet
        await page.mouse.wheel({ deltaY: hWait(400, 800) });
        await new Promise(r => setTimeout(r, 2000));

        // Locate the link specifically by looking for the domain string in the href
        const linkSelector = `a[href*="${targetDomain}"]`;
        await page.waitForSelector(linkSelector, { timeout: 15000 });
        const link = await page.$(linkSelector);

        if (link) {
            const box = await link.boundingBox();
            if (box) {
                console.log(`[Tab ${tabIndex}] Link found. Moving mouse humanly...`);
                await bezierMove(page, {x: hWait(0, 300), y: hWait(0, 300)}, {x: box.x + box.width/2, y: box.y + box.height/2});
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(100, 300) });
                
                // Wait for navigation to our site
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => console.log("Nav timeout - proceeding anyway"));
            }
        } else {
            throw new Error("Link not found on X page.");
        }

        // --- Human Engagement Loop ---
        console.log(`[Tab ${tabIndex}] Landing successful. Starting 1-8 minute stay...`);
        const sessionEnd = Date.now() + hWait(60000, 480000); // 1 min to 8 mins
        
        while (Date.now() < sessionEnd) {
            const action = Math.random();
            if (action < 0.4) {
                await page.mouse.wheel({ deltaY: hWait(200, 500) }); // Normal scroll
            } else if (action < 0.7) {
                // Random Noise Click
                await page.mouse.click(hWait(100, dev.w - 100), hWait(100, dev.h - 100), { delay: hWait(50, 150) });
            } else {
                // Internal navigation to keep session alive
                const internalLinks = await page.$$(`a[href*="${targetDomain}"]`);
                if (internalLinks.length > 0) {
                    await internalLinks[hWait(0, internalLinks.length - 1)].click().catch(() => {});
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
            await new Promise(r => setTimeout(r, hWait(15000, 35000)));
        }

    } catch (err) {
        console.error(`[Tab ${tabIndex}] Error: ${err.message}`);
        // Fail-safe jump if X blocked us
        console.log(`[Tab ${tabIndex}] Attempting Fail-safe Jump to target...`);
        await page.goto(`https://${targetDomain}`, { referer: referrer, waitUntil: 'networkidle2' }).catch(() => {});
    } finally {
        console.log(`[Tab ${tabIndex}] Session complete. Closing context.`);
        await context.close();
    }
}

async function startSession() {
    const TARGET = "learnwithblog.xyz";
    const REFERRER = "https://x.com/GhostReacondev/status/2013213212175724818?s=20";
    
    // Launch browser with headless: false so you can see it working!
    const browser = await puppeteer.launch({
        headless: false, 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    const numTabs = hWait(2, 9);
    console.log(`🚀 Script started. Will run ${numTabs} tabs.`);

    for (let i = 1; i <= numTabs; i++) {
        const dev = DEVICES[hWait(0, DEVICES.length - 1)];
        await runSingleTab(browser, dev, TARGET, REFERRER, i);
        
        // Wait 5-15 seconds before starting the next person's session
        if (i < numTabs) {
            console.log(`Waiting for next user session...`);
            await new Promise(r => setTimeout(r, hWait(5000, 15000)));
        }
    }

    await browser.close();
    console.log("✅ All tasks complete.");
}

startSession();
