const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

class EternalGhostBot {
    constructor() {
        // --- CONFIGURATION ---
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818"; 
        this.clickChance = 0.08; // 8% Chance to click an ad (Safe limit is 5-10%)
        this.userDataDir = path.join(__dirname, 'ghost_session');
        
        // --- DEVICE FLEET (DO NOT REMOVE) ---
        this.devices = [
            { name: 'Win10-Chrome-Nvidia', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, mobile: false, touch: false, cores: 8, mem: 16 },
            { name: 'MacOS-M2-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, mobile: false, touch: false, cores: 12, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)', w: 2560, h: 1440, mobile: false, touch: false, cores: 8, mem: 32 },
            { name: 'Pixel-8-Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'Samsung-S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 384, h: 854, mobile: true, touch: true, cores: 8, mem: 12 }
        ];

        this.authoritySites = ["https://www.wikipedia.org/", "https://www.bbc.com/news", "https://www.reddit.com/r/news/"];
    }

    async clean() {
        if (fs.existsSync(this.userDataDir)) {
            try { fs.rmSync(this.userDataDir, { recursive: true, force: true }); } catch (e) {}
        }
    }

    // --- HUMANIZED MOUSE MOVEMENT ---
    async humanMove(page, x, y) {
        // Adds "noise" to the movement so it's not a straight robot line
        await page.mouse.move(x, y, { steps: 25 + Math.floor(Math.random() * 20) });
    }

    async run() {
        await this.clean();
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        
        const browser = await puppeteer.launch({
            headless: false,
            userDataDir: this.userDataDir,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-web-security']
        });

        try {
            const [page] = await browser.pages();
            await page.setViewport({ width: dev.w, height: dev.h, isMobile: dev.mobile, hasTouch: dev.touch });
            await page.setUserAgent(dev.ua);

            // --- INJECTION: Fingerprint Bypass ---
            await page.evaluateOnNewDocument((d) => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                Object.defineProperty(navigator, 'platform', { get: () => d.platform });
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(p) {
                    if (p === 37445) return d.vendor;
                    if (p === 37446) return d.renderer;
                    return getParameter.apply(this, arguments);
                };
            }, dev);

            // --- PHASE 1: WARMER ---
            // Visit a big site to get "Real User" cookies
            if(Math.random() > 0.3) {
                const warm = this.authoritySites[Math.floor(Math.random() * this.authoritySites.length)];
                console.log(`🔥 Warming up at: ${warm}`);
                await page.goto(warm, { waitUntil: 'domcontentloaded' });
                await new Promise(r => setTimeout(r, 5000));
            }

            // --- PHASE 2: TWITTER (X) SCAN ---
            console.log(`🚀 Navigating to Twitter...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Deep Scan for Link
            let targetLink = null;
            for (let i = 0; i < 20; i++) { // Try for 20 seconds
                targetLink = await page.evaluateHandle((domain) => {
                    const allLinks = Array.from(document.querySelectorAll('a'));
                    return allLinks.find(a => a.href.includes(domain) || a.innerText.toLowerCase().includes(domain));
                }, this.targetDomain);

                if (targetLink.asElement()) break;
                await page.mouse.wheel({ deltaY: 200 }); 
                await new Promise(r => setTimeout(r, 1000));
            }

            if (targetLink.asElement()) {
                const box = await targetLink.asElement().boundingBox();
                await this.humanMove(page, box.x + box.width/2, box.y + box.height/2);
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                console.log("✅ Link Found & Clicked.");
            } else {
                throw new Error("Link not found on Twitter.");
            }

            // --- PHASE 3: THE BLOG (MONEY MAKER) ---
            await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
            console.log("💰 On Blog. Starting Human Simulation...");

            // 3.1: Simulate "Reading" (Scroll & Pause)
            await this.simulateReading(page);

            // 3.2: Ad Interaction (The Clicker)
            const clickedAd = await this.tryInteractWithAds(page);
            
            // 3.3: Bounce Rate Reduction (Internal Page Visit)
            if (!clickedAd) {
                console.log("🔗 No ad click. Visiting internal page to fix bounce rate...");
                await this.visitInternalPage(page);
            }

            console.log("🏁 Session Complete.");

        } catch (err) {
            console.error("❌ Error:", err.message);
        } finally {
            await browser.close();
            await this.clean();
        }
    }

    // --- HELPER: SIMULATE READING ---
    async simulateReading(page) {
        // Scroll down page in chunks
        for (let i = 0; i < 5; i++) {
            const scrollAmount = Math.floor(Math.random() * 400) + 200;
            await page.mouse.wheel({ deltaY: scrollAmount });
            
            // Random mouse jitter (reading text)
            await page.mouse.move(
                Math.random() * 500, 
                Math.random() * 500, 
                { steps: 10 }
            );

            // Wait 2-8 seconds (reading time)
            await new Promise(r => setTimeout(r, Math.random() * 6000 + 2000));
        }
    }

    // --- HELPER: AD INTERACTION ---
    async tryInteractWithAds(page) {
        if (Math.random() > this.clickChance) {
            console.log("👀 Just viewing ads today (Impression Only).");
            return false;
        }

        console.log("🎯 LUCKY CLICK TRIGGERED!");
        
        // Find Ad Frames
        const adFrames = await page.$$('iframe[id*="aswift"], iframe[id*="google_ads"]');
        if (adFrames.length > 0) {
            const targetFrame = adFrames[Math.floor(Math.random() * adFrames.length)];
            const box = await targetFrame.boundingBox();
            
            if (box) {
                // Scroll ad into view
                await page.mouse.wheel({ deltaY: box.y - 300 });
                await new Promise(r => setTimeout(r, 2000));

                // Hover first
                await this.humanMove(page, box.x + box.width/2, box.y + box.height/2);
                await new Promise(r => setTimeout(r, 1000));

                // Click
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                console.log("✅ AD CLICKED.");

                // Stay on the Ad landing page for a bit
                await new Promise(r => setTimeout(r, 15000)); 
                return true;
            }
        }
        return false;
    }

    // --- HELPER: INTERNAL NAVIGATION ---
    async visitInternalPage(page) {
        try {
            // Find a link that belongs to your domain
            const internalLink = await page.evaluateHandle((domain) => {
                return Array.from(document.querySelectorAll('a'))
                    .find(a => a.href.includes(domain) && !a.href.includes('#')); // skip anchors
            }, this.targetDomain);

            if (internalLink.asElement()) {
                const box = await internalLink.asElement().boundingBox();
                if(box) {
                    await this.humanMove(page, box.x + box.width/2, box.y + box.height/2);
                    await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                    await new Promise(r => setTimeout(r, 10000)); // Stay 10s on second page
                }
            }
        } catch (e) {
            console.log("⚠️ Could not find internal link.");
        }
    }
}

const bot = new EternalGhostBot();
bot.run();
