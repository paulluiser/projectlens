// Screen review: captures every Lens screen, state and dialog at five widths, and runs an automated
// layout audit on each capture. Read-only: dialogs are opened, never saved.
// Usage (dev server on :5173): npx -y -p playwright@1.58.2 node scripts/capture-screens.mjs <outDir> [nameFilter] [sizeFilter]
// Set CHROME_PATH to use an already-downloaded Chromium.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const [out, filter, sizeFilter] = process.argv.slice(2)
const base = 'http://localhost:5173'
mkdirSync(out, { recursive: true })

const sizes = [
  ['1440', { width: 1440, height: 900 }],
  ['1280', { width: 1280, height: 800 }],
  ['1024', { width: 1024, height: 768 }],
  ['768', { width: 768, height: 1024 }],
  ['390', { width: 390, height: 844 }],
]

// Fixture: give some milestones dates (in memory only) so the dated roadmap, calendar and agenda render.
function withDates(body) {
  const data = JSON.parse(body)
  const project = data.projects.find(item => item.id === 'hrdotnet-mobile')
  const dates = [['2026-10-01', '2026-10-20'], [null, '2026-11-05'], ['2026-11-02', '2026-11-18'], [null, '2026-11-23'], [null, '2026-11-23'], [null, '2026-11-23'], ['2026-11-24', '2026-12-12'], [null, '2027-01-15']]
  project.milestones.forEach((item, index) => {
    const [start, due] = dates[index] ?? []
    if (due) { item.dueDate = due; if (start) item.startDate = start }
    if (index === 1) item.owner = 'Product and QA leads, mobile platform squad'
  })
  return JSON.stringify(data)
}

const button = name => async page => { await page.getByRole('button', { name, exact: true }).first().click(); await page.waitForTimeout(450) }
const steps = (...actions) => async page => { for (const action of actions) await action(page) }
const css = selector => async page => { await page.locator(selector).first().click(); await page.waitForTimeout(450) }
const tab = name => async page => { await page.locator('.editor-section-nav button', { hasText: name }).first().click(); await page.waitForTimeout(300) }
const dated = true

