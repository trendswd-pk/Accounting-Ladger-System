# Portfolio Project Setup — Master Prompt (Demo → Screenshots → Docs → Rules → README)

> **Kaise use karein:** Is file ka **CONFIG** section pehle bharo, phir **MASTER PROMPT** wala hissa Cursor me naye project par paste karo.  
> Cursor **Phase 1 → 2 → 3 → 4 → 5 → 6** order follow karega — pehle **in-app Demo Mode** + `demo-mode/demo.json`, phir docs skeleton, screenshots, full docs, Cursor rules, phir root **`README.md`**.

**Short Urdu flow:**
```text
1) Demo Mode MAIN PRODUCT ke ANDAR (alag twin app NAHI)
   - Login page ke neeche simple button: “Enter Demo Mode” / “Try Demo (no login)”
   - Bina username/password — same web app pe guest demo session
   - Product final / live hone ke baad enable (feature flag OK jab tak ready na ho)
   - Portfolio ke liye sirf demo-mode/demo.json (+ short README) — JSON metadata only
2) Documentation/ skeleton (version + CHANGELOG + nav)
3) Playwright screenshots → Documentation/images/ ONLY (main app + Demo Mode)
4) English client-facing docs — har screenshot ./images/ se link
5) .cursor/rules/ — har change pe CHANGELOG + daily version bump
6) Root README.md — professional rewrite; images Documentation/images/ se embed

⚠️ HARD: Alag `demo-mode/` Next/React twin app / separate Vercel project MAT banao.
   Demo = same deployed product. `demo-mode/` folder = portfolio JSON only.
```

---

## CONFIG — pehle yeh values bharo (paste se pehle)

```text
PRODUCT_NAME     = My App Name
APP_SLUG         = my-app-slug
CATEGORY_TYPE    = web-app
VERSION          = 1.0.0
RELEASE_DATE     = 2026-09-07

# Public URL of the MAIN product (same deploy visitors use).
# Empty OK until go-live; then set in demo-mode/demo.json → live_demo_url.
LIVE_DEMO_URL    = https://your-app.vercel.app

# Optional — Google Play Store listing (Android apps / companion apps).
# Empty if no Play app. Portfolio shows a "Play Store" button like Live Demo.
PLAY_STORE_URL   = https://play.google.com/store/apps/details?id=com.example.app

# Local URL while capturing screenshots (auto-detect OK if empty)
LOCAL_DEMO_URL   = http://localhost:3000

# Portfolio metadata folder only (NOT a twin app)
DEMO_FOLDER      = demo-mode
DOCS_FOLDER      = Documentation
SCREENSHOT_DIR   = Documentation/images

# Optional: only if you keep staff login cards in addition to the guest Demo button.
# NEVER put these in demo.json.
DEMO_ADMIN_EMAIL = admin@admin.com
DEMO_ADMIN_PASS  = admin123

# Trends WD brand assets (live — download from here, do not invent new logos)
BRAND_LOGO_URL     = https://www.trendswd.com/logo.png
BRAND_FAVICON_URL  = https://www.trendswd.com/favicon.png
BRAND_ICON_URL     = https://www.trendswd.com/icon.png
```

`CATEGORY_TYPE` examples (navbar / `/our-projects/[category]`):
- `web-app` → route `/our-projects/web-apps` (label: Web Applications)
- `shopify-theme` → `/our-projects/shopify-themes`
- `mobile-app` → `/our-projects/mobile-apps`
- `hide` → product portfolio se hide (client ko dikhega nahi)

### Trends WD live brand assets (source of truth)

| Asset | Live URL |
|-------|----------|
| Logo (navbar / footer) | `https://www.trendswd.com/logo.png` |
| Favicon (browser tab) | `https://www.trendswd.com/favicon.png` |
| App icon (Next `app/icon.png` / apple) | `https://www.trendswd.com/icon.png` |

Canonical site: `https://trendswd.com/` (redirects to `www`). Always download from these live URLs — do not invent a new logo for the product or Demo Mode.

---

## MASTER PROMPT (yahan se copy karo → Cursor)

You are setting up this repository for the **Trends WD portfolio pipeline**.

Work in **strict order**. Do not skip ahead. Finish each phase’s acceptance checklist before starting the next.

**Demo Mode model (CRITICAL):** Demo Mode lives **inside the main product** (same routes, same deploy). Do **not** scaffold a separate offline twin app under `demo-mode/`. The `demo-mode/` folder exists only for portfolio metadata (`demo.json` + short README). On the product **login page**, add a clear secondary button below the normal login form so visitors can enter Demo Mode **without username/password**. Enable that path when the product is ready for public demo (feature flag / env is OK until then).

**Client-facing quality is non-negotiable.** Demo Mode, screenshots, and Documentation are shown to real clients on the Trends WD portfolio. Everything must look **professional, polished, and trustworthy** — never unfinished, slangy, joke-filled, or internally messy.

