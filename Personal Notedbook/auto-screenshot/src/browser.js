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
 * Expands scroll containers so tall panels are not clipped mid-page.
 * Returns a restore() callback.
 */
async function unclipScrollAncestors(locator) {
  await locator.evaluate((root) => {
    const touched = [];
    const visit = (node) => {
      if (!node || node.nodeType !== 1) return;
      const style = getComputedStyle(node);
      if (/(auto|scroll|hidden)/.test(style.overflowY) || /(auto|scroll|hidden)/.test(style.overflowX)) {
        touched.push([node, node.getAttribute('style') ?? '']);
        node.style.setProperty('overflow', 'visible', 'important');
        node.style.setProperty('max-height', 'none', 'important');
        node.style.setProperty('height', 'auto', 'important');
      }
    };
    let cur = root;
    while (cur) {
      visit(cur);
      cur = cur.parentElement;
    }
    for (const node of root.querySelectorAll('*')) visit(node);
    root.__shotRestore = touched;
  });

  return async () =>
    locator
      .evaluate((root) => {
        for (const [node, style] of root.__shotRestore ?? []) {
          if (style) node.setAttribute('style', style);
          else node.removeAttribute('style');
        }
        delete root.__shotRestore;
      })
      .catch(() => {});
}

async function elementFullSize(locator) {
  return locator.evaluate((root) => {
    const rect = root.getBoundingClientRect();
    const height = Math.ceil(
      Math.max(root.scrollHeight, root.offsetHeight, root.clientHeight, rect.height)
    );
    const width = Math.ceil(
      Math.max(root.scrollWidth, root.offsetWidth, root.clientWidth, rect.width)
    );
    return { width, height };
  });
}

/**
 * Scroll the document over a fully-expanded element and stitch viewport clips
 * into one PNG. Used only when height exceeds maxPanelHeight (Playwright would
 * otherwise clip to the viewport = half-page shots).
 */
async function screenshotElementStitched(page, locator, file, config, size) {
  const sharp = (await import('sharp')).default;
  const vpH = Math.min(Math.max(config.viewport.height, 800), 1400);
  const vpW = Math.max(config.viewport.width, Math.min(size.width + 40, 2400));
  await page.setViewportSize({ width: vpW, height: vpH });
  await sleep(150);

  const origin = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      absTop: r.top + window.scrollY,
      absLeft: r.left + window.scrollX,
      width: Math.ceil(Math.max(el.scrollWidth, r.width)),
      height: Math.ceil(Math.max(el.scrollHeight, r.height))
    };
  });

  const strips = [];
  let captured = 0;

  while (captured < origin.height) {
    const scrollY = Math.floor(origin.absTop + captured);
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await sleep(100);

    const clip = await page.evaluate(
      ({ absLeft, absTop, width, height, captured: already }) => {
        const topInVp = absTop + already - window.scrollY;
        const leftInVp = absLeft - window.scrollX;
        const y = Math.max(0, Math.floor(topInVp));
        const x = Math.max(0, Math.floor(leftInVp));
        const take = Math.min(
          Math.floor(window.innerHeight - y),
          Math.ceil(height - already)
        );
        return {
          x,
          y,
          width: Math.min(Math.ceil(width), Math.floor(window.innerWidth - x)),
          height: Math.max(1, take)
        };
      },
      { ...origin, captured }
    );

    if (clip.width < 1 || clip.height < 1) break;

    const buf = await page.screenshot({
      clip,
      animations: 'disabled',
      type: 'png'
    });
    strips.push(Buffer.from(buf));
    captured += clip.height;
    if (strips.length > 60) break;
  }

  if (strips.length === 0) {
    await locator.screenshot({ path: file, animations: 'disabled' });
    return file;
  }
  if (strips.length === 1) {
    fs.writeFileSync(file, strips[0]);
    return file;
  }

  const metas = await Promise.all(strips.map((b) => sharp(b).metadata()));
  const width = Math.max(...metas.map((m) => m.width || 0));
  let offset = 0;
  const composites = [];

  for (let i = 0; i < strips.length; i++) {
    const h = metas[i].height || 0;
    composites.push({ input: strips[i], top: offset, left: 0 });
    offset += h;
  }

  await sharp({
    create: {
      width,
      height: Math.max(offset, 1),
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite(composites)
    .png()
    .toFile(file);

  return file;
}

/**
 * Captures an element in full (never a half-viewport crop).
 * Grows the viewport to the content height, or scroll-stitches when too tall.
 */
export async function screenshotElement(page, locator, file, config) {
  ensureDir(path.dirname(file));

  const restore = await unclipScrollAncestors(locator);
  await locator.evaluate((el) => el.scrollIntoView({ block: 'start', inline: 'nearest' }));
  await sleep(150);

  const size = await elementFullSize(locator);
  const pad = 80;
  const neededH = Math.ceil(size.height + pad);
  const neededW = Math.max(config.viewport.width, Math.min(size.width + 40, 2400));
  const maxH = config.maxPanelHeight ?? 16000;
  const prev = (await page.viewportSize()) ?? { ...config.viewport };

  try {
    if (neededH <= maxH) {
      // Single shot: viewport tall enough that Playwright will not clip the panel.
      await page.setViewportSize({
        width: neededW,
        height: Math.max(neededH, config.viewport.height)
      });
      await sleep(280);
      await locator.evaluate((el) => el.scrollIntoView({ block: 'start', inline: 'nearest' }));
      await sleep(80);
      await locator.screenshot({ path: file, animations: 'disabled' });
    } else {
      await screenshotElementStitched(page, locator, file, config, size);
    }
  } finally {
    if (prev) await page.setViewportSize(prev).catch(() => {});
    await restore();
  }

  return file;
}

/**
 * Full document screenshot — expands nested scroll areas first so Playwright’s
 * fullPage stitch covers the whole content (not just the first overflow pane).
 */
export async function screenshotPage(page, file, config) {
  ensureDir(path.dirname(file));

  const prev = await page.viewportSize();

  await page.evaluate(() => {
    const touched = [];
    for (const node of document.querySelectorAll('html, body, body *')) {
      const style = getComputedStyle(node);
      if (!/(auto|scroll|hidden)/.test(style.overflowY) && !/(auto|scroll|hidden)/.test(style.overflowX)) {
        continue;
      }
      // Keep html/body scrollable for Playwright fullPage stitching; unclip nested panes.
      if (node === document.documentElement || node === document.body) continue;
      touched.push([node, node.getAttribute('style') ?? '']);
      node.style.setProperty('overflow', 'visible', 'important');
      node.style.setProperty('max-height', 'none', 'important');
      node.style.setProperty('height', 'auto', 'important');
    }
    document.documentElement.__shotPageRestore = touched;
    window.scrollTo(0, 0);
  });

  try {
    await sleep(250);
    // Playwright scrolls + stitches the document — never a half-viewport crop.
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  } finally {
    await page
      .evaluate(() => {
        for (const [node, style] of document.documentElement.__shotPageRestore ?? []) {
          if (style) node.setAttribute('style', style);
          else node.removeAttribute('style');
        }
        delete document.documentElement.__shotPageRestore;
      })
      .catch(() => {});
    if (prev) await page.setViewportSize(prev).catch(() => {});
  }

  return file;
}

/** Dumps the sidebar/panel HTML so selectors can be fixed when the admin changes. */
export async function dumpDom(page, file) {
  const fs = await import('node:fs');
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, await page.content());
  log.info(`DOM written to ${file}`);
}
