# Prompt: Build Nova-IMP documentation from screenshots

Copy everything below the line into a fresh Cursor chat after `scripts/auto-screenshot` has finished capturing.

---

You are writing the public documentation for the **Nova-IMP Shopify theme** (Online Store 2.0). The theme lives in this repository. Screenshots of every Theme Editor settings panel have already been captured.

## Goal

Rebuild `Nova-IMP-Docs/` so it is upload-ready for a documentation site / help centre. Every page must:

1. Explain what the merchant sees on the storefront.
2. Walk through every section / block / setting that can be edited in the Theme Editor.
3. Embed the matching screenshot from `Nova-IMP-Docs/screenshots/`.
4. Stay accurate to the live schema in `manifest.json` (never invent settings that are not there).

## Inputs (read these first)

| Path | What it is |
|------|------------|
| `Nova-IMP-Docs/screenshots/manifest.json` | Complete inventory of sections, blocks, global settings (ids, types, defaults, options, `visibleIf`) |
| `Nova-IMP-Docs/screenshots/SCREENSHOT-INDEX.md` | Map of every PNG to the section / block / settings group it shows |
| `Nova-IMP-Docs/screenshots/capture-report.json` | Captured vs skipped list |
| `Nova-IMP-Docs/screenshots/**/*.png` | The actual images |
| `Nova-IMP-Docs/screenshots/theme-blocks/` | Settings panels for the Flex PDP blocks in `blocks/` |
| `Nova-IMP-Docs/00-INDEX.md` … `35-*.md` | Existing draft docs — keep the page order and filenames, rewrite the content |
| `config/settings_schema.json` | Source of truth for Theme settings |
| `sections/*.liquid` schemas | Source of truth for section / block settings |
| `templates/*.json` | Which sections sit on which page |

If a screenshot is missing for a setting, still document the setting from `manifest.json` and mark it `(screenshot pending)`.

Check `capture-report.json → mode` first:

- `"render"` — panels were drawn from the theme schema, so **every** setting has an image, including blocks not yet placed on a template. Screenshot folders are grouped by template area (`global`, `index`, `product-*`, `collection`, `list-collections`, `other`), not by editor page.
- `"editor"` — panels came from the live Theme Editor, so some blocks will be missing; those are listed under `skipped`.

## Output structure

Keep the existing numbered files. Expand each one to this shape:

```markdown
# <Page name>

> Short one-paragraph overview of what this page is for.

## Overview

| Item | Detail |
|------|--------|
| Template | `templates/….json` |
| URL | `/…` |
| Primary sections | … |

## Storefront walkthrough

Step-by-step of what a shopper sees (no Theme Editor jargon).

## Theme Editor — sections

For every section on this template:

### <Section name> (`section-type`)

An image embed pointing at `./screenshots/sections/<page>/<nn>-<slug>/00-settings.png`

Then a table of **every setting** from the manifest:

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| Show title | checkbox | `true` | … |

Document `visibleIf` conditions in the Notes column (“Only shown when Color option style = Variant image card”).

#### Blocks

For each block type that has a screenshot:

##### <Block name> (`block-type`)

An image embed pointing at `./screenshots/sections/<page>/<nn>-<slug>/blocks/<nn>-<block>.png`

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| … | … | … | … |

## Theme Editor — page-level tips

Anything the merchant must know that is not a single setting (e.g. “Add the Availability filter in Search & Discovery so product counts stay exact”).

## Related files

```text
templates/…
sections/…
snippets/…
```
```

## Global docs

Rewrite `01-global-ui.md` so it covers:

1. Header / Footer / Announcement / Cart drawer / Quick View group / Additional Buttons — with screenshots of their section settings.
2. A new subsection **Theme settings** that walks every group under `screenshots/global-settings/` (Colors, Typography, Products, Product tiles, Countdown timer, Sale checkout timer, Collection tiles, Currency, Cart, Customer accounts, Search, Social media, Quick view, Additional Buttons, Favicon, Extras). Embed each PNG and list every setting from the matching group in `manifest.json`.
3. A **Flex PDP blocks** subsection covering `screenshots/theme-blocks/`, since those blocks are shared across product templates.

Also rewrite `00-INDEX.md` so it:

- Links every page doc.
- Links the Theme settings subsection.
- Links `screenshots/SCREENSHOT-INDEX.md`.
- States the theme version / last-capture date taken from `manifest.json.generatedAt`.

## Writing rules

- Audience: merchants and theme implementers, not developers only. Prefer plain English. Keep setting **ids** in backticks so power users can search them.
- Mirror the labels shown in the Theme Editor (use the translated `label` from the manifest, not the raw id).
- When a setting has options, list them: `Soft` / `Medium` / `Strong`.
- Never document settings that are not in `manifest.json`.
- Prefer relative image paths so the folder can be uploaded as-is (`./screenshots/...`).
- Do not invent marketing copy. Stick to what the theme actually does.
- Urdu / Roman Urdu is fine in short asides if it clarifies a merchant tip, but the primary language of the docs is English.
- After rewriting a file, leave a short checklist at the bottom:

```markdown
## Doc checklist
- [x] Overview table filled
- [x] Storefront walkthrough
- [x] Every section on the template documented
- [x] Screenshots embedded (or marked pending)
- [x] Setting tables match manifest.json
```

## Work order

1. Read `SCREENSHOT-INDEX.md` and `manifest.json` totals.
2. Rewrite `00-INDEX.md`.
3. Rewrite `01-global-ui.md` (global UI + Theme settings).
4. Rewrite each page file `02` → `35` in order. Skip a file only if its template has no matching screenshots **and** no entries in the manifest — then leave a stub that says why.
5. Finish by printing a summary:

```text
Docs written : N files
Screenshots used : N
Settings covered : N / manifest.totals.settings
Pending screenshots : N
```

## Out of scope

- Do not re-run the Playwright capture.
- Do not modify theme Liquid / CSS / schema.
- Do not delete existing screenshots.
- Do not invent a new file numbering scheme.