Use these values from the human’s CONFIG (or detect sensible defaults from `package.json` / README if a field was left as placeholder):

| Key | Value |
|-----|--------|
| Product | `{{PRODUCT_NAME}}` |
| Slug | `{{APP_SLUG}}` |
| Category | `{{CATEGORY_TYPE}}` |
| Version | `{{VERSION}}` |
| Release date | `{{RELEASE_DATE}}` |
| Live demo URL | `{{LIVE_DEMO_URL}}` |
| Local demo URL | `{{LOCAL_DEMO_URL}}` |
| Demo metadata folder | `{{DEMO_FOLDER}}` (= `demo-mode` — JSON only, not a twin app) |
| Docs folder | `{{DOCS_FOLDER}}` (= `Documentation`) |
| Screenshots | `{{SCREENSHOT_DIR}}` (= `Documentation/images`) |
| Brand favicon | `https://www.trendswd.com/favicon.png` |
| Brand logo | `https://www.trendswd.com/logo.png` |
| Brand icon | `https://www.trendswd.com/icon.png` |

---

# GLOBAL — Professional client standards (ALL phases)

Apply these in Demo Mode, screenshots, docs, changelog, and Cursor rules.

### Tone & language
- Documentation language: **clear professional English** (UI labels match the app exactly).
- Write for a **business client / end user**, not for developers debugging the repo.
- No Hinglish, memes, jokes, emoji spam, or “lorem ipsum” left in visible UI or docs.
- No internal jargon that confuses clients: avoid “GitHub type”, “repo”, “hack”, “WIP dump”, “temp seed”, “TODO fill later” in client-visible copy.
- No maintainer rant / process dump at the top of `CHANGELOG.md` or guide pages.

### What MUST NOT appear in docs or demo UI
| Forbidden | Why |
|-----------|-----|
| Real customer PII, real emails of clients, real phone numbers | Privacy / trust |
| Production secrets, API keys, tokens, `.env` values | Security |
| Joke names (`test123`, `asdf`, `foo bar`, `xxx`, cartoon insults) | Unprofessional |
| Broken empty states on every page (“No data”, blank tables) when a seeded demo should look alive | Looks unfinished |
| Fake screenshot filenames that do not exist under `Documentation/images/` | Broken docs |
| Passwords inside `demo.json` or public markdown tables that look like a leak dump | Wrong place / scary |
| A separate twin app under `demo-mode/` that duplicates the whole product | Wrong model — demo is in-app |

### What SHOULD appear
- Realistic but **fictional** business data (neutral company names, plausible dates, clean currency/IDs).
- Consistent product naming (`{{PRODUCT_NAME}}`) everywhere.
- Clear Demo Mode banner so nobody confuses demo with a real signed-in account.
- Login page **guest Demo button** (no credentials) as the primary demo entry.
- Every guide screenshot linked as `![Description](./images/NN-name.png)` from `Documentation/`.
- Version + date kept in sync across `version.json`, `APP-VERSION.md`, `CHANGELOG.md`, `_meta/navigation.json`, and `index.md`.

### Screenshot + docs link rule (permanent)
1. Canonical PNG location: **`Documentation/images/` only**.
2. Guides under `Documentation/*.md` MUST use relative links: `./images/...`.
3. Capture against the **main app** running in Demo Mode (not a separate demo project).
4. After UI changes that affect screens, re-capture and update the matching guide + `SCREENSHOT-INDEX.md`.

### HARD — Demo Mode is IN the main product (no twin app)

**Wrong (forbidden):** Scaffolding a full Next/React/Streamlit clone under `demo-mode/`, separate `package.json` app, or a second Vercel project just for demo.

**Correct:**
| Layer | What to do |
|-------|------------|
| Runtime | Demo Mode is a mode/session **inside the main product** |
| Login UI | Normal login form + **below it** a simple “Enter Demo Mode” / “Try Demo (no login)” button |
| Entry | One click → guest demo session (no username/password) |
| Data | Seeded fictional data; mock paid/external APIs while in demo |
| Banner | Tasteful “Demo Mode” indicator while the guest session is active |
| Portfolio JSON | `demo-mode/demo.json` only (`live_demo_url` + optional `play_store_url` + `type` [+ SEO fields]) |
| Deploy | **One** public web URL = main product → `live_demo_url`. Android listing → `play_store_url` |
| Timing | Product final hone ke baad / go-live par Demo Mode enable; until then feature-flag / env gate OK |
| Docs | Professional client docs for **every** product type (web app, Shopify theme, mobile app, software) |

Optional: keep staff account cards for capture/QA — but the **required** client path is the no-login Demo button.

---

# PHASE 1 — In-app Demo Mode + portfolio `demo-mode/demo.json`

### Goal
1. Wire **Demo Mode inside the main product** so clients can explore the UI on the **same website** without signing up.
2. Create **minimal** `demo-mode/` metadata for the Trends WD portfolio Live Demo button.

### Target A — Portfolio metadata only

