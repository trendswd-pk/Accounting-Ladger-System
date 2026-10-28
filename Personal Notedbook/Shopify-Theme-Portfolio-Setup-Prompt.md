# Shopify Theme — Portfolio Setup Prompt (demo.json → Screenshots → Docs → Rules → README)

> **Kaise use karein:** **CONFIG** bharo → **MASTER PROMPT** Shopify theme repo me paste karo.  
> Order: **Phase 1 → 2 → 3 → 4 → 5 → 6**.  
> Web-app / SaaS ke liye yeh file **mat** use karo → `Portfolio-Project-Setup-Prompt.md`.

**Themes vs web apps:**
```text
FULL offline Demo Mode app NAHI.
Sirf demo-mode/demo.json (type=shopify-theme + live_demo_url).
Settings / Theme Editor panel screenshots + docs → scripts/auto-screenshot
  (master copy: Personal Notedbook/auto-screenshot/ — COPY into theme; do not delete the master).
```

**Short flow:**
```text
1) demo-mode/demo.json ONLY
2) Documentation/ skeleton
3) scripts/auto-screenshot: manifest → render (Theme settings + sections + blocks) → optimize → docs
   optional: login + capture (live Theme Editor) / storefront
4) Merchant English docs — ./screenshots/ embeds
5) .cursor/rules/ — CHANGELOG + version
6) Root README — curated screenshots
```

---

## CONFIG — pehle bharo

```text
THEME_NAME       = My Shopify Theme
APP_SLUG         = my-shopify-theme
CATEGORY_TYPE    = shopify-theme
VERSION          = 1.0.0
RELEASE_DATE     = 2026-09-08

LIVE_DEMO_URL    = https://your-demo-store.myshopify.com

DEMO_FOLDER      = demo-mode
DOCS_FOLDER      = Documentation
SCREENSHOT_DIR   = Documentation/screenshots
AUTO_SHOT_DIR    = scripts/auto-screenshot

# Live Theme Editor capture ONLY (render mode ignores these)
SHOPIFY_STORE    =
SHOPIFY_THEME_ID =
SAMPLE_PRODUCT   =
SAMPLE_COLLECTION = all
SAMPLE_PAGE      = about-us
SAMPLE_BLOG      = news
```

Always `shopify-theme` → portfolio `/our-projects/shopify-themes`.

---

## MASTER PROMPT (copy from here → Cursor)

You are setting up this **Shopify theme** for the **Trends WD portfolio**.

Strict order. **No** full Demo Mode web app. Only `demo-mode/demo.json` + `Documentation/` + `scripts/auto-screenshot/`.

**Quality:** Merchant-facing, professional English, schema-accurate. Never invent settings. Never break image links.

| Key | Value |
|-----|--------|
| Theme | `{{THEME_NAME}}` |
| Slug | `{{APP_SLUG}}` |
| Category | `shopify-theme` |
| Version | `{{VERSION}}` |
| Release date | `{{RELEASE_DATE}}` |
| Live preview URL | `{{LIVE_DEMO_URL}}` |
| Screenshots | `Documentation/screenshots` |
| Tool | `scripts/auto-screenshot` |

**Master toolkit source (required to copy once into this theme):**  
`Personal Notedbook/auto-screenshot/` inside the Trends WD portfolio notebook (or an already-copied `scripts/auto-screenshot` from another Trends theme). Adapt hard-coded doc names (e.g. `Nova-IMP-Docs`) → **`Documentation/`**.

---

# GLOBAL — Professional standards

- English for merchants + implementers; Theme Editor **labels** in prose; setting **ids** in backticks.
- No jokes, Hinglish-as-primary, lorem, WIP dumps in client docs.
- Never put passwords / Admin tokens / theme secrets in `demo.json` or public docs.
- Canonical PNGs: **`Documentation/screenshots/`**. Guides link `./screenshots/...`.
- Tool artifacts stay in `scripts/auto-screenshot/data/` (`manifest.json`, `capture-report.json`); also publish reader-facing `Documentation/screenshots/SCREENSHOT-INDEX.md`.
- Generated doc regions use markers — only edit between:
  `<!-- BEGIN GENERATED: theme-editor -->` … `<!-- END GENERATED: theme-editor -->`
  Hand-written walkthroughs outside markers must survive `npm run docs`.

