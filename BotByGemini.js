const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const DEVICES = [
    { name: 'Win-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', w: 1920, h: 1080 },
    { name: 'Mac-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', w: 1440, h: 900 },
    { name: 'Win-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', w: 1366, h: 768 }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

async function bezierMove(page, start, end) {
    const steps = hWait(20, 40);
    const control = { x: (start.x + end.x)/2 + hWait(-100, 100), y: (start.y + end.y)/2 + hWait(-100, 100) };
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = (1-t)**2 * start.x + 2*(1-t)*t * control.x + t**2 * end.x;
        const y = (1-t)**2 * start.y + 2*(1-t)*t * control.y + t**2 * end.y;
        await page.mouse.move(x, y);
        if (i % 5 === 0) await new Promise(r => setTimeout(r, hWait(2, 10)));
    }
}

async function simulateHuman(page, dev, targetDomain, referrer) {
    try {
        // 1. Visit Referrer (X.com)
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, hWait(4000, 8000)));
        await page.keyboard.press('Escape'); // Dismiss popups

        // 2. Locate Link with Random Scrolling
        await page.mouse.wheel({ deltaY: hWait(200, 500) });
        const linkSelector = `a[href*="${targetDomain}"]`;
        const link = await page.waitForSelector(linkSelector, { timeout: 15000 }).catch(() => null);

        if (link) {
            const box = await link.boundingBox();
            if (box) {
                await bezierMove(page, {x: hWait(0, 100), y: hWait(0, 100)}, {x: box.x + box.width/2, y: box.y + box.height/2});
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(100, 250) });
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
            }
        } else {
            // Fail-safe jump
            await page.goto(`https://${targetDomain}`, { referer: referrer, waitUntil: 'networkidle2' });
        }

        // 3. The "Infinite" Engagement Loop (1s to 8min)
        const sessionEnd = Date.now() + hWait(1000, 480000);
        while (Date.now() < sessionEnd) {
            const dice = Math.random();
            
            if (dice < 0.4) {
                // Realistic Scroll (Variable speeds)
                const scrollAmount = hWait(150, 600);
                for(let s=0; s<5; s++) { // Break big scroll into small jitters
                    await page.mouse.wheel({ deltaY: scrollAmount / 5 });
                    await new Promise(r => setTimeout(r, hWait(50, 150)));
                }
            } else if (dice < 0.55) {
                // Text Selection (Highlighting)
                const paragraphs = await page.$$('p');
                if (paragraphs.length > 0) {
                    const pBox = await paragraphs[hWait(0, paragraphs.length - 1)].boundingBox();
                    if (pBox) {
                        await bezierMove(page, {x: pBox.x, y: pBox.y}, {x: pBox.x + 50, y: pBox.y});
                        await page.mouse.down();
                        await page.mouse.move(pBox.x + 150, pBox.y, { steps: 10 });
                        await page.mouse.up();
                    }
                }
            } else if (dice < 0.75) {
                // Accidental/Noise Clicks
                const x = hWait(0, dev.w);
                const y = hWait(0, dev.h);
                await page.mouse.click(x, y, { delay: hWait(50, 120) });
            } else if (dice < 0.9) {
                // Internal Post Click
                const internal = await page.$$(`a[href*="${targetDomain}"]`);
                if (internal.length > 0) {
                    await internal[hWait(0, internal.length - 1)].click().catch(() => {});
                    await new Promise(r => setTimeout(r, hWait(5000, 10000)));
                }
            }
            await new Promise(r => setTimeout(r, hWait(12000, 40000))); // Human pause
        }
        console.log(`Tab finished session. Closing...`);
        await page.close();
    } catch (e) {
        console.log(`Tab Error: ${e.message}`);
        await page.close();
    }
}

async function startSession() {
    const TARGET = "learnwithblog.xyz";
    const REFERRER = "https://x.com/GhostReacondev/status/2013213212175724818?s=20";
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const numTabs = hWait(2, 9);
    console.log(`🚀 Starting ${numTabs} human-like tabs simultaneously...`);

    const tabPromises = [];
    for (let i = 0; i < numTabs; i++) {
        const dev = DEVICES[hWait(0, DEVICES.length - 1)];
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        
        await page.setUserAgent(dev.ua);
        await page.setViewport({ width: dev.w, height: dev.h });
        
        // Stagger the start times so 9 tabs don't hit the site at the exact same second
        await new Promise(r => setTimeout(r, hWait(2000, 15000))); 
        tabPromises.push(simulateHuman(page, dev, TARGET, REFERRER).then(() => context.close()));
    }

    await Promise.all(tabPromises);
    await browser.close();
    console.log("✅ All tabs completed and browser data wiped.");
}

startSession();
