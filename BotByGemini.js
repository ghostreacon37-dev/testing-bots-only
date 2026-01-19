const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/** * 1. DYNAMIC HARDWARE PROFILES
 * Each tab gets a unique identity including Network Speed and Screen Size.
 */
const PROFILES = [
    { name: 'Power-User', network: '4G', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...', w: 1920, h: 1080, cores: 16, mem: 32 },
    { name: 'Mobile-Hotspot', network: 'Fast 3G', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...', w: 1440, h: 900, cores: 8, mem: 16 },
    { name: 'Standard-Office', network: 'WiFi', ua: 'Mozilla/5.0 (X11; Linux x86_64)...', w: 1366, h: 768, cores: 4, mem: 8 }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

/**
 * 2. BEHAVIORAL TOOLS: Bézier Curves & Highlighting
 */
async function humanMove(page, end) {
    const start = { x: hWait(0, 400), y: hWait(0, 400) };
    const steps = hWait(30, 60);
    const ctrl = { x: (start.x + end.x)/2 + hWait(-150, 150), y: (start.y + end.y)/2 + hWait(-150, 150) };
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = (1-t)**2 * start.x + 2*(1-t)*t * ctrl.x + t**2 * end.x;
        const y = (1-t)**2 * start.y + 2*(1-t)*t * ctrl.y + t**2 * end.y;
        await page.mouse.move(x, y);
        if (i % 10 === 0) await new Promise(r => setTimeout(r, hWait(2, 10)));
    }
}

async function simulateHuman(browser, profile, targetDomain, referrer, tabId) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    
    // Set Identity
    await page.setUserAgent(profile.ua);
    await page.setViewport({ width: profile.w, height: profile.h });

    // Emulate Network Latency (Real Human Jitter)
    const client = await page.target().createCDPSession();
    if (profile.network === 'Fast 3G') {
        await client.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.5 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    }

    try {
        console.log(`[Tab ${tabId}] Profile: ${profile.name} | Connection: ${profile.network}`);
        
        // Step 1: Visit X.com and wait for full load
        await page.goto(referrer, { waitUntil: 'networkidle2', timeout: 90000 });
        const waitTime = hWait(60000, 120000); // 1-2 mins
        console.log(`[Tab ${tabId}] Waiting ${waitTime/1000}s for X to fully render...`);
        await new Promise(r => setTimeout(r, waitTime));
        await page.keyboard.press('Escape');

        // Step 2: Search for "Learnwithblog.xyz" keyword/link
        const link = await page.evaluateHandle((domain) => {
            return Array.from(document.querySelectorAll('a')).find(a => a.href.toLowerCase().includes(domain.toLowerCase()));
        }, targetDomain).then(h => h.asElement());

        if (link) {
            await page.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), link);
            const box = await link.boundingBox();
            await humanMove(page, { x: box.x + box.width/2, y: box.y + box.height/2 });
            await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: hWait(150, 400) });
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        } else {
            // Stealth Jump (If X hides the UI)
            await page.goto(`https://${targetDomain}`, { referer: referrer, waitUntil: 'networkidle2' });
        }

        // Step 3: Random Engagement (Highlight, Scroll, Idle, Click)
        const sessionEnd = Date.now() + hWait(1000, 480000);
        while (Date.now() < sessionEnd) {
            const dice = Math.random();
            if (dice < 0.4) {
                // Jittery Human Scroll
                const dist = hWait(300, 800);
                for(let j=0; j<8; j++) { await page.mouse.wheel({ deltaY: dist/8 }); await new Promise(r => setTimeout(r, hWait(100, 300))); }
            } else if (dice < 0.6) {
                // "Read & Highlight" (Huge Human Signal)
                const paras = await page.$$('p');
                if (paras.length > 0) {
                    const pBox = await paras[hWait(0, paras.length-1)].boundingBox();
                    if (pBox) {
                        await page.mouse.move(pBox.x, pBox.y);
                        await page.mouse.down();
                        await page.mouse.move(pBox.x + 200, pBox.y, { steps: 20 });
                        await page.mouse.up();
                    }
                }
            } else if (dice < 0.85) {
                // Internal Navigation
                const internal = await page.$$(`a[href*="${targetDomain}"]`);
                if (internal.length > 0) {
                    await internal[hWait(0, internal.length-1)].click().catch(() => {});
                    await new Promise(r => setTimeout(r, hWait(8000, 15000)));
                }
            }
            await new Promise(r => setTimeout(r, hWait(15000, 45000)));
        }

    } catch (err) {
        console.log(`[Tab ${tabId}] Session Error: ${err.message}`);
    } finally {
        await context.close();
        console.log(`[Tab ${tabId}] Context Closed. History Wiped.`);
    }
}

async function start() {
    const TARGET = "learnwithblog.xyz";
    const REFERRER = "https://x.com/GhostReacondev/status/2013213212175724818?s=20";
    
    const browser = await puppeteer.launch({
        headless: false, // Recommended to stay 'false' or use 'new' for better stealth
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const numTabs = hWait(2, 9);
    console.log(`🚀 Total Simulated Humans: ${numTabs}`);

    const activeTabs = [];
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        // Staggered launch (Users don't arrive at the exact same millisecond)
        await new Promise(r => setTimeout(r, hWait(1000, 10000)));
        activeTabs.push(simulateHuman(browser, profile, TARGET, REFERRER, i));
    }

    await Promise.all(activeTabs);
    await browser.close();
    console.log("🏁 All data purged. Global Browser instance closed.");
}

start();