---

# PHASE 1 — Minimal `demo-mode/` (JSON only)

```text
demo-mode/
├── demo.json
└── README.md
```

```json
{
  "live_demo_url": "{{LIVE_DEMO_URL}}",
  "type": "shopify-theme"
}
```

- Empty URL → `""` + TODO in README only.
- **Do not** scaffold Next/React demo, login cards, seed DB, favicon pipeline.
- GitHub topic later: `shopify-theme`.

### Phase 1 acceptance
- [ ] `demo.json` valid; no credentials; no full demo app
- [ ] Short README
- [ ] Print paths + JSON

**Continue.**

---

# PHASE 2 — `Documentation/` skeleton

```text
Documentation/
├── index.md
├── README.md
├── APP-VERSION.md
├── CHANGELOG.md
├── version.json
├── _meta/navigation.json
├── screenshots/.gitkeep
├── images/.gitkeep
├── reference/.gitkeep
├── 00-getting-started.md
└── (01-*.md stubs OK)
```

`version.json` includes `"type": "shopify-theme"`.  
Navigation groups: Home, Getting started (Version, Changelog), Theme settings, Pages & sections, Reference.  
CHANGELOG: Keep-a-Changelog; Theme Editor language.

### Phase 2 acceptance
- [ ] Tree + synced version fields + empty screenshots dir

**Continue.**

---

# PHASE 3 — Auto-screenshot (Theme settings + sections + blocks) → `Documentation/screenshots/`

This phase **must** cover everything the notebook tool does: schema inventory, **rendered settings panels** (global Theme settings, every section, every block, theme blocks), optimize, generated reference docs, optional live Theme Editor capture, optional storefront shots, changelog draft, local docs serve.

## 3.1 Install the tool into THIS theme

1. If `scripts/auto-screenshot/` is missing, **copy** the full toolkit from `Personal Notedbook/auto-screenshot/` (all of `src/`, `package.json`, `config.example.json`, `launch-chrome-debug.sh`, `PROMPTS/`).
2. Adapt paths away from any `Nova-IMP-Docs` defaults → portfolio layout:

```json
{
  "outDir": "Documentation/screenshots",
  "dataDir": "scripts/auto-screenshot/data",
  "authFile": "scripts/auto-screenshot/auth/storage-state.json",
  "userDataDir": "scripts/auto-screenshot/auth/browser-profile"
}
```

Save as `scripts/auto-screenshot/config.json` (gitignored if it holds store ids). Start from `config.example.json`.

3. Update tool internals / docs paths if still hard-coded to `Nova-IMP-Docs` so `npm run docs` and `npm run serve` read/write **`Documentation/`** (`reference/`, page guides, screenshots).

4. Gitignore: `scripts/auto-screenshot/auth/`, `config.json` if sensitive, `node_modules/`.

5. Install:

```bash
cd scripts/auto-screenshot
npm install
# postinstall may install Chromium; for live capture prefer Google Chrome channel
```

## 3.2 Commands (must know — all of these)

| Command | Purpose |
|---------|---------|
| `npm run manifest` | Offline schema inventory → `data/manifest.json` (totals: settings, sections, blocks) |
| `npm run render` | **Primary.** Draw every settings panel from schema + screenshot + optimize → `Documentation/screenshots/` — **no Shopify login** |
| `npm run optimize` | Shrink PNGs alone (render already runs this) |
| `npm run docs` | Write `Documentation/reference/` + inject generated Theme Editor tables into page guides (marker-safe) |
| `npm run changelog` | Diff schema vs last committed manifest; draft CHANGELOG bullets |
| `npm run serve` | Preview docs at `http://localhost:4000` (docsify-style serve if configured) |
| `npm run build` | `render` then `docs` |
| `npm run login` | One-time Shopify admin session for **capture** only |
| `npm run capture` | Walk **live Theme Editor** and screenshot real admin panels (optional) |
| `npm run capture:global` | Live capture Theme settings only |
| `node src/cli.js capture --only=<section-type>` | Single section |
| `node src/cli.js render --only=global` | Render Theme settings only |
| `node src/cli.js render --only=<section-type>` | Render one section |
| `node src/cli.js capture --debug` | Dump last page HTML for selector fixes |
| `node src/cli.js capture --chrome` | Force Chrome channel |
| `node src/cli.js render --no-optimize` | Skip PNG shrink |

