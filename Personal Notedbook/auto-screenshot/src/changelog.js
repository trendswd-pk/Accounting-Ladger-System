import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { buildManifest } from './manifest.js';
import { fileExists, log, readJson, THEME_ROOT } from './util.js';

const MANIFEST_IN_REPO = 'scripts/auto-screenshot/data/manifest.json';

/**
 * The last committed manifest is the natural baseline: it is what the published docs
 * describe, so anything differing from it is what the next changelog entry should mention.
 */
function baselineManifest(config) {
  try {
    const text = execFileSync('git', ['show', `HEAD:${MANIFEST_IN_REPO}`], {
      cwd: THEME_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return { manifest: JSON.parse(text), source: 'last commit' };
  } catch {
    const file = path.join(config.dataDirAbsolute, 'manifest.json');
    if (fileExists(file)) return { manifest: readJson(file), source: 'manifest.json on disk' };
  }

  return { manifest: null, source: null };
}

function isRealSetting(setting) {
  return setting.type !== 'header' && setting.type !== 'paragraph' && Boolean(setting.id);
}

/** Flattens a manifest into "where it lives" → id → setting, which is what a reader cares about. */
function indexSettings(manifest) {
  const index = new Map();

  const add = (scope, settings) => {
    for (const setting of settings.filter(isRealSetting)) {
      if (!index.has(scope)) index.set(scope, new Map());
      index.get(scope).set(setting.id, setting);
    }
  };

  for (const group of manifest.globalSettings ?? []) {
    add(`Theme settings → ${group.name}`, group.settings);
  }

  for (const section of manifest.sections ?? []) {
    add(section.name, section.settings);
    for (const block of section.blocks ?? []) {
      if (block.type?.startsWith('@')) continue;
      add(`${section.name} → ${block.name} block`, block.settings);
    }
  }

  for (const block of manifest.themeBlocks ?? []) {
    add(`Theme block: ${block.name}`, block.settings);
  }

  return index;
}

function describe(setting) {
  const bits = [`\`${setting.id}\``, setting.type];
  if (setting.default !== null && setting.default !== undefined && setting.default !== '') {
    bits.push(`default \`${setting.default}\``);
  }
  return bits.join(', ');
}

function changeNote(before, after) {
  const changes = [];
  if (before.type !== after.type) changes.push(`type ${before.type} → ${after.type}`);
  if (String(before.default) !== String(after.default)) {
    changes.push(`default \`${before.default ?? 'none'}\` → \`${after.default ?? 'none'}\``);
  }
  if (before.label !== after.label) changes.push(`renamed from "${before.label}"`);

  const optionsOf = (setting) => (setting.options ?? []).map((option) => option.value).join('|');
  if (optionsOf(before) !== optionsOf(after)) changes.push('options changed');

  const rangeOf = (setting) => `${setting.min ?? ''}-${setting.max ?? ''}/${setting.step ?? ''}`;
  if (rangeOf(before) !== rangeOf(after)) changes.push('range changed');

  return changes;
}

function diff(previous, current) {
  const before = indexSettings(previous);
  const after = indexSettings(current);

  const added = [];
  const removed = [];
  const changed = [];

  for (const [scope, settings] of after) {
    const old = before.get(scope);

    for (const [id, setting] of settings) {
      if (!old?.has(id)) {
        added.push({ scope, setting, newScope: !old });
        continue;
      }
      const notes = changeNote(old.get(id), setting);
      if (notes.length) changed.push({ scope, setting, notes });
    }
  }

  for (const [scope, settings] of before) {
    const now = after.get(scope);
    for (const [id, setting] of settings) {
      if (!now?.has(id)) removed.push({ scope, setting, goneScope: !now });
    }
  }

  const sectionsOf = (manifest) => new Set((manifest.sections ?? []).map((section) => section.name));
  const previousSections = sectionsOf(previous);
  const currentSections = sectionsOf(current);

  return {
    added,
    removed,
    changed,
    newSections: [...currentSections].filter((name) => !previousSections.has(name)),
    goneSections: [...previousSections].filter((name) => !currentSections.has(name))
  };
}

function byScope(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    if (!grouped.has(entry.scope)) grouped.set(entry.scope, []);
    grouped.get(entry.scope).push(entry);
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function render(result, current) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [`## ${today} — <one line: what changed>`, ''];

  if (result.newSections.length || result.added.length) {
    lines.push('### Added', '');

    for (const name of result.newSections) lines.push(`- New section: **${name}**`);

    for (const [scope, entries] of byScope(result.added)) {
      for (const entry of entries) {
        lines.push(`- ${scope} — new setting **${entry.setting.label}** (${describe(entry.setting)})`);
      }
    }
    lines.push('');
  }

  if (result.changed.length) {
    lines.push('### Changed', '');
    for (const [scope, entries] of byScope(result.changed)) {
      for (const entry of entries) {
        lines.push(`- ${scope} — **${entry.setting.label}**: ${entry.notes.join('; ')}`);
      }
    }
    lines.push('');
  }

  if (result.goneSections.length || result.removed.length) {
    lines.push('### Removed', '');
    for (const name of result.goneSections) lines.push(`- Section removed: **${name}**`);
    for (const [scope, entries] of byScope(result.removed)) {
      for (const entry of entries) {
        lines.push(`- ${scope} — **${entry.setting.label}** (\`${entry.setting.id}\`) removed`);
      }
    }
    lines.push('');
  }

  lines.push(
    `_The theme now has ${current.totals.settings} settings across ${current.totals.sections} sections._`,
    ''
  );

  return lines.join('\n');
}

export function reportChangelog(config) {
  const { manifest: previous, source } = baselineManifest(config);
  const current = buildManifest();

  if (!previous) {
    log.warn('No baseline manifest found — run `npm run build` and commit it first.');
    return null;
  }

  log.step(`Schema compared against ${source}`);

  const result = diff(previous, current);
  const total =
    result.added.length +
    result.removed.length +
    result.changed.length +
    result.newSections.length +
    result.goneSections.length;

  if (!total) {
    log.ok('No schema changes — nothing to add to the changelog.');
    return result;
  }

  log.ok(
    `${result.added.length} added, ${result.changed.length} changed, ${result.removed.length} removed`
  );

  console.log(`\n${'-'.repeat(70)}`);
  console.log('Paste the block below at the top of Nova-IMP-Docs/CHANGELOG.md:');
  console.log(`${'-'.repeat(70)}\n`);
  console.log(render(result, current));

  return result;
}
