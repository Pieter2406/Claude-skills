#!/usr/bin/env node
// Automated part of an app-ux review: opens a page at phone sizes, measures what a browser can measure and reports it
// per checklist ID (references/checklist.md), with a screenshot per size. It measures; it doesn't judge the design.
//
//   node audit.mjs <url> [--out dir] [--sizes phone,small,tablet,desktop] [--click "<selector>"]...
//                  [--storage state.json] [--wait ms] [--json]
//
// --click     open a state before measuring (a dialog, a tab); repeatable, applied in order.
// --storage   JSON object of localStorage entries set before the page loads.
// --wait      extra milliseconds to wait after load (live data, fonts). Default 800.
// Uses axe-core too when it can be resolved (npm i -D axe-core), adding its WCAG findings.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = { click: [] };
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') opt.json = true;
  else if (a === '--click') opt.click.push(argv[++i]);
  else if (a.startsWith('--')) opt[a.slice(2)] = argv[++i];
  else pos.push(a);
}
const url = pos[0];
if (!url) { console.error('Usage: node audit.mjs <url> [--out dir] [--sizes phone,small] [--click sel]... [--storage file] [--wait ms] [--json]'); process.exit(1); }
const out = opt.out || 'ux-audit';
mkdirSync(out, { recursive: true });

const load = (name) => {
  for (const base of [import.meta.url, `${process.cwd()}/`]) { try { return createRequire(base)(name); } catch { /* next */ } }
  return null;
};
const pw = load('playwright');
if (!pw) { console.error('Playwright not found: npm i -D playwright && npx playwright install chromium'); process.exit(2); }
const axePath = (() => { for (const base of [import.meta.url, `${process.cwd()}/`]) { try { return createRequire(base).resolve('axe-core/axe.min.js'); } catch { /* next */ } } return null; })();

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  small: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1366, height: 860 } },
};
const sizes = (opt.sizes || 'phone,small').split(',');
const storage = opt.storage ? JSON.parse(readFileSync(opt.storage, 'utf8')) : null;

