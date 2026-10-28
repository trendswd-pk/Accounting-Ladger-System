import fs from 'node:fs';
import path from 'node:path';

import { ensureDir, fileExists, log, pad, readJson, slugify, themePath } from './util.js';

const MARK_START = '<!-- BEGIN GENERATED: theme-editor -->';
const MARK_END = '<!-- END GENERATED: theme-editor -->';

const DOCS_DIR = themePath('Nova-IMP-Docs');
const REFERENCE_DIR = path.join(DOCS_DIR, 'reference');

function writeMarkdown(file, lines) {
  const body = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s*$/, '');

  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${body}\n`);
}

function cell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function code(value) {
  const text = String(value ?? '').trim();
  return text ? `\`${cell(text)}\`` : '—';
}

function defaultCell(setting) {
  if (setting.default === null || setting.default === undefined || setting.default === '') return '—';
  if (typeof setting.default === 'boolean') return `\`${setting.default}\``;
  return code(setting.default);
}

/** "{{ section.settings.count_enable == true }}" reads better as "count_enable == true". */
function readableCondition(condition) {
  return String(condition)
    .replace(/^\{\{-?\s*/, '')
    .replace(/\s*-?\}\}$/, '')
    .replace(/\b(section|block)\.settings\./g, '')
    .trim();
}

/** Bare URLs render as plain text in strict markdown; angle brackets make them real links. */
function autolink(text) {
  return text.replace(/(?<![(<\w])(https?:\/\/[^\s<>)\]]+)/g, '<$1>');
}

function notes(setting) {
  const parts = [];

  if (setting.info) {
    // Shopify uses a URL-only `info` as an example value rather than as guidance.
    const isExampleUrl = /^https?:\/\/\S+$/.test(setting.info.trim());
    parts.push(isExampleUrl ? `Example: ${autolink(cell(setting.info))}` : autolink(cell(setting.info)));
  }

  if (setting.limit) parts.push(`Shows up to ${setting.limit} items`);

  if (setting.options?.length) {
    parts.push(`Options: ${setting.options.map((option) => cell(option.label)).join(' · ')}`);
  }

  if (setting.min !== undefined || setting.max !== undefined) {
    const unit = setting.unit ? ` ${cell(setting.unit)}` : '';
    const step = setting.step !== undefined ? `, step ${setting.step}` : '';
    parts.push(`Range ${setting.min ?? '?'}–${setting.max ?? '?'}${unit}${step}`);
  }

  if (setting.visibleIf) parts.push(`Shown when \`${readableCondition(setting.visibleIf)}\``);

  return parts.join('<br>') || '—';
}

/**
 * Shopify `header` settings visually group the panel, so they become sub-headings and
 * each group gets its own table instead of one unreadable 100-row table.
 */
function settingsMarkdown(settings, headingLevel = 2) {
  if (!settings.length) return ['_No settings._', ''];

  const hash = '#'.repeat(headingLevel);
  const lines = [];
  let openTable = false;

  const closeTable = () => {
    if (openTable) lines.push('');
    openTable = false;
  };

  const openTableIfNeeded = () => {
    if (openTable) return;
    lines.push('| Setting | ID | Type | Default | Notes |', '|---|---|---|---|---|');
    openTable = true;
  };

  for (const setting of settings) {
    if (setting.type === 'header') {
      closeTable();
      lines.push(`${hash} ${setting.label || 'Options'}`, '');
      continue;
    }

    if (setting.type === 'paragraph') {
      closeTable();
      lines.push(`> ${cell(setting.label)}`, '');
      continue;
    }

    openTableIfNeeded();
    lines.push(
      `| ${cell(setting.label) || '—'} | ${code(setting.id)} | \`${setting.type}\` | ${defaultCell(setting)} | ${notes(setting)} |`
    );
  }

  closeTable();
  return lines;
}

function imageLink(fromDir, image) {
  if (!image) return null;
  const absolute = path.join(themePath('Nova-IMP-Docs/screenshots'), image);
  return path.relative(fromDir, absolute).split(path.sep).join('/');
}

