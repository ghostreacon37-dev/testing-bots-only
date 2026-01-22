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
        
        // --- 20+ DEVICE FLEET (PRESERVED) ---
        this.devices = [
            { name: 'Win10-Chrome-NV', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, cores: 8, mem: 16 },
            { name: 'MacOS-M2-Saf', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, cores: 12, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)', w: 2560, h: 1440, cores: 8, mem: 32 },
            { name: 'Pixel-8-Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'iPhone-15-Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 393, h: 852, mobile: true, touch: true, cores: 6, mem: 8 }
        ];

        this.authoritySites = ["https://www.wikipedia.org/", "https://www.bbc.com/news"];
    }

    async clean() {
        if (fs.existsSync(this.userDataDir)) {
            try { fs.rmSync(this.userDataDir, { recursive: true, force: true }); } catch (e) {}
        }
    }

    async applyEvasions(page, d) {
        await page.evaluateOnNewDocument((d) => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => d.cores });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => d.mem });
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(p) {
                if (p === 37445) return d.vendor;
                if (p === 37446) return d.renderer;
                return getParameter.apply(this, arguments);
            };
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
            await this.applyEvasions(page, dev);

            // --- PHASE 1: X.COM ---
            console.log(`🚀 Navigating to Twitter...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Link Finder
            let linkElement = null;
            for(let i=0; i<15; i++) {
                linkElement = await page.evaluateHandle((domain) => {
                    return Array.from(document.querySelectorAll('a')).find(a => a.href.includes(domain));
                }, this.targetDomain);
                if(linkElement.asElement()) break;
                await page.mouse.wheel({ deltaY: 300 });
                await new Promise(r => setTimeout(r, 1000));
            }

            if (linkElement.asElement()) {
                const box = await linkElement.asElement().boundingBox();
                
                // 🛠️ NEW TAB HANDLING LOGIC
                // We create a promise that waits for a new "target" (tab) to be created
                const newTabPagePromise = new Promise(resolve => browser.once('targetcreated', target => resolve(target.page())));

                console.log("🖱️ Clicking link (Expects new tab)...");
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2);

                // Wait for the new tab to exist
                const blogPage = await newTabPagePromise;
                if (!blogPage) throw new Error("New tab didn't open.");

                // Switch focus to the new tab
                await blogPage.bringToFront();
                await blogPage.setViewport({ width: dev.w, height: dev.h });
                
                console.log("✅ Switched to New Tab: " + (await blogPage.title()));

                // --- PHASE 2: HUMAN BEHAVIOR ON BLOG ---
                await this.doHumanBehavior(blogPage, dev);

            } else {
                throw new Error("Link not found on Twitter.");
            }

        } catch (err) {
            console.error("❌ Session Error:", err.message);
        } finally {
            await browser.close();
            await this.clean();
        }
    }

    async doHumanBehavior(page, dev) {
        console.log("💰 Starting Human Simulation...");
        const sessionDuration = (Math.random() * 120000) + 180000; // 3-5 minutes
        const endTime = Date.now() + sessionDuration;

        while (Date.now() < endTime) {
            // Random Scroll
            const scroll = Math.floor(Math.random() * 500) + 100;
            await page.mouse.wheel({ deltaY: scroll });
            
            // Random Mouse Movement
            await page.mouse.move(Math.random() * dev.w, Math.random() * dev.h, { steps: 25 });

            // Random Pause (Reading)
            const pause = Math.random() * 10000 + 5000;
            console.log(`   Reading for ${Math.floor(pause/1000)}s...`);
            await new Promise(r => setTimeout(r, pause));

            // Random Internal Click (To prevent bounce)
            if (Math.random() < 0.1) {
                const internalLink = await page.evaluateHandle((domain) => {
                    return Array.from(document.querySelectorAll('a')).find(a => a.href.includes(domain) && !a.href.includes('#'));
                }, this.targetDomain);
                
                if (internalLink.asElement()) {
                    console.log("🔗 Clicking Internal Link...");
                    await internalLink.asElement().click();
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }
        console.log("🏁 Behavior Session Finished.");
    }
}

const bot = new EternalGhostBot();
bot.run();
