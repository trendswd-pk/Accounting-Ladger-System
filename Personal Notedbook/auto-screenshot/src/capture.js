import path from 'node:path';

import {
  dumpDom,
  isLoginPage,
  launch,
  passChallenge,
  screenshotElement,
  screenshotPage,
  waitForIdle
} from './browser.js';
import { findFirstVisible, findRowByName } from './selectors.js';
import { log, pad, slugify } from './util.js';

function editorUrl(config, { previewPath, context } = {}) {
  const url = new URL(config.adminEditorUrl);
  if (previewPath) url.searchParams.set('previewPath', previewPath);
  if (context) url.searchParams.set('context', context);
  return url.toString();
}

function relative(config, file) {
  return path.relative(config.outDirAbsolute, file).split(path.sep).join('/');
}

async function openEditor(page, config, options) {
  const url = editorUrl(config, options);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await passChallenge(page, config);

  if (await isLoginPage(page)) {
    throw new Error(
      'Shopify showed the login page instead of the Theme Editor.\n' +
        '  Run `npm run login`, complete the sign-in (including any captcha), then press Enter and try again.'
    );
  }

  await waitForIdle(page, config);
  return url;
}

async function requireSidebar(page, config, results, context) {
  const sidebar = await findFirstVisible(page, 'sidebar', config, 15000);
  if (!sidebar) {
    results.skipped.push({ kind: 'sidebar', context, reason: 'sidebar not found — selectors may need updating' });
    log.warn(`sidebar not found for ${context}`);
  }
  return sidebar;
}

async function captureSelection(page, config, scope, name, file, results, meta) {
  const row = await findRowByName(scope, name, config);
  if (!row) {
    results.skipped.push({ ...meta, reason: `no sidebar row named “${name}”` });
    return null;
  }

  await row.click({ timeout: config.actionTimeoutMs }).catch(() => {});
  await waitForIdle(page, config);

  const panel = await findFirstVisible(page, 'settingsPanel', config, 10000);
  if (!panel) {
    results.skipped.push({ ...meta, reason: 'settings panel not found after selecting the row' });
    return null;
  }

  await screenshotElement(page, panel, file, config);
  results.captured.push({ ...meta, image: relative(config, file) });
  log.ok(relative(config, file));
  return { row, panel };
}

async function captureGlobalSettings(page, config, manifest, results) {
  log.step('Global theme settings');
  await openEditor(page, config, { context: 'theme' });

  const sidebar = await requireSidebar(page, config, results, 'theme settings');
  if (!sidebar) return;

  let index = 1;
  for (const group of manifest.globalSettings) {
    const file = path.join(config.outDirAbsolute, 'global-settings', `${pad(index)}-${group.slug}.png`);
    await captureSelection(page, config, sidebar, group.name, file, results, {
      kind: 'global-settings',
      group: group.name,
      settingsCount: group.settings.length
    });
    index += 1;
  }
}

async function captureBlocks(page, config, sidebar, section, sectionDir, results) {
  let index = 1;

  for (const block of section.blocks) {
    const file = path.join(sectionDir, 'blocks', `${pad(index)}-${block.slug}.png`);
    const row = await findRowByName(sidebar, block.name, config);

    if (!row) {
      results.skipped.push({
        kind: 'block',
        section: section.type,
        block: block.type,
        reason: 'block is not placed in this template, so the editor has no row for it'
      });
      index += 1;
      continue;
    }

    await row.click({ timeout: config.actionTimeoutMs }).catch(() => {});
    await waitForIdle(page, config);

    const panel = await findFirstVisible(page, 'settingsPanel', config, 10000);
    if (panel) {
      await screenshotElement(page, panel, file, config);
      results.captured.push({
        kind: 'block',
        section: section.type,
        block: block.type,
        blockName: block.name,
        settingsCount: block.settings.length,
        image: relative(config, file)
      });
      log.ok(relative(config, file));
    }
    index += 1;
  }
}