function indexImages(report) {
  const bySection = new Map();
  const byBlock = new Map();
  const byGroup = new Map();
  const byThemeBlock = new Map();

  for (const item of report?.captured ?? []) {
    if (item.kind === 'section') bySection.set(item.section, item.image);
    else if (item.kind === 'block') byBlock.set(`${item.section}::${item.block}`, item.image);
    else if (item.kind === 'global-settings') byGroup.set(item.group, item.image);
    else if (item.kind === 'theme-block') byThemeBlock.set(item.block, item.image);
  }

  return { bySection, byBlock, byGroup, byThemeBlock };
}

function writeSectionReference(section, images, manifest) {
  const dir = path.join(REFERENCE_DIR, 'sections');
  const file = path.join(dir, `${section.slug}.md`);
  const lines = [`# ${section.name}`, ''];

  const meta = [`\`${section.file}\``, `section type \`${section.type}\``];
  if (section.maxBlocks) meta.push(`max ${section.maxBlocks} blocks`);
  lines.push(meta.join(' · '), '');

  if (section.templates.length) {
    lines.push(`**Used on templates:** ${section.templates.map((t) => `\`${t}\``).join(', ')}`, '');
  }
  if (section.sectionGroups.length) {
    lines.push(`**Section groups:** ${section.sectionGroups.map((g) => `\`${g}\``).join(', ')}`, '');
  }
  if (section.presets.length) {
    lines.push(`**Presets:** ${section.presets.map((p) => cell(p)).join(', ')}`, '');
  }

  const image = imageLink(dir, images.bySection.get(section.type));
  if (image) lines.push(`![${cell(section.name)} settings](${image})`, '');

  lines.push('## Section settings', '');
  lines.push(...settingsMarkdown(section.settings, 3));

  if (section.blocks.length) {
    lines.push('## Blocks', '');

    for (const block of section.blocks) {
      const heading =
        block.type === '@app' ? 'App blocks' : block.type === '@theme' ? 'Theme blocks' : block.name;
      lines.push(`### ${heading}`, '', `Block type \`${block.type}\``, '');

      const themeBlock = manifest.themeBlocks.find((candidate) => candidate.type === block.type);
      if (themeBlock) {
        lines.push(
          `Settings come from the theme block — see [${themeBlock.name}](../theme-blocks/${themeBlock.slug}.md).`,
          ''
        );
        continue;
      }
      if (block.type === '@app') {
        lines.push('App block. Its settings are provided by the app the merchant installs.', '');
        continue;
      }
      if (block.type === '@theme') {
        lines.push('Accepts any theme block — see the theme block list in the [reference index](../00-INDEX.md).', '');
        continue;
      }

      const blockImage = imageLink(dir, images.byBlock.get(`${section.type}::${block.type}`));
      if (blockImage) lines.push(`![${cell(block.name)} settings](${blockImage})`, '');
      lines.push(...settingsMarkdown(block.settings, 4));
    }
  }

  writeMarkdown(file, lines);
  return path.relative(DOCS_DIR, file).split(path.sep).join('/');
}

function writeThemeSettingsReference(group, index, images) {
  const dir = path.join(REFERENCE_DIR, 'theme-settings');
  const file = path.join(dir, `${pad(index)}-${group.slug}.md`);
  const lines = [`# Theme settings — ${group.name}`, '', '`config/settings_schema.json`', ''];

  const image = imageLink(dir, images.byGroup.get(group.name));
  if (image) lines.push(`![${cell(group.name)} settings](${image})`, '');

  lines.push(...settingsMarkdown(group.settings));

  writeMarkdown(file, lines);
  return path.relative(DOCS_DIR, file).split(path.sep).join('/');
}

function writeThemeBlockReference(block, images) {
  const dir = path.join(REFERENCE_DIR, 'theme-blocks');
  const file = path.join(dir, `${block.slug}.md`);
  const lines = [`# ${block.name}`, '', `\`${block.file}\` · block type \`${block.type}\``, ''];

  const image = imageLink(dir, images.byThemeBlock.get(block.type));
  if (image) lines.push(`![${cell(block.name)} settings](${image})`, '');

  lines.push(...settingsMarkdown(block.settings));

  writeMarkdown(file, lines);
  return path.relative(DOCS_DIR, file).split(path.sep).join('/');
}

