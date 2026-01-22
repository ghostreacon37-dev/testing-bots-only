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
        
        // --- 20+ MASSIVE DEVICE FLEET (PRESERVED & EXPANDED) ---
        this.devices = [
            { name: 'Win10-Chrome-NV', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, cores: 8, mem: 16 },
            { name: 'MacOS-M2-Saf', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, cores: 12, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)', w: 2560, h: 1440, cores: 8, mem: 32 },
            { name: 'Pixel-8-Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 384, h: 854, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'iPhone-15-Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 393, h: 852, mobile: true, touch: true, cores: 6, mem: 8 },
            { name: 'Linux-Ubuntu-Firefox', ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0', platform: 'Linux x86_64', vendor: 'Intel Open Source Technology Center', renderer: 'Mesa Intel(R) UHD Graphics 620', w: 1600, h: 900, cores: 4, mem: 8 },
            { name: 'iPad-Air-5', ua: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', platform: 'iPad', vendor: 'Apple Inc.', renderer: 'Apple M1 GPU', w: 820, h: 1180, mobile: true, touch: true, cores: 8, mem: 8 },
            { name: 'Xiaomi-14', ua: 'Mozilla/5.0 (Linux; Android 14; 23127PN0CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Qualcomm', renderer: 'Adreno (TM) 750', w: 393, h: 852, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'Win10-Surface-Laptop', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Intel', renderer: 'Intel(R) Iris(R) Xe Graphics', w: 2256, h: 1504, cores: 4, mem: 16 }
        ];

        this.authoritySites = ["https://www.wikipedia.org/", "https://www.bbc.com/news", "https://www.nytimes.com/"];
    }

    async clean() {
        if (fs.existsSync(this.userDataDir)) {
            try { fs.rmSync(this.userDataDir, { recursive: true, force: true }); } catch (e) {}
        }
    }

    async applyMaxBypass(page, d) {
        await page.evaluateOnNewDocument((d) => {
            // Mask WebDriver
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            // Fake Hardware
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => d.cores });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => d.mem });
            // Fake WebGL
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(p) {
                if (p === 37445) return d.vendor;
                if (p === 37446) return d.renderer;
                return getParameter.apply(this, arguments);
            };
            // Tab Focus Bypass
            Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
            Object.defineProperty(document, 'hidden', { get: () => false });
        }, d);
    }

    async run() {
        await this.clean();
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        
        const browser = await puppeteer.launch({
            headless: false,
            userDataDir: this.userDataDir,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });

        try {
            const [page] = await browser.pages();
            await page.setViewport({ width: dev.w, height: dev.h });
            await page.setUserAgent(dev.ua);
            await this.applyMaxBypass(page, dev);

            // --- PHASE 1: WARMER ---
            await page.goto(this.authoritySites[Math.floor(Math.random() * 3)], { waitUntil: 'domcontentloaded' });
            await new Promise(r => setTimeout(r, 5000));

            // --- PHASE 2: TWITTER REFERRER ---
            console.log(`🚀 Entering X.com as ${dev.name}...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Wait and Find link
            let linkFound = false;
            for(let i=0; i<15; i++) {
                const link = await page.evaluateHandle((domain) => {
                    return Array.from(document.querySelectorAll('a')).find(a => a.href.includes(domain));
                }, this.targetDomain);

                if(link.asElement()) {
                    const box = await link.asElement().boundingBox();
                    if(box) {
                        await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 20 });
                        await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                        linkFound = true;
                        break;
                    }
                }
                await page.mouse.wheel({ deltaY: 200 });
                await new Promise(r => setTimeout(r, 1000));
            }

            if(!linkFound) throw new Error("Link not found on X");

            // --- PHASE 3: BLOG HUMAN BEHAVIOR (MAX DWELL TIME) ---
            await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
            console.log("💰 On Blog. Starting Deep Engagement...");

            const startTime = Date.now();
            const sessionDuration = (Math.random() * 180000) + 180000; // 3 to 6 minutes

            while (Date.now() - startTime < sessionDuration) {
                // 1. Random Human Scroll
                const direction = Math.random() > 0.2 ? 1 : -1; // Mostly scroll down, sometimes up
                await page.mouse.wheel({ deltaY: (Math.random() * 400) * direction });

                // 2. Mouse Jitter (Human hand movement)
                await page.mouse.move(Math.random() * dev.w, Math.random() * dev.h, { steps: 30 });

                // 3. Highlight Text (Common human reading behavior)
                if (Math.random() < 0.1) {
                    await page.mouse.down();
                    await page.mouse.move(Math.random() * 100, Math.random() * 100, { steps: 5 });
                    await page.mouse.up();
                }

                // 4. Random Internal Click (Every 2 minutes)
                if (Math.random() < 0.05) {
                    const internalLinks = await page.$$(`a[href*="${this.targetDomain}"]`);
                    if (internalLinks.length > 0) {
                        const nextLink = internalLinks[Math.floor(Math.random() * internalLinks.length)];
                        await nextLink.click().catch(() => {});
                        await new Promise(r => setTimeout(r, 10000));
                    }
                }

                console.log(`   Dwell: ${Math.floor((Date.now() - startTime)/1000)}s / ${Math.floor(sessionDuration/1000)}s`);
                await new Promise(r => setTimeout(r, Math.random() * 15000 + 5000));
            }

            console.log("🏁 Session Complete. High trust earned.");

        } catch (err) {
            console.error("❌ Session Error:", err.message);
        } finally {
            await browser.close();
            await this.clean();
        }
    }
}

const bot = new EternalGhostBot();
bot.run();
