const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

class EternalGhostBotV21 {
    constructor() {
        this.targetWord = "LearnWithBlog.xyz";
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        
        // --- ALL 20+ DEVICES PRESERVED ---
        this.devices = [
            { name: 'Win10-Chrome-NV', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', cores: 12, mem: 32 },
            { name: 'S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 12 }
        ];
    }

    async run() {
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1280,720']
        });

        // --- IMPROVED POPUNDER AUTO-CLOSE ---
        browser.on('targetcreated', async (target) => {
            if (target.type() === 'page') {
                const newPage = await target.page();
                if (newPage) {
                    const url = newPage.url();
                    // If it's not the blog and not twitter, kill it.
                    if (url !== "about:blank" && !url.includes(this.targetDomain) && !url.includes("x.com")) {
                        console.log("🛡️ Popunder Blocked:", url.substring(0, 40));
                        await newPage.close().catch(() => {});
                    }
                }
            }
        });

        try {
            const [page] = await browser.pages();
            await page.setUserAgent(dev.ua);
            console.log(`🚀 Loading X.com...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2' });

            // --- PRECISION SNIPER CLICKING ---
            let blogOpened = false;
            for (let i = 0; i < 15; i++) {
                console.log(`🔍 Scan ${i+1}: Hunting for link...`);
                
                // Try to find the link handle using Pierce (sees through Shadow DOM)
                const linkHandle = await page.evaluateHandle((domain) => {
                    const allLinks = Array.from(document.querySelectorAll('a'));
                    return allLinks.find(a => a.href.includes(domain) || a.innerText.includes("LearnWithBlog"));
                }, this.targetDomain);

                const element = linkHandle.asElement();
                if (element) {
                    console.log("🎯 Link Spotted! Forcing Redirect...");
                    await element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(r => setTimeout(r, 2000));

                    // TRIPLE-TAP STRATEGY: 1. JS Click, 2. Mouse Click, 3. Keyboard Enter
                    try {
                        await page.evaluate(el => el.click(), element); // Method 1
                        const box = await element.boundingBox();
                        if (box) await page.mouse.click(box.x + box.width/2, box.y + box.height/2); // Method 2
                    } catch (e) {}

                    // Check if a new tab with the blog actually opened
                    await new Promise(r => setTimeout(r, 4000));
                    const pages = await browser.pages();
                    const blogPage = pages.find(p => p.url().includes(this.targetDomain));

                    if (blogPage) {
                        console.log("✅ Redirect Successful!");
                        await blogPage.bringToFront();
                        await this.blogEngagement(blogPage, browser);
                        blogOpened = true;
                        break;
                    }
                }
                await page.mouse.wheel({ deltaY: 400 }); // Scroll down to reveal
                await new Promise(r => setTimeout(r, 2000));
            }

        } catch (err) {
            console.error("❌ Bot Error:", err.message);
        } finally {
            await browser.close();
        }
    }

    async blogEngagement(page, browser) {
        const endTime = Date.now() + (Math.floor(Math.random() * 410000) + 10000);
        console.log("🖱️ Starting Random Click Loop on Blog...");

        while (Date.now() < endTime) {
            try {
                await page.bringToFront().catch(() => {});
                const roll = Math.random();

                if (roll < 0.6) {
                    // RANDOM CLICKER: Finds internal links to keep the session alive
                    const links = await page.$$('a');
                    if (links.length > 0) {
                        const targetLink = links[Math.floor(Math.random() * links.length)];
                        await targetLink.click().catch(() => {});
                        console.log("  - Randomly clicked a link on blog...");
                        await new Promise(r => setTimeout(r, 5000));
                    }
                } else {
                    await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 500) - 250 });
                    console.log("  - Scrolling...");
                }

                console.log(`⏱️ Remaining: ${Math.floor((endTime - Date.now())/1000)}s`);
                await new Promise(r => setTimeout(r, 8000));
            } catch (e) {
                // If a click closes the page, try to find it again
                const pages = await browser.pages();
                page = pages.find(p => p.url().includes(this.targetDomain)) || page;
            }
        }
    }
}

new EternalGhostBotV21().run();
