const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

class EternalGhostBot {
    constructor() {
        this.targetWord = "LearnWithBlog.xyz"; 
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        this.userDataDir = path.join(__dirname, 'ghost_session');
    }

    async run() {
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });

        try {
            const [page] = await browser.pages();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

            console.log(`🚀 Navigating to Twitter...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // --- 🎯 THE TEXT HUNTER LOGIC ---
            console.log(`🔍 Hunting for the word: "${this.targetWord}"`);
            let linkFound = false;

            for (let attempt = 0; attempt < 20; attempt++) {
                // Find element by text content (Case Insensitive)
                const targetHandle = await page.evaluateHandle((textToFind) => {
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null, false);
                    let node;
                    while(node = walker.nextNode()) {
                        // Check if the element contains our text and is a link or inside one
                        if (node.innerText && node.innerText.toLowerCase().includes(textToFind.toLowerCase())) {
                            const link = node.closest('a');
                            if (link) return link;
                        }
                    }
                    return null;
                }, this.targetWord);

                const element = targetHandle.asElement();
                if (element) {
                    console.log("✅ Word found! Clicking now...");
                    
                    // Setup new tab listener before clicking
                    const newTabPagePromise = new Promise(resolve => browser.once('targetcreated', target => resolve(target.page())));

                    // Scroll it into center and click
                    await element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(r => setTimeout(r, 1000));
                    await element.click();

                    // Wait for the new tab to open
                    const blogPage = await newTabPagePromise;
                    if (blogPage) {
                        await blogPage.bringToFront();
                        console.log("🚀 Switched to: " + await blogPage.title());
                        await this.doHumanBehavior(blogPage);
                        linkFound = true;
                        break;
                    }
                }

                // If not found, scroll down to load more content
                await page.mouse.wheel({ deltaY: 300 });
                console.log(`   Attempt ${attempt + 1}: Word not visible yet, scrolling...`);
                await new Promise(r => setTimeout(r, 2000));
            }

            if (!linkFound) console.error("❌ Could not find the link after 20 attempts.");

        } catch (err) {
            console.error("❌ Error:", err.message);
        }
    }

    async doHumanBehavior(page) {
        console.log("💰 Simulating Reading on Blog...");
        // Stay for 2 minutes to satisfy AdSense/Pop-under requirements
        for (let i = 0; i < 12; i++) {
            await page.mouse.wheel({ deltaY: Math.random() * 400 });
            await new Promise(r => setTimeout(r, 10000));
            console.log(`   Dwell time: ${ (i+1) * 10 }s`);
        }
    }
}

new EternalGhostBot().run();
