# Building the app

## Pick the simplest shape that meets the spec

| The spec says | Build | Scaffold flags |
|---|---|---|
| One person, data can live on the device (a trainer, a calculator, a personal tracker) | Static files, state in `localStorage` | none |
| Several people share records, read later (a shared list, a log, sign-ups, scores) | Static files + Worker API + **D1** | `--d1` |
| Several devices see the same thing *live* (a game, a quiz host + phones, a shared shopping trip) | Static files + Worker + **Durable Object room** over WebSockets (`public/room.js` on the client) | `--room` |
| Both | Both | `--d1 --room` |
| Big app: several screens, npm libraries, TypeScript | Vite + TypeScript (see cloudflare.md) | then convert |

Plain HTML/CSS/JS in `public/` is the default: no build step, nothing to break, easy to change later. Reach for Vite
only when the app clearly outgrows a few files. No frameworks unless the spec truly needs one.

## Design for the moment it's used

These apps are mostly opened on a phone, in short moments, often by someone who didn't build them. Before writing code,
decide the one screen that matters most and make that screen excellent.

- **Mobile first**: lay out for 390 px wide first; 16 px side gutters; no sideways scrolling; tap targets at least
  44 px; the main action within thumb reach (bottom half). Then make sure it also looks deliberate at 1366 px (a centred
  column or a real two-column layout, not a stretched phone).
- **Give it a character** that matches the spec's tone: pick a palette, a type pairing (system fonts are fine; a Google
  Font is OK), and one visual idea, and put a one-line comment at the top of the CSS saying what that idea is. Every
  colour is a token on `:root`, redefined for dark mode (the template shows the pattern).
- **Clarity over cleverness**: one primary button per screen, plain words, numbers big and readable, feedback for every
  tap (state change, toast, or haptic `navigator.vibrate?.(10)`).
- **Robust**: works after a reload, in a private window (wrap storage in try/catch), makes no network calls it
  doesn't need, and recovers when a live connection drops (reconnect with backoff, show "reconnecting…"). Opening
  with no signal at all needs a service worker; add a small cache-first one only when the spec asks for offline use.
- **Accessible**: real `<button>`s and `<label>`s, visible focus, contrast ≥ 4.5:1 for text, no information by colour
  alone, `prefers-reduced-motion` respected for animations.
- **Installable**: keep the manifest and icons. Design a simple `public/icon.svg` for the app (one shape or letter on
  the brand colour), then run `node <skill>/scripts/make_icon.mjs <dir>` for the iPhone home-screen PNG.
- **Language**: the interface in the language Pieter asked in (Dutch or English), including dates and numbers
  (`toLocaleDateString('nl-BE')` / `'en-GB'`). Set `<html lang>` accordingly (the scaffold does).
- **Privacy**: no analytics, trackers or third-party scripts beyond a font. Data stays on the device unless the spec
  says it's shared.

## Live rooms

The `--room` template is a room where **the server is in charge**, which is what games and quizzes need:

- `POST /api/rooms` creates a room and returns its code and a host key; `public/room.js` (`createRoom`, `joinRoom`)
  keeps the key on the host device and the player id on each player's device, so a reload or a locked phone comes back
  as the same host or player. Unknown or expired codes are refused (`no-room`), not silently opened.
- Devices send **actions** (`{type: 'buzz'}`); `Room.apply()` checks who sent it (role and id live on the socket via
  `serializeAttachment`) and changes the state; `Room.view()` builds each device's own view. Secrets (the right answer,
  other teams' picks) stay on the server until the rules reveal them. Scores can't be forged by a client.
- A Durable Object has **one alarm**: `save()` points it at whatever comes first, the end of a timed round or the
  room's expiry. Add new timers to that `Math.min`.
- Keep-alive `ping`s are answered without waking the room (`setWebSocketAutoResponse`); `room.js` sends one every 25 s,
  reconnects with backoff, reconnects at once when the page becomes visible again, and queues taps made while offline.

Replace the example buzzer rules (`apply`, `view`, the `round` fields) with the app's own. For a simple shared list
where everyone may edit everything, a D1 table with one action per change (add, tick, delete) is simpler than a room.
Room codes are 4 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no I, O, 0, 1); show them big, with a copy-link
button and a `?room=CODE` link that joins directly.

**TV + phones apps**: ask whether the host's laptop is mirrored to the TV. If so, the host screen *is* the TV: never
show secrets (answers, the next question) on it unless the host explicitly reveals them, or offer a separate TV view
(`?tv=CODE`) for a second window. Keep screens that stay on (TV, host) awake with the Screen Wake Lock API
(`navigator.wakeLock.request('screen')`, re-requested when the page becomes visible again).

`cf dev` shows the room binding as `local [not connected]`; that's harmless (the Worker binds to its own Durable
Object).

## Test before you show it

1. `bash <skill>/scripts/dev.sh start <dir>` starts `cf dev` in the background on the first free port from 8787 and
   prints the URL; `bash <skill>/scripts/dev.sh stop <dir>` stops it and everything it started.
2. Put non-trivial logic (scoring, dates, merging, limits) in its own module in `public/` (e.g. `logic.js`, plain
   functions on plain data) and test it in `tests/*.test.js` with `node:test`; `npm test` runs them. `tests/` sits
   outside `public/`, so it's never published.
3. Click through the core flow in a Playwright script kept in the scratch folder, not the repo. Chromium is usually
   pre-installed: if `require('playwright')` fails from the scratch folder, run it with `NODE_PATH=$(npm root -g)`;
   only install Playwright if that fails too. For anything with dates, `page.clock.install()` and
   `page.clock.fastForward()` test midnight rollovers in seconds.
   For shared or live apps, give every role its own browser context (host, TV, several players, a stranger with a wrong
   code) and check: everyone sees each change; a player can't do host things; secrets don't appear in the players'
   WebSocket frames (`page.on('websocket')`); a reload comes back as the same player; `context.setOffline(true)` then
   `false` shows "reconnecting…" and recovers; timed rounds end on their own.
   **Screenshot every important state from this flow** (the dialog, the result, the TV during a question, the phone
   after answering) at phone size and, where relevant, tablet or TV size, in light and dark mode. These are the
   screenshots that find real problems; review them all.
4. `node <skill>/scripts/shoot.mjs <url> <scratch>/shots` checks the first screen for errors, sideways scrolling and
   small tap targets (add `--sizes phone,tablet,desktop` when a
   tablet or TV matters, and `--storage filled.json --name filled` to shoot the app with data in it). Fix every
   reported problem, then **look at** every screenshot. Fix what looks off: cramped spacing, unreadable dark mode,
   overlaps, hidden elements peeking out, a stretched desktop layout.
5. `npx cf deploy --dry-run` must pass before the real deploy. To see exactly what will be published, look in
   `.cloudflare/output/v0/workers/default/assets/` after the dry-run.