async function captureAddBlockPanel(page, config, sectionDir, section, results) {
  const button = await findFirstVisible(page, 'addBlock', config, 4000);
  if (!button) return;

  await button.click().catch(() => {});
  await waitForIdle(page, config);

  const file = path.join(sectionDir, 'available-blocks.png');
  await screenshotPage(page, file, config);
  results.captured.push({ kind: 'add-block-panel', section: section.type, image: relative(config, file) });
  await page.keyboard.press('Escape').catch(() => {});
}

async function capturePages(page, config, manifest, results, filter) {
  const done = new Set();

  for (const editorPage of config.resolvedPages) {
    const sections = manifest.sections.filter((section) => {
      if (done.has(section.type)) return false;
      if (filter && !filter(section)) return false;
      const inTemplate = section.templates.some((template) => editorPage.templates.includes(template));
      // Header/footer/quick-view groups render everywhere; capture them on the first page.
      const inGroup = section.sectionGroups.length > 0 && editorPage.id === config.resolvedPages[0].id;
      return inTemplate || inGroup;
    });

    if (!sections.length) continue;

    log.step(`${editorPage.label} — ${sections.length} section(s)`);
    await openEditor(page, config, { previewPath: editorPage.previewPath });

    const sidebar = await requireSidebar(page, config, results, editorPage.label);
    if (!sidebar) continue;

    let index = 1;
    for (const section of sections) {
      const sectionDir = path.join(
        config.outDirAbsolute,
        'sections',
        slugify(editorPage.id),
        `${pad(index)}-${section.slug}`
      );
      const selection = await captureSelection(
        page,
        config,
        sidebar,
        section.name,
        path.join(sectionDir, '00-settings.png'),
        results,
        {
          kind: 'section',
          page: editorPage.id,
          section: section.type,
          sectionName: section.name,
          settingsCount: section.settings.length
        }
      );

      if (selection) {
        done.add(section.type);
        if (config.capture.blocks && section.blocks.length) {
          await captureBlocks(page, config, sidebar, section, sectionDir, results);
        }
        if (config.capture.addBlockPanel && section.blocks.length) {
          await captureAddBlockPanel(page, config, sectionDir, section, results);
        }
      }
      index += 1;
    }
  }
}

async function captureStorefront(page, config, results) {
  log.step('Storefront pages');

  for (const storePath of config.storefrontPaths) {
    const url = new URL(storePath, `https://${config.storeDomain}`);
    url.searchParams.set('preview_theme_id', config.themeId);

    await page.goto(url.toString(), { waitUntil: 'load' }).catch(() => {});
    await waitForIdle(page, config);

    const slug = slugify(storePath === '/' ? 'home' : storePath);
    const file = path.join(config.outDirAbsolute, 'storefront', `${slug}.png`);
    await screenshotPage(page, file, config);
    results.captured.push({ kind: 'storefront', path: storePath, image: relative(config, file) });
    log.ok(relative(config, file));
  }
}

export async function captureAll(config, manifest, { only, debug } = {}) {
  const results = { startedAt: new Date().toISOString(), captured: [], skipped: [] };
  const { browser, page, hasSession, ownsBrowser } = await launch(config);

  if (!hasSession) {
    log.warn('No saved admin session found — run `npm run login` first if the editor does not load.');
  }

  const sectionFilter = only ? (section) => section.type === only || section.slug === only : null;

  try {
    if (config.capture.globalSettings && (!only || only === 'global')) {
      await captureGlobalSettings(page, config, manifest, results);
    }
    if (config.capture.sections && only !== 'global') {
      await capturePages(page, config, manifest, results, sectionFilter);
    }
    if (config.capture.storefront && !only) {
      await captureStorefront(page, config, results);
    }
    if (debug) {
      await dumpDom(page, path.join(config.dataDirAbsolute, 'debug', 'last-page.html'));
    }
  } finally {
    results.finishedAt = new Date().toISOString();
    // When attached to the merchant's own Chrome, only the tab we opened is closed.
    if (ownsBrowser) await browser.close().catch(() => {});
    else await page.close().catch(() => {});
  }

  return results;
}
