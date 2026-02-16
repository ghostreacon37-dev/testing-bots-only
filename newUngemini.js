const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class EternalGhostBotV23 {
    constructor() {
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        
        this.devices = [
            { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', w: 1920, h: 1080 },
            { name: 'MacOS-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', w: 1440, h: 900 },
            { name: 'S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', w: 384, h: 854, mobile: true }
        ];
    }

    async wait(min, max) {
        const ms = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(r => setTimeout(r, ms));
    }

    async run() {
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        const width = dev.w + Math.floor(Math.random() * 60 - 30);
        const height = dev.h + Math.floor(Math.random() * 60 - 30);

        const browser = await puppeteer.launch({
            headless: false,
            args: [`--window-size=${width},${height}`, '--no-sandbox', '--disable-notifications']
        });

        browser.on('targetcreated', async (target) => {
            if (target.type() === 'page') {
                const newPage = await target.page();
                if (newPage) {
                    const url = newPage.url();
                    if (url !== "about:blank" && !url.includes(this.targetDomain) && !url.includes("x.com")) {
                        await newPage.close().catch(() => {});
                    }
                }
            }
        });

        try {
            const [page] = await browser.pages();
            await page.setUserAgent(dev.ua);
            await page.setViewport({ width, height, isMobile: !!dev.mobile });

            console.log(`🚀 Navigating to X.com...`);
            
            // 1. Initial Load
            await page.goto(this.referrerUrl, { 
                waitUntil: 'networkidle2', 
                timeout: 60000 
            });

            // 2. SMART WAIT: Wait for X's main content column to appear
            console.log("⏳ Waiting for X content to render...");
            try {
                await page.waitForSelector('article, [data-testid="tweet"]', { timeout: 15000 });
                console.log("✅ X Content Loaded.");
            } catch (e) {
                console.log("⚠️ X took too long, attempting link search anyway...");
            }

            // Extra "human" pause to let images/cards load
            await this.wait(3000, 6000);

            let found = false;
            for (let i = 0; i < 8; i++) {
                const link = await page.evaluateHandle((dom) => {
                    const links = Array.from(document.querySelectorAll('a'));
                    // Look for the domain or the "card" link X generates
                    return links.find(a => a.href.includes(dom) || a.innerText.includes("LearnWithBlog"));
                }, this.targetDomain);

                const element = link.asElement();
                if (element) {
                    console.log("🎯 Link found! Scrolling to click...");
                    await element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await this.wait(2000, 4000);
                    
                    const box = await element.boundingBox();
                    if (box) {
                        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
                        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                        found = true;
                        break;
                    }
                }
                // If not found, scroll down to trigger lazy loading
                await page.mouse.wheel({ deltaY: 400 });
                await this.wait(1500, 3000);
            }

            if (found) {
                // Wait for the new tab to open and stabilize
                await this.wait(5000, 8000);
                const pages = await browser.pages();
                const blogPage = pages.find(p => p.url().includes(this.targetDomain));
                if (blogPage) {
                    await blogPage.bringToFront();
                    await this.simulateHuman(blogPage);
                }
            }

        } catch (err) {
            console.error("❌ Error:", err.message);
        } finally {
            await browser.close();
        }
    }

    async simulateHuman(page) {
        const sessionEnd = Date.now() + (Math.floor(Math.random() * 180000) + 120000);
        console.log("👤 Blog Engagement Active...");

        while (Date.now() < sessionEnd) {
            const roll = Math.random();
            try {
                if (roll < 0.5) { 
                    // Reading behavior
                    await page.mouse.wheel({ deltaY: Math.random() * 250 + 50 });
                    await this.wait(3000, 7000);
                } else if (roll < 0.8) {
                    // Mouse movement / Distraction
                    await page.mouse.move(Math.random() * 400, Math.random() * 400, { steps: 8 });
                    await this.wait(2000, 5000);
                } else {
                    // Navigate deeper
                    const links = await page.$$('a');
                    if (links.length > 0) {
                        const target = links[Math.floor(Math.random() * links.length)];
                        await target.click().catch(() => {});
                        await this.wait(6000, 10000);
                    }
                }
            } catch (e) {}
        }
    }
}

new EternalGhostBotV23().run();
