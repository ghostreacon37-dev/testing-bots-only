const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createCursor } = require('ghost-cursor'); // Required: npm install ghost-cursor
const path = require('path');

puppeteer.use(StealthPlugin());

class EternalGhostV14 {
    constructor() {
        this.targetWord = "LearnWithBlog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
    }

    async run() {
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--window-size=1920,1080', '--disable-blink-features=AutomationControlled']
        });

        try {
            const [page] = await browser.pages();
            const cursor = createCursor(page); // Initialize Human Mouse
            await page.setViewport({ width: 1280, height: 800 });

            console.log("🌐 Loading Referrer...");
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2' });

            // 1. HUMAN SCANNING: Scroll up and down randomly before clicking
            await this.humanScroll(page);

            // 2. FIND & CLICK: Hunting for the text
            const linkHandle = await page.evaluateHandle((text) => {
                const anchors = Array.from(document.querySelectorAll('a'));
                return anchors.find(a => a.innerText.toLowerCase().includes(text.toLowerCase()));
            }, this.targetWord);

            if (linkHandle.asElement()) {
                console.log("🎯 Link Found. Moving mouse like a human...");
                
                // Wait for new tab
                const newTabPagePromise = new Promise(res => browser.once('targetcreated', t => res(t.page())));

                // Ghost-Cursor move and click (curved path, non-linear)
                await cursor.click(linkHandle);

                const blogPage = await newTabPagePromise;
                if (blogPage) {
                    await blogPage.bringToFront();
                    const blogCursor = createCursor(blogPage);
                    await this.engageOnBlog(blogPage, blogCursor);
                }
            } else {
                console.log("❌ Text not found. Try increasing scroll range.");
            }

        } catch (e) {
            console.error("Session Error:", e.message);
        }
    }

    async humanScroll(page) {
        for (let i = 0; i < 3; i++) {
            const scrollAmt = Math.floor(Math.random() * 400) + 200;
            await page.mouse.wheel({ deltaY: scrollAmt });
            await new Promise(r => setTimeout(r, Math.random() * 2000 + 1000));
        }
    }

    async engageOnBlog(page, cursor) {
        console.log("💰 Engagement Started. Performing random human tasks...");
        const endTime = Date.now() + (Math.random() * 60000 + 180000); // 3-4 Minutes

        while (Date.now() < endTime) {
            const action = Math.floor(Math.random() * 4);

            switch(action) {
                case 0: // Random Curved Mouse Move
                    console.log("  - Moving mouse aimlessly...");
                    await cursor.moveTo({ 
                        x: Math.random() * 800, 
                        y: Math.random() * 600 
                    });
                    break;
                
                case 1: // Randomized Jerky Scroll
                    console.log("  - Scrolling to read...");
                    await page.mouse.wheel({ deltaY: (Math.random() * 600) - 200 });
                    break;

                case 2: // Text Selection (Highly human behavior)
                    console.log("  - Highlighting text...");
                    const paragraphs = await page.$$('p');
                    if (paragraphs.length > 0) {
                        const p = paragraphs[Math.floor(Math.random() * paragraphs.length)];
                        await cursor.move(p);
                        await page.mouse.down();
                        await cursor.moveTo({ x: Math.random() * 100, y: 10 }, { relative: true });
                        await page.mouse.up();
                    }
                    break;

                case 3: // Idle/Thinking time
                    console.log("  - Idle (Thinking)...");
                    await new Promise(r => setTimeout(r, Math.random() * 15000 + 5000));
                    break;
            }

            // Short pause between actions
            await new Promise(r => setTimeout(r, Math.random() * 5000 + 2000));
        }
        console.log("🏁 Session complete.");
    }
}

new EternalGhostV14().run();
