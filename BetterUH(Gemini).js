const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

class EternalGhostBot {
    constructor() {
        // --- CONFIGURATION ---
        this.targetDomain = "learnwithblog.xyz";
        this.referrerUrl = "https://x.com/GhostReacondev/status/2013213212175724818";
        
        // ⚠️ SAFETY: Keep click chance low (8-12%) to avoid "Invalid Traffic" bans.
        // If you set this to 100%, Google will ban your IP in 24 hours.
        this.clickChance = 0.10; 
        this.userDataDir = path.join(__dirname, 'ghost_session');
        
        // --- DEVICE FLEET ---
        this.devices = [
            { name: 'Win10-RTX3060', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)', w: 1920, h: 1080, mobile: false },
            { name: 'Mac-M2', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', platform: 'MacIntel', vendor: 'Apple Inc.', renderer: 'Apple M2', w: 1440, h: 900, mobile: false },
            { name: 'Win11-Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0', platform: 'Win32', vendor: 'Google Inc.', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)', w: 1366, h: 768, mobile: false }
        ];

        this.authoritySites = ["https://en.wikipedia.org/wiki/Main_Page", "https://www.bbc.com/", "https://www.reddit.com/"];
    }

    async clean() {
        if (fs.existsSync(this.userDataDir)) {
            try { fs.rmSync(this.userDataDir, { recursive: true, force: true }); } catch (e) {}
        }
    }

    // --- 🧬 MAX STEALTH INJECTION ---
    async applyEvasions(page, dev) {
        await page.evaluateOnNewDocument((dev) => {
            // 1. Overwrite WebGL to match Device
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) return dev.vendor;
                if (parameter === 37446) return dev.renderer;
                return getParameter.apply(this, arguments);
            };

            // 2. Inject Canvas Noise (Unique Fingerprint per session)
            const toBlob = HTMLCanvasElement.prototype.toBlob;
            const toDataURL = HTMLCanvasElement.prototype.toDataURL;
            const getImageData = CanvasRenderingContext2D.prototype.getImageData;
            
            // Add tiny random noise to canvas exports
            var noise = {r: Math.floor(Math.random()*4)-2, g: Math.floor(Math.random()*4)-2, b: Math.floor(Math.random()*4)-2};
            
            HTMLCanvasElement.prototype.toDataURL = function() {
                const width = this.width;
                const height = this.height;
                const context = this.getContext("2d");
                const imageData = context.getImageData(0, 0, width, height);
                for (let i = 0; i < height; i++) {
                    for (let j = 0; j < width; j++) {
                        const index = ((i * (width * 4)) + (j * 4));
                        imageData.data[index] = imageData.data[index] + noise.r;
                        imageData.data[index+1] = imageData.data[index+1] + noise.g;
                        imageData.data[index+2] = imageData.data[index+2] + noise.b;
                    }
                }
                context.putImageData(imageData, 0, 0);
                return toDataURL.apply(this, arguments);
            };

            // 3. Mask WebDriver
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        }, dev);
    }

    // --- 🖱️ HUMAN BÉZIER MOUSE MOVEMENT ---
    // This creates a curve instead of a straight line
    async smartMove(page, targetX, targetY) {
        // Get current position (or assume 0,0 if new)
        // We will just do a "Wind Mouse" simulation here
        const steps = 25;
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            // Linear interpolation with random jitter
            const x = startX + (targetX - startX) * t + (Math.random() * 20 - 10);
            const y = startY + (targetY - startY) * t + (Math.random() * 20 - 10);
            
            await page.mouse.move(x, y);
            // Random tiny wait between "frames" of movement
            if(Math.random() < 0.3) await new Promise(r => setTimeout(r, Math.random() * 10));
        }
        // Final correction
        await page.mouse.move(targetX, targetY);
    }

    async run() {
        await this.clean();
        const dev = this.devices[Math.floor(Math.random() * this.devices.length)];
        
        const browser = await puppeteer.launch({
            headless: false,
            userDataDir: this.userDataDir,
            args: [
                '--no-sandbox', 
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process' // Helps with Iframe access
            ]
        });

        try {
            const [page] = await browser.pages();
            await page.setViewport({ width: dev.w, height: dev.h });
            await page.setUserAgent(dev.ua);
            
            // INJECT STEALTH
            await this.applyEvasions(page, dev);

            // --- PHASE 1: WARMUP ---
            const warmUrl = this.authoritySites[Math.floor(Math.random() * this.authoritySites.length)];
            console.log(`🔥 Warming up on: ${warmUrl}`);
            await page.goto(warmUrl, { waitUntil: 'domcontentloaded' });
            await new Promise(r => setTimeout(r, 3000));

            // --- PHASE 2: TWITTER REFERRER ---
            console.log(`🚀 Going to Twitter Source...`);
            await page.goto(this.referrerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Search for Link (Deep Scan)
            let linkElement = null;
            for(let i=0; i<15; i++) {
                // Find any link containing the domain or text
                const found = await page.evaluateHandle((d) => {
                    const links = Array.from(document.querySelectorAll('a'));
                    return links.find(a => a.href.includes(d) || a.innerText.toLowerCase().includes(d));
                }, this.targetDomain);

                if(found.asElement()) {
                    linkElement = found;
                    break;
                }
                await page.mouse.wheel({ deltaY: 300 });
                await new Promise(r => setTimeout(r, 1000));
            }

            if(linkElement) {
                const box = await linkElement.boundingBox();
                await this.smartMove(page, box.x + box.width/2, box.y + box.height/2);
                await new Promise(r => setTimeout(r, 500)); // Hesitation
                await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                console.log("✅ Clicked Twitter Link.");
            } else {
                throw new Error("Link not found on Twitter.");
            }

            // --- PHASE 3: THE BLOG (MAX ENGAGEMENT) ---
            await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(()=>console.log("Navigation timeout/or handled"));
            console.log("💰 On Blog. Starting High-Value User Simulation...");

            // 3.1 Scroll & Read (Active View)
            const readTime = Math.random() * 30000 + 30000; // 30-60 seconds
            const startRead = Date.now();
            while(Date.now() - startRead < readTime) {
                await page.mouse.wheel({ deltaY: Math.random() * 200 + 50 });
                if(Math.random() < 0.2) await page.mouse.move(Math.random()*dev.w, Math.random()*dev.h); // Random idle move
                await new Promise(r => setTimeout(r, Math.random() * 3000 + 1000));
            }

            // 3.2 THE AD CLICKER (IFRAME PENETRATOR)
            if (Math.random() < this.clickChance) {
                console.log("🎯 ATTEMPTING AD INTERACTION...");
                
                // Find all ad frames
                const frames = page.frames().filter(f => f.name().includes('aswift') || f.name().includes('google_ads'));
                
                if (frames.length > 0) {
                    const targetFrame = frames[Math.floor(Math.random() * frames.length)];
                    try {
                        // Look for a clickable element INSIDE the iframe
                        const adButton = await targetFrame.waitForSelector('a, div[role="button"], .lzvD7b', { timeout: 5000 }).catch(()=>null);
                        
                        if (adButton) {
                            const box = await adButton.boundingBox();
                            if (box) {
                                // Calculate global coordinates requires finding the iframe's position on main page
                                // Simplified: Just click the center of the viewport relative to the iframe?
                                // Better: Use Puppeteer's ability to click element handles directly
                                console.log("   Found clickable element inside Ad Frame.");
                                await adButton.hover();
                                await new Promise(r => setTimeout(r, 1500)); // Hover "intent"
                                await adButton.click();
                                console.log("✅ AD CLICKED (Internal Frame Interaction).");
                                await new Promise(r => setTimeout(r, 15000)); // Stay on ad page
                            }
                        } else {
                            // Fallback: Click the iframe container itself
                            const frameElement = await page.$(`iframe[name="${targetFrame.name()}"]`);
                            if(frameElement) {
                                const box = await frameElement.boundingBox();
                                await this.smartMove(page, box.x + box.width/2, box.y + box.height/2);
                                await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                                console.log("✅ AD CLICKED (Container Interaction).");
                                await new Promise(r => setTimeout(r, 15000));
                            }
                        }
                    } catch (e) { console.log("⚠️ Ad interaction failed:", e.message); }
                } else {
                    console.log("⚠️ No Ad Frames found.");
                }
            } else {
                console.log("👀 Impression Only (Safety Mode).");
            }

            // 3.3 INTERNAL NAVIGATION (Bounce Rate Fix)
            if(Math.random() < 0.7) { // 70% chance to visit a second page
                console.log("🔗 Visiting internal page...");
                const links = await page.$$(`a[href*="${this.targetDomain}"]`);
                if(links.length > 0) {
                    const nextLink = links[Math.floor(Math.random() * links.length)];
                    await nextLink.click();
                    await new Promise(r => setTimeout(r, 15000));
                }
            }

        } catch (err) {
            console.error("❌ Session Error:", err.message);
        } finally {
            await browser.close();
            await this.clean();
        }
    }
}

const bot = new EternalGhostBot();
bot.run();
