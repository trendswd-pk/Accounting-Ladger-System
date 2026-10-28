import path from 'node:path';

import { renderPanelHtml } from './render.js';
import { ensureDir, log, pad, slugify } from './util.js';

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

function relative(config, file) {
  return path.relative(config.outDirAbsolute, file).split(path.sep).join('/');
}

/** Groups sections by where a merchant finds them, so folders mirror the editor. */
function areaOf(section) {
  if (section.sectionGroups.length) return 'global';
  return section.templates[0] ?? 'other';
}

/**
 * A block without inline settings is either a placeholder for app/theme blocks, a
 * pointer at a file in blocks/, or simply a block that has nothing to configure.
 * Only the first two cannot be drawn.
 */
function referenceReason(type, themeBlockTypes) {
  if (type === '@app') return 'app block — its settings come from the app the merchant installs';
  if (type === '@theme') return 'accepts any theme block — those are captured under theme-blocks/';
  if (themeBlockTypes.has(type)) return `theme block "${type}" — captured under theme-blocks/`;
  return null;
}

async function shoot(page, file, { title, meta, settings }) {
  ensureDir(path.dirname(file));
  await page.setContent(renderPanelHtml({ title, meta, settings }), { waitUntil: 'load' });
  await page.locator('.panel').screenshot({ path: file, animations: 'disabled' });
  return file;
}

export async function renderAll(config, manifest, { only } = {}) {
  const { chromium } = await importPlaywright();
  const results = { startedAt: new Date().toISOString(), captured: [], skipped: [], mode: 'render' };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: config.deviceScaleFactor
  });

  try {
    if (!only || only === 'global') {
      log.step(`Global theme settings — ${manifest.globalSettings.length} group(s)`);
      let index = 1;
      for (const group of manifest.globalSettings) {
        const file = path.join(config.outDirAbsolute, 'global-settings', `${pad(index)}-${group.slug}.png`);
        await shoot(page, file, {
          title: group.name,
          meta: 'Theme settings',
          settings: group.settings
        });
        results.captured.push({
          kind: 'global-settings',
          group: group.name,
          settingsCount: group.settings.length,
          image: relative(config, file)
        });
        log.ok(relative(config, file));
        index += 1;
      }
    }

    if (only !== 'global') {
      const sections = only
        ? manifest.sections.filter((section) => section.type === only || section.slug === only)
        : manifest.sections;

      log.step(`Sections — ${sections.length}`);
      const counters = new Map();
      const themeBlockTypes = new Set(manifest.themeBlocks.map((block) => block.type));

      for (const section of sections) {
        const area = areaOf(section);
        const index = (counters.get(area) ?? 0) + 1;
        counters.set(area, index);

        const dir = path.join(
          config.outDirAbsolute,
          'sections',
          slugify(area),
          `${pad(index)}-${section.slug}`
        );

        const file = await shoot(page, path.join(dir, '00-settings.png'), {
          title: section.name,
          meta: section.type,
          settings: section.settings
        });
        results.captured.push({
          kind: 'section',
          page: area,
          section: section.type,
          sectionName: section.name,
          settingsCount: section.settings.length,
          image: relative(config, file)
        });
        log.ok(relative(config, file));

        let blockIndex = 1;
        for (const block of section.blocks) {
          const reason = block.reference ? referenceReason(block.type, themeBlockTypes) : null;
          if (reason) {
            results.skipped.push({ kind: 'block', section: section.type, block: block.type, reason });
            blockIndex += 1;
            continue;
          }

          const blockFile = await shoot(
            page,
            path.join(dir, 'blocks', `${pad(blockIndex)}-${block.slug}.png`),
            { title: block.name, meta: `${section.type} › ${block.type}`, settings: block.settings }
          );
          results.captured.push({
            kind: 'block',
            section: section.type,
            block: block.type,
            blockName: block.name,
            settingsCount: block.settings.length,
            image: relative(config, blockFile)
          });
          blockIndex += 1;
        }
      }

      if (!only && manifest.themeBlocks.length) {
        log.step(`Theme blocks — ${manifest.themeBlocks.length}`);
        let index = 1;
        for (const block of manifest.themeBlocks) {
          const file = path.join(config.outDirAbsolute, 'theme-blocks', `${pad(index)}-${block.slug}.png`);
          await shoot(page, file, {
            title: block.name,
            meta: `blocks/${block.type}.liquid`,
            settings: block.settings
          });
          results.captured.push({
            kind: 'theme-block',
            block: block.type,
            blockName: block.name,
            settingsCount: block.settings.length,
            image: relative(config, file)
          });
          log.ok(relative(config, file));
          index += 1;
        }
      }
    }
  } finally {
    results.finishedAt = new Date().toISOString();
    await browser.close();
  }

  return results;
}