const screens = [
  ['01-landing', '/landing'],
  ['02-features', '/landing/features'],
  ['03-how-it-works', '/landing/how-it-works'],
  ['04-use-cases', '/landing/use-cases'],
  ['05-updates', '/landing/updates'],
  ['10-overview', '/landing/overview'],
  ['11-projects', '/landing/projects'],
  ['12-projects-search-hit', '/landing/projects?q=sims'],
  ['12-projects-search-none', '/landing/projects?q=zzz'],
  ['13-project-sims', '/landing/projects/simsdotnet'],
  ['13-project-pms', '/landing/projects/performance-management-system-pms'],
  ['13-project-sorted', '/landing/projects/simsdotnet?sort=oldest'],
  ['14-sidebar-collapsed', '/landing/overview', async page => { if (page.viewportSize().width > 760) await css('#sidebar-toggle')(page) }],
  ['15-drawer', '/landing/overview', async page => { if (page.viewportSize().width <= 760) await css('#sidebar-toggle')(page) }],
  ['16-mobile-search', '/landing/overview', async page => { if (page.viewportSize().width <= 760) await css('.mobile-search-toggle')(page) }],
  ['20-report-progress', '/landing/projects/simsdotnet/2026-10/progress'],
  ['20-report-progress-pms', '/landing/projects/performance-management-system-pms/2026-10/progress'],
  ['20-report-progress-sept', '/landing/projects/simsdotnet/2026-09/progress'],
  ['21-report-accomplishments', '/landing/projects/simsdotnet/2026-10/accomplishments'],
  ['22-report-blockers', '/landing/projects/simsdotnet/2026-10/blockers'],
  ['23-report-next-month', '/landing/projects/simsdotnet/2026-10/next-month'],
  ['23-report-next-month-day', '/landing/projects/simsdotnet/2026-10/next-month', css('.calendar-deadline')],
  ['23-report-next-month-collapsed', '/landing/projects/simsdotnet/2026-10/next-month', css('.calendar-toggle')],
  ['24-report-ended', '/landing/projects/simsdotnet/2026-10/next-month', button('Finish review')],
  ['25-present-home', '/landing/projects/simsdotnet/2026-10/progress?present=1'],
  ['26-present-chapter', '/landing/projects/simsdotnet/2026-10/progress?present=1&view=chapter'],
  ['26-present-next-month', '/landing/projects/simsdotnet/2026-10/next-month?present=1&view=chapter'],
  ['27-report-share', '/landing/projects/simsdotnet/2026-10/progress', css('.record-toolbar button[aria-label*="hare" i], .record-toolbar button[title*="hare" i]')],
  ['28-report-month-missing', '/landing/projects/simsdotnet/2026-01/progress'],
  ['30-milestones-roadmap', '/landing/projects/hrdotnet-mobile/milestones'],
  ['30-milestones-roadmap-dated', '/landing/projects/hrdotnet-mobile/milestones', null, dated],
  ['30-milestones-row-expanded', '/landing/projects/hrdotnet-mobile/milestones', css('.milestone-detail-toggle'), dated],
  ['31-milestones-calendar', '/landing/projects/hrdotnet-mobile/milestones?view=calendar', null, dated],
  ['31-milestones-calendar-day', '/landing/projects/hrdotnet-mobile/milestones?view=calendar', css('.milestone-calendar-day:has(.milestone-calendar-dots i)'), dated],
  ['32-milestones-list', '/landing/projects/hrdotnet-mobile/milestones?view=list', null, dated],
  ['32-milestones-filtered', '/landing/projects/hrdotnet-mobile/milestones?status=in-progress'],
  ['32-milestones-search-none', '/landing/projects/hrdotnet-mobile/milestones?search=zzz'],
  ['32-milestones-sims', '/landing/projects/simsdotnet/milestones'],
  ['33-milestone-status-menu', '/landing/projects/hrdotnet-mobile/milestones', css('.milestone-status-trigger')],
  ['40-dialog-create-project', '/landing/projects', button('Create project')],
  ['40-dialog-create-project-invalid', '/landing/projects', steps(button('Create project'), async page => { await page.locator('[role="dialog"] .editor-footer button').last().click(); await page.waitForTimeout(300) })],
  ['41-dialog-edit-report', '/landing/projects/simsdotnet/2026-10/progress', button('Edit report')],
  ['41-dialog-edit-report-progress', '/landing/projects/simsdotnet/2026-10/progress', steps(button('Edit report'), tab('Progress'))],
  ['41-dialog-edit-report-accomplishments', '/landing/projects/simsdotnet/2026-10/progress', steps(button('Edit report'), tab('Accomplishments'))],
  ['41-dialog-edit-report-blockers', '/landing/projects/simsdotnet/2026-10/progress', steps(button('Edit report'), tab('Blockers'))],
  ['41-dialog-edit-report-next', '/landing/projects/simsdotnet/2026-10/progress', steps(button('Edit report'), tab('Next month'))],
  ['42-dialog-create-report', '/landing/projects/simsdotnet', button('Create report')],
  ['43-dialog-delete-report', '/landing/projects/simsdotnet/2026-10/progress', css('.record-toolbar button[aria-label^="Delete" i]')],
  ['44-dialog-create-milestone', '/landing/projects/hrdotnet-mobile/milestones', button('Create milestone')],
  ['44-dialog-create-milestone-invalid', '/landing/projects/hrdotnet-mobile/milestones', steps(button('Create milestone'), button('Save milestone'))],
  ['45-dialog-edit-milestone', '/landing/projects/hrdotnet-mobile/milestones', css('.milestone-item button[aria-label^="Edit" i]')],
  ['46-dialog-delete-milestone', '/landing/projects/hrdotnet-mobile/milestones', css('.milestone-item button[aria-label^="Delete" i]')],
  ['60-project-overview', '/landing/projects/simsdotnet/overview'],
  ['60-project-overview-empty', '/landing/projects/hrdotnet-mobile/overview'],
  ['61-weekly-board', '/landing/projects/simsdotnet/weekly'],
  ['61-weekly-list', '/landing/projects/simsdotnet/weekly?view=list'],
  ['61-weekly-filtered-none', '/landing/projects/simsdotnet/weekly?search=zzz'],
  ['61-weekly-empty', '/landing/projects/hrdotnet-mobile/weekly'],
  ['62-weekly-status-menu', '/landing/projects/simsdotnet/weekly', css('.task-status-trigger')],
  ['63-dialog-new-week', '/landing/projects/simsdotnet/weekly', button('New week')],
  ['63-dialog-edit-week', '/landing/projects/simsdotnet/weekly', button('Edit week')],
  ['63-dialog-add-task', '/landing/projects/simsdotnet/weekly', css('.weekly-toolbar-end [data-slot="button"]')],
  ['63-dialog-delete-task', '/landing/projects/simsdotnet/weekly?view=board', css('.task-card button[aria-label^="Delete"]')],
  ['50-missing-page', '/landing/nowhere'],
  ['51-project-unavailable', '/landing/projects/nope'],
  ['52-milestones-unavailable', '/landing/projects/nope/milestones'],
]

