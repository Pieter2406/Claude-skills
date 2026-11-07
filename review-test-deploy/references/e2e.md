# End-to-end scenarios and pitfalls

The scenarios in SKILL.md phase 4 apply to every kind of app; `app-types.md` says how to drive each kind. This file
has the reusable recipes and the mistakes that cost time.

## Browser helpers

`scripts/e2e-kit.cjs` (CommonJS, Playwright):

```js
const { chromium } = require('playwright');
const { open, check, shot, done } = require('<skill>/scripts/e2e-kit.cjs');
(async () => {
  const b = await chromium.launch();
  const A = await open(b, { device: 'iPhone 13', tag: 'A' });             // a phone
  const B = await open(b, { viewport: { width: 1280, height: 800 }, tag: 'B' }); // a desktop
  await A.page.goto('<local url>');
  // ... drive the UI, check('what', condition), shot(A.page, '<dir>/a-1.png') ...
  await done(b, [A, B]); // prints collected errors, exits 1 on any FAIL or error
})();
```

Options of `open`: `device` (a Playwright device name) or `viewport`, `tz` (time zone; default: the machine's),
`locale`, `geo` ({latitude, longitude}), `time` (fake clock start), `scheme` ('light' | 'dark'), `tag`.

## Recipes

- **Shared state, two users/devices**: two contexts/clients with separate storage and identities; the second joins the
  way real users do (invite link, login, code). Wait for the app's sync (poll, push, reload) before checking.
- **Interruption**: browser `ctx.setOffline(true/false)`; for services, stop the dependency or point it at a dead port;
  for processes, kill mid-run. Then check what the server/store ended up with, not only what the UI says.
- **Previous version's data**: check out the last release in a worktree, run it once to produce real data, then run
  the new version on that data. Cheaper: write the old format by hand from the old code.
- **Changing external data** (feeds, prices, statuses): intercept and pin it (Playwright `route`, a stub server, a
  fixture) so the run is repeatable; keep one run against the real feed if it's safe and read-only.
- **Time**: fake the clock in the client (`page.clock`) or inject a clock in the service; fast-forward instead of
  sleeping.
- **Evidence**: look at every screenshot/response you take; combine several screenshots into one image (PIL) to save
  turns; screenshot at scale 1 for checks only you read.

## Pitfalls already hit

- **Client clock ahead of the server.** Servers often clamp or ignore client timestamps in the future, so durations come
  out wrong. Start a fake client clock slightly in the **past** and fast-forward from there, never past real time.
- **A fake clock changes time-dependent UI** (themes by time of day, opening hours, greetings). Expect it; don't "fix"
  the app for it.
- **Selectors that match hidden elements**: scope to the visible container or use `:visible`.
- **Random or ranked choices**: the first item the app offers may not be the case you want to test. Pick the case
  explicitly and log which one you got.
- **Unit-test fixtures older than the state they act on** are silently treated as stale. When a new test fails, check
  the fixture times and order first.
- **Killing dev servers with `pkill -f <pattern>`** also kills your own shell when the pattern is in the same command
  line; use a PID or a separate command.
- **Dialogs or lists that re-render reset their scroll**: the result may be off screen. Look at the screenshot.
- **A role or identity that isn't set** (who am I, which tenant, which device) often silently picks the first one.
  Test once without it.
