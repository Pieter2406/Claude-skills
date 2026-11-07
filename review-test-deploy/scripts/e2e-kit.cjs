// Helpers for end-to-end runs of browser apps with Playwright. App-agnostic; CommonJS so `node test.js` can require it.
//   const { open, check, shot, done } = require('./e2e-kit.cjs');
// open(browser, opts) → { ctx, page, errors, tag }: a new context (separate storage = a separate user/device).
//   opts: device (Playwright device name) or viewport {width, height}; tz (IANA zone, default the machine's);
//   locale; geo {latitude, longitude}; time (fake clock start, Date or ms); scheme 'light'|'dark'; tag (label in logs).
//   Page errors and every HTTP response ≥ 400 are collected as "<tag> <status> <METHOD> <url>".
// check(name, cond) prints PASS/FAIL and counts failures; shot(page, file) saves a screenshot;
// done(browser, sessions) prints the collected errors, closes the browser, exits 1 on any FAIL or error.
const { devices } = require('playwright');

let fails = 0;
function check(name, cond) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name);
  if (!cond) fails++;
  return !!cond;
}

async function open(browser, { device, viewport, tz, locale, geo, time, scheme, tag = 'S' } = {}) {
  if (device && !devices[device]) throw new Error(`unknown device "${device}"`);
  const ctx = await browser.newContext({
    ...(device ? devices[device] : {}),
    ...(viewport ? { viewport } : {}),
    ...(tz ? { timezoneId: tz } : {}),
    ...(locale ? { locale } : {}),
    ...(scheme ? { colorScheme: scheme } : {}),
    ...(geo ? { geolocation: geo, permissions: ['geolocation'] } : {}),
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${tag} pageerror ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${tag} ${r.status()} ${r.request().method()} ${r.url()}`);
  });
  if (time != null) await page.clock.install({ time: new Date(time) });
  return { ctx, page, errors, tag };
}

async function shot(page, file) {
  await page.screenshot({ path: file });
  return file;
}

async function done(browser, sessions = []) {
  const errors = sessions.flatMap((s) => s.errors);
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (fails || errors.length) process.exit(1);
}

module.exports = { open, check, shot, done };
