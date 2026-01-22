const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

// Initializing Stealth
puppeteer.use(StealthPlugin());

class GhostBot {
    constructor() {
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        this.userDataDir = path.join(__dirname, 'ghost_session');
        this.devices = [
            { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11)', w: 1920, h: 1080, mobile: false, touch: false, cores: 8 },
            { name: 'Pixel-8-Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true, touch: true, cores: 8 },
            { name: 'iPhone-15-Max', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 430, h: 932, mobile: true, touch: true, cores: 6 }
        ];
    }

    // Automated Folder Cleanup
    clean() {
        if (fs.existsSync(this.userDataDir)) {
            try {
                fs.rmSync(this.userDataDir, { recursive: true, force: true });
                console.log("✅ Session cleaned.");
            } catch (e) {
                console.log("⚠️ Could not clean session (likely files in use).");
            }
        }
    }

    async run() {
        this.clean();
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        
        const browser = await puppeteer.launch({
            headless: false,
            userDataDir: this.userDataDir,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });

        try {
            const [page] = await browser.pages();
            
            // Apply Hardware Spoofing
            await page.setUserAgent(dev.ua);
            if (dev.mobile) {
                await page.setViewport({ width: dev.w, height: dev.h, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
            } else {
                await page.setViewport({ width: dev.w, height: dev.h });
            }

            // Fingerprint Injection
            await page.evaluateOnNewDocument((d) => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                Object.defineProperty(navigator, 'platform', { get: () => d.platform });
                Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => d.cores });
                
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(param) {
                    if (param === 37445) return d.vendor;
                    if (param === 37446) return d.renderer;
                    return getParameter.apply(this, arguments);
                };
            }, dev);

            console.log(`🚀 Starting: ${dev.name}`);
            
            // Navigate to Referrer (X.com)
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            await new Promise(r => setTimeout(r, 5000));

            // Finding the Link with Retry Logic
            const linkHandle = await page.waitForFunction((domain) => {
                const anchors = Array.from(document.querySelectorAll('a'));
                return anchors.find(a => a.href.includes(domain));
            }, { timeout: 15000 }, this.targetDomain);

            if (linkHandle) {
                const box = await linkHandle.boundingBox();
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            }

            // On Blog Engagement
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            console.log("🔗 On Blog. Starting impression loops...");

            // Stay for 3-5 minutes
            const endSession = Date.now() + (Math.random() * 120000 + 180000);
            while (Date.now() < endSession) {
                // Find AdSense
                await page.evaluate(() => {
                    const ad = document.querySelector('ins.adsbygoogle, [id*="google_ads"]');
                    if (ad) ad.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });

                // Random scroll
                await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 400) - 100 });
                await new Promise(r => setTimeout(r, Math.random() * 20000 + 10000));
            }

            console.log("🏁 Session completed successfully.");

        } catch (err) {
            console.error("❌ Error encountered:", err.message);
        } finally {
            await browser.close();
            this.clean();
        }
    }
}

// Execution
const bot = new GhostBot();
bot.run();
