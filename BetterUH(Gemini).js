const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
puppeteer.use(StealthPlugin());

const DEVICES = [
    { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, mobile: false },
    { name: 'iPhone-15', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 393, h: 852, mobile: true }
    // ... add your other devices here
];

const jitter = (ms) => new Promise(r => setTimeout(r, ms + (Math.random() * (ms * 0.4))));

async function startSession() {
    const TARGET_DOMAIN = "learnwithblog.xyz";
    const REFERRER_URL = "https://x.com/GhostReacondev/status/2013213212175724818";
    
    // --- 1. PERSONA GENERATOR ---
    const roll = Math.random();
    let persona = "skimmer"; 
    let stayTime = 0;

    if (roll < 0.20) {
        persona = "bouncer";   // Visits and leaves instantly (1-5 seconds)
        stayTime = Math.random() * 4000 + 1000;
    } else if (roll < 0.50) {
        persona = "skimmer";   // Stays 30-60 seconds
        stayTime = Math.random() * 30000 + 30000;
    } else {
        persona = "reader";    // Stays 2-7 minutes
        stayTime = Math.random() * 300000 + 120000;
    }

    const dev = DEVICES[Math.floor(Math.random() * DEVICES.length)];
    
    // --- 2. COOKIE PERSISTENCE (The History Fix) ---
    // This saves the browser data to a folder named after the device.
    // Next time this device runs, Google sees "Returning User" cookies.
    const userDataDir = path.join(__dirname, `user_data_${dev.name.replace(/\s+/g, '_')}`);

    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: userDataDir, // <--- THIS SAVES HISTORY/COOKIES
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });

    const page = await browser.newPage();
    if (dev.mobile) {
        await page.setViewport({ width: dev.w, height: dev.h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    } else {
        await page.setViewport({ width: dev.w, height: dev.h });
    }
    await page.setUserAgent(dev.ua);

    try {
        // --- 3. WARMING PHASE (Fake History) ---
        // 30% chance to visit a big site first to get "real" cookies
        if (Math.random() < 0.3) {
            console.log("Warming up session: Visiting Wikipedia...");
            await page.goto("https://en.wikipedia.org/wiki/Special:Random", { waitUntil: 'networkidle2' });
            await jitter(3000);
        }

        console.log(`Persona: ${persona}. Target stay: ${Math.floor(stayTime/1000)}s`);
        await page.goto(REFERRER_URL, { waitUntil: 'networkidle2' });

        // Search and click link logic
        const link = await page.$(`a[href*="${TARGET_DOMAIN}"]`);
        if (link) {
            const box = await link.boundingBox();
            await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { delay: 200 });
        }

        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // --- 4. THE STAY LOGIC ---
        const startTime = Date.now();
        while (Date.now() - startTime < stayTime) {
            if (persona === "bouncer") break; // Leaves immediately

            // Human movement
            await page.mouse.wheel({ deltaY: Math.random() * 400 });
            
            // Random internal click for "readers"
            if (persona === "reader" && Math.random() < 0.1) {
                const internals = await page.$$('a[href*="' + TARGET_DOMAIN + '"]');
                if (internals.length > 0) {
                    await internals[Math.floor(Math.random() * internals.length)].click().catch(() => {});
                }
            }
            await jitter(hWait(10000, 20000));
        }

        console.log("Session Ended.");
    } catch (e) {
        console.log("Error:", e.message);
    } finally {
        await browser.close();
    }
}

function hWait(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }
startSession();
