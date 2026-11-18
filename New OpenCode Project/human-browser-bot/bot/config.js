// human-browser-bot — config.js
// All timing parameters, humanization settings, and configuration
// for the custom redirect method. Tuned for realistic human-like behavior.

// ---------------------------------------------------------------------------
// Wait time ranges (in milliseconds) with skew toward shorter waits
// ---------------------------------------------------------------------------

const step1WaitBeforeOpen = { min: 3000, max: 45000, skew: 0.65 };
const step2WaitAfterOpen  = { min: 6000, max: 25000, skew: 0.60 };
const step2ScrollWait     = { min: 2500, max: 8000,  skew: 0.55 };
const step3WaitAfterClick = { min: 2000, max: 10000, skew: 0.55 };
const step4WaitAfterContinue = { min: 2000, max: 7000, skew: 0.60 };
const step5WaitAfterGoToLink = { min: 1200, max: 8000, skew: 0.55 };
const step6WaitBeforeBrowse   = { min: 800,  max: 4000, skew: 0.50 };
const finalBrowseDuration     = { min: 2000, max: 12000, skew: 0.55 };

// ---------------------------------------------------------------------------
// Mouse movement humanization
// ---------------------------------------------------------------------------

const humanization = {
  overshootProbability: 0.28,
  minSteps: 10,
  maxSteps: 30,
  minSpeed: 0.7,
  maxSpeed: 1.3,
  jitterChance: 0.15,
  midMovePauseChance: 0.10,
  preClickHesitateChance: 0.20,
  doubleTakeChance: 0.08,
};

// ---------------------------------------------------------------------------
// Reading / browsing behavior
// ---------------------------------------------------------------------------

const reading = {
  wpmMin: 200,
  wpmMax: 300,
  reReadChance: 0.15,
  textSelectionChance: 0.20,
  tabSwitchChance: 0.08,
  windowBlurChance: 0.06,
};

// ---------------------------------------------------------------------------
// Abandonment (humans sometimes quit early)
// ---------------------------------------------------------------------------

const abandonment = {
  perStepBailChance: 0.03,
  earlyExitChance: 0.10,
};

// ---------------------------------------------------------------------------
// Speed presets
// ---------------------------------------------------------------------------

const SPEED_PRESETS = {
  slow:   { multiplier: 1.4, readMultiplier: 1.3 },
  normal: { multiplier: 1.0, readMultiplier: 1.0 },
  fast:   { multiplier: 0.6, readMultiplier: 0.5 },
};

// ---------------------------------------------------------------------------
// Console debug mode
// ---------------------------------------------------------------------------

const debug = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const randMinMax = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;

// Skewed toward min: skew=0.5 uniform, higher = more weight on min
const randSkewed = (min, max, skew = 0.5) => {
  const u = Math.random();
  const t = Math.pow(u, skew);
  return Math.floor(min + t * (max - min));
};

const checkProbability = (percentage) => Math.random() * 100 < percentage;
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

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
    interval: 20000,
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
    speed: 'normal',
  };

  let positional = 0;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--confirm-owned' || arg === '-c') { cfg.confirmOwned = true; continue; }
    if (arg === '--debug') { cfg.debug = true; continue; }
    if (arg === '--forever') { cfg.forever = true; continue; }
    if (arg === '--one-browser-per-tab') { cfg.oneBrowserPerTab = true; continue; }
    if (arg === '--proxy') { cfg.proxyMode = true; continue; }
    if (arg === '--proxy-rotation') { cfg.proxyRotation = true; continue; }
    if (arg === '--no-random-viewport') { cfg.randomViewport = false; continue; }

    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      const val = value !== undefined ? value : args[i + 1];
      // Only consume next arg when value is NOT inline (no = sign)
      if (value === undefined) i++;
      switch (key) {
        case 'target': cfg.target = val; break;
        case 'referrer': cfg.referrer = val; break;
        case 'runs': cfg.runs = parseInt(val, 10) || 1; break;
        case 'interval': cfg.interval = parseInt(val, 10) || 20000; break;
        case 'fixed-instances': cfg.fixedInstances = parseInt(val, 10) || null; break;
        case 'min-tabs': cfg.minTabs = parseInt(val, 10) || 1; break;
        case 'max-tabs': cfg.maxTabs = parseInt(val, 10) || 3; break;
        case 'proxy-file': cfg.proxyFile = val; cfg.proxyMode = true; break;
        case 'ua-file': cfg.uaFile = val; break;
        case 'headless': cfg.headless = val !== 'false'; break;
        case 'speed': cfg.speed = val || 'normal'; break;
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

Visits the referrer page first (human clicked a tracked link there),
then follows the redirect flow to the target.

Options:
  --confirm-owned        Required. Confirm you own or have permission to test the domain.
  --debug                Enable debug logging.
  --forever              Run indefinitely (until SIGINT/SIGTERM).
  --runs=N               Number of runs (default: 1).
  --interval=ms          Wait ms between runs (default: 20000).
  --min-tabs=N           Min tabs per run (default: 1).
  --max-tabs=N           Max tabs per run (default: 3).
  --fixed-instances=N    Fixed browser instances instead of random tabs.
  --one-browser-per-tab  Separate browser per tab (allows per-tab proxies).
  --proxy                Enable proxy mode.
  --proxy-file=file      Proxy list file (enables proxy mode).
  --proxy-rotation       Rotate proxies between runs/tabs.
  --ua-file=file         Custom user-agent profiles file.
  --headless=false       Show browser window.
  --no-random-viewport   Fixed 1366x768 viewport.
  --speed=slow|normal|fast  Execution speed preset (default: normal).

Example:
  node testbot.js https://example.com https://referrer.example.com/page --confirm-owned --debug
`;
}

module.exports = {
  step1WaitBeforeOpen,
  step2WaitAfterOpen,
  step2ScrollWait,
  step3WaitAfterClick,
  step3Probability: 67,
  step4WaitAfterContinue,
  step5WaitAfterGoToLink,
  step6WaitBeforeBrowse,
  finalBrowseDuration,
  humanization,
  reading,
  abandonment,
  SPEED_PRESETS,
  debug,
  randMinMax,
  randFloat,
  randSkewed,
  checkProbability,
  clamp,
  parseArgs,
  usage,
};
