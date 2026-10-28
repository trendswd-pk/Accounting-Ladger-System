import fs from 'node:fs';
import path from 'node:path';

import { fileExists, log, parseJsonc, readJson, slugify, themePath } from './util.js';

const SCHEMA_RE = /\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/;

function listFiles(dir, extension) {
  const full = themePath(dir);
  if (!fileExists(full)) return [];
  return fs
    .readdirSync(full)
    .filter((name) => name.endsWith(extension))
    .sort()
    .map((name) => ({ name, relative: path.posix.join(dir, name), absolute: path.join(full, name) }));
}

function loadTranslations() {
  const file = themePath('locales/en.default.schema.json');
  return fileExists(file) ? readJson(file) : {};
}

/** Resolves "t:sections.foo.settings.bar.label" against the default schema locale. */
function createTranslator(translations) {
  return function translate(value) {
    if (typeof value !== 'string' || !value.startsWith('t:')) return value ?? '';
    const resolved = value
      .slice(2)
      .split('.')
      .reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), translations);
    return typeof resolved === 'string' ? resolved : value;
  };
}

function normalizeSetting(setting, translate) {
  const normalized = {
    type: setting.type,
    id: setting.id ?? null,
    label: translate(setting.label ?? setting.content ?? ''),
    default: setting.default ?? null,
    info: translate(setting.info ?? '') || null,
    visibleIf: setting.visible_if ?? null
  };

  if (Array.isArray(setting.options)) {
    normalized.options = setting.options.map((option) => ({
      value: option.value,
      label: translate(option.label ?? option.value)
    }));
  }

  for (const key of ['min', 'max', 'step', 'unit', 'placeholder', 'limit']) {
    if (setting[key] !== undefined) normalized[key] = setting[key];
  }

  return normalized;
}

function normalizeSettings(settings, translate) {
  if (!Array.isArray(settings)) return [];
  return settings.map((setting) => normalizeSetting(setting, translate));
}

function readSchema(file) {
  const source = fs.readFileSync(file.absolute, 'utf8');
  const match = source.match(SCHEMA_RE);
  if (!match) return { schema: null, error: null };
  try {
    return { schema: parseJsonc(match[1]), error: null };
  } catch (error) {
    return { schema: null, error: error.message };
  }
}

function collectSchemaFiles(dir, translate, problems) {
  const entries = [];

  for (const file of listFiles(dir, '.liquid')) {
    const { schema, error } = readSchema(file);

    if (error) {
      problems.push({ file: file.relative, error });
      continue;
    }
    if (!schema) continue;

    const type = file.name.replace(/\.liquid$/, '');
    const name = translate(schema.name ?? type);

    entries.push({
      type,
      name,
      slug: slugify(type),
      file: file.relative,
      settings: normalizeSettings(schema.settings, translate),
      blocks: (schema.blocks ?? []).map((block) => ({
        type: block.type ?? null,
        name: translate(block.name ?? block.type ?? 'Block'),
        slug: slugify(block.type ?? block.name ?? 'block'),
        settings: normalizeSettings(block.settings, translate),
        // Theme blocks reference other files instead of declaring settings inline.
        reference: block.type && !block.settings ? block.type : null
      })),
      presets: (schema.presets ?? []).map((preset) => translate(preset.name ?? '')),
      maxBlocks: schema.max_blocks ?? null,
      templatesAllowed: schema.templates ?? null,
      enabledOn: schema.enabled_on ?? null
    });
  }

  return entries;
}

function templateKeyFromPath(relative) {
  return relative
    .replace(/^templates\//, '')
    .replace(/\.(json|liquid)$/, '');
}

function collectTemplates(problems) {
  const files = [...listFiles('templates', '.json'), ...listFiles('templates/customers', '.json')];
  const templates = [];

  for (const file of files) {
    let data;
    try {
      data = parseJsonc(fs.readFileSync(file.absolute, 'utf8'));
    } catch (error) {
      problems.push({ file: file.relative, error: error.message });
      continue;
    }

    const order = Array.isArray(data.order) ? data.order : Object.keys(data.sections ?? {});
    templates.push({
      key: templateKeyFromPath(file.relative),
      file: file.relative,
      sectionTypes: order
        .map((id) => data.sections?.[id]?.type)
        .filter(Boolean)
    });
  }

  return templates;
}

function collectSectionGroups(problems) {
  const groups = [];

  for (const file of listFiles('sections', '.json')) {
    let data;
    try {
      data = parseJsonc(fs.readFileSync(file.absolute, 'utf8'));
    } catch (error) {
      problems.push({ file: file.relative, error: error.message });
      continue;
    }

    const order = Array.isArray(data.order) ? data.order : Object.keys(data.sections ?? {});
    groups.push({
      key: file.name.replace(/\.json$/, ''),
      file: file.relative,
      groupType: data.type ?? null,
      name: data.name ?? file.name.replace(/\.json$/, ''),
      sectionTypes: order.map((id) => data.sections?.[id]?.type).filter(Boolean)
    });
  }

  return groups;
}

function collectGlobalSettings(translate, problems) {
  const file = themePath('config/settings_schema.json');
  if (!fileExists(file)) return [];

  let data;
  try {
    data = parseJsonc(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    problems.push({ file: 'config/settings_schema.json', error: error.message });
    return [];
  }

  return data
    .filter((group) => group.name && group.name !== 'theme_info')
    .map((group) => ({
      name: translate(group.name),
      slug: slugify(translate(group.name)),
      settings: normalizeSettings(group.settings, translate)
    }));
}

/**
 * Every section is attached to the templates and section groups that render it,
 * because the Theme Editor can only reach a section through one of those.
 */
function attachLocations(sections, templates, groups) {
  for (const section of sections) {
    section.templates = templates.filter((t) => t.sectionTypes.includes(section.type)).map((t) => t.key);
    section.sectionGroups = groups.filter((g) => g.sectionTypes.includes(section.type)).map((g) => g.key);
  }
}

export function buildManifest() {
  const translations = loadTranslations();
  const translate = createTranslator(translations);
  const problems = [];

  const sections = collectSchemaFiles('sections', translate, problems);
  const themeBlocks = collectSchemaFiles('blocks', translate, problems);
  const templates = collectTemplates(problems);
  const sectionGroups = collectSectionGroups(problems);
  const globalSettings = collectGlobalSettings(translate, problems);

  attachLocations(sections, templates, sectionGroups);

  const settingsTotal =
    sections.reduce(
      (sum, section) =>
        sum + section.settings.length + section.blocks.reduce((s, b) => s + b.settings.length, 0),
      0
    ) +
    themeBlocks.reduce((sum, block) => sum + block.settings.length, 0) +
    globalSettings.reduce((sum, group) => sum + group.settings.length, 0);

  for (const problem of problems) {
    log.warn(`schema could not be parsed: ${problem.file} — ${problem.error}`);
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      sections: sections.length,
      themeBlocks: themeBlocks.length,
      templates: templates.length,
      sectionGroups: sectionGroups.length,
      globalSettingGroups: globalSettings.length,
      settings: settingsTotal
    },
    globalSettings,
    sections,
    themeBlocks,
    templates,
    sectionGroups,
    problems
  };
}
