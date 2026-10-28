#!/usr/bin/env node
import path from 'node:path';

import { saveLoginSession } from './browser.js';
import { captureAll } from './capture.js';
import { reportChangelog } from './changelog.js';
import { assertStoreConfigured, loadConfig } from './config.js';
import { generateDocs } from './docs.js';
import { buildManifest } from './manifest.js';
import { optimizeScreenshots } from './optimize.js';
import { renderAll } from './render-capture.js';
import { writeReport } from './report.js';
import { serveDocs } from './serve.js';
import { log, writeJson } from './util.js';

const USAGE = `
Nova-IMP auto-screenshot

Usage
  node src/cli.js <command> [options]

Commands
  manifest    Read every schema in the theme and write manifest.json (works offline)
  render      Draw every settings panel from the schema and screenshot it (no login)
  docs        Build the settings reference in Nova-IMP-Docs from manifest + screenshots
  optimize    Shrink the screenshot PNGs in place (runs automatically after render)
  changelog   Compare the theme schema with the last commit and draft a CHANGELOG entry
  serve       Open the documentation in a browser at http://localhost:4000
  login       Open a browser, sign in to Shopify admin once, save the session
  capture     Walk the live Theme Editor and screenshot every settings panel
  help        Show this message

Options
  --only=<type>     Capture a single section type, or "global" for theme settings only
  --no-optimize     Keep the raw, larger PNGs after a render
  --port=<number>   Port for the docs server (default 4000)
  --headed          Run with a visible browser (default; Cloudflare blocks headless)
  --headless        Force headless — usually stopped by Shopify's Cloudflare check
  --debug           Also dump the last page's HTML so selectors can be inspected
  --storefront      Include storefront page screenshots
  --no-blocks       Skip block-level screenshots
  --out=<dir>       Override the output directory
  --store=<store>   Store handle or my-store.myshopify.com
  --theme=<id>      Theme id
`;

function parseArgs(argv) {
  const args = { command: argv[0] ?? 'help', flags: {} };
  for (const arg of argv.slice(1)) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    args.flags[key] = value === undefined ? true : value;
  }
  return args;
}

function overridesFrom(flags) {
  const overrides = {};
  if (flags.out) overrides.outDir = flags.out;
  if (flags.store) overrides.store = flags.store;
  if (flags.theme) overrides.themeId = flags.theme;
  if (flags.headed) overrides.headless = false;
  if (flags.headless) overrides.headless = true;
  if (flags.chrome) overrides.browserChannel = 'chrome';
  if (flags.storefront) overrides.capture = { ...(overrides.capture ?? {}), storefront: true };
  if (flags['no-blocks']) overrides.capture = { ...(overrides.capture ?? {}), blocks: false };
  return overrides;
}

async function runManifest(config) {
  const manifest = buildManifest();
  const file = path.join(config.dataDirAbsolute, 'manifest.json');
  writeJson(file, manifest);

  log.step('Theme manifest');
  for (const [key, value] of Object.entries(manifest.totals)) {
    log.info(`${key.padEnd(20)} ${value}`);
  }
  log.ok(`written to ${path.relative(process.cwd(), file)}`);
  return manifest;
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const config = loadConfig(overridesFrom(flags));

  switch (command) {
    case 'manifest':
      await runManifest(config);
      break;

    case 'render': {
      const manifest = await runManifest(config);
      const results = await renderAll(config, manifest, {
        only: typeof flags.only === 'string' ? flags.only : undefined
      });
      writeReport(config, manifest, results);
      if (!flags['no-optimize']) await optimizeScreenshots(config);
      break;
    }

    case 'optimize':
      await optimizeScreenshots(config);
      break;

    case 'changelog':
      reportChangelog(config);
      break;

    case 'serve':
      serveDocs({ port: flags.port ? Number(flags.port) : 4000 });
      break;

    case 'docs': {
      const totals = generateDocs(config);
      log.step('Summary');
      for (const [key, value] of Object.entries(totals)) {
        log.info(`${key.padEnd(20)} ${value}`);
      }
      break;
    }

    case 'login':
      assertStoreConfigured(config);
      await saveLoginSession(config);
      break;

    case 'capture': {
      assertStoreConfigured(config);
      const manifest = await runManifest(config);
      const results = await captureAll(config, manifest, {
        only: typeof flags.only === 'string' ? flags.only : undefined,
        debug: Boolean(flags.debug)
      });
      writeReport(config, manifest, results);
      break;
    }

    default:
      console.log(USAGE);
  }
}

main().catch((error) => {
  log.error(error.message);
  process.exitCode = 1;
});
