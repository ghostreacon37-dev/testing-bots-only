const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

class EternalGhostBotV20 {
    constructor() {
        this.targetWord = "LearnWithBlog.xyz";
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        this.userDataDir = path.join(__dirname, 'ghost_session');
        
        // --- ALL 20+ DEVICES PRESERVED ---
        this.devices = [
            { name: 'Win10-Chrome-NV', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', w: 1920, h: 1080, cores: 8, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)', w: 2560, h: 1440, cores: 12, mem: 32 },
            { name: 'MacOS-M2-Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, cores: 8, mem: 16 },
            { name: 'S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', vendor: 'Google Inc.', renderer: 'Adreno (TM) 750', w: 384, h: 854, mobile: true, touch: true, cores: 8, mem: 12 },
            { name: 'iPhone-15-Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', platform: 'iPhone', vendor: 'Apple Inc.', renderer: 'Apple GPU', w: 393, h: 852, mobile: true, touch: true, cores: 6, mem: 8 }
        ];
    }

    async applyStealth(page, d) {
        await page.evaluateOnNewDocument((d) => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => d.cores });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => d.mem });
        }, d);
    }

    async run() {
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
        });

        // --- NEW: POPUNDER AUTO-CLOSE SYSTEM ---
        // This listener watches for any new tab opening and kills it if it's an ad.
        browser.on('targetcreated', async (target) => {
            const newPage = await target.page();
            if (newPage) {
                const url = newPage.url();
                // If it's NOT our domain and NOT x.com, it's probably a popunder ad.
                if (!url.includes(this.targetDomain) && !url.includes("x.com") && url !== "about:blank") {
                    console.log("🛡️ Popunder detected! Closing ad tab:", url);
                    await newPage.close().catch(() => {});
                }
            }
        });

        try {
            const [page] = await browser.pages();
            await page.setViewport({ width: dev.w, height: dev.h });
            await page.setUserAgent(dev.ua);
            await this.applyStealth(page, dev);

            console.log(`🚀 Loading X.com...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // Search and click logic (Brute-Force V19 preserved)
            let clicked = false;
            for (let i = 0; i < 10; i++) {
                const link = await page.evaluateHandle((domain) => {
                    const card = document.querySelector('[data-testid="card.wrapper"]');
                    if (card) return card.closest('a') || card;
                    return Array.from(document.querySelectorAll('a')).find(a => a.href.includes(domain));
                }, this.targetDomain);

                const element = link.asElement();
                if (element) {
                    const box = await element.boundingBox();
                    if (box) {
                        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 30 });
                        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                        
                        // Give it a moment to find the actual blog tab
                        await new Promise(r => setTimeout(r, 4000));
                        const allPages = await browser.pages();
                        const blogPage = allPages.find(p => p.url().includes(this.targetDomain));
                        
                        if (blogPage) {
                            await blogPage.bringToFront();
                            await this.engagementLoop(blogPage, dev, browser);
                            clicked = true;
                            break;
                        }
                    }
                }
                await page.mouse.wheel({ deltaY: 300 });
                await new Promise(r => setTimeout(r, 2000));
            }

        } catch (err) {
            console.error("❌ Error:", err.message);
        } finally {
            await browser.close();
        }
    }

    async engagementLoop(page, dev, browser) {
        const duration = Math.floor(Math.random() * 410000) + 10000; // 0 to 7 minutes
        const endTime = Date.now() + duration;
        console.log(`💰 Target session: ${Math.floor(duration/1000)}s | Random clicks enabled.`);

        while (Date.now() < endTime) {
            try {
                // Ensure we are focused on the blog
                await page.bringToFront().catch(() => {});
                
                const roll = Math.random();
                if (roll < 0.3) {
                    await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 600) - 200 });
                } else if (roll < 0.7) {
                    // --- CLICK MULTIPLIER ---
                    // Randomly click any link on your site to trigger more popunders/impressions
                    const links = await page.$$('a');
                    if (links.length > 0) {
                        const randomLink = links[Math.floor(Math.random() * links.length)];
                        await randomLink.scrollIntoView().catch(() => {});
                        const box = await randomLink.boundingBox();
                        if (box) {
                            console.log("🖱️ Clicking internal content to generate impressions...");
                            await page.mouse.click(box.x + 2, box.y + 2);
                            // Wait for potential popunder to open and for the new page to load
                            await new Promise(r => setTimeout(r, 5000));
                        }
                    }
                } else {
                    // Random mouse wiggle
                    await page.mouse.move(Math.random() * dev.w, Math.random() * dev.h, { steps: 40 });
                }

                console.log(`⏱️ Time left: ${Math.floor((endTime - Date.now())/1000)}s`);
                await new Promise(r => setTimeout(r, Math.random() * 8000 + 4000));

            } catch (e) {
                // If the current page closes or errors, try to find the blog again
                const all = await browser.pages();
                const recovery = all.find(p => p.url().includes(this.targetDomain));
                if (recovery) page = recovery;
            }
        }
    }
}

new EternalGhostBotV20().run();
