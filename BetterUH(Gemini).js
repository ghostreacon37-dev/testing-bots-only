const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

class EternalGhostBot {
    constructor() {
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        this.userDataDir = path.join(__dirname, 'ghost_session');
        
        // 10+ DEVICE FLEET
        this.devices = [
            { name: 'Win10-Chrome-Nvidia', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, mobile: false, touch: false, cores: 8, mem: 16 },
            { name: 'MacOS-M2-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, mobile: false, touch: false, cores: 12, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)', w: 2560, h: 1440, mobile: false, touch: false, cores: 8, mem: 32 },
            { name: 'Pixel-8-Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'Samsung-S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 384, h: 854, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'Samsung-A54', ua: 'Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Mali-G68 MC4', w: 412, h: 915, mobile: true, touch: true, cores: 8, mem: 6 },
            { name: 'OnePlus-12', ua: 'Mozilla/5.0 (Linux; Android 14; CPH2581) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 412, h: 915, mobile: true, touch: true, cores: 8, mem: 16 },
            { name: 'Xiaomi-14', ua: 'Mozilla/5.0 (Linux; Android 14; 23127PN0CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 393, h: 852, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'iPhone-15-Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 393, h: 852, mobile: true, touch: true, cores: 6, mem: 8 },
            { name: 'iPhone-14', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 390, h: 844, mobile: true, touch: true, cores: 6, mem: 6 },
            { name: 'iPad-Pro-M2', ua: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPad', vendor: 'Apple Inc.', renderer: 'Apple M2 GPU', w: 1024, h: 1366, mobile: true, touch: true, cores: 8, mem: 16 }
        ];

        this.authoritySites = [
            "https://www.wikipedia.org/",
            "https://www.bbc.com/news",
            "https://www.nytimes.com/",
            "https://www.cnn.com/",
            "https://www.reddit.com/r/news/"
        ];
    }

    clean() {
        if (fs.existsSync(this.userDataDir)) {
            try {
                fs.rmSync(this.userDataDir, { recursive: true, force: true });
                console.log("🧹 Session Wiped (New Human Identity Created).");
            } catch (e) { console.log("⚠️ Cleanup skipped."); }
        }
    }

    async run() {
        this.clean();
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        
        const browser = await puppeteer.launch({
            headless: false,
            userDataDir: this.userDataDir,
            args: [
                '--no-sandbox', '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-webrtc'
            ]
        });

        try {
            const [page] = await browser.pages();
            await page.setViewport({ width: dev.w, height: dev.h, isMobile: dev.mobile, hasTouch: dev.touch, deviceScaleFactor: dev.mobile ? 3 : 1 });
            await page.setUserAgent(dev.ua);

            // MAX BYPASS INJECTION
            await page.evaluateOnNewDocument((d) => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                Object.defineProperty(navigator, 'platform', { get: () => d.platform });
                Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => d.cores });
                Object.defineProperty(navigator, 'deviceMemory', { get: () => d.mem });
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(param) {
                    if (param === 37445) return d.vendor;
                    if (param === 37446) return d.renderer;
                    return getParameter.apply(this, arguments);
                };
                if (d.touch) { Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }); }
            }, dev);

            // --- PHASE 1: HISTORY WARMER (70% Chance) ---
            if (Math.random() < 0.7) {
                const warmSite = this.authoritySites[Math.floor(Math.random() * this.authoritySites.length)];
                console.log(`🔥 Warming session at: ${warmSite}`);
                await page.goto(warmSite, { waitUntil: 'networkidle2' });
                await page.mouse.wheel({ deltaY: 500 });
                await new Promise(r => setTimeout(r, hWait(15000, 30000))); // Simulate reading
            }

            // --- PHASE 2: TARGET ENTRY ---
            console.log(`🚀 Navigating to Twitter Referrer... Device: ${dev.name}`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, hWait(5000, 10000)));

            const linkHandle = await page.waitForFunction((domain) => {
                return Array.from(document.querySelectorAll('a')).find(a => a.href.includes(domain));
            }, { timeout: 20000 }, this.targetDomain);

            if (linkHandle) {
                const box = await linkHandle.boundingBox();
                await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 30 });
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
            }

            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            
            // --- PHASE 3: BLOG ENGAGEMENT (The Money Loop) ---
            const stayTime = Math.random() > 0.4 ? 400000 : 120000; 
            const endTime = Date.now() + stayTime;

            while (Date.now() < endTime) {
                // Find AdSense for "Active View" Impression
                await page.evaluate(() => {
                    const ad = document.querySelector('ins.adsbygoogle, [id*="google_ads"]');
                    if (ad) ad.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });

                await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 800) - 300 });
                await new Promise(r => setTimeout(r, hWait(15000, 40000)));
            }

            console.log("🏁 Session Success.");
        } catch (err) {
            console.error("❌ Session Error:", err.message);
        } finally {
            await browser.close();
            this.clean();
        }
    }
}

function hWait(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }
const bot = new EternalGhostBot();
bot.run();
