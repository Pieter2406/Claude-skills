# End-to-end recipes and pitfalls

`scripts/e2e-kit.cjs` (CommonJS, Playwright) gives: `phone(browser, opts)` → `{ ctx, page, errors }` with a phone
device, time zone, geolocation and an error collector (page errors + every HTTP ≥ 400 with method and URL);
`check(name, cond)` that prints PASS/FAIL and counts; `shot(page, file)`; `done(browser)` that prints errors and
exits non-zero on any FAIL. Copy it next to your test script or `require` it by path.

```js
const { chromium } = require('playwright');
const { phone, check, shot, done } = require('<skill>/scripts/e2e-kit.cjs');
(async () => {
  const b = await chromium.launch();
  const A = await phone(b, { device: 'iPhone 13', tag: 'A' });
  const B = await phone(b, { device: 'Pixel 7', tag: 'B' });
  await A.page.goto('http://localhost:8787/');
  // ... drive, check(...), shot(A.page, dir + '/a-1.png') ...
  await done(b, [A, B]);
})();
```

## Recipes

- **Shared state, two devices**: two browser contexts (separate storage), the second joins through the app's own
  share link or code. Reload or wait for the poll before checking the other side.
- **Offline**: `ctx.setOffline(true)`, do the actions, check the app's local queue (localStorage/IndexedDB), then
  `ctx.setOffline(false)`, trigger the app's resync (reload, `online` event, or its poll), and read the server state
  through the app's own API with `page.evaluate(fetch…)`.
- **Old data**: before `goto`, `ctx.addInitScript` to write localStorage in the old format, or send an old-style
  action to the API, then open the new screens.
- **Live data that changes**: `ctx.route('**/api/<feed>', …)` to fetch the real response and patch it (everything
  open, fixed wait times) so the scenario is the same every run.
- **Time**: `page.clock.install({ time })` before `goto`, `page.clock.fastForward('12:00')` to let minutes pass.
- **Screenshots**: deviceScaleFactor 1 for ones only you look at; read every one (combine several into one image with
  PIL to save turns). Check both themes when the app has light and dark.

## Pitfalls already hit

- **Fake clock vs real server.** A browser clock in the future makes the server ignore or clamp client timestamps
  (e.g. "within now − 12 h … now + 2 min"), so durations come out wrong. Install the clock slightly in the **past**
  (now − 20…40 min) and fast-forward from there, never past the real time.
- **The fake clock drives the theme too**: a "dark after sunset" app looks dark at a fake 07:30. That's correct.
- **Hidden duplicates**: `[data-x]` may first match a hidden element (a map pin behind a list). Scope the selector to
  the visible pane or use `:visible`.
- **Plan/choice randomness**: the first suggestion may not be the case you want (a split where one half rests has no
  queue). Pick the case explicitly by its text/attributes and log which one you got.
- **Fixtures older than the state they act on**: a unit test that sets a target "1 minute ago" and then acts "30
  minutes ago" is ignored as a late replay. When a new test fails, check the fixture times first.
- **`pkill -f pattern`** also kills your own shell if the pattern is in the command line; kill dev servers by PID or a
  pattern that isn't in the same command.
- Sheets/dialogs that re-render reset their scroll: after an answer, the result may sit off screen. Screenshot it.
