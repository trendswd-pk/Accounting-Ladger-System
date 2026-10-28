# Auto Screenshot & Docs (Playwright)

Builds the theme documentation from the theme source: screenshots **every settings panel** in Nova-IMP — global theme settings, all 62 sections, every block, and every theme block — into `Nova-IMP-Docs/screenshots/`, then writes the markdown settings reference in `Nova-IMP-Docs/reference/`.

```bash
cd scripts/auto-screenshot
npm install
npm run build     # render + docs
```

That needs no Shopify login and no browser session.

| Command | Does |
|---------|------|
| `npm run manifest` | Inventory the schema into `manifest.json` (no browser) |
| `npm run render` | Draw + screenshot every settings panel from the schema, then shrink the PNGs |
| `npm run optimize` | Shrink the PNGs on their own (render already does this) |
| `npm run docs` | Write `Nova-IMP-Docs/reference/` and refresh the page guides |
| `npm run changelog` | Diff the schema against the last commit and draft a CHANGELOG entry |
| `npm run serve` | Read the docs in a browser at <http://localhost:4000> |
| `npm run build` | `render` then `docs` |
| `npm run capture` | Screenshot the **live** Theme Editor instead (needs admin sign-in) |

`render` is the recommended source for images. It is instant, reproducible, needs no store access, and reaches settings the real editor cannot show. Use `capture` only when a doc page needs the literal admin UI.

## What it produces

`Nova-IMP-Docs/` holds only what a reader should see, so images go there and the build artifacts stay here under `data/`.

Images, in `Nova-IMP-Docs/screenshots/`:

| Folder | Contents |
|--------|----------|
| `global-settings/` | One PNG per Theme settings group (Colors, Typography, Products, Quick view, Additional Buttons, …) |
| `sections/<area>/<nn>-<section>/00-settings.png` | Section settings panel |
| `sections/<area>/<nn>-<section>/blocks/` | Block settings panels |
| `theme-blocks/` | Blocks from `blocks/` (Flex PDP) |
| `storefront/` | Optional full-page storefront shots (`capture` only) |

Build artifacts, in `scripts/auto-screenshot/data/`:

| File | Contents |
|------|----------|
| `manifest.json` | Complete schema inventory of the theme, and the baseline `npm run changelog` compares against |
| `SCREENSHOT-INDEX.md` | Human-readable map of every image |
| `capture-report.json` | Machine report of what was captured / skipped |

`npm run docs` then turns that into markdown:

| Path | Contents |
|------|----------|
| `Nova-IMP-Docs/reference/00-INDEX.md` | Index of every settings group, section and theme block |
| `Nova-IMP-Docs/reference/theme-settings/` | One page per Theme settings group |
| `Nova-IMP-Docs/reference/sections/` | One page per section, with its blocks |
| `Nova-IMP-Docs/reference/theme-blocks/` | One page per Flex PDP theme block |
| `Nova-IMP-Docs/01-*.md` … `35-*.md` | Existing page guides, with a generated "Theme Editor settings" table added |

Each settings table lists label, id, type, default, range, options and the `visible_if` condition, and every page embeds its panel screenshot.

The page guides are only edited between `<!-- BEGIN GENERATED: theme-editor -->` and `<!-- END GENERATED: theme-editor -->`, so hand-written walkthroughs survive a rebuild. Sections shared by several templates (`main-product` is used by six) are documented once and linked, not duplicated.

## Setup for live-editor capture

Everything below only applies to `capture`. It is optional.

```bash
cp config.example.json config.json
# edit config.json → store, themeId, and sample handles
```

`config.json` fields that matter:

| Field | Example | Notes |
|-------|---------|-------|
| `store` | `"my-store"` or `"my-store.myshopify.com"` | Required |
| `themeId` | `"123456789012"` | From `shopify theme list` or the editor URL |
| `samples.productHandle` | `"navy-shirt"` | Needed to open a product page in the editor |
| `samples.collectionHandle` | `"all"` | Needed for collection pages |
| `samples.pageHandle` | `"about-us"` | Needed for page templates |
| `samples.blogHandle` | `"news"` | Needed for blog / article templates |

Environment variables also work and override the file:

```bash
export SHOPIFY_STORE=my-store
export SHOPIFY_THEME_ID=123456789012
```

## Getting an authenticated browser

Sign in once into a **dedicated Chrome profile** that this tool owns:

```bash
npm run login
```

Google Chrome opens. Complete the sign-in **including any captcha or 2FA**, wait until the Theme Editor sidebar is actually visible, then press Enter in the terminal. The profile and session are stored in `auth/` (gitignored) and reused by every later run. If you press Enter while still on the login page, the command tells you that sign-in did not complete.

Three constraints shaped this design — worth knowing before trying to “simplify” it:

1. **Headless does not work.** Shopify admin is behind Cloudflare, which answers headless browsers with a “Just a moment…” page instead of the editor. Runs are headed on purpose.
2. **Your everyday Chrome profile cannot be reused.** Chrome has blocked `--remote-debugging-port` on its default data directory (`~/.config/google-chrome`) since version 136, so there is no way to attach to the browser you normally sign in with. Copying its cookies into another profile would mean handling credential material, so the tool does not do that either.
3. **Chromium struggles more than Chrome.** Keep `"browserChannel": "chrome"` so real Google Chrome is used; it clears Cloudflare far more reliably.

### Attaching to a debug-enabled Chrome (optional)

If you prefer to keep a browser open and drive it, start the dedicated profile with a debugging port and switch modes:

```bash
./launch-chrome-debug.sh          # uses auth/chrome-profile, port 9222
```

