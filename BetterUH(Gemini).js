const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

class EternalGhostBot {
    constructor() {
        this.targetWord = "LearnWithBlog.xyz";
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        this.userDataDir = path.join(__dirname, 'ghost_session');
        
        // --- RESTORED MASSIVE DEVICE FLEET (20 PROFILES) ---
        this.devices = [
            { name: 'Win10-Chrome-1', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, cores: 8, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)', w: 2560, h: 1440, cores: 12, mem: 32 },
            { name: 'MacOS-M2-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, cores: 8, mem: 16 },
            { name: 'Ubuntu-Firefox', ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0', platform: 'Linux x86_64', vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 620', w: 1366, h: 768, cores: 4, mem: 8 },
            { name: 'S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 384, h: 854, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'iPhone-15-Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 393, h: 852, mobile: true, touch: true, cores: 6, mem: 8 },
            { name: 'Pixel-8-Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'iPad-Air-5', ua: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', platform: 'iPad', vendor: 'Apple Inc.', renderer: 'Apple M1 GPU', w: 820, h: 1180, mobile: true, touch: true, cores: 8, mem: 8 },
            { name: 'Win10-Old-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Intel', renderer: 'Intel(R) HD Graphics 520', w: 1600, h: 900, cores: 4, mem: 4 },
            { name: 'MacBook-Pro-Intel', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Intel Inc.', renderer: 'Intel Iris Plus Graphics 640', w: 2560, h: 1600, cores: 4, mem: 8 },
            // ... Add 10 more as needed in this array ...
        ];
    }

    async clean() {
        if (fs.existsSync(this.userDataDir)) {
            try { fs.rmSync(this.userDataDir, { recursive: true, force: true }); } catch (e) {}
        }
    }

    async applyStealth(page, d) {
        await page.evaluateOnNewDocument((d) => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
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
            await this.applyStealth(page, dev);

            console.log(`🚀 Device: ${dev.name} | Referral: X.com`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // --- HUNTING THE LINK ---
            let linkElement = null;
            for (let i = 0; i < 20; i++) {
                linkElement = await page.evaluateHandle((text) => {
                    return Array.from(document.querySelectorAll('a')).find(a => 
                        a.innerText.toLowerCase().includes(text.toLowerCase()) || 
                        a.href.includes("learnwithblog.xyz")
                    );
                }, this.targetWord);

                const element = linkElement.asElement();
                if (element) {
                    console.log("🎯 Found it! Switching tabs...");
                    const newTabPagePromise = new Promise(resolve => browser.once('targetcreated', t => resolve(t.page())));
                    
                    const box = await element.boundingBox();
                    if (box) {
                        await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 25 });
                        await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                        
                        const blogPage = await newTabPagePromise;
                        if (blogPage) {
                            await blogPage.bringToFront();
                            await this.humanLoop(blogPage, dev);
                        }
                    }
                    break;
                }
                await page.mouse.wheel({ deltaY: 300 });
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (err) {
            console.error("❌ Session Error:", err.message);
        } finally {
            await browser.close();
        }
    }

    async humanLoop(page, dev) {
        console.log("💰 HUMAN BEHAVIOR ACTIVE (3-5 MINS)");
        const end = Date.now() + (Math.random() * 120000 + 180000);
        
        while (Date.now() < end) {
            const roll = Math.random();
            if (roll < 0.4) {
                await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 500) - 200 });
            } else if (roll < 0.7) {
                await page.mouse.move(Math.random() * dev.w, Math.random() * dev.h, { steps: 40 });
            } else if (roll < 0.9) {
                // Highlight text like a reader
                await page.mouse.move(200, 300);
                await page.mouse.down();
                await page.mouse.move(400, 310, { steps: 15 });
                await page.mouse.up();
            } else {
                // Click a random article/link on your site to boost SEO & Ad trust
                const internal = await page.$$(`a[href*="${this.targetDomain}"]`);
                if (internal.length > 0) {
                    await internal[Math.floor(Math.random() * internal.length)].click().catch(() => {});
                }
            }
            console.log(`⏱️ Remaining: ${Math.floor((end - Date.now())/1000)}s`);
            await new Promise(r => setTimeout(r, Math.random() * 8000 + 4000));
        }
    }
}

new EternalGhostBot().run();
