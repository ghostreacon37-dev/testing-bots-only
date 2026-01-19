const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const DEVICES = [
    { name: 'Desktop-Win', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16, w: 1920, h: 1080 },
    { name: 'Desktop-Mac', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', cores: 10, mem: 32, w: 1440, h: 900 }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

async function bezierMove(page, start, end) {
    const steps = hWait(25, 45);
    const control = { 
        x: (start.x + end.x) / 2 + (Math.random() - 0.5) * 200, 
        y: (start.y + end.y) / 2 + (Math.random() - 0.5) * 200 
    };
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x;
        const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y;
        await page.mouse.move(x, y);
        if (i % 8 === 0) await new Promise(r => setTimeout(r, hWait(5, 15)));
    }
}

async function startUltimateSession() {
    const TARGET_DOMAIN = "learnwithblog.xyz";
    const REFERRER_URL = "https://x.com/GhostReacondev/status/2013213212175724818?s=20";
    
    const browser = await puppeteer.launch({
        headless: false, // Switching to false helps bypass X's bot detection
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const totalTabs = hWait(2, 9);

    for (let i = 1; i <= totalTabs; i++) {
        const dev = DEVICES[hWait(0, DEVICES.length - 1)];
        const context = await browser.createBrowserContext();
        const page = await context.newPage();

        await page.setUserAgent(dev.ua);
        await page.setViewport({ width: dev.w, height: dev.h });

        try {
            console.log(`Tab ${i}: Opening X...`);
            await page.goto(REFERRER_URL, { waitUntil: 'networkidle2', timeout: 90000 });
            
            // Wait for potential popups and clear them
            await new Promise(r => setTimeout(r, 5000));
            await page.keyboard.press('Escape'); 

            // SCROLL DOWN to find the link (Simulating reading the tweet)
            await page.mouse.wheel({ deltaY: hWait(300, 600) });
            await new Promise(r => setTimeout(r, 2000));

            // FIND THE LINK - Using a more aggressive "contains text" selector
            const linkHandle = await page.evaluateHandle((domain) => {
                const anchors = Array.from(document.querySelectorAll('a'));
                return anchors.find(a => a.href.includes(domain) || a.innerText.includes(domain));
            }, TARGET_DOMAIN);

            const link = linkHandle.asElement();

            if (link) {
                console.log("Link located. Moving mouse to click...");
                const box = await link.boundingBox();
                if (box) {
                    // Move from a random spot to the link
                    await bezierMove(page, {x: hWait(0, 100), y: hWait(0, 100)}, {x: box.x + box.width/2, y: box.y + box.height/2});
                    
                    // Physical Click
                    await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(100, 250) });
                    
                    // Wait for the new page to load
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
                }
            } else {
                console.log("Link not found on page. Forcing Referrer Jump...");
                // Fail-safe jump if X hides the link from bots
                await page.goto(`https://${TARGET_DOMAIN}`, { referer: REFERRER_URL, waitUntil: 'networkidle2' });
            }

            // --- Engagement Loop ---
            const sessionEnd = Date.now() + hWait(1000, 480000); 
            while (Date.now() < sessionEnd) {
                const action = Math.random();
                if (action < 0.5) await page.mouse.wheel({ deltaY: hWait(200, 500) });
                else if (action < 0.7) {
                    const internal = await page.$$('a[href*="' + TARGET_DOMAIN + '"]');
                    if (internal.length > 0) await internal[hWait(0, internal.length - 1)].click().catch(() => {});
                }
                await new Promise(r => setTimeout(r, hWait(10000, 30000)));
            }

        } catch (err) {
            console.error(`Tab Error: ${err.message}`);
        } finally {
            await context.close();
        }
    }
    await browser.close();
}

startUltimateSession();
