---
name: review-test-deploy
description: Ship a change safely in any project — any kind of app (web app, API or backend, CLI, mobile app, desktop app, library, data pipeline) and any stack or hosting. It runs an independent code review of everything since the last release, the full test suite plus new tests for every new behaviour and every finding, an end-to-end run of the real thing through its real entry points (concurrent users or sessions, interrupted network or process, data from the previous version, failure paths, a smoke run over everything else), fixes what is real, updates the docs, then commits, releases or deploys with the project's own command, checks the live result read-only and reports. Use it whenever the user asks to "review, test and deploy", "test thoroughly and release", "ship it", "is it ready to go live?", "check everything before release", "review en test grondig en deploy", "zet het veilig online", "maak een release", or says "deploy"/"release"/"publish" after a large change that hasn't been reviewed. Not for a pure security audit or a pure UI review (use a dedicated skill for those when available).
---

# Review, test and release

A release goes wrong in the places nobody looked: the second user, the dropped connection, last version's data,
the failure branch, the feature next to the one that changed. This skill is the routine that looks there before users
do. It assumes nothing about the app: every command, URL, platform and rule comes from the project itself.

Keep the user posted in one line per phase. Work in this order; each phase feeds the next.

## 0. Ground rules

- **Releasing changes what users get.** Deploy, publish or tag only when the user asked for it in this conversation.
  If a permission rule blocks it, stop, push the commits and ask; never work around the block.
- **Follow the project's own release rules** (CLAUDE.md, README, CONTRIBUTING, CI config): freeze windows, "not
  during the event", version bumps, changelogs, required approvals. Check the current time in the users' time zone
  against them. If a rule forbids the release but the user asked explicitly, say so in one line, pick the safest
  moment, and go on: it's their call.
- **Never test against production**: no test data, uploads, load, brute force or paid API calls there. Use a local
  instance, a test environment or a separate test deploy; the live check after release is read-only.
- **Secrets** never go into the chat, commits, logs or screenshots.

## 1. Know the project and the change

- Read the project docs for: how to build, test and run it locally; how it is released (command, CI, store, registry);
  where it runs; what data it keeps and where; invariants ("bump the cache version", "migrations before deploy",
  "keep the allow-list in sync").
- Classify the app (`references/app-types.md`): it decides how you run it end to end and how you check the release.
- `git status`, `git log --oneline -15`. Find the last released commit (a tag, a release/deploy commit, the version
  the platform or registry reports) and set the range: `git diff <last-release>..HEAD --stat`. Commit uncommitted
  work first so the review, the tests and the release see the same code.
- Write down the risky surfaces of this diff in two or three lines: new input the server trusts, new shared state,
  changed data formats or schemas, flows across users/devices/processes, offline or retry paths, time and clocks,
  permissions.

## 2. Independent review (in parallel)

Start one reviewer subagent in the background **before** you test, so it isn't anchored on what you find. Give it
the diff range, the docs to read and the prompt in `references/review-prompt.md`; it reports findings only (no
edits). Don't hand it your hypotheses. For a small diff (under ~100 lines) you may review it yourself with the same
list. While it runs, do phases 3 and 4; don't duplicate its reading or predict its results.

## 3. Tests

- Run the full suite (and the linters/type checks CI runs). Red before your change → report it; go on only if it's
  clearly unrelated and the user agrees.
- Every new behaviour gets a test at the cheapest level that proves it (pure function > module > service/API > full
  app). Every finding you fix later gets a test that fails without the fix.
- A failing new test is first suspected of being wrong itself (fixture times, setup, order); check before you change
  the app.

## 4. End to end, through the real entry points

Run the real thing locally (or on a test environment) the way users reach it — browser, HTTP client, terminal,
emulator, an example program — using the recipe for its type in `references/app-types.md` and the scenarios and
pitfalls in `references/e2e.md`. For browser apps, `scripts/e2e-kit.cjs` has Playwright helpers. Collect errors
(crashes, error logs, HTTP ≥ 400, non-zero exits) for every run.

1. **Happy path** of each new feature, start to finish, with evidence you actually look at (screenshots, responses,
   output).
2. **Concurrency**: two users, sessions, devices or processes at once wherever state is shared.
3. **Interruption**: network off and back, a request that times out, a process killed mid-way, a retry arriving twice
   or late.
4. **Previous version's data**: state, files, database rows, cached client data or messages written by the old
   version; an old client talking to the new server if both can coexist.
5. **Failure paths**: invalid input, the server saying no, missing permissions: is the result and the message true?
6. **Smoke run** over everything else: every screen/route/command/public function, including the ones you didn't touch,
   and every supported variant (themes, locales, sizes, platforms) the project claims.

A failure is a test bug or an app bug: decide which before changing anything, and say which in the report.

## 5. Triage and fix

Merge the reviewer's findings with yours. For each: reproduce it (a test or a small script), then fix what is real
with the smallest change that removes the cause. Note what you deliberately leave (low impact, risky to change just
before release) and why. Then re-run the full suite and every end-to-end scenario; fresh evidence for anything
visible.

## 6. Docs

Update the project's notes (CLAUDE.md, README, changelog, API docs) with the new behaviour, rules and gotchas the next
person needs. Keep their style and layout.

## 7. Commit, release, verify

1. Commit (clear message, the repo's attribution rules) and push.
2. Release with the project's own mechanism: its deploy script, CI pipeline, store upload, package publish or tag. If
   a platform-specific deploy skill is installed (e.g. one for Cloudflare), use it. Keep the version or release id.
3. Commit anything the release generated (version stamps, lockfiles) and push.
4. Verify read-only, the way a user would reach it (`references/app-types.md`): the service answers, the new version
   is the one served/installed, health or status endpoints are fine, nothing writes data.

If the project has no release step (a library not published yet, a branch for review), stop after pushing and say so.

## 8. Report

Short, in the user's language:
- what was released (where, commit, version id, time);
- what the review found and what you fixed, numbered, one plain line each;
- what you tested (suites with pass counts, end-to-end scenarios) and anything that failed and why;
- what you left and why;
- what the user must do now (update or reload clients, set a secret, announce it, approve a store review).
