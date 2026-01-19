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
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    
    // Assign a "Personality" to this specific tab
    const personalities = ['Reader', 'Clicker', 'Idle'];
    const personality = personalities[hWait(0, 2)];
    
    await page.setUserAgent(dev.ua);
    await page.setViewport({ width: dev.w, height: dev.h });

    try {
        console.log(`[Tab ${tabIndex}] Device: ${dev.name} | Personality: ${personality}`);
        
        // 1. Go to X.com
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, hWait(5000, 10000)));
        await page.keyboard.press('Escape');

        // 2. Locate and Click Link
        const linkSelector = `a[href*="${targetDomain}"]`;
        await page.waitForSelector(linkSelector, { timeout: 15000 });
        const link = await page.$(linkSelector);

        if (link) {
            const box = await link.boundingBox();
            if (box) {
                await bezierMove(page, {x: hWait(0, 300), y: hWait(0, 300)}, {x: box.x + box.width/2, y: box.y + box.height/2});
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(100, 300) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            }
        }

        // 3. PERSONALIZED ENGAGEMENT LOOP
        const sessionEnd = Date.now() + hWait(60000, 480000); 
        console.log(`[Tab ${tabIndex}] Session active for ${Math.round((sessionEnd - Date.now())/60000)} minutes...`);

        while (Date.now() < sessionEnd) {
            const action = Math.random();

            if (personality === 'Reader') {
                // Focus: Scrolling and small mouse movements
                if (action < 0.7) {
                    await page.mouse.wheel({ deltaY: hWait(150, 400) });
                } else {
                    await page.mouse.move(hWait(100, 500), hWait(100, 500), { steps: 20 });
                }
                await new Promise(r => setTimeout(r, hWait(15000, 40000))); // Long pauses for reading
            } 
            
            else if (personality === 'Clicker') {
                // Focus: Clicking internal links and background noise
                if (action < 0.5) {
                    const internal = await page.$$(`a[href*="${targetDomain}"]`);
                    if (internal.length > 0) {
                        await internal[hWait(0, internal.length - 1)].click().catch(() => {});
                        await new Promise(r => setTimeout(r, hWait(5000, 10000)));
                    }
                } else {
                    await page.mouse.click(hWait(0, dev.w), hWait(0, dev.h), { delay: hWait(50, 150) });
                }
                await new Promise(r => setTimeout(r, hWait(8000, 20000))); // Frequent actions
            } 
            
            else if (personality === 'Idle') {
                // Focus: Doing nothing (Waiting)
                console.log(`[Tab ${tabIndex}] User is idling (reading long content)...`);
                await new Promise(r => setTimeout(r, hWait(40000, 90000))); // Huge wait times
                await page.mouse.wheel({ deltaY: hWait(50, 150) }); // Tiny scroll to show "alive"
            }
        }

    } catch (err) {
        console.error(`[Tab ${tabIndex}] Error: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabIndex}] Data wiped and tab closed.`);
    }
}

async function startSession() {
    const TARGET = "learnwithblog.xyz";
    const REFERRER = "https://x.com/GhostReacondev/status/2013213212175724818?s=20";
    
    const browser = await puppeteer.launch({
        headless: false, // Set to "new" for background run
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const numTabs = hWait(2, 9);
    for (let i = 1; i <= numTabs; i++) {
        const dev = DEVICES[hWait(0, DEVICES.length - 1)];
        await runSingleTab(browser, dev, TARGET, REFERRER, i);
        if (i < numTabs) await new Promise(r => setTimeout(r, hWait(5000, 15000)));
    }

    await browser.close();
}

startSession();
