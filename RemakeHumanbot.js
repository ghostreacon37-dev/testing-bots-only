const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

class EternalGhostBotV17 {
    constructor() {
        this.targetWord = "LearnWithBlog.xyz";
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        this.userDataDir = path.join(__dirname, 'ghost_session');
        
        // --- FULL RE-RESTORED MASSIVE DEVICE FLEET ---
        this.devices = [
            { name: 'Win10-Chrome-NV', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, cores: 8, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)', w: 2560, h: 1440, cores: 12, mem: 32 },
            { name: 'MacOS-M2-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, cores: 8, mem: 16 },
            { name: 'S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 384, h: 854, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'iPhone-15-Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 393, h: 852, mobile: true, touch: true, cores: 6, mem: 8 },
            { name: 'Ubuntu-Firefox', ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0', platform: 'Linux x86_64', vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 620', w: 1366, h: 768, cores: 4, mem: 8 },
            { name: 'iPad-Air-5', ua: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', platform: 'iPad', vendor: 'Apple Inc.', renderer: 'Apple M1 GPU', w: 820, h: 1180, mobile: true, touch: true, cores: 8, mem: 8 }
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

            // --- HUNTING THE X.COM LINK ---
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
                    console.log("🎯 Referral found! Jumping to blog...");
                    const newTabPagePromise = new Promise(resolve => browser.once('targetcreated', t => resolve(t.page())));
                    
                    const box = await element.boundingBox();
                    if (box) {
                        await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 25 });
                        await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                        
                        const blogPage = await newTabPagePromise;
                        if (blogPage) {
                            await blogPage.bringToFront();
                            // MAX ENGAGEMENT TIME: 0 to 7 Minutes
                            await this.multiPageEngagement(blogPage, dev);
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

    async multiPageEngagement(page, dev) {
        // Random session length between 10 seconds and 420 seconds (7 minutes)
        const totalDuration = Math.floor(Math.random() * 410000) + 10000;
        const sessionEnd = Date.now() + totalDuration;
        
        console.log(`💰 Multi-Page Engagement Started: Target ${Math.floor(totalDuration/1000)} seconds.`);

        while (Date.now() < sessionEnd) {
            const roll = Math.random();
            
            // 1. Random Interaction
            if (roll < 0.3) {
                console.log("   - Smooth scrolling...");
                await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 700) - 200 });
            } else if (roll < 0.6) {
                console.log("   - Jittery mouse movement...");
                await page.mouse.move(Math.random() * dev.w, Math.random() * dev.h, { steps: 60 });
            } else if (roll < 0.8) {
                console.log("   - Highlighting key text...");
                await page.evaluate(() => window.scrollBy(0, 100));
                await page.mouse.move(300, 400);
                await page.mouse.down();
                await page.mouse.move(500, 410, { steps: 30 });
                await page.mouse.up();
            } else {
                // 2. CLICKING INTERNAL LINKS (Impression Booster)
                // This makes the bot visit more than one page on your site.
                console.log("🔗 Searching for next article/internal link...");
                const internalLinks = await page.$$(`a[href*="${this.targetDomain}"]`);
                if (internalLinks.length > 5) { // Ensure we have options
                    const nextLink = internalLinks[Math.floor(Math.random() * internalLinks.length)];
                    const box = await nextLink.boundingBox();
                    if (box && box.y > 0) { // Only click if it's a valid link on screen
                        await nextLink.scrollIntoView();
                        await page.mouse.move(box.x + 5, box.y + 5, { steps: 20 });
                        await nextLink.click().catch(() => {});
                        console.log("✅ Clicked new internal page for more impressions.");
                        await new Promise(r => setTimeout(r, 8000)); // Wait for load
                    }
                }
            }

            console.log(`⏱️ Remaining session: ${Math.floor((sessionEnd - Date.now())/1000)}s`);
            
            // Random pause (human reading time) between 5-15 seconds
            await new Promise(r => setTimeout(r, Math.random() * 10000 + 5000));
        }
        console.log("🏁 Max Engagement Session Complete.");
    }
}

new EternalGhostBotV17().run();