// ------------------------------------------------------------------ in-page measurements (runs in the browser)
function measure({ mobile }) {
  const vw = innerWidth; const vh = innerHeight;
  const res = [];
  const add = (id, level, msg, items = []) => res.push({ id, level, msg, items: items.slice(0, 12), count: items.length });
  const desc = (el) => {
    const t = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}${t ? ` "${t}"` : ''}`;
  };
  // Only what the user can reach now: inside the top-most open modal dialog if there is one.
  const modal = [...document.querySelectorAll('dialog[open]')].filter((d) => d.matches(':modal')).pop();
  const scope = modal || document.body;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    if (s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)') return false; // sr-only
    if (el.closest('[hidden], [inert], dialog:not([open])')) return false;
    return true;
  };
  const inView = (r) => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  const interactive = [...scope.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [tabindex]:not([tabindex="-1"])')].filter(visible);

  // MOB-1 / MOB-2: target size (inline links inside running text are exempt)
  const small = []; const tiny = [];
  for (const el of interactive) {
    if (el.tagName === 'A' && el.closest('p, li') && el.parentElement.textContent.trim().length > el.textContent.trim().length + 20) continue;
    let r = el.getBoundingClientRect();
    const lab = el.matches('input[type=checkbox], input[type=radio]') && (el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`)));
    if (lab) r = lab.getBoundingClientRect();
    const w = Math.round(r.width); const h = Math.round(r.height);
    if (w < 24 || h < 24) tiny.push(`${desc(el)} ${w}×${h}`);
    else if (w < 44 || h < 44) small.push(`${desc(el)} ${w}×${h}`);
  }
  if (tiny.length) add('MOB-1', 'fail', 'Targets below 24×24 CSS px (WCAG 2.5.8)', tiny);
  if (small.length) add('MOB-1', 'warn', 'Targets below 44×44 CSS px (recommended for touch)', small);

  // MOB-4: interactive elements in the hard-to-reach top band of a phone
  if (mobile) {
    const top = interactive.filter((el) => { const r = el.getBoundingClientRect(); return inView(r) && (r.top + r.height / 2) < vh * 0.2; });
    if (top.length) add('MOB-4', 'warn', 'Controls in the top 20 % of the screen (hard to reach one-handed): fine for rare actions only', top.map(desc));
  }

  // MOB-6: safe areas
  const vp = document.querySelector('meta[name=viewport]')?.content || '';
  const sheets = [];
  for (const ss of document.styleSheets) { try { sheets.push(...ss.cssRules); } catch { /* cross-origin */ } }
  const flat = []; const walk = (rules) => { for (const r of rules) { flat.push(r); if (r.cssRules) walk(r.cssRules); } }; walk(sheets);
  const css = flat.map((r) => r.cssText).join('\n');
  const usesSafe = /safe-area-inset/.test(css);
  if (!/viewport-fit\s*=\s*cover/.test(vp)) add('MOB-6', 'warn', 'No viewport-fit=cover: content stays inside the safe area, but fixed bars get letterboxed backgrounds on notched phones');
  else if (!usesSafe) add('MOB-6', 'fail', 'viewport-fit=cover without any env(safe-area-inset-*) in the CSS: content will sit under the status bar/home indicator');
  const safeSelectors = flat.filter((r) => r.selectorText && /safe-area-inset/.test(r.cssText)).map((r) => r.selectorText);
  const edge = [...document.querySelectorAll('body *')].filter((el) => {
    const s = getComputedStyle(el);
    if (!['fixed', 'sticky'].includes(s.position) && !(el.tagName === 'DIALOG' && el.open)) return false;
    if (!visible(el)) return false;
    const r = el.getBoundingClientRect();
    return r.top <= 1 || r.bottom >= vh - 1;
  });
  const unsafe = edge.filter((el) => ![el, ...el.children].some((x) => safeSelectors.some((sel) => { try { return x.matches(sel); } catch { return false; } })));
  if (viewportFit() && unsafe.length) add('MOB-6', 'warn', 'Fixed/sticky elements or open dialogs touching a screen edge with no safe-area rule on them or their children', unsafe.map(desc));
  function viewportFit() { return /viewport-fit\s*=\s*cover/.test(vp); }

  // MOB-8: share of the viewport covered by fixed/sticky UI
  const fixed = [...document.querySelectorAll('body *')].filter((el) => getComputedStyle(el).position === 'fixed' && visible(el) && !el.closest('dialog'));
  const covered = fixed.reduce((n, el) => { const r = el.getBoundingClientRect(); return n + Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) * (Math.min(r.width, vw) / vw); }, 0);
  if (!modal && covered / vh > 0.25) add('MOB-8', 'warn', `Fixed UI covers ${Math.round((covered / vh) * 100)} % of the viewport (> 25 %)`, fixed.map(desc));

  // MOB-12: zoom and input font size
  if (/user-scalable\s*=\s*(no|0)/.test(vp) || (/maximum-scale\s*=\s*([\d.]+)/.exec(vp)?.[1] ?? 9) < 2) add('MOB-12', 'fail', `Pinch zoom disabled in the viewport meta: "${vp}"`);
  const zoomers = [...scope.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]), select, textarea')].filter(visible).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16);
  if (zoomers.length) add('MOB-12', 'warn', 'Form fields with text < 16 px: iOS Safari zooms in on focus', zoomers.map((el) => `${desc(el)} ${getComputedStyle(el).fontSize}`));

  // A11Y-9 / VIS-8: horizontal overflow
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) {
    const wide = [...document.querySelectorAll('body *')].filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest('[style*="overflow"], .scroll-x')).slice(0, 20);
    add('A11Y-9', 'fail', `Horizontal scrolling: page is ${sw} px wide in a ${vw} px viewport`, wide.map(desc));
  }
  const clipped = [...scope.querySelectorAll('*')].filter((el) => visible(el) && getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1);
  if (clipped.length) add('VIS-8', 'warn', 'Text truncated with an ellipsis', clipped.map((el) => `${desc(el)} full: "${el.textContent.trim().slice(0, 50)}"`));

  // A11Y-1 contrast of visible text (solid backgrounds only)
  const rgb = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => { const a = fg[3] ?? 1; return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)); };
  const bgOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      // A pattern on <html>/<body> is usually a subtle texture over a solid colour: measure against that colour.
      if (s.backgroundImage !== 'none' && !['HTML', 'BODY'].includes(e.tagName)) return { unknown: true };
      const c = rgb(s.backgroundColor);
      if (c && (c[3] ?? 1) > 0) { layers.push(c); if ((c[3] ?? 1) >= 1) break; }
      if (e.tagName === 'DIALOG' && e.open) break;
    }
    let base = [255, 255, 255];
    const root = rgb(getComputedStyle(document.documentElement).backgroundColor);
    if (root && (root[3] ?? 1) > 0) base = root.slice(0, 3);
    for (const l of layers.reverse()) base = blend(l, base);
    return { color: base };
  };
  const lowContrast = []; let skipped = 0; const seen = new Set();
  const textEls = [...scope.querySelectorAll('body *, dialog[open] *')].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && visible(el));
  for (const el of textEls.slice(0, 600)) {
    const s = getComputedStyle(el);
    const bg = bgOf(el);
    if (bg.unknown) { skipped++; continue; }
    const fg = blend(rgb(s.color), bg.color);
    const L1 = lum(fg); const L2 = lum(bg.color);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(s.fontSize); const bold = Number(s.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    if (ratio < need) {
      const key = `${s.color}|${bg.color}|${need}`;
      if (seen.has(key)) continue; seen.add(key);
      lowContrast.push(`${desc(el)} ${ratio.toFixed(2)}:1 (needs ${need}) ${s.color} on rgb(${bg.color.map(Math.round)})`);
    }
  }
  if (lowContrast.length) add('A11Y-1', 'fail', 'Text below the WCAG contrast minimum (unique colour pairs)', lowContrast);
  if (skipped) add('A11Y-1', 'info', `${skipped} text elements on gradients/images were not measured: check them by eye`);

  // A11Y-3: names
  const nameOf = (el) => (el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && el.getAttribute('aria-labelledby').split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ')) || el.textContent || el.getAttribute('title') || el.querySelector('img[alt]')?.alt || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) || el.closest('label')?.textContent || '').trim();
  const unnamed = interactive.filter((el) => !nameOf(el) && !(el.tagName === 'INPUT' && ['submit', 'button'].includes(el.type) && el.value));
  if (unnamed.length) add('A11Y-3', 'fail', 'Controls without an accessible name', unnamed.map(desc));
  const placeholderOnly = interactive.filter((el) => el.matches('input, textarea') && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !(el.id && document.querySelector(`label[for="${el.id}"]`)) && !el.closest('label') && el.placeholder);
  if (placeholderOnly.length) add('IN-1', 'warn', 'Fields labelled only by a placeholder', placeholderOnly.map(desc));
  const noAlt = [...scope.querySelectorAll('img:not([alt])')].filter(visible);
  if (noAlt.length) add('A11Y-3', 'fail', 'Images without an alt attribute (use alt="" when decorative)', noAlt.map((i) => i.src.split('/').pop()));
  const noDims = [...document.querySelectorAll('img:not([width]), img:not([height])')].filter(visible);
  if (noDims.length) add('PERF-3', 'info', 'Images without width/height attributes (layout shift risk)', noDims.map((i) => i.src.split('/').pop()));

  // A11Y-12 / A11Y-8
  if (!document.documentElement.lang) add('A11Y-12', 'fail', '<html> has no lang attribute');
  if (!modal) {
    const h1 = document.querySelectorAll('h1').length;
    if (h1 !== 1) add('A11Y-8', 'warn', `${h1} h1 elements (expected 1)`);
    if (!document.querySelector('main, [role=main]')) add('A11Y-8', 'warn', 'No <main> landmark');
  }

  // A11Y-10 / VIS-10: motion without a reduced-motion alternative
  const animates = /animation\s*:|animation-name|transition\s*:/.test(css);
  if (animates && !/prefers-reduced-motion/.test(css)) add('A11Y-10', 'warn', 'Animations/transitions but no prefers-reduced-motion rule');

  // VIS-1: very small text
  const tinyText = textEls.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);
  if (tinyText.length) add('VIS-1', 'warn', 'Text smaller than 12 px', tinyText.map((el) => `${desc(el)} ${getComputedStyle(el).fontSize}`));

  return res;
}

