const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

class EternalGhostBotV18 {
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

            console.log(`🚀 Navigating to Twitter...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // --- 🛡️ BRUTE FORCE LINK FINDER ---
            let clicked = false;
            for (let attempt = 0; attempt < 15; attempt++) {
                console.log(`🔍 Attempt ${attempt + 1}: Searching for link...`);
                
                const linkHandle = await page.evaluateHandle((domain, text) => {
                    // Search strategy 1: Text content
                    const allLinks = Array.from(document.querySelectorAll('a'));
                    let found = allLinks.find(a => a.innerText.toLowerCase().includes(text.toLowerCase()) || a.href.includes(domain));
                    
                    // Search strategy 2: Twitter Cards (sometimes they have no text)
                    if (!found) {
                        const card = document.querySelector('[data-testid="card.layoutLarge.detail"]');
                        if (card) found = card.closest('a');
                    }
                    
                    // Search strategy 3: Shortened t.co links in tweet body
                    if (!found) {
                        const tweetText = document.querySelector('[data-testid="tweetText"]');
                        if (tweetText) found = tweetText.querySelector('a');
                    }
                    
                    return found;
                }, this.targetDomain, this.targetWord);

                const element = linkHandle.asElement();
                if (element) {
                    console.log("🎯 TARGET SPOTTED! Clicking...");
                    const newTabPagePromise = new Promise(resolve => browser.once('targetcreated', t => resolve(t.page())));
                    
                    await element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(r => setTimeout(r, 1500));
                    
                    // Physical Click
                    const box = await element.boundingBox();
                    await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 20 });
                    await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                    
                    const blogPage = await newTabPagePromise;
                    if (blogPage) {
                        await blogPage.bringToFront();
                        await this.multiPageEngagement(blogPage, dev);
                        clicked = true;
                        break;
                    }
                }

                // If not found, jiggle the scroll to trigger Twitter's lazy load
                await page.mouse.wheel({ deltaY: (attempt % 2 === 0 ? 400 : -200) });
                await new Promise(r => setTimeout(r, 2000));
            }

            if (!clicked) console.log("⚠️ Failed to find link. Check if tweet is loaded.");

        } catch (err) {
            console.error("❌ Error:", err.message);
        } finally {
            await browser.close();
        }
    }

    async multiPageEngagement(page, dev) {
        const totalDuration = Math.floor(Math.random() * 410000) + 10000; // 10s to 7m
        const sessionEnd = Date.now() + totalDuration;
        console.log(`💰 Session Started: ${Math.floor(totalDuration/1000)}s`);

        while (Date.now() < sessionEnd) {
            const roll = Math.random();
            if (roll < 0.4) {
                await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 600) - 200 });
            } else if (roll < 0.8) {
                // Human Randomness: Mouse shaking & Text highlighting
                await page.mouse.move(Math.random() * dev.w, Math.random() * dev.h, { steps: 50 });
                if (Math.random() > 0.5) {
                    await page.mouse.down();
                    await page.mouse.move(Math.random() * 100, 10, { relative: true });
                    await page.mouse.up();
                }
            } else {
                // CLICK MULTIPLIER: Find any internal link to refresh impressions
                const internal = await page.$$(`a[href*="${this.targetDomain}"]`);
                if (internal.length > 0) {
                    const next = internal[Math.floor(Math.random() * internal.length)];
                    await next.click().catch(() => {});
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
            await new Promise(r => setTimeout(r, Math.random() * 10000 + 5000));
        }
    }
}

new EternalGhostBotV18().run();