```json
{ "connect": { "mode": "attach", "cdpPort": 9222 } }
```

The launcher accepts `CHROME_USER_DATA_DIR`, `CHROME_PROFILE_DIRECTORY`, `CHROME_DEBUG_PORT` and `CHROME_BINARY` as environment variables. It refuses to target Chrome's default directory, because Chrome would silently ignore the debugging port.

## Capture

```bash
# Everything the config asks for
npm run capture

# Only Theme settings (Colors, Typography, …)
npm run capture:global

# A single section by type
node src/cli.js capture --only=list-collections-template

# Also dump the last page HTML when selectors stop matching
node src/cli.js capture --debug

# Drive installed Google Chrome instead of bundled Chromium
node src/cli.js capture --chrome
```

Render a single section or just the theme settings:

```bash
node src/cli.js render --only=list-collections-template
node src/cli.js render --only=global
```

## Output layout

```text
scripts/auto-screenshot/data/
├── SCREENSHOT-INDEX.md
├── capture-report.json
└── manifest.json

Nova-IMP-Docs/screenshots/
├── global-settings/
│   ├── 01-colors.png
│   ├── 02-typography.png
│   └── …
├── sections/
│   ├── global/            header, footer, quick view, …
│   ├── index/             homepage sections
│   ├── product-*/         product template sections
│   ├── collection/
│   ├── list-collections/
│   └── other/             sections not placed on a template yet
├── theme-blocks/          blocks/ (Flex PDP)
└── storefront/            (capture mode only)
```

## Reading the docs locally

```bash
npm run serve          # http://localhost:4000
npm run serve -- --port=5000
```

This serves `Nova-IMP-Docs/` with [docsify](https://docsify.js.org), which renders the markdown in the browser — sidebar, search across all 1310 settings, and the panel screenshots inline. There is no build step: edit a file, refresh the page.

Two configuration details are load-bearing, so don't "simplify" them:

- `relativePath: true` in `index.html` is what makes the `../../screenshots/…` image paths in the reference pages resolve. It also means a bare link is looked up inside the reader's current folder, which is why `_sidebar.md` is generated with root-absolute links.
- The `alias` entry maps every nested `_sidebar.md` request back to the one at the root; without it docsify probes for a sidebar in each subfolder and logs a 404 per page.

The page needs internet access the first time, because docsify itself is loaded from a CDN.

## Keeping the changelog honest

After editing the theme, and **before committing**, run:

```bash
npm run changelog
```

It builds the schema fresh, compares it with the `manifest.json` in the last commit, and prints a ready-to-paste entry listing every setting that was added, changed or removed — with the section it belongs to. Paste it at the top of [`Nova-IMP-Docs/CHANGELOG.md`](../../Nova-IMP-Docs/CHANGELOG.md), replace the placeholder heading, and add anything the schema cannot see (visual changes, bug fixes, behaviour).

If nothing in the schema moved, it says so and prints nothing.

When writing the entry:

- Newest date at the top; split it into **Added / Changed / Removed / Fixed** and drop the empty parts.
- Name the setting the way the Theme Editor does and say where it lives ("Theme settings → Products"). The reader is in the editor, not in the code.
- Say what difference it makes, not which file changed.

## Rewriting the narrative docs

`npm run docs` generates the mechanical part — settings tables and screenshots — because that has to stay exactly in sync with the schema. The storefront walkthroughs are hand-written prose.

To have an agent rewrite that prose too, open a new Cursor chat and paste [`PROMPTS/generate-docs-from-screenshots.md`](./PROMPTS/generate-docs-from-screenshots.md).

## When Shopify changes the Theme Editor

The admin markup is not a public API. Every selector is a **list of candidates** in `src/selectors.js`. If a capture run starts skipping panels:

1. `npm run capture:debug`
2. Open `scripts/auto-screenshot/data/debug/last-page.html`
3. Update the matching candidate list in `src/selectors.js`, or override it in `config.json`:

```json
{
  "selectors": {
    "sidebar": "[data-testid=sections-sidebar]",
    "settingsPanel": "[data-testid=settings-panel]"
  }
}
```

## Limits (by design)

**Render mode**

- Panels are faithful reproductions of the Theme Editor, not pixel-identical copies of Shopify's admin. They intentionally leave out admin chrome and store data.
- Conditional settings (`visible_if`) are always drawn. The real editor hides them until their condition is met; the condition itself is recorded in `manifest.json`.
- `@app` blocks are listed but not drawn — their settings belong to the app the merchant installs.

**Docs mode**

- Only the generated markers in the page guides are rewritten; the rest of each guide is yours to maintain.
- Header and paragraph schema entries become sub-headings and notes rather than table rows, so the row count is lower than the raw setting count in `manifest.json`.

**Optimize**

- Panels are flat UI, so the PNGs are re-encoded to a 256-colour palette — visually identical, roughly a third of the size. Photographs would not survive this; settings panels do.
- Files that are already palette PNGs are skipped, so a repeat run rewrites nothing and leaves the repo clean. Re-encoding them would keep shaving off a few kilobytes and show up as 187 modified images after every run.
- Skip the step entirely with `node src/cli.js render --no-optimize`.

**Capture mode**

- Only blocks **already placed** on the previewed template can be opened. Unused block types land under “Not captured”.
- Runs must be headed: Shopify admin is behind Cloudflare, which blocks headless browsers.
- Your everyday Chrome profile cannot be reused — Chrome has blocked remote debugging on its default data directory since version 136.
- Shopify's admin UI is private, so expect to re-tune `src/selectors.js` after admin redesigns.