```text
demo-mode/
├── demo.json      # REQUIRED for portfolio Live Demo button
└── README.md      # short maintainer notes (how Demo Mode works in the main app)
```

**Do not** put app source, `package.json`, `public/`, or a twin UI under `demo-mode/`.

### Target B — Main product (REQUIRED)

Implement Demo Mode in the **root application**:

1. **Login page CTA (REQUIRED)**  
   Below the normal email/password (or OAuth) form, add a clear secondary button, e.g.:
   - “Enter Demo Mode”
   - “Try Demo — no login required”
   
   One click starts a guest demo session and routes into the app (dashboard/home).

2. **Guest session**  
   - No username/password for this path  
   - Session flag e.g. `demo:{{APP_SLUG}}:session` = guest  
   - Optional “Exit Demo” / return to login  

3. **Demo data**  
   - Professional fictional seed (tables, charts, settings look alive)  
   - While in Demo Mode: do not write to production DB / paid APIs; use mocks or isolated local/demo store  
   - Optional “Reset demo data”  

4. **Visibility**  
   - Tasteful Demo Mode banner / badge so it is never confused with a real account  

5. **Enable timing**  
   - If the product is not ready for public demo yet: gate with `NEXT_PUBLIC_DEMO_MODE=true` (or equivalent)  
   - When the main project goes live, enable the button and set `live_demo_url` to the **main** public URL  

### Branding
Use Trends WD assets on the **main product** as already designed (favicon/logo). Do not invent a separate demo branding pipeline under `demo-mode/`.

```bash
# Only if the main app still needs the favicon locally:
curl -fsSL -o public/favicon.png https://www.trendswd.com/favicon.png
```

### `demo.json` contract (REQUIRED)

Minimal (backward compatible):

```json
{
  "live_demo_url": "{{LIVE_DEMO_URL}}",
  "type": "{{CATEGORY_TYPE}}"
}
```

With Play Store (software / mobile companion apps):

```json
{
  "live_demo_url": "{{LIVE_DEMO_URL}}",
  "play_store_url": "{{PLAY_STORE_URL}}",
  "type": "{{CATEGORY_TYPE}}"
}
```

Optional SEO fields (portfolio site supports these when present):

```json
{
  "live_demo_url": "{{LIVE_DEMO_URL}}",
  "play_store_url": "{{PLAY_STORE_URL}}",
  "type": "{{CATEGORY_TYPE}}",
  "title": "{{PRODUCT_NAME}}",
  "architectureType": "Custom Web App",
  "techStack": ["Next.js", "Vercel"],
  "summary": "One-line client-facing summary.",
  "outcome": "Key business outcome visitors should notice.",
  "featured": false
}
```

**How the portfolio shows links**
| Field | Button on Trends WD project card / detail |
|-------|-------------------------------------------|
| `live_demo_url` | **Live Demo** (web / hosted demo) |
| `play_store_url` | **Play Store** (Google Play listing — same style as Live Demo) |

Omit `play_store_url` (or leave `""`) when there is no Android app yet. Never invent a fake Play link.

Rules:
- **Do NOT put username/password in `demo.json`.** Guest Demo needs no credentials; any staff logins stay on the login UI / maintainer README only.
- If `{{LIVE_DEMO_URL}}` is empty / placeholder, set `"live_demo_url": ""` and note in `demo-mode/README.md` only.
- If there is a Play app, set real `play_store_url` (e.g. `https://play.google.com/store/apps/details?id=…`).
- `type` = portfolio category slug (`web-app`, `shopify-theme`, `mobile-app`, …) or `hide`.
- After main product deploy, set `live_demo_url` to that **same** public URL — never invent a fake URL, never deploy a second “demo-only” app just for portfolio.
- Software that ships **both** web + Play app: set **both** URLs. Portfolio will show both buttons.

Also add a GitHub topic later (human): same as `type`.

### Demo Mode hard rules

| Do | Do NOT |
|----|--------|
| Same screens/routes/labels as the real product | Build a separate twin app under `demo-mode/` |
| Login page guest **Demo** button (no credentials) | Require signup/login to try the demo |
| Clear “Demo Mode” banner while guest session is on | Silent mode that looks like a real production account |
| Mock / isolate writes while in demo | Hit production Supabase/Firebase/SQL with demo clicks |
| Professional seed data | Empty or joke-filled screens |
| One deploy URL in `live_demo_url` | Separate Vercel Root Directory = `demo-mode` for a full app |

### Architecture (inside main product)

**Next.js / React / SPA**
1. Keep the real product UI.
2. Add demo helpers in the main codebase, e.g.:
   - `lib/demo/session.ts` — start/exit guest demo session
   - `lib/demo/store.ts` — isolated demo CRUD (localStorage / memory / demo DB)
   - `lib/demo/seed.ts` — professional fictional seed on first enter
3. On login page: render the Demo button under the form; `onClick` → start guest session → navigate to home.
4. Gate real mutations: if demo session → use demo store / mocks.
5. Storage keys example:
   ```text
   demo:{{APP_SLUG}}:session
   demo:{{APP_SLUG}}:guest:{resource}
   ```

