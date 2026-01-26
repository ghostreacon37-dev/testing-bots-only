const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

class EternalGhostBotV21 {
    constructor() {
        this.targetWord = "LearnWithBlog.xyz";
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        
        this.devices = [
            { name: 'Win10-Chrome-NV', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', cores: 12, mem: 32 },
            { name: 'S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 12 }
        ];
    }

    // --- NEW: HUMAN MOUSE MOVEMENT ENGINE ---
    async moveMouseHumanLike(page, targetX, targetY) {
        const steps = 15 + Math.floor(Math.random() * 10);
        for (let i = 1; i <= steps; i++) {
            // Add slight "jitter" to the path so it's not a perfect straight line
            const jitterX = (Math.random() - 0.5) * 5;
            const jitterY = (Math.random() - 0.5) * 5;
            
            // Calculate intermediate point
            await page.mouse.move(
                targetX + jitterX, 
                targetY + jitterY, 
                { steps: 1 }
            );
            await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
        }
    }

    async run() {
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1280,720']
        });

        browser.on('targetcreated', async (target) => {
            if (target.type() === 'page') {
                const newPage = await target.page();
                if (newPage) {
                    const url = newPage.url();
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

            let blogOpened = false;
            for (let i = 0; i < 15; i++) {
                console.log(`🔍 Scan ${i+1}: Hunting for link...`);
                
                const linkHandle = await page.evaluateHandle((domain) => {
                    const allLinks = Array.from(document.querySelectorAll('a'));
                    return allLinks.find(a => a.href.includes(domain) || a.innerText.includes("LearnWithBlog"));
                }, this.targetDomain);

                const element = linkHandle.asElement();
                if (element) {
                    console.log("🎯 Link Spotted! Moving Mouse...");
                    await element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(r => setTimeout(r, 2000));

                    const box = await element.boundingBox();
                    if (box) {
                        // Move mouse to link smoothly before clicking
                        await this.moveMouseHumanLike(page, box.x + box.width/2, box.y + box.height/2);
                        
                        try {
                            await page.evaluate(el => el.click(), element);
                            await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                        } catch (e) {}
                    }

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
                await page.mouse.wheel({ deltaY: 400 });
                await new Promise(r => setTimeout(r, 2000));
            }

        } catch (err) {
            console.error("❌ Bot Error:", err.message);
        } finally {
            await browser.close();
        }
    }

    async blogEngagement(page, browser) {
        const stayDurationMs = Math.floor(Math.random() * 600000); 
        const endTime = Date.now() + stayDurationMs;
        
        console.log(`🖱️ Session Stay Time: ${Math.floor(stayDurationMs / 60000)}m ${Math.floor((stayDurationMs % 60000) / 1000)}s`);

        if (stayDurationMs < 5000) {
            console.log("⏩ Stay time too short, skipping engagement...");
            return;
        }

        while (Date.now() < endTime) {
            try {
                await page.bringToFront().catch(() => {});
                const roll = Math.random();

                if (roll < 0.7) {
                    const links = await page.$$('a');
                    if (links.length > 0) {
                        const targetLink = links[Math.floor(Math.random() * links.length)];
                        const box = await targetLink.boundingBox();
                        
                        if (box) {
                            // Smooth move to the internal link
                            await page.mouse.wheel({ deltaY: box.y - 200 });
                            await new Promise(r => setTimeout(r, 1000));
                            await this.moveMouseHumanLike(page, box.x + box.width/2, box.y + box.height/2);
                            
                            await targetLink.click().catch(() => {});
                            console.log("  - Interaction: Internal Link Clicked with Smooth Move");
                            await new Promise(r => setTimeout(r, Math.random() * 4000 + 2000));
                        }
                    }
                } else {
                    const scrollAmount = Math.floor(Math.random() * 800) - 400;
                    await page.mouse.wheel({ deltaY: scrollAmount });
                    console.log("  - Interaction: Random Scroll");
                    await new Promise(r => setTimeout(r, Math.random() * 3000 + 1000));
                }

                console.log(`⏱️ Remaining: ${Math.floor((endTime - Date.now())/1000)}s`);
            } catch (e) {
                const pages = await browser.pages();
                const foundPage = pages.find(p => p.url().includes(this.targetDomain));
                if (foundPage) {
                    page = foundPage;
                } else {
                    break;
                }
            }
        }
    }
}

new EternalGhostBotV21().run();
