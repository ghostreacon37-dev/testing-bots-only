// human-browser-bot — config.js
// All timing parameters, humanization settings, and configuration
// for the custom redirect method. Tuned for realistic human-like behavior.

// ---------------------------------------------------------------------------
// Wait time ranges (in milliseconds)
// ---------------------------------------------------------------------------

// Step 1: Land on page, read/hesitate, then click Open
const step1WaitBeforeOpen = {
  min: 4000,
  max: 55000,
  // Skew toward shorter waits most of the time, occasional long reads
  skew: 0.6,
};

// Step 2: After Open, wait before clicking Next
const step2WaitAfterOpen = {
  min: 8000,
  max: 30000,
  skew: 0.55,
};

// Step 2 optional: Scroll down appears
const step2ScrollWait = {
  min: 3000,
  max: 9000,
  skew: 0.5,
};

// Step 3: Click Open again, reload, wait
const step3WaitAfterClick = {
  min: 2500,
  max: 12000,
  skew: 0.5,
};

// Step 3 probability - 67% chance to do extra humanizing scroll
const step3Probability = 67;

// Step 4: Click Continue and wait
const step4WaitAfterContinue = {
  min: 2500,
  max: 8000,
  skew: 0.55,
};

// Step 5: Click Go to Link and wait
const step5WaitAfterGoToLink = {
  min: 1500,
  max: 10000,
  skew: 0.5,
};

// Step 6: Click Open Link and continue browsing
const step6WaitBeforeBrowse = {
  min: 1000,
  max: 5000,
  skew: 0.45,
};

// Total browsing time at the end (3-20 seconds typical human session tail)
const finalBrowseDuration = {
  min: 3000,
  max: 20000,
  skew: 0.5,
};

// ---------------------------------------------------------------------------
// Mouse movement humanization settings
// ---------------------------------------------------------------------------

const humanization = {
  // Overshoot probability: humans sometimes move past target then correct back
  overshootProbability: 0.30,
  // Steps for curved mouse path (more steps = smoother but slower)
  minSteps: 10,
  maxSteps: 35,
  // Base speed multiplier; actual speed varies along the path
  minSpeed: 0.6,
  maxSpeed: 1.4,
  // Chance of a micro-jitter mid-move (tiny unintended twitch)
  jitterChance: 0.18,
  // Chance to pause briefly mid-move (hesitation)
  midMovePauseChance: 0.12,
  // Chance to move to element, hesitate, move slightly away, then click
  preClickHesitateChance: 0.22,
  // Chance to do a "double-take" (move away slightly then back to target)
  doubleTakeChance: 0.10,
};

// ---------------------------------------------------------------------------
// Browsing / reading behavior
// ---------------------------------------------------------------------------

const reading = {
  // Base reading speed: words per minute (humans read ~200-300 WPM)
  wpmMin: 180,
  wpmMax: 320,
  // Chance to re-read / scroll back up after scrolling down
  reReadChance: 0.20,
  // Chance to select/highlight text while reading
  textSelectionChance: 0.25,
  // Chance to switch tabs mid-session
  tabSwitchChance: 0.10,
  // Chance to blur/unfocus window briefly
  windowBlurChance: 0.08,
};

// ---------------------------------------------------------------------------
// Abandonment / early exit (humans don't always complete flows)
// ---------------------------------------------------------------------------

const abandonment = {
  // Chance to bail out at any given step (get distracted, close tab)
  perStepBailChance: 0.04,
  // Chance to abandon entirely before finishing all steps
  earlyExitChance: 0.12,
};

// ---------------------------------------------------------------------------
// Console debug mode
// ---------------------------------------------------------------------------

const debug = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Get random value from range (uniform)
const randMinMax = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Get random float in range
const randFloat = (min, max) => Math.random() * (max - min) + min;

// Get random value skewed toward min (more human-like timing distribution)
// skew: 0 = uniform, 1 = heavily weighted toward min
const randSkewed = (min, max, skew = 0.5) => {
  const u = Math.random();
  // Power curve: u^skew biases toward 0 (toward min)
  const t = Math.pow(u, skew);
  return Math.floor(min + t * (max - min));
};

// Get random probability check
const checkProbability = (percentage) => Math.random() * 100 < percentage;

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

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
    randomViewport: true,
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
    if (arg === '--no-random-viewport') {
      cfg.randomViewport = false;
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

    if (positional === 0) { cfg.target = arg; positional++; }
    else if (positional === 1) { cfg.referrer = arg; positional++; }
  }

  return cfg;
}

function usage() {
  return `
Usage: node testbot.js <target_url> <referrer_url> [options]

The bot first visits the referrer page, then follows the redirect path to target.
This mirrors a real human clicking a tracked link.

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
  --no-random-viewport   Use fixed 1366x768 viewport instead of randomizing.

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
  finalBrowseDuration,
  humanization,
  reading,
  abandonment,
  debug,
  randMinMax,
  randFloat,
  randSkewed,
  checkProbability,
  parseArgs,
  usage,
};