**Streamlit / Python**
- Same idea: in-app “Enter Demo Mode” control; isolated demo dataset; banner; no twin folder app.

### Optional staff login cards
Account cards (admin/editor/viewer) are **optional** for QA/screenshots. The **required** client-facing path is the no-login Demo button. If you keep cards, document them in `demo-mode/README.md` only — not in `demo.json`.

### Phase 1 acceptance
- [ ] **No** twin Next/React app scaffolded under `demo-mode/`
- [ ] `demo-mode/demo.json` exists (`type` + `live_demo_url`, no passwords)
- [ ] `demo-mode/README.md` explains in-app Demo Mode + how to enable + URL TODO if needed
- [ ] Main product login page has a **simple Demo button below** the login form
- [ ] Button enters guest Demo Mode **without** username/password on the **same** app
- [ ] Demo banner visible; seed data looks professional
- [ ] Demo path does not write to production secrets/DB (mocks / isolation)
- [ ] Feature flag / enable plan documented if Demo is not public yet
- [ ] Print summary: how to enter Demo, flag name (if any), `demo.json` status, run command for main app

**STOP.** Print Phase 1 summary. Ask before Phase 2 only if Demo Mode cannot run. Otherwise continue.

---

# PHASE 2 — Documentation folder skeleton (`Documentation/`)

### Goal
Create the **portfolio docs folder structure** (stubs OK). Full prose is Phase 4 after screenshots exist.

### Target structure (REQUIRED)

```text
Documentation/
├── index.md
├── README.md
├── APP-VERSION.md
├── CHANGELOG.md
├── version.json
├── _meta/
│   └── navigation.json
├── images/                      # ONLY canonical screenshot folder
│   └── .gitkeep
├── 00-getting-started.md        # stub OK
└── (optional stub 01-*.md — or create fully in Phase 4)
```

### `version.json`
```json
{
  "name": "{{PRODUCT_NAME}}",
  "version": "{{VERSION}}",
  "released": "{{RELEASE_DATE}}"
}
```

### `_meta/navigation.json` (minimum)

```json
{
  "site": "{{PRODUCT_NAME}} Documentation",
  "base_url": "https://trendswd.com/projects/{{REPO_NAME}}/doc",
  "version": "{{VERSION}}",
  "version_date": "{{RELEASE_DATE}}",
  "navigation": [
    { "title": "Home", "path": "/docs", "file": "index.md" },
    {
      "title": "Getting started",
      "children": [
        { "title": "Version", "path": "/docs/APP-VERSION", "file": "APP-VERSION.md" },
        { "title": "Changelog", "path": "/docs/CHANGELOG", "file": "CHANGELOG.md" }
      ]
    },
    { "title": "Pages", "children": [] }
  ]
}
```

### `CHANGELOG.md` format (REQUIRED from day one)

Use Keep-a-Changelog style. Newest section on top. One section per **calendar day** of work (and/or per version bump):

```markdown
# Changelog

All notable changes to {{PRODUCT_NAME}} are documented here.

## [{{VERSION}}] — {{RELEASE_DATE}}

### Added
- Initial Demo Mode and documentation pipeline for portfolio publishing.

### Changed
- (none yet)

### Fixed
- (none yet)
```

Rules:
- Client-readable bullets (“Improved invoice filters”) — not git dump (“fix stuff”, “wip”).
- No secrets, no internal dispute notes, no “ask Ahmed” TODOs.
- Every meaningful product / docs / demo change later **must** append here (enforced in Phase 5 rules).

### `APP-VERSION.md`
Short professional version page: current version, release date, link to Changelog, what this release includes in 3–6 bullets.

### Stubs
- `index.md` — product name, version table, live demo placeholder from `demo-mode/demo.json`, “Screenshots pending”.
- `README.md` — pipeline note for maintainers: Demo → Screenshots → Docs → Rules.

### Phase 2 acceptance
- [ ] Folder tree exists under `Documentation/`
- [ ] `images/` ready for PNGs
- [ ] `version.json` / APP-VERSION / CHANGELOG / navigation version fields match
- [ ] Print: list of files created

**Continue to Phase 3.**

---

# PHASE 3 — Playwright screenshots → `Documentation/images/`

### Goal
Automate **full visual coverage** of the product in **Demo Mode**. Save PNGs for documentation **only** under `Documentation/images/`.

### Prefer
Run against the **main app** with guest Demo Mode entered (fictional professional data). Never production secrets / real customer data.

### Paths

| What | Path |
|------|------|
| Output PNGs (canonical) | `Documentation/images/` |
| Capture script | `scripts/capture-docs.js` (or repo-root `capture-docs.js`) |
| Index | `Documentation/images/SCREENSHOT-INDEX.md` |

Do **not** put the capture pipeline inside a twin `demo-mode/` app.

