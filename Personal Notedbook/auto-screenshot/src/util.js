import fs from 'node:fs';
import path from 'node:path';

export const THEME_ROOT = path.resolve(import.meta.dirname, '../../..');

export function themePath(...parts) {
  return path.join(THEME_ROOT, ...parts);
}

export function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'untitled';
}

export function pad(index, width = 2) {
  return String(index).padStart(width, '0');
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function fileExists(file) {
  return fs.existsSync(file);
}

/**
 * Shopify JSON templates and section groups allow // and /* *\/ comments,
 * which JSON.parse rejects, so they are stripped while respecting strings.
 */
export function parseJsonc(text) {
  let out = '';
  let inString = false;
  let inLine = false;
  let inBlock = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inLine) {
      if (char === '\n') {
        inLine = false;
        out += char;
      }
      continue;
    }

    if (inBlock) {
      if (char === '*' && next === '/') {
        inBlock = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      out += char;
      if (char === '\\') {
        out += next ?? '';
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }

    if (char === '/' && next === '/') {
      inLine = true;
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlock = true;
      i += 1;
      continue;
    }

    out += char;
  }

  return JSON.parse(out);
}

export const log = {
  info: (...args) => console.log('•', ...args),
  step: (...args) => console.log('\n▸', ...args),
  ok: (...args) => console.log('  ✓', ...args),
  warn: (...args) => console.warn('  !', ...args),
  error: (...args) => console.error('  ✗', ...args)
};

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
