import os from 'node:os';
import path from 'node:path';

import { fileExists, readJson, themePath } from './util.js';

function expandHome(value) {
  if (typeof value !== 'string') return value;
  return value.startsWith('~') ? path.join(os.homedir(), value.slice(1)) : value;
}

const CONFIG_FILE = path.resolve(import.meta.dirname, '../config.json');

export const DEFAULT_CONFIG = {
  /** Either "my-store.myshopify.com" or just the store handle "my-store". */
  store: '',
  /** Numeric theme id. Get it from `shopify theme list` or the editor URL. */
  themeId: '',

  /** Only the PNGs live here, because the documentation embeds them. */
  outDir: 'Nova-IMP-Docs/screenshots',
  /**
   * Build artifacts (schema inventory, run report, image index) stay out of the
   * documentation folder so that what ships to readers is purely about the theme.
   */
  dataDir: 'scripts/auto-screenshot/data',
  authFile: 'scripts/auto-screenshot/auth/storage-state.json',
  /**
   * Shopify admin sits behind Cloudflare, which blocks headless browsers with a
   * "Just a moment…" challenge. A persistent profile keeps both the login and the
   * Cloudflare clearance, and headless is off by default for the same reason.
   */
  userDataDir: 'scripts/auto-screenshot/auth/browser-profile',
  usePersistentProfile: true,
  /** Set to "chrome" to drive an installed Google Chrome instead of bundled Chromium. */
  browserChannel: null,
  challengeTimeoutMs: 60000,

  /**
   * How the run gets an authenticated browser.
   *   "attach" — drive the real Chrome profile that is already signed in to Shopify
   *              (no separate login, no captcha) by talking to its debugging port.
   *   "own"    — launch a private browser profile and sign in once via `npm run login`.
   */
  connect: {
    mode: 'attach',
    cdpPort: 9222,
    chromeBinary: 'google-chrome-stable',
    chromeUserDataDir: '~/.config/google-chrome',
    chromeProfileDirectory: 'Default',
    /** Start Chrome with the debugging port when nothing is listening yet. */
    autoLaunch: true,
    launchTimeoutMs: 30000
  },

  headless: false,
  viewport: { width: 1500, height: 1000 },
  deviceScaleFactor: 2,
  /** Milliseconds waited after a click so the settings panel finishes rendering. */
  settleMs: 1200,
  navigationTimeoutMs: 90000,
  actionTimeoutMs: 25000,
  /** Panels taller than the viewport are captured up to this height. */
  maxPanelHeight: 9000,

  capture: {
    globalSettings: true,
    sections: true,
    blocks: true,
    addBlockPanel: false,
    storefront: false
  },

  /**
   * Handles used to build editor preview URLs. Leave a value empty to skip the
   * templates that need it.
   */
  samples: {
    productHandle: '',
    collectionHandle: '',
    pageHandle: '',
    blogHandle: '',
    articlePath: ''
  },

  /**
   * Which editor pages to visit. `templates` are matched against the manifest so
   * each section is captured on a page that actually renders it. Override this
   * list in config.json for full control.
   */
  pages: null,

  /** Extra storefront paths captured when capture.storefront is true. */
  storefrontPaths: ['/', '/collections', '/cart', '/search?q=shirt', '/blogs/news', '/pages/about-us'],

  /** Optional CSS selector overrides; each value replaces the built-in candidates. */
  selectors: {}
};

function normalizeStore(store) {
  const value = String(store || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!value) return { handle: '', domain: '' };
  const handle = value.replace(/\.myshopify\.com$/, '');
  return { handle, domain: `${handle}.myshopify.com` };
}

function defaultPages(samples) {
  const pages = [
    { id: 'home', label: 'Home page', previewPath: '/', templates: ['index'] },
    { id: 'cart', label: 'Cart', previewPath: '/cart', templates: ['cart'] },
    { id: 'search', label: 'Search', previewPath: '/search', templates: ['search'] },
    { id: 'list-collections', label: 'Collections list', previewPath: '/collections', templates: ['list-collections'] },
    { id: 'not-found', label: '404', previewPath: '/does-not-exist-404', templates: ['404'] }
  ];

  if (samples.productHandle) {
    pages.push({
      id: 'product',
      label: 'Product page',
      previewPath: `/products/${samples.productHandle}`,
      templates: ['product']
    });
  }
  if (samples.collectionHandle) {
    pages.push({
      id: 'collection',
      label: 'Collection page',
      previewPath: `/collections/${samples.collectionHandle}`,
      templates: ['collection']
    });
  }
  if (samples.pageHandle) {
    pages.push({
      id: 'page',
      label: 'Static page',
      previewPath: `/pages/${samples.pageHandle}`,
      templates: ['page']
    });
  }
  if (samples.blogHandle) {
    pages.push({
      id: 'blog',
      label: 'Blog',
      previewPath: `/blogs/${samples.blogHandle}`,
      templates: ['blog']
    });
  }
  if (samples.articlePath) {
    pages.push({
      id: 'article',
      label: 'Article',
      previewPath: samples.articlePath,
      templates: ['article']
    });
  }

  return pages;
}

function mergeDeep(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return override ?? base;
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value) ? mergeDeep(base?.[key] ?? {}, value) : value;
  }
  return result;
}

export function loadConfig(overrides = {}) {
  let config = { ...DEFAULT_CONFIG };

  if (fileExists(CONFIG_FILE)) {
    config = mergeDeep(config, readJson(CONFIG_FILE));
  }

  const fromEnv = {
    store: process.env.SHOPIFY_STORE,
    themeId: process.env.SHOPIFY_THEME_ID,
    outDir: process.env.SCREENSHOT_OUT_DIR
  };
  for (const [key, value] of Object.entries(fromEnv)) {
    if (value) config[key] = value;
  }

  config = mergeDeep(config, overrides);

  const store = normalizeStore(config.store);
  config.storeHandle = store.handle;
  config.storeDomain = store.domain;
  config.adminEditorUrl = store.handle
    ? `https://admin.shopify.com/store/${store.handle}/themes/${config.themeId}/editor`
    : '';
  config.outDirAbsolute = path.isAbsolute(config.outDir) ? config.outDir : themePath(config.outDir);
  config.dataDirAbsolute = path.isAbsolute(config.dataDir) ? config.dataDir : themePath(config.dataDir);
  config.authFileAbsolute = path.isAbsolute(config.authFile) ? config.authFile : themePath(config.authFile);
  config.userDataDirAbsolute = path.isAbsolute(config.userDataDir)
    ? config.userDataDir
    : themePath(config.userDataDir);
  config.connect.chromeUserDataDirAbsolute = expandHome(config.connect.chromeUserDataDir);
  config.resolvedPages = config.pages ?? defaultPages(config.samples);

  return config;
}

export function assertStoreConfigured(config) {
  const missing = [];
  if (!config.storeHandle) missing.push('store');
  if (!config.themeId) missing.push('themeId');
  if (missing.length) {
    throw new Error(
      `Missing config: ${missing.join(', ')}. Set them in scripts/auto-screenshot/config.json ` +
        'or via SHOPIFY_STORE / SHOPIFY_THEME_ID environment variables.'
    );
  }
}