### Prerequisites
1. Confirm in-app Demo Mode works (login page → Demo button).
2. From **repo root**: `npm install` (or stack equivalent).
3. Install Playwright: `npm install -D playwright` && `npx playwright install chromium`.
4. Start **main app**: `npm run dev` — detect real port (`3000` / `3001` / `8501`).
5. Wait until HTTP responds, then run capture.
6. Env overrides:
   ```bash
   DOCS_URL={{LOCAL_DEMO_URL}}
   # Prefer guest Demo button (no credentials). Optional staff login only if needed:
   # DOCS_EMAIL={{DEMO_ADMIN_EMAIL}}
   # DOCS_PASSWORD={{DEMO_ADMIN_PASS}}
   node scripts/capture-docs.js
   ```

### Login / Demo entry
1. Screenshot login page **including** the “Enter Demo Mode” button.
2. Click the Demo button (preferred) — wait for real post-entry landmark (dashboard).
3. Optional staff-login pass only for permission-diff screens (`viewer-…` in filename).

### Coverage (must)
- Every main route / nav destination
- Primary CTAs, filters, tabs, row menus, create/edit **modals/drawers** (Cancel after shot)
- Tables with seed rows; charts after paint
- Mobile subset: home, open nav, 1 content page, settings/profile if exist  
Desktop `1280×800`, mobile `375×812`.

### Naming
```text
01-login.png
02-dashboard.png
03-…-modal.png
18-mobile-dashboard.png
```
Global counter; clear old numbered `*.png` in `Documentation/images/` on full recapture (keep `.gitkeep` / index handling clean).

### Script requirements
- Real selectors for **this** app
- Discover routes from sidebar / router
- Guard optional UI with `count()` checks
- Log each saved file; non-zero exit on hard failure
- npm script: `"screenshots": "node scripts/capture-docs.js"`
- Write files to **`Documentation/images/`**

### After capture
Write `Documentation/images/SCREENSHOT-INDEX.md`:
- datetime, base URL, entry method (Demo button / staff login)
- table: `# | file | route | what | notes`
- PNG count

### Phase 3 acceptance
- [ ] Main app + Demo Mode used as `DOCS_URL`
- [ ] PNGs exist under `Documentation/images/`
- [ ] Login (with Demo button) + main nav + important modals captured
- [ ] Mobile subset done
- [ ] `SCREENSHOT-INDEX.md` complete
- [ ] Print: path, count, re-run commands, skips

**Continue to Phase 4.**

---

# PHASE 4 — Full documentation using screenshots

### Goal
Write **complete, professional English** portfolio documentation under `Documentation/`, wiring real screenshots from `Documentation/images/`.

### Style
- One markdown guide per page / major screen: `01-login.md`, `02-dashboard.md`, …
- Flat numbered guides preferred
- Screenshots: `![Login](./images/01-login.png)` — **always** this relative form
- Exact UI labels; step-by-step for a new user / client trainee

### Professional docs — ALL product types (REQUIRED)

Documentation must be **client-ready and complete** whether the product is a Shopify theme, custom web app, business software, or mobile/Play Store app. Same quality bar everywhere.

| Product type | Docs must cover |
|--------------|-----------------|
| Shopify theme | Install, theme settings, sections/blocks, customization, FAQ, support |
| Web app / software | Getting started, every major screen, roles/permissions, workflows, FAQ |
| Mobile / Play app | Install from Play Store (link), login/demo, main flows, permissions, FAQ |
| Hybrid (web + Play) | Web guides **and** Play Store install/use; `index.md` lists both entry points |

### Every page guide MUST include
1. `# Title`
2. Version line (`{{VERSION}}`)
3. Route (or Android screen name)
4. Who can access
5. Screenshot(s) with `./images/...` paths
6. What this page/screen does
7. Layout at a glance
8. Numbered steps (exact button/field labels)
9. Fields / tables / modals / permissions as relevant
10. Errors & edge cases (user-facing, calm tone)
11. Related links

### Update
- `index.md` — product blurb, version table, **live demo URL** and **Play Store URL** (when set) from `demo-mode/demo.json`, how to open demo / install app, full index, simple ASCII app map
- `_meta/navigation.json` — every guide listed
- `APP-VERSION.md`, `CHANGELOG.md`, `version.json` — version fields equal
- Map each PNG from `SCREENSHOT-INDEX.md` into the correct guide
- If a shot is missing: keep correct `![...](./images/...)` placeholder and list under README “Screenshots still needed” (maintainer), not as broken client panic text on Home

### Do not
- Invent fake image filenames
- Scatter docs outside `Documentation/`
- Put maintainer-only walls of text at top of CHANGELOG or index
- Document a twin-app `demo-mode/` run path (old model)
- Include unprofessional seed examples in prose
- Ship thin/placeholder docs for themes or software — full professional coverage only

