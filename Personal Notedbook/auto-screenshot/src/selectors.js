/**
 * Shopify's Theme Editor markup is not a public API, so every target is a list of
 * candidates tried in order. Override any key through `selectors` in config.json
 * when Shopify changes their admin.
 */
export const CANDIDATES = {
  /** Left column that lists sections and blocks. */
  sidebar: [
    '[data-testid="sections-sidebar"]',
    '#AppFrameNav',
    'aside:has([role="tree"])',
    '[role="tree"]',
    'nav:has(li)'
  ],

  /** Rows inside the sidebar that select a section or a block. */
  sidebarRow: [
    '[role="treeitem"]',
    '[data-section-id]',
    '[data-block-id]',
    'li button',
    'li [role="button"]'
  ],

  /** Right column that shows the settings of the current selection. */
  settingsPanel: [
    '[data-testid="settings-panel"]',
    'form[data-settings-form]',
    'aside:has(input, select, textarea)',
    'section:has(input, select, textarea)'
  ],

  /** Sidebar entry that opens the global theme settings. */
  themeSettingsEntry: [
    'a[href*="context=theme"]',
    'button:has-text("Theme settings")',
    '[aria-label="Theme settings"]'
  ],

  /** Buttons that reveal the block list of the selected section. */
  addBlock: ['button:has-text("Add block")', 'button:has-text("Add")'],

  /** Overlays that must be gone before a screenshot is taken. */
  loading: ['[data-testid="loading-overlay"]', '.Polaris-Spinner']
};

export function candidatesFor(key, config) {
  const override = config?.selectors?.[key];
  if (!override) return CANDIDATES[key] ?? [];
  return Array.isArray(override) ? override : [override];
}

/** Returns the first locator from `key`'s candidates that is actually visible. */
export async function findFirstVisible(scope, key, config, timeoutMs = 8000) {
  for (const selector of candidatesFor(key, config)) {
    const locator = scope.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: timeoutMs });
      return locator;
    } catch {
      // Candidate is absent in this admin version; try the next one.
    }
  }
  return null;
}

/** Finds a sidebar row by its visible label, ignoring case and extra whitespace. */
export async function findRowByName(scope, name, config) {
  const wanted = String(name).trim().toLowerCase();

  for (const selector of candidatesFor('sidebarRow', config)) {
    const rows = scope.locator(selector);
    const count = await rows.count().catch(() => 0);

    for (let i = 0; i < count; i += 1) {
      const row = rows.nth(i);
      const text = ((await row.innerText().catch(() => '')) || '').trim().toLowerCase();
      if (!text) continue;
      if (text === wanted || text.startsWith(wanted) || text.includes(wanted)) return row;
    }
  }

  return null;
}
