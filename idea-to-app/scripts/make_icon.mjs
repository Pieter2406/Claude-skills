#!/usr/bin/env node
// iOS ignores SVG icons on the home screen: this renders public/icon.svg to public/apple-touch-icon.png (180×180).
//
//   node make_icon.mjs <app-dir>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? '.');
const svg = readFileSync(join(dir, 'public', 'icon.svg'), 'utf8');
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  ({ chromium } = createRequire(dir + '/')('playwright'));
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', '<svg width="180" height="180" ')}</body></html>`);
await page.screenshot({ path: join(dir, 'public', 'apple-touch-icon.png'), omitBackground: false });
await browser.close();
console.log('Wrote public/apple-touch-icon.png');