// Focus indicator: tab through the first focusable elements and look for an outline or box-shadow.
async function focusCheck(page) {
  const missing = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
      return { ring, d: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}"` };
    });
    if (r && !r.ring) missing.push(r.d);
  }
  return missing;
}

// ------------------------------------------------------------------ run
const browser = await pw.chromium.launch();
const report = { url, date: new Date().toISOString(), sizes: {} };
for (const name of sizes) {
  const dev = SIZES[name];
  if (!dev) { console.error(`Unknown size ${name}`); continue; }
  const ctx = await browser.newContext({ ...dev, colorScheme: 'dark' });
  if (storage) await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, storage);
  const page = await ctx.newPage();
  const errors = []; const failed = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  page.on('requestfailed', (r) => failed.push(`${r.url().slice(0, 100)} ${r.failure()?.errorText}`));
  page.on('dialog', (d) => d.dismiss());
  await page.addInitScript(() => {
    window.__ux = { cls: 0, lcp: 0, long: 0 };
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__ux.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__ux.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { window.__ux.long += l.getEntries().length; }).observe({ type: 'longtask', buffered: true });
    } catch { /* not supported */ }
  });
  try { await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }); } catch (e) { console.error(`Could not load ${url}: ${e.message}`); process.exit(3); }
  await page.waitForTimeout(Number(opt.wait ?? 800) + 2000);
  for (const sel of opt.click) {
    try { await page.click(sel, { timeout: 5000 }); await page.waitForTimeout(600); } catch { errors.push(`--click "${sel}" failed`); }
  }
  const results = await page.evaluate(measure, { mobile: Boolean(dev.isMobile) });
  const vitals = await page.evaluate(() => window.__ux);
  if (vitals.cls > 0.1) results.push({ id: 'VIS-9', level: 'fail', msg: `Layout shift during load: CLS ${vitals.cls.toFixed(3)} (> 0.1)`, items: [], count: 0 });
  if (vitals.lcp > 2500) results.push({ id: 'PERF-1', level: 'warn', msg: `LCP ${Math.round(vitals.lcp)} ms in the lab (> 2500)`, items: [], count: 0 });
  if (vitals.long) results.push({ id: 'PERF-4', level: 'info', msg: `${vitals.long} long tasks (> 50 ms) during load`, items: [], count: 0 });
  if (!opt.click.length) {
    const noRing = await focusCheck(page);
    if (noRing.length) results.push({ id: 'A11Y-4', level: 'warn', msg: 'Focused elements without a visible outline/box-shadow', items: noRing, count: noRing.length });
  }
  if (axePath) {
    await page.addScriptTag({ path: axePath });
    const axe = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations);
    for (const v of axe) results.push({ id: `axe:${v.id}`, level: v.impact === 'critical' || v.impact === 'serious' ? 'fail' : 'warn', msg: v.help, items: v.nodes.slice(0, 8).map((n) => n.target.join(' ')), count: v.nodes.length });
  }
  if (errors.length) results.push({ id: 'IN-11', level: 'warn', msg: 'Console errors', items: errors, count: errors.length });
  if (failed.length) results.push({ id: 'IN-11', level: 'warn', msg: 'Failed requests', items: failed, count: failed.length });
  const shot = join(out, `${name}${opt.click.length ? '-state' : ''}.png`);
  await page.screenshot({ path: shot, fullPage: !opt.click.length });
  report.sizes[name] = { viewport: dev.viewport, screenshot: shot, vitals, results };
  await ctx.close();
}
await browser.close();

// ------------------------------------------------------------------ report
const icon = { fail: '✗', warn: '!', info: 'i' };
for (const [name, r] of Object.entries(report.sizes)) {
  const counts = { fail: 0, warn: 0, info: 0 };
  r.results.forEach((x) => { counts[x.level]++; });
  console.log(`\n=== ${name} ${r.viewport.width}×${r.viewport.height} · ${counts.fail} fail, ${counts.warn} warn, ${counts.info} info · ${r.screenshot}`);
  for (const x of r.results.sort((a, b) => ['fail', 'warn', 'info'].indexOf(a.level) - ['fail', 'warn', 'info'].indexOf(b.level))) {
    console.log(`${icon[x.level]} [${x.id}] ${x.msg}${x.count > x.items.length ? ` (${x.count}, first ${x.items.length})` : ''}`);
    for (const it of x.items) console.log(`    - ${it}`);
  }
}
if (!axePath) console.log('\n(i) axe-core not found: `npm i -D axe-core` adds its WCAG checks.');
if (opt.json) { writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2)); console.log(`\nJSON: ${join(out, 'report.json')}`); }
console.log('\nThe script measures; look at the screenshots and walk the core tasks with references/checklist.md.');