### Phase 4 acceptance
- [ ] Every major route / screen has a guide
- [ ] Every nav item file exists
- [ ] Screenshots wired via `./images/...` or listed missing for maintainers
- [ ] Version synced across meta / APP-VERSION / index / changelog / version.json
- [ ] Tone is client-professional (theme, software, or mobile — same bar)
- [ ] `demo-mode/demo.json` still valid; index shows live URL and Play Store URL when present

**Continue to Phase 5.**

---

# PHASE 5 — Cursor rules (auto CHANGELOG + version — permanent)

### Goal
Install project Cursor rules so **future changes** (any Cursor session in this repo) automatically:
1. Record what changed in `Documentation/CHANGELOG.md`
2. Keep version files in sync
3. Bump version when the day’s work warrants it
4. Keep docs/demo professional and screenshot links correct

Human should **not** need to re-explain this every time.

### Create these files

#### 1) `.cursor/rules/portfolio-product.mdc` (`alwaysApply: true`)

```markdown
---
description: Trends WD portfolio product — demo, docs, changelog, version discipline
alwaysApply: true
---

# Trends WD portfolio product rules

This repo ships on the Trends WD portfolio via in-app Demo Mode + `demo-mode/demo.json` + `Documentation/`.

## On every meaningful change (UI, features, demo, docs, fixes)

1. Update `Documentation/CHANGELOG.md` under **today’s date** (newest section on top).
   - If a section for today / current version already exists, append bullets there.
   - If not, add a new `## [x.y.z] — YYYY-MM-DD` section.
   - Use client-readable bullets (Added / Changed / Fixed / Removed).
   - Never log secrets, jokes, or internal blame notes.

2. Keep these version fields identical when you bump:
   - `Documentation/version.json` → `version`, `released`
   - `Documentation/APP-VERSION.md`
   - `Documentation/_meta/navigation.json` → `version`, `version_date`
   - `Documentation/index.md` version table
   - Top changelog section heading

3. **Version bump policy (do this without being asked):**
   - Same calendar day, small ongoing edits → keep same version; append CHANGELOG bullets under today’s section.
   - End of a work session with shippable changes, or a new calendar day with new changes → bump **patch** (`1.0.0` → `1.0.1`) and set `released` / `version_date` to **today**.
   - New user-facing feature set → bump **minor** (`1.0.x` → `1.1.0`).
   - Breaking workflow / major redesign → bump **major** (`1.x` → `2.0.0`).
   - Always sync all version files listed above in the same edit.

4. If UI screens changed: refresh Playwright screenshots into `Documentation/images/`, update `SCREENSHOT-INDEX.md`, and fix guide image links (`./images/...` only). Also refresh hero / gallery images in root `README.md` if those screens changed.

5. If Demo Mode behavior/seed changed: update the **in-app** demo helpers + any docs that describe those screens. Keep seed data professional. Keep the login-page guest Demo button working.

6. Never put passwords in `demo-mode/demo.json`. Never invent a fake `live_demo_url` or `play_store_url`.

7. **Do not create a twin app under `demo-mode/`.** That folder is portfolio JSON (+ short README) only. Demo Mode stays inside the main product; `live_demo_url` is the main public URL after go-live. Set `play_store_url` when an Android / Play Store app exists — portfolio shows a Play Store button like Live Demo.

8. Client-facing docs and root `README.md` stay professional English — no Hinglish, no meme copy, no empty “lorem” UI in screenshots.

9. When finishing a change set, briefly confirm in the reply: changelog updated + version (or “same version, bullets appended”). If README visuals/copy changed, say so.

10. After a full pipeline run (or when asked), keep root `README.md` aligned with product + `Documentation/` (see Phase 6). Prefer embedding screenshots from `Documentation/images/` via `Documentation/images/filename.png` — do not invent image paths.
```

#### 2) `.cursor/rules/documentation-screenshots.mdc`

```markdown
---
description: Documentation screenshot paths and linking
globs: Documentation/**/*.md
alwaysApply: false
---

# Documentation screenshots

- Canonical images live in `Documentation/images/`.
- In markdown guides link only as `![Alt](./images/file.png)`.
- Capture against the main app in Demo Mode (guest Demo button).
- Do not invent filenames; check `Documentation/images/SCREENSHOT-INDEX.md`.
- After adding/renaming images, update the matching guide and navigation if needed.
```

#### 3) Optional `AGENTS.md` (repo root, short pointer)

```markdown
# Agent notes

