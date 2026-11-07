---
name: review-test-deploy
description: Ship a change safely in any project, whatever the stack — an independent code review of everything since the last deploy, the full test suite plus new tests for every new behaviour and every finding, an end-to-end run of the real app (phone size, several users or devices at once, offline and back, old saved data, a smoke run over every screen), fixing what is real, updating the docs, then committing, deploying and checking the live site, and a short report. Use it whenever the user asks to "review, test and deploy", "test thoroughly and deploy", "ship it", "is it ready to go live?", "check everything before release", "review en test grondig en deploy", "zet het veilig online", or says "deploy" after a large change that hasn't been reviewed yet. For only logging in to Cloudflare and deploying, use cf-deploy; for a security audit, app-security-review; for an interface review, app-ux.
---

# Review, test and deploy

A release goes wrong in the places nobody looked: the second phone, the flaky signal, yesterday's saved data, the
failure branch of a button, the screen next to the one that changed. This skill is the routine that looks there
before users do. It works for any stack: read the project's own docs for the commands and fill them in.

Keep the user posted in one line per phase. Work in this order; each phase feeds the next.

## 0. Ground rules

- **Deploying changes the live site.** Do it only when the user asked for it in this conversation ("deploy",
  "ship it", "zet het online"). An auto-mode or permission rule may block a production deploy without that request:
  then stop, push the commits, and ask. Never work around the block.
- **Respect the project's own release rules** (CLAUDE.md, README, CONTRIBUTING): "don't deploy during the event",
  release windows, changelogs, version bumps. Check the local time against them (`TZ=<their zone> date`). If a rule
  forbids the deploy but the user asked explicitly, say so in one line, take the safest moment (before use starts),
  and go on: it's their call.
- **Never on production**: test data, uploads, load, brute force, paid API calls. Write tests run on local dev or a
  separate test deploy; the live check is read-only.
- **Secrets** never go into the chat, commits, logs or screenshots.

## 1. Scope: what changed since the last release

- Read `CLAUDE.md` / `README.md`: test command, dev server, deploy command, live URL, data stores, invariants
  ("bump the cache version", "keep the access list in sync").
- `git status`, `git log --oneline -15`. Find the last deployed commit (a release tag, a "deploy"/"stamp" commit, the
  version the platform reports) and set the range: `git diff <last-deploy>..HEAD --stat`. Uncommitted work is part of
  the release: commit it first so the review and the deploy see the same code.
- Write down the risky surfaces of this diff in two or three lines: new server-trusted inputs, new shared state,
  changed data formats, flows that span devices or users, offline paths, time and clocks.

## 2. Independent review (in parallel)

Start one reviewer subagent in the background **before** you test, so it isn't anchored on what you find. Give it
the diff range, the project docs to read, and the focus list from `references/review-prompt.md`; ask for findings
only (no edits), each with file:line, a concrete failure scenario, a fix, and "certain" or "plausible". Don't hand
it your hypotheses. Small diffs (under ~100 lines) you may review yourself with the same list.

While it runs, do phases 3 and 4. Don't duplicate its reading; don't predict its results.

## 3. Tests

- Run the full suite. Red before your change → say so and stop unless it's clearly unrelated and the user agrees.
- Every new behaviour in the diff gets a test at the cheapest level that proves it (pure function > module > API >
  browser). Every finding you fix later gets a test that fails without the fix.
- A failing new test is first suspected of being wrong itself (wrong fixture times, wrong setup); check before you
  "fix" the app.

## 4. End-to-end on the real app

Start the dev server and drive the app with Playwright (`scripts/e2e-kit.cjs` has the helpers; recipes and
pitfalls in `references/e2e.md`). At phone size, collecting page errors and every HTTP ≥ 400:

1. **Happy path** of each new feature, start to finish, with screenshots you actually look at.
2. **Two users or devices at once** if any state is shared: both see each other's changes, no one overwrites the
   other, each gets the part that belongs to them.
3. **Offline and back**: do the new actions with the network off, then on; check what the server ended up with.
4. **Old data**: load state saved by the previous version (or written by an older client) and use the new screens.
5. **Failure branches**: the action that fails (server says no, timeout): does the UI tell the truth?
6. **Smoke run** over every screen, tab and dialog, also the ones you didn't touch, and both themes if there are two.

A failure is a test bug or an app bug: decide which before changing anything, and say which in the report.

## 5. Triage and fix

When the review arrives, merge it with your own findings. For each: reproduce (a test or a script), then fix
what is real, smallest change that removes the cause. Note what you deliberately leave (low impact, risky to change
right before release) with the reason. Re-run the full suite and every e2e scenario after the fixes; new screenshots
for anything visual.

## 6. Docs

Update the project's notes (CLAUDE.md, README, changelog) with new behaviour, rules and gotchas the next session
needs. Keep the same style and section layout.

## 7. Commit, deploy, verify

1. Commit (clear message, the repo's attribution rules) and push.
2. Deploy with the project's command; on Cloudflare use the `cf-deploy` skill. Keep the version/release id.
3. Commit anything the deploy generated (version stamps) and push.
4. Live check, read-only: the main URL answers as expected (200, or the login redirect if it's behind access
   control); a changed static file is served; any status endpoint reports healthy. No writes.

## 8. Report

Short, in the user's language:
- what's live (URL, commit, version id, time);
- what the review found and what you fixed, numbered, one line each in plain words;
- what you tested (suites with pass counts, e2e scenarios) and anything that failed and why;
- what you left and why;
- what the user must do now (reload the app on their devices, set a secret, tell others).