**Default path for portfolio:** `npm run manifest && npm run build` (or `render` + `docs`).  
Use **`capture` only** when a doc truly needs literal Shopify admin chrome / storefront photos.

## 3.3 What screenshots MUST include (editor settings coverage)

| Output under `Documentation/screenshots/` | Meaning |
|-------------------------------------------|---------|
| `global-settings/*.png` | **Every Theme settings group** (Colors, Typography, Products, Cart, …) — one panel PNG each |
| `sections/<area>/<nn>-<section>/00-settings.png` | **Section** settings panel |
| `sections/<area>/<nn>-<section>/blocks/*.png` | **Block** settings panels for that section |
| `theme-blocks/*.png` | Root `blocks/` theme blocks (e.g. Flex PDP) |
| `storefront/` | Optional full-page storefront (`capture --storefront` only) |
| `SCREENSHOT-INDEX.md` | Human map of every PNG (copy/publish into screenshots or Documentation root) |

Areas typically include: `global` (header/footer/…), `index`, `product-*`, `collection`, `list-collections`, `other`, etc. — driven by templates + schema, not invented.

**Coverage checklist (Phase 3 is incomplete until these pass):**
- [ ] All global Theme settings groups captured
- [ ] All sections in manifest have a settings PNG (or listed skipped with reason)
- [ ] All block types reachable in render mode have PNGs
- [ ] Theme blocks covered if `blocks/` exists
- [ ] `@app` blocks listed in manifest/docs but usually **not** drawn (app-owned settings)
- [ ] `visible_if` settings documented; render may show them even when live editor hides them — note once in Getting Started

## 3.4 Recommended run (offline render — do this first)

```bash
cd scripts/auto-screenshot
npm run manifest
npm run render          # Theme settings + sections + blocks panels
# optimize runs inside render unless --no-optimize
npm run docs            # reference/ + generated tables in guides
npm run changelog       # paste draft into Documentation/CHANGELOG.md when useful
npm run serve           # spot-check http://localhost:4000
```

Print manifest totals and PNG count in the Phase 3 summary.

## 3.5 Optional — live Theme Editor capture (admin settings UI)

Only after render is done, and only if needed.

**Config fields:**

| Field | Notes |
|-------|-------|
| `store` | `my-store` or `my-store.myshopify.com` |
| `themeId` | From `shopify theme list` or editor URL |
| `samples.productHandle` | Product templates |
| `samples.collectionHandle` | Collection templates |
| `samples.pageHandle` | Page templates |
| `samples.blogHandle` / article path | Blog / article |

Env overrides: `SHOPIFY_STORE`, `SHOPIFY_THEME_ID`.

**Auth constraints (do not “simplify” away):**
1. **Headless fails** — Cloudflare (“Just a moment…”). Use headed Chrome.
2. **Default everyday Chrome profile cannot be attached** for remote debugging (Chrome 136+). Use the tool’s dedicated profile via `npm run login` or `launch-chrome-debug.sh`.
3. Prefer `"browserChannel": "chrome"` over bundled Chromium for Cloudflare.

```bash
npm run login
# sign in + 2FA; wait until Theme Editor sidebar is visible; then confirm in terminal

npm run capture
# or: npm run capture:global
# or: node src/cli.js capture --only=main-product --debug
```

Attach mode (optional):

```bash
./launch-chrome-debug.sh
# config: connect.mode = "attach", cdpPort = 9222
```

If selectors break after a Shopify admin redesign: `capture --debug` → inspect `data/debug/last-page.html` → update `src/selectors.js` or `config.json` selector overrides.

**Capture limits:** only blocks **already placed** on the previewed template open in the live editor; unused types appear under skipped in `capture-report.json`. Render mode does not have that limit.

## 3.6 Docs generation behavior (`npm run docs`)