Follow `.cursor/rules/portfolio-product.mdc`.
Portfolio pipeline: in-app Demo Mode + `demo-mode/demo.json` + `Documentation/` (screenshots in `Documentation/images/`).
Demo entry: login page → “Enter Demo Mode” (no credentials) on the same deployed app.
On changes: update CHANGELOG and version files per the rule — do not wait to be asked.
After full setup (or UI screenshot changes): keep root `README.md` professional and embed key images from `Documentation/images/`.
```

### Phase 5 acceptance
- [ ] `.cursor/rules/portfolio-product.mdc` exists with `alwaysApply: true`
- [ ] Screenshot rule file exists
- [ ] Optional `AGENTS.md` pointer exists
- [ ] Rules mention CHANGELOG + version bump + professional tone + `./images/` links + README alignment + **in-app Demo Mode (no twin app)** + guest Demo button
- [ ] Print: paths created

**Continue to Phase 6.**

---

# PHASE 6 — Root `README.md` (professional + docs screenshots)

### Goal
After Demo, Docs, Screenshots, and Rules are done, rewrite / update the **repository root `README.md`** so GitHub visitors see a **professional product overview** — not a messy WIP dump. Pull **key screenshots from `Documentation/images/`** (already captured in Phase 3) into the README. Do **not** invent new image files; reuse docs screenshots.

### When to run
- **Always** at the end of a full pipeline (Phases 1–5 complete).
- Also when the human pastes the “Refresh README” follow-up after later UI/docs changes.

### Image rules for README
| Do | Do NOT |
|----|--------|
| Use existing PNGs under `Documentation/images/` | Invent filenames that do not exist |
| Link as `Documentation/images/02-dashboard.png` (from repo root) | Invent a twin-app screenshot folder |
| Pick 3–6 **best** screens (login + Demo button, dashboard + 2–4 core flows) | Dump every PNG into README |
| Check `Documentation/images/SCREENSHOT-INDEX.md` for real names | Hotlink random external placeholders |
| Keep alt text clear and professional | Use meme captions |

Suggested selection (adapt to this app; skip missing):
1. Dashboard / home after login  
2. One primary list or workflow screen  
3. One create/edit modal or detail view  
4. One settings / reports / secondary highlight  
5. Optional: mobile shot if it looks strong  

### README structure (REQUIRED — professional English)

Rewrite root `README.md` to roughly this shape (adapt section titles to the product; keep it tight):

```markdown
# {{PRODUCT_NAME}}

One clear sentence: what the product does for the client.

![Dashboard](Documentation/images/02-dashboard.png)

## Overview
2–4 short paragraphs or bullets: who it is for, main outcomes.

## Features
- Bullet list of real capabilities (from the app, not vaporware)

## Screenshots
![…](Documentation/images/…)
![…](Documentation/images/…)
(short caption under each image optional)

## Demo & downloads
- How to enter Demo Mode: open the app → login page → click **Enter Demo Mode** (no username/password)
- Live URL from `demo-mode/demo.json` → `live_demo_url` (same as main product URL after go-live; or “Deploy pending” if empty — calm wording)
- Play Store URL from `demo-mode/demo.json` → `play_store_url` when an Android app exists (omit section if empty)
- Point maintainers to `demo-mode/README.md` for enable flag / notes — do not dump credential tables

## Documentation
- Link to `Documentation/index.md` (and portfolio docs URL if known)
- Note that full guides and screenshots live under `Documentation/`

## Tech stack
Short accurate table/list from this repo.

## Getting started (production app, if applicable)
Install / env / run — only what is real for this repo. Never paste real secrets.

## Version
Current version from `Documentation/version.json` + link to `Documentation/CHANGELOG.md` / `APP-VERSION.md`.

