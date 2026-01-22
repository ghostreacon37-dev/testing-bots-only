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
        
        this.devices = [
            { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, cores: 8, mem: 16 },
            { name: 'MacOS-M2', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, cores: 12, mem: 16 },
            { name: 'Pixel-8', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 740', w: 393, h: 851, mobile: true, touch: true, cores: 8, mem: 12 }
        ];
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
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });

        try {
            const [page] = await browser.pages();
            await page.setViewport({ width: dev.w, height: dev.h });
            await page.setUserAgent(dev.ua);

            console.log(`🚀 Loading X.com...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 90000 });
            
            // --- SMART LINK FINDER (FIXED) ---
            let linkElement = null;
            console.log("🔍 Deep scanning for link...");

            for (let i = 0; i < 30; i++) { // Increase to 30 attempts (30 seconds)
                linkElement = await page.evaluateHandle((domain) => {
                    // Method 1: Check all <a> tags for the domain in the HREF
                    const byHref = Array.from(document.querySelectorAll('a')).find(a => a.href.toLowerCase().includes(domain.toLowerCase()));
                    if (byHref) return byHref;

                    // Method 2: Check for Twitter "Card" links (often shortened)
                    const byCard = Array.from(document.querySelectorAll('[data-testid="card.layoutLarge.detail"]')).find(el => el.innerText.toLowerCase().includes(domain.toLowerCase()));
                    if (byCard) return byCard;

                    // Method 3: Check for raw text that looks like the domain
                    const byText = Array.from(document.querySelectorAll('span')).find(s => s.innerText.toLowerCase().includes(domain.toLowerCase()));
                    return byText ? byText.closest('a') : null;
                }, this.targetDomain);

                const element = linkElement.asElement();
                if (element) {
                    console.log("✅ Link detected!");
                    
                    // Setup new tab listener BEFORE clicking
                    const newTabPagePromise = new Promise(resolve => browser.once('targetcreated', target => resolve(target.page())));
                    
                    const box = await element.boundingBox();
                    if (box) {
                        await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 20 });
                        await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                        
                        const blogPage = await newTabPagePromise;
                        if (blogPage) {
                            await blogPage.bringToFront();
                            console.log("🚀 Switched to Blog Tab.");
                            await this.doHumanBehavior(blogPage, dev);
                            return; // Success
                        }
                    }
                }

                // If not found, scroll a bit to trigger lazy loading
                await page.mouse.wheel({ deltaY: 250 });
                await new Promise(r => setTimeout(r, 1000));
            }

            throw new Error("Link not found on Twitter after 30 seconds.");

        } catch (err) {
            console.error("❌ Session Error:", err.message);
        } finally {
            await browser.close();
        }
    }

    async doHumanBehavior(page, dev) {
        console.log("💰 Simulating Reading & Human Flow...");
        const duration = 180000 + (Math.random() * 120000); // 3-5 mins
        const end = Date.now() + duration;

        while (Date.now() < end) {
            await page.mouse.wheel({ deltaY: (Math.random() * 500) - 100 });
            await page.mouse.move(Math.random() * dev.w, Math.random() * dev.h, { steps: 30 });
            
            // Randomly click an internal link to prevent bounce rate
            if (Math.random() < 0.05) {
                const internal = await page.evaluateHandle((d) => {
                    return Array.from(document.querySelectorAll('a')).find(a => a.href.includes(d) && !a.href.includes('#'));
                }, this.targetDomain);
                if (internal.asElement()) await internal.asElement().click();
            }

            console.log(`⏱️ Time remaining: ${Math.floor((end - Date.now()) / 1000)}s`);
            await new Promise(r => setTimeout(r, 10000 + Math.random() * 5000));
        }
    }
}

const bot = new EternalGhostBot();
bot.run();
