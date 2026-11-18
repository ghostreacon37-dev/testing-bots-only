// human-browser-bot — config.js
// All timing parameters and configuration for the custom redirect method

// Wait time ranges (in milliseconds)
// Step 1: Go to website and wait before clicking Open
const step1WaitBeforeOpen = {
  min: 5000,   // 5 sec
  max: 60000,  // 60 sec
};

// Step 2: Wait after clicking Open before clicking Next
const step2WaitAfterOpen = {
  min: 10000,  // 10 sec
  max: 25000,  // 25 sec
};

// Step 2 optional: Scroll down appears and click
const step2ScrollWait = {
  min: 5000,   // 5 sec
  max: 10000,  // 10 sec
};

// Step 3: Click Open, reload, 67/100 probability, wait
const step3WaitAfterClick = {
  min: 3000,   // 3 sec
  max: 13000,  // 13 sec
};

// Step 3 probability - 67% chance to proceed
const step3Probability = 67; // 67 out of 100

// Step 4: Click Continue and wait
const step4WaitAfterContinue = {
  min: 3000,   // 3 sec
  max: 7000,   // 7 sec
};

// Step 5: Click Go to Link and wait
const step5WaitAfterGoToLink = {
  min: 2000,   // 2 sec
  max: 12000,  // 12 sec
};

// Step 6: Click Open Link and continue browsing
const step6WaitBeforeBrowse = {
  min: 1000,   // 1 sec (minimum)
  max: 5000,   // 5 sec
};

// Mouse movement humanization settings
const humanization = {
  // Overshoot probability (25% chance to overshoot target)
  overshootProbability: 0.25,
  // Steps for curved mouse path
  minSteps: 8,
  maxSteps: 25,
  // Speed range for mouse movement
  minSpeed: 0.7,
  maxSpeed: 1.3,
};

// Console debug mode
const debug = false;

/**
 * Parse command-line arguments for the bot.
 * Supports --key=value, --key value (boolean flags), and positional args.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    target: null,
    referrer: null,
    confirmOwned: false,
    debug: false,
    runs: 1,
    forever: false,
    interval: 30000,
    fixedInstances: null,
    minTabs: 1,
    maxTabs: 3,
    oneBrowserPerTab: false,
    proxyMode: false,
    proxyFile: null,
    proxyRotation: false,
    uaFile: null,
    headless: true,
  };

  let positional = 0;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--confirm-owned' || arg === '-c') {
      cfg.confirmOwned = true;
      continue;
    }
    if (arg === '--debug') {
      cfg.debug = true;
      continue;
    }
    if (arg === '--forever') {
      cfg.forever = true;
      continue;
    }
    if (arg === '--one-browser-per-tab') {
      cfg.oneBrowserPerTab = true;
      continue;
    }
    if (arg === '--proxy') {
      cfg.proxyMode = true;
      continue;
    }
    if (arg === '--proxy-rotation') {
      cfg.proxyRotation = true;
      continue;
    }

    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      const val = value !== undefined ? value : args[i + 1];
      switch (key) {
        case 'target': cfg.target = val; i++; break;
        case 'referrer': cfg.referrer = val; i++; break;
        case 'runs': cfg.runs = parseInt(val, 10) || 1; i++; break;
        case 'interval': cfg.interval = parseInt(val, 10) || 30000; i++; break;
        case 'fixed-instances': cfg.fixedInstances = parseInt(val, 10) || null; i++; break;
        case 'min-tabs': cfg.minTabs = parseInt(val, 10) || 1; i++; break;
        case 'max-tabs': cfg.maxTabs = parseInt(val, 10) || 3; i++; break;
        case 'proxy-file': cfg.proxyFile = val; cfg.proxyMode = true; i++; break;
        case 'ua-file': cfg.uaFile = val; i++; break;
        case 'headless': cfg.headless = val !== 'false'; i++; break;
        default:
          if (cfg.debug) console.log(`  Unknown option: --${key}`);
      }
      continue;
    }

    // Positional arguments: target then referrer
    if (positional === 0) { cfg.target = arg; positional++; }
    else if (positional === 1) { cfg.referrer = arg; positional++; }
  }

  return cfg;
}

/**
 * Build a usage/help string for the bot.
 */
function usage() {
  return `
Usage: node testbot.js <target_url> <referrer_url> [options]

Options:
  --confirm-owned        Required. Confirm you own or have permission to test the domain.
  --debug                Enable debug logging.
  --forever              Run indefinitely (until SIGINT/SIGTERM).
  --runs=N               Number of runs to perform (default: 1).
  --interval=ms          Wait ms between runs (default: 30000).
  --min-tabs=N           Min tabs per run (default: 1).
  --max-tabs=N           Max tabs per run (default: 3).
  --fixed-instances=N    Use a fixed number of browser instances instead of random tabs.
  --one-browser-per-tab  Launch a separate browser per tab (allows per-tab proxies).
  --proxy                Enable proxy mode.
  --proxy-file=file      File containing proxies (enables proxy mode).
  --proxy-rotation       Rotate proxies between runs/tabs.
  --ua-file=file         File containing custom user-agent profiles.
  --headless=false       Run with a visible browser window.

Example:
  node testbot.js https://example.com https://referrer.example.com/page --confirm-owned --debug
`;
}

// Export all config
module.exports = {
  step1WaitBeforeOpen,
  step2WaitAfterOpen,
  step2ScrollWait,
  step3WaitAfterClick,
  step3Probability,
  step4WaitAfterContinue,
  step5WaitAfterGoToLink,
  step6WaitBeforeBrowse,
  humanization,
  debug,

  // Get random value from range
  randMinMax: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

  // Get random probability check
  checkProbability: (percentage) => Math.random() * 100 < percentage,

  // CLI argument parsing
  parseArgs,
  usage,
};