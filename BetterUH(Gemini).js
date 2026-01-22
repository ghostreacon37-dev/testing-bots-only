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
        
        // --- 10+ DEVICE FLEET (PRESERVED) ---
        this.devices = [
            { name: 'Win10-Chrome-Nvidia', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, mobile: false, touch: false, cores: 8, mem: 16 },
            { name: 'MacOS-M2-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, mobile: false, touch: false, cores: 12, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)', w: 2560, h: 1440, mobile: false, touch: false, cores: 8, mem: 32 },
            { name: 'Pixel-8-Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'Samsung-S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 384, h: 854, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'iPhone-15-Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 393, h: 852, mobile: true, touch: true, cores: 6, mem: 8 },
            { name: 'iPhone-14', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 390, h: 844, mobile: true, touch: true, cores: 6, mem: 6 }
        ];

        this.authoritySites = ["https://www.wikipedia.org/", "https://www.bbc.com/news", "https://www.reddit.com/r/news/"];
    }

    async clean() {
        if (fs.existsSync(this.userDataDir)) {
            try { fs.rmSync(this.userDataDir, { recursive: true, force: true }); } catch (e) {}
        }
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

            // --- FINGERPRINT BYPASS ---
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

            // --- STEP 1: WARMER ---
            await page.goto(this.authoritySites[Math.floor(Math.random() * 3)], { waitUntil: 'domcontentloaded' });
            await new Promise(r => setTimeout(r, 5000));

            // --- STEP 2: X.COM (DEEP SCAN) ---
            console.log("🔍 Scanning X for link...");
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // Deep Search Link Logic
            let targetHandle = null;
            for (let attempt = 0; attempt < 15; attempt++) {
                targetHandle = await page.evaluateHandle((domain) => {
                    // Search all links for domain match or text match
                    return Array.from(document.querySelectorAll('a')).find(a => 
                        a.href.toLowerCase().includes(domain.toLowerCase()) || 
                        a.innerText.toLowerCase().includes(domain.toLowerCase())
                    );
                }, this.targetDomain);

                if (targetHandle.asElement()) break;
                await page.mouse.wheel({ deltaY: 300 }); // Scroll slightly
                await new Promise(r => setTimeout(r, 1000));
            }

            const element = targetHandle.asElement();
            if (element) {
                const box = await element.boundingBox();
                await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 15 });
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                console.log("✅ Clicked!");
            } else {
                throw new Error("Could not find Target Link on X.com after 15 seconds.");
            }

            await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});

            // --- STEP 3: BLOG ENGAGEMENT + 5% AD CLICK ---
            console.log("💰 On Blog. Running Revenue Loop...");
            const endTime = Date.now() + 180000; // 3 Min stay

            while (Date.now() < endTime) {
                // Scroll to AdSense
                await page.evaluate(() => {
                    const ad = document.querySelector('ins.adsbygoogle, iframe[id*="aswift"]');
                    if (ad) ad.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });

                // --- THE 5% AD CLICK LOGIC ---
                if (Math.random() < 0.05) {
                    console.log("🎯 Random Ad Click Triggered...");
                    const adFrame = await page.$('iframe[id*="aswift"]');
                    if (adFrame) {
                        const box = await adFrame.boundingBox();
                        await page.mouse.click(box.x + 10, box.y + 10);
                        await new Promise(r => setTimeout(r, 10000));
                        await page.goBack(); // Return to blog
                    }
                }

                await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 400) - 100 });
                await new Promise(r => setTimeout(r, 15000));
            }

        } catch (err) { console.error("❌ Error:", err.message); }
        finally { await browser.close(); }
    }
}

const bot = new EternalGhostBot();
bot.run();
