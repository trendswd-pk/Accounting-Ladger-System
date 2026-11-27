import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';

import { candidatesFor } from './selectors.js';
import { ensureDir, fileExists, log, sleep } from './util.js';

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch {
    throw new Error(
      'Playwright is not installed. Run:\n' +
        '  cd scripts/auto-screenshot && npm install && npx playwright install chromium'
    );
  }
}

/** Cloudflare fingerprints the automation flag, so it is switched off. */
const LAUNCH_ARGS = ['--disable-blink-features=AutomationControlled'];

function cdpEndpoint(port) {
  return `http://127.0.0.1:${port}`;
}

async function debuggerReady(port) {
  try {
    const response = await fetch(`${cdpEndpoint(port)}/json/version`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Chrome symlinks SingletonLock to "<host>-<pid>" while it owns a profile, which is
 * authoritative. Matching process names instead trips over crash handlers and zygote
 * leftovers that outlive a closed browser.
 * @returns {number|null} pid of the Chrome instance holding the profile
 */
/**
 * Chrome blocks --remote-debugging-port on its own default data directory
 * (security hardening since Chrome 136), so attach mode cannot work there.
 */
function isDefaultChromeDir(userDataDir) {
  const defaults = [
    path.join(os.homedir(), '.config', 'google-chrome'),
    path.join(os.homedir(), '.config', 'google-chrome-beta'),
    path.join(os.homedir(), '.config', 'chromium'),
    path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome')
  ];
  return defaults.some((dir) => path.resolve(userDataDir) === path.resolve(dir));
}

function profileOwnerPid(userDataDir) {
  try {
    const target = fs.readlinkSync(path.join(userDataDir, 'SingletonLock'));
    const pid = Number(target.slice(target.lastIndexOf('-') + 1));
    if (!Number.isInteger(pid) || pid <= 0) return null;
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

async function spawnChromeWithDebugPort(config) {
  const { spawn } = await import('node:child_process');
  const { cdpPort, chromeBinary, chromeUserDataDirAbsolute, chromeProfileDirectory } = config.connect;

  log.info(`Starting Chrome (profile “${chromeProfileDirectory}”) with debugging port ${cdpPort}`);

  const child = spawn(
    chromeBinary,
    [
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${chromeUserDataDirAbsolute}`,
      `--profile-directory=${chromeProfileDirectory}`,
      '--no-first-run',
      '--no-default-browser-check',
      ...LAUNCH_ARGS
    ],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();

  const deadline = Date.now() + config.connect.launchTimeoutMs;
  while (Date.now() < deadline) {
    await sleep(1000);
    if (await debuggerReady(cdpPort)) return true;
  }
  return false;
}

/**
 * Drives the Chrome profile the merchant already uses, so the existing Shopify
 * session is reused and no second login or captcha is needed.
 */
async function attachToChrome(config) {
  const { chromium } = await importPlaywright();
  const { cdpPort, autoLaunch, chromeProfileDirectory, chromeUserDataDirAbsolute } = config.connect;

  if (!(await debuggerReady(cdpPort)) && isDefaultChromeDir(chromeUserDataDirAbsolute)) {
    throw new Error(
      `Chrome refuses remote debugging on its default data directory (${chromeUserDataDirAbsolute}).\n` +
        '  Since Chrome 136 this is blocked for security, so the everyday profile cannot be attached to.\n' +
        '  Use a dedicated profile instead: set "connect": { "mode": "own" } in config.json and run `npm run login` once.'
    );
  }

  if (!(await debuggerReady(cdpPort))) {
    const ownerPid = profileOwnerPid(chromeUserDataDirAbsolute);

    if (ownerPid) {
      throw new Error(
        `Chrome (pid ${ownerPid}) already owns the profile without a debugging port, so its session cannot be reused.\n` +
          '  Windows may look closed while Chrome keeps running in the background.\n' +
          `  Quit it fully — "kill ${ownerPid}" — then re-run this command.`
      );
    }

    if (!autoLaunch || !(await spawnChromeWithDebugPort(config))) {
      throw new Error(
        `Chrome did not open a debugging port on ${cdpEndpoint(cdpPort)}.\n` +
          '  Start it manually with ./launch-chrome-debug.sh and try again.'
      );
    }
  }

  const browser = await chromium.connectOverCDP(cdpEndpoint(cdpPort));
  const context = browser.contexts()[0];

  if (!context) {
    throw new Error('Connected to Chrome but it has no browser context open. Open a tab and retry.');
  }

  context.setDefaultTimeout(config.actionTimeoutMs);
  context.setDefaultNavigationTimeout(config.navigationTimeoutMs);

  const page = await context.newPage();
  await page.setViewportSize(config.viewport);

  log.ok(`Attached to Chrome profile “${chromeProfileDirectory}”`);
  return { browser, context, page, hasSession: true, ownsBrowser: false };
}

export async function launch(config, { headless = config.headless } = {}) {
  if (config.connect?.mode === 'attach') return attachToChrome(config);

  const { chromium } = await importPlaywright();

  const common = {
    headless,
    args: LAUNCH_ARGS,
    ...(config.browserChannel ? { channel: config.browserChannel } : {})
  };
  const contextOptions = {
    viewport: config.viewport,
    deviceScaleFactor: config.deviceScaleFactor,
    locale: 'en-US'
  };

  let browser;
  let context;
  let hasSession;

  if (config.usePersistentProfile) {
    ensureDir(config.userDataDirAbsolute);
    hasSession = fileExists(path.join(config.userDataDirAbsolute, 'Default'));
    context = await chromium.launchPersistentContext(config.userDataDirAbsolute, {
      ...common,
      ...contextOptions
    });
    browser = context;
  } else {
    hasSession = fileExists(config.authFileAbsolute);
    browser = await chromium.launch(common);
    context = await browser.newContext({
      ...contextOptions,
      storageState: hasSession ? config.authFileAbsolute : undefined
    });
  }

  context.setDefaultTimeout(config.actionTimeoutMs);
  context.setDefaultNavigationTimeout(config.navigationTimeoutMs);

  const page = context.pages()[0] ?? (await context.newPage());
  await page.setViewportSize(config.viewport);

  return { browser, context, page, hasSession, ownsBrowser: true };
}

/**
 * Shopify admin is fronted by Cloudflare. Its interstitial resolves on its own in a
 * real (non-headless) browser, so the run simply waits it out.
 */
export async function passChallenge(page, config) {
  const isChallenge = async () => /just a moment|checking your browser/i.test(await page.title().catch(() => ''));

  if (!(await isChallenge())) return true;

  log.warn('Cloudflare challenge detected — waiting for it to clear…');
  const deadline = Date.now() + config.challengeTimeoutMs;

  while (Date.now() < deadline) {
    await sleep(2000);
    if (!(await isChallenge())) {
      log.ok('challenge cleared');
      return true;
    }
  }

  log.error(
    'Cloudflare challenge did not clear. Run with --headed, or set "browserChannel": "chrome" in config.json.'
  );
  return false;
}

export async function isLoginPage(page) {
  if (/accounts\.shopify\.com|\/(login|auth)\b/.test(page.url())) return true;
  return /^log in/i.test(await page.title().catch(() => ''));
}

/** Opens a headed browser so the store owner can sign in once; saves the session. */
export async function saveLoginSession(config) {
  const { browser, context, page } = await launch(config, { headless: false });

  const target = config.adminEditorUrl || `https://admin.shopify.com/store/${config.storeHandle}`;
  log.info(`Opening ${target}`);
  await page.goto(target, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await passChallenge(page, config);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question(
    '\nSign in to Shopify admin in the browser window.\n' +
      'When the Theme Editor is fully loaded, come back here and press Enter… '
  );
  rl.close();

  const stillLoggedOut = await isLoginPage(page);

  ensureDir(path.dirname(config.authFileAbsolute));
  await context.storageState({ path: config.authFileAbsolute });

  if (stillLoggedOut) {
    log.error('The browser is still on the Shopify login page — sign-in did not complete.');
    log.warn('Run `npm run login` again and finish the sign-in before pressing Enter.');
  } else {
    log.ok(`Signed in. Session saved to ${config.authFile}`);
    if (config.usePersistentProfile) log.ok(`Browser profile kept at ${config.userDataDir}`);
  }

  await browser.close();
}

export async function waitForIdle(page, config) {
  for (const selector of candidatesFor('loading', config)) {
    await page
      .locator(selector)
      .first()
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => {});
  }
  await sleep(config.settleMs);
}

/**
 * Captures an element in full, even when it lives inside a scroll container that
 * would normally clip everything below the fold.
 */
export async function screenshotElement(page, locator, file, config) {
  ensureDir(path.dirname(file));

  const unclip = async () =>
    locator.evaluate((root) => {
      const touched = [];
      for (const node of [root, ...root.querySelectorAll('*')]) {
        const style = getComputedStyle(node);
        if (!/(auto|scroll)/.test(style.overflowY) && !/(auto|scroll)/.test(style.overflowX)) continue;
        touched.push([node, node.getAttribute('style') ?? '']);
        node.style.overflow = 'visible';
        node.style.maxHeight = 'none';
        node.style.height = 'auto';
      }
      root.__shotRestore = touched;
    });

  const restore = async () =>
    locator
      .evaluate((root) => {
        for (const [node, style] of root.__shotRestore ?? []) {
          if (style) node.setAttribute('style', style);
          else node.removeAttribute('style');
        }
        delete root.__shotRestore;
      })
      .catch(() => {});

  await unclip();

  const box = await locator.boundingBox();
  const needed = Math.ceil((box?.height ?? 0) + 60);
  const resized = needed > config.viewport.height && needed <= config.maxPanelHeight;

  if (resized) {
    await page.setViewportSize({ width: config.viewport.width, height: needed });
    await sleep(250);
  }

  await locator.screenshot({ path: file, animations: 'disabled' });

  if (resized) await page.setViewportSize(config.viewport);
  await restore();

  return file;
}

export async function screenshotPage(page, file, config) {
  ensureDir(path.dirname(file));
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  return file;
}

/** Dumps the sidebar/panel HTML so selectors can be fixed when the admin changes. */
export async function dumpDom(page, file) {
  const fs = await import('node:fs');
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, await page.content());
  log.info(`DOM written to ${file}`);
}