// Automated layout audit, run in the page. Flags: content touching a bordered box's edge, clipped text,
// overlapping text, small tap targets, off-scale font sizes, and horizontal overflow.
function audit() {
  const findings = []
  const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05 }
  const label = el => (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase()) + ` "${(el.innerText || '').trim().slice(0, 32).replace(/\s+/g, ' ')}"`
  const root = document.querySelector('[role="dialog"]') ?? document.body
  if (document.documentElement.scrollWidth > innerWidth + 1) findings.push(`page overflows by ${document.documentElement.scrollWidth - innerWidth}px`)
  const textRects = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: node => node.textContent.trim() && node.parentElement && visible(node.parentElement) && !node.parentElement.closest('.sr-only, [aria-hidden="true"] .sr-only, script, style, option') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT })
  while (walker.nextNode()) {
    const range = document.createRange(); range.selectNodeContents(walker.currentNode)
    for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) textRects.push({ el: walker.currentNode.parentElement, r })
  }
  // 1. content touching the edge of a bordered, rounded box (missing padding)
  for (const box of root.querySelectorAll('*')) {
    const s = getComputedStyle(box)
    const bordered = ['Top', 'Right', 'Bottom', 'Left'].every(side => parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none') && parseFloat(s.borderTopLeftRadius) >= 6
    if (!bordered || !visible(box) || box.matches('input, select, textarea, button, a, [data-slot="button"], .lozenge, .task-flag, kbd, progress')) continue
    const b = box.getBoundingClientRect()
    const inside = textRects.filter(t => box.contains(t.el) && !t.el.closest('button, a, input, select, .lozenge, [data-slot="button"], table'))
    const min = Math.min(...inside.map(t => Math.min(t.r.left - b.left, b.right - t.r.right, t.r.top - b.top)))
    if (inside.length && min < 7) findings.push(`edge: text ${Math.round(min)}px from border of ${label(box)}`)
  }
  // 2. clipped text without an ellipsis
  for (const el of root.querySelectorAll('*')) {
    if (!visible(el) || !el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue
    const s = getComputedStyle(el)
    if (/(hidden|clip)/.test(s.overflowX + s.overflow) && el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== 'ellipsis' && !el.closest('.sr-only')) findings.push(`clipped: ${label(el)}`)
  }
  // 3. overlapping text from different elements
  for (let i = 0; i < textRects.length; i++) for (let j = i + 1; j < textRects.length; j++) {
    const a = textRects[i], c = textRects[j]
    if (a.el === c.el || a.el.contains(c.el) || c.el.contains(a.el)) continue
    const w = Math.min(a.r.right, c.r.right) - Math.max(a.r.left, c.r.left), h = Math.min(a.r.bottom, c.r.bottom) - Math.max(a.r.top, c.r.top)
    if (w > 3 && h > 3) findings.push(`overlap: ${label(a.el)} × ${label(c.el)}`)
  }
  // 4. small tap targets
  for (const el of root.querySelectorAll('a[href], button, select, input:not([type=hidden]), [role="button"]')) {
    if (!visible(el) || el.closest('.sr-only, .skip-link, p, li > p, .lx-footer-grid')) continue
    const r = el.getBoundingClientRect()
    if (r.height < 24 || r.width < 24) findings.push(`target ${Math.round(r.width)}×${Math.round(r.height)}: ${label(el)}`)
  }
  // 5. font sizes off the Kern scale (fluid h1/display sizes excluded)
  const scale = new Set([10, 11, 12, 13, 14, 16, 18, 20, 24])
  const seen = new Set()
  for (const t of textRects) { const size = parseFloat(getComputedStyle(t.el).fontSize); if (size < 25 && !scale.has(Math.round(size * 10) / 10)) seen.add(`${size}px ${label(t.el)}`) }
  for (const entry of [...seen].slice(0, 6)) findings.push(`font off-scale: ${entry}`)
  return [...new Set(findings)]
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
const report = {}
for (const [size, viewport] of sizes) {
  if (sizeFilter && size !== sizeFilter) continue
  const phone = viewport.width < 600
  for (const [name, path, act, fixture] of screens) {
    if (filter && !name.includes(filter)) continue
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', isMobile: phone, hasTouch: phone })
    if (fixture) await context.route('**/api/workspace', async route => { const response = await route.fetch(); await route.fulfill({ response, body: withDates(await response.text()) }) })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const id = `${name}-${size}`
    try {
      await page.goto(base + path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      if (act) await act(page)
      const findings = [...await page.evaluate(audit), ...errors.map(message => `pageerror: ${message}`)]
      const dialog = await page.locator('[role="dialog"]').count()
      await page.screenshot({ path: `${out}/${id}.png`, fullPage: !dialog })
      report[id] = findings
      console.log(`${id}${findings.length ? `  ${findings.length} finding(s)` : ''}`)
    } catch (error) { report[id] = [`FAILED ${error.message.split('\n')[0]}`]; console.log(`${id} FAILED ${error.message.split('\n')[0]}`) }
    await context.close()
  }
}
writeFileSync(`${out}/audit.json`, JSON.stringify(report, null, 2))
await browser.close()
