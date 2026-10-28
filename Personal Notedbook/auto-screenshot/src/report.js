import fs from 'node:fs';
import path from 'node:path';

import { ensureDir, log, THEME_ROOT, writeJson } from './util.js';

function table(rows, headers) {
  const head = `| ${headers.join(' | ')} |`;
  const rule = `|${headers.map(() => '---').join('|')}|`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`);
  return [head, rule, ...body].join('\n');
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

export function writeReport(config, manifest, results) {
  const reportFile = path.join(config.dataDirAbsolute, 'capture-report.json');
  writeJson(reportFile, {
    startedAt: results.startedAt,
    finishedAt: results.finishedAt,
    store: config.storeDomain,
    themeId: config.themeId,
    mode: results.mode ?? 'editor',
    totals: {
      captured: results.captured.length,
      skipped: results.skipped.length,
      settingsShown: results.captured.reduce((sum, item) => sum + (item.settingsCount ?? 0), 0),
      ...manifest.totals
    },
    captured: results.captured,
    skipped: results.skipped
  });

  const source =
    results.mode === 'render'
      ? 'Panels rendered from the theme schema (every setting, including blocks that are not placed on any template).'
      : 'Panels captured from the live Shopify Theme Editor.';

  const lines = [
    '# Screenshot index',
    '',
    `Captured ${results.captured.length} screenshot(s) on ${new Date(results.finishedAt ?? Date.now()).toISOString()}.`,
    '',
    source,
    '',
    'Full setting details (id, type, default, options, conditional visibility) live in `manifest.json`.',
    'This file only maps each image to what it shows.',
    ''
  ];

  const globals = results.captured.filter((item) => item.kind === 'global-settings');
  if (globals.length) {
    lines.push('## Global theme settings', '');
    lines.push(
      table(
        globals.map((item) => [item.group, String(item.settingsCount ?? ''), `\`${item.image}\``]),
        ['Settings group', 'Settings', 'Screenshot']
      ),
      ''
    );
  }

  const sections = results.captured.filter((item) => item.kind === 'section');
  const blocks = groupBy(
    results.captured.filter((item) => item.kind === 'block'),
    (item) => item.section
  );

  if (sections.length) {
    for (const [pageId, pageSections] of groupBy(sections, (item) => item.page)) {
      lines.push(`## Editor page: ${pageId}`, '');
      lines.push(
        table(
          pageSections.map((item) => [
            item.sectionName,
            `\`${item.section}\``,
            String(item.settingsCount ?? ''),
            `\`${item.image}\``
          ]),
          ['Section', 'Type', 'Settings', 'Screenshot']
        ),
        ''
      );

      for (const item of pageSections) {
        const sectionBlocks = blocks.get(item.section) ?? [];
        if (!sectionBlocks.length) continue;
        lines.push(`### Blocks of ${item.sectionName}`, '');
        lines.push(
          table(
            sectionBlocks.map((block) => [
              block.blockName,
              `\`${block.block}\``,
              String(block.settingsCount ?? ''),
              `\`${block.image}\``
            ]),
            ['Block', 'Type', 'Settings', 'Screenshot']
          ),
          ''
        );
      }
    }
  }

  const themeBlocks = results.captured.filter((item) => item.kind === 'theme-block');
  if (themeBlocks.length) {
    lines.push('## Theme blocks', '');
    lines.push(
      table(
        themeBlocks.map((item) => [
          item.blockName,
          `\`${item.block}\``,
          String(item.settingsCount ?? ''),
          `\`${item.image}\``
        ]),
        ['Block', 'Type', 'Settings', 'Screenshot']
      ),
      ''
    );
  }

  const storefront = results.captured.filter((item) => item.kind === 'storefront');
  if (storefront.length) {
    lines.push('## Storefront pages', '');
    lines.push(
      table(
        storefront.map((item) => [`\`${item.path}\``, `\`${item.image}\``]),
        ['Path', 'Screenshot']
      ),
      ''
    );
  }

  if (results.skipped.length) {
    lines.push('## Not captured', '');
    lines.push(
      table(
        results.skipped.map((item) => [
          item.kind,
          `\`${item.section ?? item.group ?? item.context ?? ''}\``,
          `\`${item.block ?? ''}\``,
          item.reason
        ]),
        ['Kind', 'Section / group', 'Block', 'Reason']
      ),
      ''
    );
  }

  const indexFile = path.join(config.dataDirAbsolute, 'SCREENSHOT-INDEX.md');
  ensureDir(path.dirname(indexFile));
  fs.writeFileSync(indexFile, `${lines.join('\n')}\n`);

  const settingsShown = results.captured.reduce((sum, item) => sum + (item.settingsCount ?? 0), 0);

  log.step('Summary');
  log.info(`captured : ${results.captured.length} screenshots`);
  log.info(`settings : ${settingsShown} of ${manifest.totals.settings}`);
  log.info(`skipped  : ${results.skipped.length}`);
  log.info(`images   : ${path.relative(THEME_ROOT, config.outDirAbsolute)}`);
  log.info(`report   : ${path.relative(THEME_ROOT, reportFile)}`);
  log.info(`index    : ${path.relative(THEME_ROOT, indexFile)}`);

  return { reportFile, indexFile };
}
