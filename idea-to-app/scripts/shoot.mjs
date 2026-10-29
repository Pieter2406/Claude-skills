#!/usr/bin/env node
// Opens a page at phone, tablet and desktop size, saves full-page screenshots in light and dark mode, and reports
// what a reviewer would catch: console errors, failed requests, horizontal scrolling and tap targets under 44 px.
//
//   node shoot.mjs <url> <out-dir> [--sizes phone,tablet,desktop] [--storage state.json] [--name filled]
//
// --storage  a JSON object of localStorage entries ({"key": value, ...}; non-strings are JSON-encoded) set before the
//            page loads, so you can shoot the app with data in it, not only its empty first screen.
// --name     a prefix for the file names, e.g. "filled" gives filled-phone-light.png.
// Look at every screenshot afterwards; this script finds problems, it doesn't judge the design. For screens behind
// taps (a dialog, a result), take screenshots in your own Playwright flow test.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';

const positional = [];
const opt = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i];
  else positional.push(argv[i]);
}
const [url, out = 'shots'] = positional;
if (!url) {
  console.error('Usage: node shoot.mjs <url> [out-dir] [--sizes phone,tablet,desktop] [--storage state.json] [--name prefix]');
  process.exit(1);
}
const storage = opt.storage ? JSON.parse(readFileSync(opt.storage, 'utf8')) : null;
const prefix = opt.name ? `${opt.name}-` : '';
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  try {
    ({ chromium } = createRequire(process.cwd() + '/')('playwright'));
  } catch {
    console.error('Playwright is not installed here. Run `npm i -D playwright && npx playwright install chromium`, or check the page by hand.');
    process.exit(2);
  }
}
mkdirSync(out, { recursive: true });

const allSizes = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1366, height: 860 } },
};
const sizes = Object.fromEntries(
  (opt.sizes ?? 'phone,desktop').split(',').map((s) => {
    if (!allSizes[s]) throw new Error(`Unknown size "${s}": use ${Object.keys(allSizes).join(', ')}`);
    return [s, allSizes[s]];
  }),
);
const report = [];
const browser = await chromium.launch();
for (const [size, opts] of Object.entries(sizes)) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ ...opts, colorScheme: scheme });
    if (storage)
      await ctx.addInitScript((entries) => {
        for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }, storage);
    const page = await ctx.newPage();
    const problems = [];
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
    page.on('pageerror', (e) => problems.push(`error: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`failed: ${r.url()} (${r.failure()?.errorText})`));
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));
    await page.goto(url, { waitUntil: 'networkidle' }).catch((e) => problems.push(`load: ${e.message}`));
    await page.waitForTimeout(500);
    const checks = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const overflow = document.documentElement.scrollWidth > w + 1;
      // Links inside running text are exempt; everything else you tap should be 44 px or more.
      const small = [...document.querySelectorAll('button, a, input, select, textarea, [role="button"]')]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          if (e.tagName === 'A' && cs.display === 'inline') return false;
          if (e.type === 'checkbox' || e.type === 'radio') return false;
          return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44) && cs.visibility !== 'hidden';
        })
        .slice(0, 5)
        .map((e) => `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30)}"`);
      return { overflow, small, title: document.title };
    });
    if (checks.overflow) problems.push('page scrolls sideways');
    if (size !== 'desktop' && checks.small.length) problems.push(`tap targets under 44px: ${checks.small.join(', ')}`);
    const file = `${out}/${prefix}${size}-${scheme}.png`;
    await page.screenshot({ path: file, fullPage: true });
    report.push({ file, title: checks.title, problems });
    await ctx.close();
  }
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
process.exit(report.some((r) => r.problems.length) ? 3 : 0);