/** `written` holds Nova-IMP-Docs-relative paths; links inside reference/ need to drop that prefix. */
function refRelative(docsRelative) {
  return docsRelative.replace(/^reference\//, '');
}

function writeReferenceIndex(manifest, written) {
  const lines = [
    '# Settings reference',
    '',
    `Every configurable setting in the theme: ${manifest.totals.settings} settings across ` +
      `${manifest.totals.sections} sections, ${manifest.totals.themeBlocks} theme blocks and ` +
      `${manifest.totals.globalSettingGroups} theme settings groups.`,
    '',
    `Theme version dated ${String(manifest.generatedAt).slice(0, 10)}.`,
    '',
    '## Theme settings',
    '',
    '| Group | Settings |',
    '|---|---|'
  ];

  for (const group of manifest.globalSettings) {
    lines.push(
      `| [${cell(group.name)}](./${refRelative(written.groups.get(group.name))}) | ${group.settings.length} |`
    );
  }

  lines.push('', '## Sections', '', '| Section | Type | Settings | Blocks |', '|---|---|---|---|');

  for (const section of [...manifest.sections].sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(
      `| [${cell(section.name)}](./${refRelative(written.sections.get(section.type))}) | \`${section.type}\` | ` +
        `${section.settings.length} | ${section.blocks.length} |`
    );
  }

  lines.push('', '## Theme blocks (Flex PDP)', '', '| Block | Settings |', '|---|---|');

  for (const block of manifest.themeBlocks) {
    lines.push(
      `| [${cell(block.name)}](./${refRelative(written.themeBlocks.get(block.type))}) | ${block.settings.length} |`
    );
  }

  lines.push('');

  const file = path.join(REFERENCE_DIR, '00-INDEX.md');
  writeMarkdown(file, lines);
  return file;
}

function docTitle(file, fallback) {
  const heading = fs.readFileSync(file, 'utf8').match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

/**
 * Docsify reads the whole navigation from this one file, so it is rebuilt with the docs.
 * Links are root-absolute on purpose: docsify runs with `relativePath: true` so that the
 * screenshots embedded in reference pages resolve, and under that setting a bare
 * `01-global-ui.md` would be looked up inside whatever folder the reader is currently in.
 */
function writeSidebar(manifest, written, pageFiles) {
  const lines = [`- [Overview](/00-INDEX.md)`, `- [Changelog](/CHANGELOG.md)`, ''];

  lines.push('- **Page guides**');
  for (const name of pageFiles) {
    lines.push(`  - [${docTitle(path.join(DOCS_DIR, name), name)}](/${name})`);
  }

  lines.push('', '- **Settings reference**', '  - [All settings](/reference/00-INDEX.md)');

  lines.push('  - **Theme settings**');
  for (const group of manifest.globalSettings) {
    lines.push(`    - [${group.name}](/${written.groups.get(group.name)})`);
  }

  lines.push('  - **Sections**');
  for (const section of [...manifest.sections].sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`    - [${section.name}](/${written.sections.get(section.type)})`);
  }

  lines.push('  - **Theme blocks**');
  for (const block of manifest.themeBlocks) {
    lines.push(`    - [${block.name}](/${written.themeBlocks.get(block.type)})`);
  }

  writeMarkdown(path.join(DOCS_DIR, '_sidebar.md'), lines);
}

function templateKeysFromDoc(text) {
  const keys = [];
  const pattern = /\|\s*\*\*Template\*\*\s*\|\s*`templates\/([^`]+)`/g;
  let match = pattern.exec(text);
  while (match) {
    keys.push(match[1].replace(/\.(json|liquid)$/, ''));
    match = pattern.exec(text);
  }
  return keys;
}

function generatedBlockFor(sections, written, { isGlobal = false } = {}) {
  const lines = [MARK_START, '', '## Theme Editor settings', ''];

  if (!sections.length) {
    lines.push(
      'This page has no editable sections of its own. See the [settings reference](./reference/00-INDEX.md).',
      '',
      MARK_END
    );
    return lines.join('\n');
  }

  lines.push(
    'Each section below links to its full settings reference — every setting with id, type, default and a screenshot of the panel.',
    '',
    '| Section | Type | Settings | Blocks |',
    '|---|---|---|---|'
  );

  for (const section of sections) {
    lines.push(
      `| [${cell(section.name)}](./${written.sections.get(section.type)}) | \`${section.type}\` | ` +
        `${section.settings.length} | ${section.blocks.length} |`
    );
  }

  lines.push('');

  if (isGlobal) {
    lines.push('### Global theme settings', '', '| Group | Settings |', '|---|---|');
    for (const [name, file] of written.groups) {
      lines.push(`| [${cell(name)}](./${file}) | ${written.groupCounts.get(name)} |`);
    }
    lines.push('');
  }

  lines.push(`Full index: [settings reference](./reference/00-INDEX.md)`, '', MARK_END);
  return lines.join('\n');
}

