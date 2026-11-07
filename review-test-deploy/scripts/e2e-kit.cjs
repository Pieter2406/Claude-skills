// Small helpers for end-to-end runs with Playwright at phone size. CommonJS so a plain `node test.js` can require it.
//   const { phone, check, shot, done } = require('./e2e-kit.cjs');
// phone(browser, { device, tag, tz, geo, time })  → { ctx, page, errors }: a phone context (default iPhone 13,
//   Europe/Brussels), optional geolocation {latitude, longitude} and fake clock start (Date or ms). Page errors and
//   every HTTP response ≥ 400 are collected as "<tag> <status> <METHOD> <url>".
// check(name, cond) prints PASS/FAIL and counts failures; shot(page, file) saves a screenshot (scale 1);
// done(browser, phones) prints the collected errors, closes the browser and exits 1 on any FAIL or error.
const { devices } = require('playwright');

let fails = 0;
function check(name, cond) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name);
  if (!cond) fails++;
  return !!cond;
}

async function phone(browser, { device = 'iPhone 13', tag = 'P', tz = 'Europe/Brussels', geo = null, time = null } = {}) {
  const ctx = await browser.newContext({
    ...devices[device],
    timezoneId: tz,
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

async function done(browser, phones = []) {
  const errors = phones.flatMap((p) => p.errors);
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (fails || errors.length) process.exit(1);
}

module.exports = { phone, check, shot, done };
