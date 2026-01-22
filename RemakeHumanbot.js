const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

class EternalGhostBotV19 {
    constructor() {
        this.targetWord = "LearnWithBlog.xyz";
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        this.userDataDir = path.join(__dirname, 'ghost_session');
        
        // --- PRESERVED 20+ DEVICE FLEET ---
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

        try {
            const [page] = await browser.pages();
            await page.setViewport({ width: dev.w, height: dev.h });
            await page.setUserAgent(dev.ua);
            await this.applyStealth(page, dev);

            console.log(`🚀 Loading X.com...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // --- 🛡️ FIXED BRUTE-FORCE LINK FINDER ---
            let clicked = false;
            for (let i = 0; i < 10; i++) {
                const link = await page.evaluateHandle((domain, text) => {
                    // Strategy 1: Find by domain in HREF (Most reliable)
                    const byHref = Array.from(document.querySelectorAll('a')).find(a => a.href.toLowerCase().includes(domain.toLowerCase()));
                    if (byHref) return byHref;

                    // Strategy 2: Find by visible text
                    const byText = Array.from(document.querySelectorAll('a')).find(a => a.innerText.toLowerCase().includes(text.toLowerCase()));
                    if (byText) return byText;

                    // Strategy 3: Find the Twitter Card Container (The image/box)
                    const card = document.querySelector('[data-testid="card.wrapper"]');
                    if (card) return card.closest('a') || card;

                    return null;
                }, this.targetDomain, this.targetWord);

                const element = link.asElement();
                if (element) {
                    console.log("🎯 Link Spied! Moving mouse to click...");
                    const newTabPagePromise = new Promise(res => browser.once('targetcreated', t => res(t.page())));
                    
                    await element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(r => setTimeout(r, 2000));
                    
                    const box = await element.boundingBox();
                    if (box) {
                        // Move mouse naturally to the center of the link/card
                        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 30 });
                        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                        
                        const blogPage = await newTabPagePromise;
                        if (blogPage) {
                            await blogPage.bringToFront();
                            console.log("✅ Blog Loaded. Starting Click Loop (0-7 min)...");
                            await this.blogEngagementLoop(blogPage, dev);
                            clicked = true;
                            break;
                        }
                    }
                }
                // Jiggle scroll to trigger lazy-loading if not found
                await page.mouse.wheel({ deltaY: (i % 2 === 0 ? 500 : -200) });
                await new Promise(r => setTimeout(r, 3000));
            }

        } catch (err) {
            console.error("❌ Session Error:", err.message);
        } finally {
            await browser.close();
        }
    }

    async blogEngagementLoop(page, dev) {
        // Range: 0 (actually 10s for safety) to 7 Minutes (420,000ms)
        const duration = Math.floor(Math.random() * 410000) + 10000;
        const endTime = Date.now() + duration;

        while (Date.now() < endTime) {
            const action = Math.random();

            if (action < 0.4) {
                // Human Scrolling
                await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 800) - 300 });
                console.log("  - Scrolling...");
            } else if (action < 0.7) {
                // Randomly Click something on your blog (IMPRESSION GENERATOR)
                const links = await page.$$('a'); 
                if (links.length > 0) {
                    const randomLink = links[Math.floor(Math.random() * links.length)];
                    const box = await randomLink.boundingBox();
                    if (box && box.y > 0 && box.y < dev.h) {
                        console.log("  - Clicking internal link for more ads...");
                        await randomLink.click().catch(() => {});
                        await new Promise(r => setTimeout(r, 5000)); // Wait for new page
                    }
                }
            } else if (action < 0.9) {
                // Highlight text (Very human behavior)
                await page.mouse.move(300, 300);
                await page.mouse.down();
                await page.mouse.move(500, 310, { steps: 20 });
                await page.mouse.up();
                console.log("  - Highlighting text...");
            }

            // Random delay between actions (5 to 15 seconds)
            await new Promise(r => setTimeout(r, Math.random() * 10000 + 5000));
            console.log(`⏱️ Remaining: ${Math.floor((endTime - Date.now())/1000)}s`);
        }
    }
}

new EternalGhostBotV19().run();
