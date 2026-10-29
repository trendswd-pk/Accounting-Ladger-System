/**
 * Playwright capture → ../Documentation/images/
 *
 * Usage:
 *   DOCS_URL=http://localhost:3000 DOCS_EMAIL=admin@admin.com DOCS_PASSWORD=admin123 \
 *     node capture-docs.js
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const OUT_DIR = path.resolve(__dirname, '../Documentation/images')
const BASE = (process.env.DOCS_URL || 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = process.env.DOCS_EMAIL || 'admin@admin.com'
const PASSWORD = process.env.DOCS_PASSWORD || 'admin123'

const DESKTOP = { width: 1280, height: 800 }
const MOBILE = { width: 375, height: 812 }

/** @type {{ n: number, file: string, route: string, what: string, notes: string }[]} */
const indexRows = []
let counter = 0

function ensureOut() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  for (const name of fs.readdirSync(OUT_DIR)) {
    if (/^\d{2}-.+\.png$/i.test(name)) fs.unlinkSync(path.join(OUT_DIR, name))
  }
}

function nextName(slug) {
  counter += 1
  return `${String(counter).padStart(2, '0')}-${slug}.png`
}

async function shot(page, slug, route, what, notes = '') {
  const file = nextName(slug)
  const full = path.join(OUT_DIR, file)
  await page.waitForTimeout(350)
  await page.screenshot({ path: full, fullPage: true, animations: 'disabled' })
  indexRows.push({ n: counter, file, route, what, notes })
  console.log('saved', file)
  return file
}

async function waitReady(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(400)
}

async function openNavIfNeeded(page, isMobile) {
  if (!isMobile) return
  const btn = page.locator('button').filter({ has: page.locator('svg') }).first()
  const menu = page.getByRole('button', { name: /menu|open/i }).first()
  if ((await menu.count()) > 0) {
    await menu.click().catch(() => {})
  } else if ((await page.locator('header button').count()) > 0) {
    await page.locator('header button').first().click().catch(() => {})
  }
  await page.waitForTimeout(300)
}

async function gotoNav(page, label, href) {
  const link = page.locator(`a[href="${href}"]`).first()
  if ((await link.count()) > 0) {
    await link.click()
  } else {
    await page.goto(`${BASE}${href}`)
  }
  await waitReady(page)
}

async function expandGroup(page, name) {
  const btn = page.getByRole('button', { name }).or(page.locator('button').filter({ hasText: name })).first()
  if ((await btn.count()) > 0) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(200)
  }
}

async function tryOpenAddModal(page) {
  const candidates = [
    page.getByRole('button', { name: /add transaction|new transaction|add entry/i }),
    page.getByRole('button', { name: /^add$/i }),
    page.locator('button').filter({ hasText: /add transaction/i }),
  ]
  for (const c of candidates) {
    if ((await c.count()) > 0) {
      await c.first().click()
      await page.waitForTimeout(400)
      return true
    }
  }
  return false
}

async function closeModal(page) {
  const cancel = page.getByRole('button', { name: /cancel|close/i }).first()
  if ((await cancel.count()) > 0) {
    await cancel.click().catch(() => {})
  } else {
    await page.keyboard.press('Escape')
  }
  await page.waitForTimeout(250)
}

async function loginFlow(page) {
  await page.goto(`${BASE}/login`)
  await waitReady(page)
  await shot(page, 'login', '/login', 'Demo Mode login with account cards', 'before submit')

  // Prefer account card click (fills + signs in)
  const adminCard = page.locator('button').filter({ hasText: /Admin/i }).first()
  if ((await adminCard.count()) > 0) {
    await adminCard.click()
  } else {
    await page.fill('#login-email', EMAIL)
    await page.fill('#login-password', PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
  }

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
  await waitReady(page)
  // Dashboard landmark
  await page.getByText(/dashboard|northline|balance|today/i).first().waitFor({ timeout: 15000 }).catch(() => {})
}

async function captureDesktop(browser) {
  const context = await browser.newContext({ viewport: DESKTOP })
  const page = await context.newPage()
  await loginFlow(page)

  await shot(page, 'dashboard', '/', 'Dashboard after login', 'seeded KPIs/charts')

  if (await tryOpenAddModal(page)) {
    await shot(page, 'dashboard-add-transaction-modal', '/', 'Add transaction modal from dashboard', '')
    await closeModal(page)
  }

  const routes = [
    ['transactions', '/transactions', 'Transactions journal'],
    ['accounts', '/accounts', 'Accounts list'],
    ['cash-savings', '/cash-savings', 'Cash & Savings'],
    ['payable', '/payable', 'Payable'],
    ['receivable', '/receivable', 'Receivable'],
    ['expenses', '/expenses', 'Expenses'],
    ['expenses-daily', '/expenses/daily', 'Daily Expense'],
    ['expenses-monthly', '/expenses/monthly', 'Monthly Expense'],
    ['investment', '/investment', 'Investment'],
    ['settings', '/settings', 'Settings General'],
    ['settings-profile', '/settings/profile', 'Profile'],
    ['settings-account-type', '/settings/account-type', 'Account Type'],
    ['settings-cash-type', '/settings/cash-type', 'Cash Type'],
  ]

  for (const [slug, href, what] of routes) {
    await page.goto(`${BASE}${href}`)
    await waitReady(page)
    await shot(page, slug, href, what, '')
  }

  // Transactions modal
  await page.goto(`${BASE}/transactions`)
  await waitReady(page)
  if (await tryOpenAddModal(page)) {
    await shot(page, 'transactions-add-modal', '/transactions', 'Add transaction modal', 'Cancel after shot')
    await closeModal(page)
  }

  await context.close()
}

async function captureMobile(browser) {
  const context = await browser.newContext({
    viewport: MOBILE,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  await loginFlow(page)
  await shot(page, 'mobile-dashboard', '/', 'Mobile dashboard', '375×812')

  await openNavIfNeeded(page, true)
  await shot(page, 'mobile-nav', '/', 'Mobile navigation open', '')

  await page.goto(`${BASE}/transactions`)
  await waitReady(page)
  await shot(page, 'mobile-transactions', '/transactions', 'Mobile transactions', '')

  await page.goto(`${BASE}/settings`)
  await waitReady(page)
  await shot(page, 'mobile-settings', '/settings', 'Mobile settings', '')

  await context.close()
}

function writeIndex() {
  const lines = [
    '# Screenshot index',
    '',
    `- Captured: ${new Date().toISOString()}`,
    `- Base URL: ${BASE}`,
    `- User: ${EMAIL}`,
    `- PNG count: ${indexRows.length}`,
    '',
    '| # | file | route | what | notes |',
    '|---|------|-------|------|-------|',
    ...indexRows.map(
      (r) => `| ${r.n} | \`${r.file}\` | \`${r.route}\` | ${r.what} | ${r.notes || '—'} |`
    ),
    '',
  ]
  fs.writeFileSync(path.join(OUT_DIR, 'SCREENSHOT-INDEX.md'), lines.join('\n'))
  console.log('Wrote SCREENSHOT-INDEX.md —', indexRows.length, 'PNGs')
}

async function main() {
  ensureOut()
  // Wait for server
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE)
      if (res.ok || res.status === 200 || res.status === 304) break
    } catch {
      /* retry */
    }
    if (i === 39) {
      console.error('Demo server not reachable at', BASE)
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, 500))
  }

  const browser = await chromium.launch({ headless: true })
  try {
    await captureDesktop(browser)
    await captureMobile(browser)
  } finally {
    await browser.close()
  }
  writeIndex()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