Produces / refreshes:
- `Documentation/reference/00-INDEX.md` (or equivalent index)
- `Documentation/reference/theme-settings/` — one page per Theme settings group
- `Documentation/reference/sections/` — per section + blocks
- `Documentation/reference/theme-blocks/` — theme blocks
- Injects settings tables + screenshot embeds into page guides **only inside GENERATED markers**

Each settings table: label, id, type, default, range, options, `visible_if`. Embed matching panel PNG.

Shared sections used by multiple templates: document **once**, link elsewhere — do not duplicate full tables.

## 3.7 Optimize / image quality
- Settings panels: palette PNG optimization OK (~⅓ size, visually identical).
- Do not palette-crush photographic storefront shots the same way if quality suffers.
- Re-run optimize is idempotent for already-optimized panels when the tool skips them.

## 3.8 Phase 3 acceptance
- [ ] Toolkit copied/adapted; `outDir` = `Documentation/screenshots`
- [ ] `manifest` written; totals printed
- [ ] **Render** completed: global settings + sections + blocks (+ theme-blocks)
- [ ] `SCREENSHOT-INDEX.md` + `capture-report.json` / report available
- [ ] `npm run docs` refreshed reference + marker regions
- [ ] Optional capture documented if used (and skips listed)
- [ ] `npm run serve` smoke-checked or reason skipped
- [ ] Print: commands to re-run, PNG count, skips

**Continue.**

---

# PHASE 4 — Merchant documentation (narrative + embeds)

### Goal
Finish **professional English** docs. Mechanical tables/screenshots come from Phase 3; you write storefront walkthroughs and merchant tips.

### Inputs
| Path | What |
|------|------|
| `scripts/auto-screenshot/data/manifest.json` | Source of truth for settings |
| `Documentation/screenshots/SCREENSHOT-INDEX.md` | Image map |
| `Documentation/screenshots/**/*.png` | Panels |
| `config/settings_schema.json` | Theme settings |
| `sections/*.liquid` / `blocks/*.liquid` | Schemas |
| `templates/*.json` | Section placement |
| `capture-report.json` → `mode` | `"render"` vs `"editor"` (know what may be missing) |

### Page guide template

```markdown
# <Page name>

> Short overview.

## Overview
| Item | Detail |
|------|--------|
| Template | `templates/….json` |
| URL | `/…` |
| Primary sections | … |

## Storefront walkthrough
Shopper-facing steps (no unnecessary editor jargon).

## Theme Editor — sections
### <Section name> (`section-type`)
![…](./screenshots/sections/<area>/<nn>-<slug>/00-settings.png)

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| … | … | … | visible_if… |

#### Blocks
##### <Block name> (`block-type`)
![…](./screenshots/.../blocks/....png)
(settings table)

## Theme Editor — tips
## Related files
## Doc checklist
- [ ] Overview table
- [ ] Storefront walkthrough
- [ ] Every section on template
- [ ] Screenshots embedded or pending
- [ ] Tables match manifest.json
```

### Global / Theme settings guide (REQUIRED)
Cover header/footer/announcement/cart/quick view/etc. **and** every `screenshots/global-settings/` group with PNG + full settings from manifest. Include **theme-blocks** subsection if present.

### `index.md`
Product blurb, version, live preview from `demo-mode/demo.json`, links to all guides, Theme settings, reference index, SCREENSHOT-INDEX, manifest date if available.

### Rules
- Never invent settings not in manifest.
- Missing shot → still document + `(screenshot pending)`.
- Relative `./screenshots/...` only.
- Preserve GENERATED markers when re-running docs.

### Work order
1. Read SCREENSHOT-INDEX + manifest totals + capture-report mode  
2. Rewrite index + global Theme settings guide  
3. Page guides in template order  
4. Sync navigation + version files  
5. Summary: files written / screenshots used / settings covered / pending  

### Phase 4 acceptance
- [ ] Global settings + major templates done
- [ ] Embeds valid
- [ ] Nav + version synced
- [ ] Professional tone

**Continue.**

---

# PHASE 5 — Cursor rules

