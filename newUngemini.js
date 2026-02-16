const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class EternalGhostBotV21 {
    constructor() {
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        this.lastMousePos = { x: 0, y: 0 };
        
        this.devices = [
            { name: 'Win10-Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32' },
            { name: 'S24-Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', platform: 'Linux armv8l' }
        ];
    }

    // --- NEW: HUMAN MOVEMENT ENGINE ---
    async moveMouseHumanlike(page, toX, toY, steps = 15) {
        const fromX = this.lastMousePos.x;
        const fromY = this.lastMousePos.y;
        
        // Create a random "elbow" for the curve
        const controlX = (fromX + toX) / 2 + (Math.random() * 150 - 75);
        const controlY = (fromY + toY) / 2 + (Math.random() * 150 - 75);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Quadratic Bezier formula: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
            const x = Math.floor((1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * controlX + t * t * toX);
            const y = Math.floor((1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * controlY + t * t * toY);
            
            await page.mouse.move(x, y);
            await new Promise(r => setTimeout(r, Math.random() * 15 + 5));
        }
        this.lastMousePos = { x: toX, y: toY };
    }

    async humanScroll(page, distance) {
        const steps = Math.abs(Math.floor(distance / 80));
        const direction = distance > 0 ? 1 : -1;
        for (let i = 0; i < steps; i++) {
            const scrollAmt = (Math.random() * 40 + 60) * direction;
            await page.mouse.wheel({ deltaY: scrollAmt });
            await new Promise(r => setTimeout(r, Math.random() * 150 + 50));
        }
    }

    // --- CORE LOGIC ---
    async run() {
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
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
            await page.setViewport({ width: 1280, height: 720 });
            
            console.log(`🚀 Loading X.com...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2' });

            for (let i = 0; i < 10; i++) {
                const linkHandle = await page.evaluateHandle((domain) => {
                    const allLinks = Array.from(document.querySelectorAll('a'));
                    return allLinks.find(a => a.href.includes(domain));
                }, this.targetDomain);

                const element = linkHandle.asElement();
                if (element) {
                    const box = await element.boundingBox();
                    if (box) {
                        console.log("🎯 Link Spotted! Moving mouse in curve...");
                        await this.moveMouseHumanlike(page, box.x + box.width/2, box.y + box.height/2);
                        await new Promise(r => setTimeout(r, 600)); // Hesitation pause
                        await page.mouse.down();
                        await new Promise(r => setTimeout(r, Math.random() * 50 + 30));
                        await page.mouse.up();
                    }

                    await new Promise(r => setTimeout(r, 5000));
                    const pages = await browser.pages();
                    const blogPage = pages.find(p => p.url().includes(this.targetDomain));

                    if (blogPage) {
                        console.log("✅ Redirect Successful!");
                        await this.blogEngagement(blogPage, browser);
                        break;
                    }
                }
                await this.humanScroll(page, 500);
            }
        } catch (err) {
            console.error("❌ Bot Error:", err.message);
        } finally {
            await browser.close();
        }
    }

    async blogEngagement(page, browser) {
        const endTime = Date.now() + (Math.floor(Math.random() * 120000) + 30000);
        
        while (Date.now() < endTime) {
            try {
                await page.bringToFront().catch(() => {});
                const roll = Math.random();

                if (roll < 0.5) {
                    const links = await page.$$('a');
                    if (links.length > 0) {
                        const target = links[Math.floor(Math.random() * links.length)];
                        const box = await target.boundingBox();
                        if (box) {
                            console.log("🖱️ Engaging: Curving to internal link...");
                            await this.moveMouseHumanlike(page, box.x + box.width/2, box.y + box.height/2);
                            await target.click();
                        }
                        await new Promise(r => setTimeout(r, 8000));
                    }
                } else {
                    console.log("📜 Engaging: Human scrolling...");
                    await this.humanScroll(page, Math.random() > 0.5 ? 400 : -300);
                }
                await new Promise(r => setTimeout(r, 5000));
            } catch (e) {
                const pages = await browser.pages();
                page = pages.find(p => p.url().includes(this.targetDomain)) || page;
            }
        }
    }
}

new EternalGhostBotV21().run();
