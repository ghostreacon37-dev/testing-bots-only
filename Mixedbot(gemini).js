const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const PROFILES = [
    { name: 'Chrome-Windows', vendor: 'Google Inc.', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16, w: 1920, h: 1080, mobile: false },
    { name: 'Edge-Windows', vendor: 'Microsoft', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', cores: 12, mem: 32, w: 2560, h: 1440, mobile: false },
    { name: 'Safari-Mac', vendor: 'Apple Computer, Inc.', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', platform: 'MacIntel', cores: 8, mem: 16, w: 1440, h: 900, mobile: false },
    { name: 'Chrome-Android-Pixel', vendor: 'Google Inc.', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 8, w: 412, h: 915, mobile: true }
];

const hWait = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

async function simulateHumanSession(browser, profile, targetDomain, referrer, tabId) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    
    // Fingerprinting
    await page.setUserAgent(profile.ua);
    await page.setViewport({ width: profile.w, height: profile.h, isMobile: profile.mobile, hasTouch: profile.mobile });
    await page.evaluateOnNewDocument((p) => {
        Object.defineProperty(navigator, 'vendor', { get: () => p.vendor });
        Object.defineProperty(navigator, 'platform', { get: () => p.platform });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => p.cores });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => p.mem });
        delete navigator.__proto__.webdriver;
    }, profile);

    try {
        // --- PHASE 1: X.COM (FAST REDIRECT) ---
        console.log(`[Tab ${tabId}] X.com: Quick Redirect Mode...`);
        await page.goto(referrer, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait just enough for the link to exist
        await new Promise(r => setTimeout(r, hWait(5000, 10000))); 
        
        const xLink = await page.evaluateHandle((domain) => {
            return Array.from(document.querySelectorAll('a')).find(a => a.href && a.href.includes(domain));
        }, targetDomain).then(h => h.asElement());

        if (xLink) {
            const box = await xLink.boundingBox();
            if (box) {
                // Direct click to move to the blog
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            }
        }

        // --- PHASE 2: LEARNWITHBLOG.XYZ (FULL HUMAN MODE) ---
        console.log(`[Tab ${tabId}] Blog reached. Starting Deep Human Behavior...`);
        
        // 1. Initial Reading Wait
        await new Promise(r => setTimeout(r, hWait(10000, 25000)));
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
async function start() {
    const TARGET = "learnwithblog.xyz";
    const REFERRER = "https://x.com/GhostReacondev/status/2013213212175724818?s=20";
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
    });

    const numTabs = hWait(2, 5);
    for (let i = 1; i <= numTabs; i++) {
        const profile = PROFILES[hWait(0, PROFILES.length - 1)];
        simulateHumanSession(browser, profile, TARGET, REFERRER, i);
        await new Promise(r => setTimeout(r, hWait(5000, 15000)));
    }
}

start();