## License / contact (optional)
Only if the repo already has a clear policy; otherwise omit or keep minimal (Trends WD).
```

### Professional tone (same as docs)
- Client-readable; no Hinglish, jokes, “WIP”, “asdf”, or internal GitHub process essays.
- No secrets, tokens, or production customer data.
- Prefer product language over “this repo was set up for the portfolio pipeline” (one short maintainer note at the bottom is OK if useful).

### Also update
- If an old README exists: **replace** messy sections; preserve only still-true install/env facts.
- Sync version string with `Documentation/version.json`.
- Append a CHANGELOG bullet under today: e.g. “Updated root README with product overview and documentation screenshots.” (bump version only if Phase 5 policy says so).

### Phase 6 acceptance
- [ ] Root `README.md` rewritten / updated in professional English
- [ ] Screenshots embedded from `Documentation/images/` only (verified files exist)
- [ ] Demo + Documentation sections point to real paths / URL from `demo.json`
- [ ] No fake images, no passwords in `demo.json`, no unprofessional copy
- [ ] CHANGELOG mentions README update if this pass changed it
- [ ] Print: README path + list of image files used

---

# FINAL OUTPUT (all phases)

Print one summary:

1. **Demo:** how to enter (login → Demo button), feature flag if any, `demo.json` (type + live_demo_url status), seed/professionalism notes — confirm **no twin app** under `demo-mode/`
2. **Screenshots:** `Documentation/images/` count, how to re-run
3. **Docs:** guide files, nav groups, missing images
4. **Rules:** changelog/version auto-discipline installed (paths)
5. **README:** root `README.md` updated; which `Documentation/images/` PNGs were embedded
6. **Human next steps:**
   - Deploy the **main product** → paste that public URL into `demo-mode/demo.json` → `live_demo_url`
   - Enable the login-page Demo button for public visitors if it was feature-flagged
   - Re-run Phase 6 / “Refresh README” after go-live so Live Demo link matches
   - Add GitHub topic = `{{CATEGORY_TYPE}}`
   - Ensure repo root has `demo-mode/demo.json` and `Documentation/` for portfolio sync

---

# Implementation order (never reverse)

1. Scan production: routes, auth, data, roles, externals  
2. **Phase 1** — in-app Demo Mode (login Demo button) + `demo-mode/demo.json` (JSON only)  
3. **Phase 2** — `Documentation/` skeleton + CHANGELOG/version  
4. **Phase 3** — Playwright against main app Demo Mode → `Documentation/images/`  
5. **Phase 4** — Full docs wired to `./images/` screenshots  
6. **Phase 5** — `.cursor/rules/` so future edits auto-update CHANGELOG + version  
7. **Phase 6** — Root `README.md` professional rewrite + embed screenshots from `Documentation/images/`  
8. Final summary + human go-live URL reminder (`live_demo_url` = main product URL)  

END OF MASTER PROMPT

---

## After deploy — URL set (short paste)

Jab **main product** live ho jaye, Cursor me yeh paste karo:

```text
Update demo-mode/demo.json:
- set "live_demo_url" to: {{PASTE_PUBLIC_MAIN_APP_URL_HERE}}
- if Play Store app exists, set "play_store_url" to: {{PASTE_PLAY_STORE_URL_HERE}}
- keep "type" unchanged unless I say otherwise
- do NOT add demo_credentials (guest Demo button needs no passwords)
Enable the public “Enter Demo Mode” button on the login page if it was feature-flagged.
Also update Documentation/index.md live demo + Play Store links to match.
Update root README.md Demo / downloads section to the same URLs.
Append Documentation/CHANGELOG.md (today) and bump patch version + sync version files per .cursor/rules.
Show me the final demo.json, version, and README Demo section.
```

### After Play Store publish (short paste)

```text
Update demo-mode/demo.json:
- set "play_store_url" to: {{PASTE_PLAY_STORE_URL_HERE}}
- keep live_demo_url and type unchanged unless I say otherwise
Update Documentation/index.md and root README.md to show the Play Store link.
Append CHANGELOG + bump patch per project rules.
Show final demo.json and the Play Store sections.
```

---

## Follow-ups (optional)

### Fix / finish Demo Mode
```text
Continue Demo Mode INSIDE the main product (do not create a twin app under demo-mode/).
Login page: keep a simple “Enter Demo Mode” button below the login form — no username/password.
Guest session + professional seed + Demo banner; mock/isolate production DB/APIs while in demo.
Update demo-mode/demo.json (type + live_demo_url) and demo-mode/README.md only for portfolio metadata.
Update CHANGELOG + version per project rules.
```

### Re-capture screenshots
```text
Re-run Playwright against the main app in Demo Mode (click guest Demo button).
Write PNGs to Documentation/images/ (clear old numbered PNGs), update SCREENSHOT-INDEX.md.
Wire guides with ./images/ links only.
Use DOCS_URL from CONFIG / README.
Update CHANGELOG if visuals/docs changed.
Then refresh root README.md screenshot gallery from Documentation/images/.
```

### Docs / app changes (ongoing — rules should already cover this)
```text
Apply .cursor/rules/portfolio-product.mdc:
- Update Documentation to match the app
- Refresh screenshots in Documentation/images/ if UI changed
- Append CHANGELOG under today; bump version when policy says so; sync version.json / APP-VERSION / navigation / index
- Keep root README.md aligned (copy + Documentation/images/ embeds)
Keep professional English and working ./images/ links.
```

### Refresh README only (after pipeline / after new screenshots)
```text
Run Phase 6 only: rewrite/update root README.md professionally.
Embed 3–6 key screenshots from Documentation/images/ (verify via SCREENSHOT-INDEX.md).
Sync Demo URL from demo-mode/demo.json and version from Documentation/version.json.
Update CHANGELOG for the README pass. Show which images were used.
```

---

## One-liner (Urdu/Hinglish)

```text
Is project me portfolio pipeline chalao (order lock):
1) Demo Mode MAIN APP ke andar — login page ke neeche “Enter Demo Mode” button (bina login)
   + demo-mode/ sirf demo.json (+ short README) — alag twin app / separate Vercel MAT banao
   + product live hone par live_demo_url = MAIN public URL
   + Play Store app ho to play_store_url bhi set karo (portfolio pe Live Demo jaisa Play Store button)
2) Documentation/ — professional full docs (theme / software / mobile — same quality bar)
3) Playwright → Documentation/images/ + SCREENSHOT-INDEX.md (main app + Demo Mode)
4) Client-facing English docs — screenshots sirf ./images/ se link
5) .cursor/rules/ — har change pe CHANGELOG + daily/session version bump
6) Root README.md — professional update; screenshots Documentation/images/ se embed
CONFIG pehle bharo. Full rules: Personal Notedbook/Portfolio-Project-Setup-Prompt.md
```
