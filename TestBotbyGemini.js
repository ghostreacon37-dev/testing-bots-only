const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

class EternalGhostBotV21 {
    constructor() {
        this.targetWord = "LearnWithBlog.xyz";
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        
        // --- ALL DEVICES PRESERVED ---
        this.devices = [
            { name: 'Win10-Chrome-NV', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', cores: 8, mem: 16 },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', platform: 'Win32', cores: 12, mem: 32 },
            { name: 'S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l', cores: 8, mem: 12 }
        ];
    }

    // --- HUMAN MOUSE MOVEMENT ENGINE PRESERVED ---
    async moveMouseHumanLike(page, targetX, targetY) {
        const steps = 15 + Math.floor(Math.random() * 10);
        for (let i = 1; i <= steps; i++) {
            const jitterX = (Math.random() - 0.5) * 5;
            const jitterY = (Math.random() - 0.5) * 5;
            await page.mouse.move(targetX + jitterX, targetY + jitterY, { steps: 1 });
            await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
        }
    }

    async run() {
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1280,720']
        });

        // --- POPUNDER AUTO-CLOSE PRESERVED ---
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
                        await this.moveMouseHumanLike(page, box.x + box.width/2, box.y + box.height/2);
                        try {
                            await page.evaluate(el => el.click(), element);
                            await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                        } catch (e) {}
                    }

                    await new Promise(r => setTimeout(r, 4000));
                    // Triggering multi-tab engagement
                    await this.multiTabEngagement(browser);
                    break;
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

    async multiTabEngagement(browser) {
        const stayDurationMs = Math.floor(Math.random() * 600000); // 0 to 10 mins
        const endTime = Date.now() + stayDurationMs;
        
        console.log(`⏳ Total Multitasking Session: ${Math.floor(stayDurationMs / 60000)}m ${Math.floor((stayDurationMs % 60000) / 1000)}s`);

        if (stayDurationMs < 5000) return;

        while (Date.now() < endTime) {
            const allPages = await browser.pages();
            // Filter only tabs that are on the target blog
            const blogTabs = allPages.filter(p => p.url().includes(this.targetDomain));

            if (blogTabs.length === 0) {
                console.log("⚠️ No active blog tabs found. Waiting...");
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            for (const activePage of blogTabs) {
                if (Date.now() > endTime) break;

                try {
                    console.log(`📱 Switching to Tab: ${activePage.url().substring(0, 30)}...`);
                    await activePage.bringToFront().catch(() => {});
                    
                    // --- INTENSE INTERACTION LOGIC ---
                    // Perform 2-5 actions per "visit" to this tab
                    const actionsPerVisit = Math.floor(Math.random() * 4) + 2; 
                    
                    for (let j = 0; j < actionsPerVisit; j++) {
                        const roll = Math.random();
                        if (roll < 0.6) {
                            // CLICKING ACTION
                            const links = await activePage.$$('a');
                            if (links.length > 0) {
                                const targetLink = links[Math.floor(Math.random() * links.length)];
                                const box = await targetLink.boundingBox();
                                if (box) {
                                    await activePage.mouse.wheel({ deltaY: box.y - 150 });
                                    await this.moveMouseHumanLike(activePage, box.x + box.width/2, box.y + box.height/2);
                                    await targetLink.click().catch(() => {});
                                    console.log("   ✅ Link Clicked in active tab");
                                }
                            }
                        } else {
                            // SCROLLING ACTION
                            const scrolls = Math.floor(Math.random() * 3) + 1;
                            for(let s=0; s<scrolls; s++) {
                                await activePage.mouse.wheel({ deltaY: Math.floor(Math.random() * 600) - 300 });
                                await new Promise(r => setTimeout(r, 800));
                            }
                            console.log("   📜 Scrolled in active tab");
                        }
                        await new Promise(r => setTimeout(r, 2000));
                    }
                } catch (e) {
                    console.log("Tab interaction failed, moving to next...");
                }
            }
            
            console.log(`⏱️ Session Time Remaining: ${Math.floor((endTime - Date.now())/1000)}s`);
            await new Promise(r => setTimeout(r, 3000)); // Pause before cycling tabs again
        }
        console.log("🏁 All tab engagements finished.");
    }
}

new EternalGhostBotV21().run();
