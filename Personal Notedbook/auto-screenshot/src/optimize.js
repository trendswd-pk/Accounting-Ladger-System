import fs from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { log } from './util.js';

const CONCURRENCY = 8;

function pngFiles(dir) {
  const found = [];

  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.png')) found.push(full);
    }
  };

  if (fs.existsSync(dir)) walk(dir);
  return found.sort();
}

/**
 * Settings panels are flat UI, so a 256-colour palette is visually identical and far
 * smaller than the truecolour PNG Playwright writes.
 *
 * Already-palette files are skipped rather than re-encoded. Re-encoding keeps finding a
 * marginally smaller result every pass, which would rewrite all 187 files on every run and
 * show up as a repo full of modified images for no real gain.
 */
async function optimizeFile(file) {
  const before = fs.statSync(file).size;

  try {
    const { isPalette } = await sharp(file).metadata();
    if (isPalette) return { before, after: before, skipped: true };

    const buffer = await sharp(file).png({ palette: true, quality: 90, effort: 10 }).toBuffer();

    if (buffer.length < before) {
      fs.writeFileSync(file, buffer);
      return { before, after: buffer.length };
    }
  } catch (error) {
    log.warn(`could not optimize ${path.basename(file)}: ${error.message}`);
  }

  return { before, after: before };
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export async function optimizeScreenshots(config) {
  const files = pngFiles(config.outDirAbsolute);

  if (!files.length) {
    log.warn('No screenshots found to optimize.');
    return { files: 0, before: 0, after: 0 };
  }

  log.step(`Optimizing ${files.length} screenshots`);

  let before = 0;
  let after = 0;
  let skipped = 0;

  for (let index = 0; index < files.length; index += CONCURRENCY) {
    const batch = files.slice(index, index + CONCURRENCY);
    const results = await Promise.all(batch.map(optimizeFile));

    for (const result of results) {
      before += result.before;
      after += result.after;
      if (result.skipped) skipped += 1;
    }
  }

  if (skipped === files.length) {
    log.ok(`already optimized (${formatSize(after)}), nothing rewritten`);
    return { files: files.length, before, after, skipped };
  }

  const saved = before - after;
  const percent = before ? Math.round((saved / before) * 100) : 0;
  const skippedNote = skipped ? `, ${skipped} already optimized` : '';
  log.ok(`${formatSize(before)} → ${formatSize(after)} (${percent}% smaller${skippedNote})`);

  return { files: files.length, before, after, skipped };
}