function injectIntoDoc(file, block) {
  const text = fs.readFileSync(file, 'utf8');

  if (text.includes(MARK_START) && text.includes(MARK_END)) {
    const start = text.indexOf(MARK_START);
    const end = text.indexOf(MARK_END) + MARK_END.length;
    fs.writeFileSync(file, `${text.slice(0, start)}${block}${text.slice(end)}`);
    return 'updated';
  }

  const anchor = text.indexOf('## Related files');
  if (anchor !== -1) {
    fs.writeFileSync(file, `${text.slice(0, anchor)}${block}\n\n---\n\n${text.slice(anchor)}`);
  } else {
    fs.writeFileSync(file, `${text.replace(/\s*$/, '')}\n\n---\n\n${block}\n`);
  }
  return 'inserted';
}

export function generateDocs(config) {
  const manifest = readJson(path.join(config.dataDirAbsolute, 'manifest.json'));
  const reportFile = path.join(config.dataDirAbsolute, 'capture-report.json');
  const report = fileExists(reportFile) ? readJson(reportFile) : null;

  if (!report) {
    log.warn('No capture-report.json found — reference pages will be written without screenshots.');
  }

  const images = indexImages(report);
  const written = {
    sections: new Map(),
    groups: new Map(),
    groupCounts: new Map(),
    themeBlocks: new Map()
  };

  log.step('Settings reference');

  for (const section of manifest.sections) {
    written.sections.set(section.type, writeSectionReference(section, images, manifest));
  }
  log.ok(`${manifest.sections.length} section pages`);

  manifest.globalSettings.forEach((group, index) => {
    written.groups.set(group.name, writeThemeSettingsReference(group, index + 1, images));
    written.groupCounts.set(group.name, group.settings.length);
  });
  log.ok(`${manifest.globalSettings.length} theme settings pages`);

  for (const block of manifest.themeBlocks) {
    written.themeBlocks.set(block.type, writeThemeBlockReference(block, images));
  }
  log.ok(`${manifest.themeBlocks.length} theme block pages`);

  writeReferenceIndex(manifest, written);
  log.ok('reference/00-INDEX.md');

  log.step('Page docs');

  const docFiles = fs
    .readdirSync(DOCS_DIR)
    .filter((name) => /^\d\d-.*\.md$/.test(name) && name !== '00-INDEX.md')
    .sort();

  let touched = 0;

  for (const name of docFiles) {
    const file = path.join(DOCS_DIR, name);
    const text = fs.readFileSync(file, 'utf8');
    const keys = templateKeysFromDoc(text);
    const isGlobal = name.startsWith('01-');

    const sections = manifest.sections.filter((section) =>
      isGlobal ? section.sectionGroups.length > 0 : section.templates.some((key) => keys.includes(key))
    );

    const result = injectIntoDoc(file, generatedBlockFor(sections, written, { isGlobal }));
    log.info(`${result.padEnd(8)} ${name} — ${sections.length} section(s)`);
    touched += 1;
  }

  log.ok(`${touched} page docs updated`);

  writeSidebar(manifest, written, docFiles);
  log.ok('_sidebar.md');

  return {
    sectionPages: manifest.sections.length,
    themeSettingsPages: manifest.globalSettings.length,
    themeBlockPages: manifest.themeBlocks.length,
    pageDocs: touched,
    settings: manifest.totals.settings
  };
}
