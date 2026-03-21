/**
 * ghost-tester-final.js
 * Modernized Device Library (No Mac) + Human Emulation
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

/* ---------- Modern 2026 Device Library ---------- */
const DEVICE_LIBRARY = [
    { name: 'iPhone 15 Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', vw: { width: 393, height: 852 } },
    { name: 'iPhone 16 Pro Max', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1', vw: { width: 440, height: 956 } },
    { name: 'Samsung S24 Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.105 Mobile Safari/537.36', vw: { width: 412, height: 915 } },
    { name: 'Google Pixel 9 Pro', ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36', vw: { width: 412, height: 892 } },
    { name: 'Windows 11 - Chrome High-End', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', vw: { width: 1920, height: 1080 } },
    { name: 'Windows 11 - Edge Workstation', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0', vw: { width: 2560, height: 1440 } },
    { name: 'iPad Pro M4', ua: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', vw: { width: 1024, height: 1366 } },
    { name: 'Linux Ubuntu - Firefox Desktop', ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0', vw: { width: 1366, height: 768 } }
];

/* ---------- Human Behavior Engine ---------- */
const HumanEngine = {
    async moveNatural(page, x, y) {
        const steps = Math.floor(Math.random() * 15) + 5;
        try { await page.mouse.move(x, y, { steps }); } catch(e) {}
    },
    async humanScroll(page) {
        const distance = Math.floor(Math.random() * 500) + 150;
        await page.evaluate((d) => window.scrollBy(0, d), distance).catch(()=>{});
        await new Promise(r => setTimeout(r, Math.random() * 800 + 400));
    },
    async microPause(type = 'normal') {
        const ms = type === 'long' ? Math.random() * 12000 + 5000 : Math.random() * 2500 + 800;
        return new Promise(r => setTimeout(r, ms));
    }
};

/* ---------- CLI & Main Bot ---------- */
function parseArgs() {
    const argv = process.argv.slice(2);
    const cfg = { target: null, referrer: null, runs: 1, forever: false, interval: 15000, headless: false, confirmOwned: false };
    for (const a of argv) {
        if (!cfg.target && !a.startsWith('--')) cfg.target = a;
        else if (!cfg.referrer && !a.startsWith('--')) cfg.referrer = a;
        else if (a.startsWith('--runs=')) cfg.runs = parseInt(a.split('=')[1]) || 1;
        else if (a === '--forever') cfg.forever = true;
        else if (a === '--confirm-owned') cfg.confirmOwned = true;
        else if (a === '--headless') cfg.headless = true;
    }
    return cfg;
}

class GhostBot {
    constructor(cfg) {
        this.cfg = cfg;
        this.targetHost = new URL(cfg.target).hostname;
    }

    async run() {
        if (!this.cfg.target || !this.cfg.confirmOwned) {
            console.error("❌ Usage: node script.js <target> <referrer> --confirm-owned");
            process.exit(1);
        }

        let count = 0;
        while (this.cfg.forever || count < this.cfg.runs) {
            count++;
            console.log(`\n🚀 Run #${count} | Device Rotation Active`);
            await this.executeSession();
            await new Promise(r => setTimeout(r, this.cfg.interval));
        }
    }

    async executeSession() {
        const device = DEVICE_LIBRARY[Math.floor(Math.random() * DEVICE_LIBRARY.length)];
        console.log(`📱 Emulating: ${device.name}`);
        
        const profileDir = path.join('/tmp', `ghost_${Date.now()}`);
        const browser = await puppeteer.launch({
            headless: this.cfg.headless,
            userDataDir: profileDir,
            args: [`--window-size=${device.vw.width},${device.vw.height}`, '--no-sandbox']
        });

        // Anti-Popunder Monitor
        browser.on('targetcreated', async (t) => {
            const p = await t.page();
            if (p && p.url() !== "about:blank" && !p.url().includes(this.targetHost) && !p.url().includes("x.com")) {
                await p.close().catch(() => {});
            }
        });

        try {
            const [page] = await browser.pages();
            await page.setUserAgent(device.ua);
            await page.setViewport(device.vw);

            // 1. Visit Referrer
            console.log(`🔗 Referrer: ${this.cfg.referrer}`);
            await page.goto(this.cfg.referrer, { waitUntil: 'networkidle2' });
            await HumanEngine.humanScroll(page);

            // 2. Sniper Click
            const elHandle = await page.evaluateHandle((h) => {
                return Array.from(document.querySelectorAll('a')).find(a => a.href.includes(h));
            }, this.targetHost);

            const element = elHandle.asElement();
            if (element) {
                const box = await element.boundingBox();
                if (box) {
                    await element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await HumanEngine.moveNatural(page, box.x + box.width/2, box.y + box.height/2);
                    await HumanEngine.microPause();
                    await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                }
            } else {
                await page.goto(this.cfg.target, { referer: this.cfg.referrer });
            }

            // 3. Engagement
            await new Promise(r => setTimeout(r, 5000));
            const pages = await browser.pages();
            const targetPage = pages.find(p => p.url().includes(this.targetHost)) || page;
            
            const end = Date.now() + (Math.random() * 60000 + 60000); // 1-2 mins
            while (Date.now() < end) {
                await HumanEngine.humanScroll(targetPage);
                if (Math.random() > 0.8) {
                    const links = await targetPage.$$(`a[href*="${this.targetHost}"]`);
                    if (links.length > 0) await links[Math.floor(Math.random()*links.length)].click().catch(()=>{});
                }
                await HumanEngine.microPause();
            }
            console.log("✅ Session Success");
        } catch (e) {
            console.error("❌ Run Error:", e.message);
        } finally {
            await browser.close();
            if (fs.existsSync(profileDir)) fs.rmSync(profileDir, { recursive: true, force: true });
        }
    }
}

const config = parseArgs();
new GhostBot(config).run();