Create `.cursor/rules/portfolio-shopify-theme.mdc` (`alwaysApply: true`):

```markdown
---
description: Trends WD Shopify theme — docs, auto-screenshot, changelog, demo.json
alwaysApply: true
---

# Trends WD Shopify theme rules

- Portfolio: `demo-mode/demo.json` (`shopify-theme` + `live_demo_url`) + `Documentation/`.
- `demo-mode/` = JSON (+ short README) ONLY — never a full demo web app.
- Screenshots: `Documentation/screenshots/` via `scripts/auto-screenshot` (prefer `render`).
- On schema/settings changes: `manifest` → `render` → `docs` → `changelog`; refresh guides.
- CHANGELOG + version sync (patch per new day/session; minor features; major breaking).
- Keep GENERATED markers intact; link `./screenshots/...` only.
- No secrets in demo.json. Refresh README after big visual passes.
```

Also: screenshot globs rule + optional `AGENTS.md`.

### Phase 5 acceptance
- [ ] Rules installed including auto-screenshot re-run duty

**Continue.**

---

# PHASE 6 — Root `README.md`

Professional overview; embed **3–6 curated** images from `Documentation/screenshots/` (or `Documentation/images/`). Do not dump every settings PNG.

Sync preview URL from `demo.json` + version from `version.json`. CHANGELOG bullet if README changed.

### Phase 6 acceptance
- [ ] README professional; images verified on disk

---

# FINAL OUTPUT

1. **demo-mode** — JSON only confirmation  
2. **Screenshots** — global + sections + blocks counts; render vs capture; re-run cmds  
3. **Docs** — guides / reference / pending  
4. **Rules**  
5. **README** — images used  
6. **Human:** paste preview URL; GitHub topic `shopify-theme`; keep master toolkit in portfolio notebook for future themes  

---

# Implementation order

1. Scan theme schemas/templates  
2. Phase 1 — `demo.json`  
3. Phase 2 — Documentation skeleton  
4. Phase 3 — Copy/adapt auto-screenshot → full render (Theme settings + sections + blocks) → docs  
5. Phase 4 — Narrative docs  
6. Phase 5 — Rules  
7. Phase 6 — README  
8. Summary  

END OF MASTER PROMPT

---

## After preview URL ready

```text
Update demo-mode/demo.json live_demo_url; keep type shopify-theme; no secrets.
Sync Documentation/index.md + README. CHANGELOG + patch bump per rules.
Show demo.json + version.
```

---

## Follow-ups

### Schema changed — full screenshot refresh
```text
cd scripts/auto-screenshot && npm run manifest && npm run render && npm run docs && npm run changelog
Paste changelog draft; fix ./screenshots/ links; bump version per rules.
```

### Live Theme Editor pass (optional)
```text
Configure store/themeId/samples; npm run login; npm run capture (or capture:global / --only=…).
Merge needed PNGs into Documentation/screenshots/; update SCREENSHOT-INDEX + docs.
```

### Narrative rewrite only
```text
Rewrite merchant guides from manifest + Documentation/screenshots (Phase 4).
Do not invent settings. Preserve GENERATED markers.
```

### README only
```text
Phase 6: curated 3–6 screenshots; sync demo URL + version.
```

---

## One-liner

```text
Shopify theme portfolio pipeline:
1) demo-mode/demo.json ONLY (shopify-theme)
2) Documentation/ skeleton
3) Copy Personal Notedbook/auto-screenshot → scripts/auto-screenshot
   manifest → render (Theme settings + sections + blocks) → docs
   optional live capture for real editor chrome
4) Merchant docs with ./screenshots/
5) Cursor rules (CHANGELOG/version)
6) README curated shots
Master toolkit STAYS in Personal Notedbook/auto-screenshot/ for the next theme.
Prompt: Personal Notedbook/Shopify-Theme-Portfolio-Setup-Prompt.md
```

---

## NOTE — Do not delete `Personal Notedbook/auto-screenshot/`

That folder is the **runnable master toolkit** (Playwright render/capture source). The prompt tells Cursor to **copy** it into each theme as `scripts/auto-screenshot/`. Deleting the notebook copy would remove the source for future themes. Keep it.
