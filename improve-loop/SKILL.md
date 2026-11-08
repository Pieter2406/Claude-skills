---
name: improve-loop
description: Improve an existing app in rounds - review it, test it, fix and improve it, document it, commit and push, then go again - until the user stops or nothing worth doing is left. Each round reviews the running app (screenshots of every page, light and dark), runs the full test suite as a baseline, picks the most valuable work towards the user's goals (bugs first, then UX/UI, polish, new features, restructuring, a characteristic look, more complete product data and images), implements it with tests and docs, gets an independent code review of the round's diff, fixes what the review confirms, reruns everything and pushes. Use it whenever the user asks to "loop", "keep improving", "review test improve document", "continue loop", "nog een ronde", "blijf verbeteren", "maak het af", or gives a list of goals for an app and expects repeated rounds of work rather than one change. Not for a single bug or feature (use the project's own bug/feature skill or just do it), and not for releasing to production (use review-test-deploy).
---

# Improve loop: review, test, improve, document, push - and again

The user names an app and goals ("improve UX/UI, make it bug free, polish, add features, characteristic look,
remove what is out of place, more complete product data and images"). Work in **rounds**. A round is small enough to
finish, test and push in one go, and ends with everything committed and pushed and a short report. Then start the
next round when the user says "continue loop" (or keep going if they asked for several rounds at once).

Keep the user posted in one line per phase. Never leave work uncommitted at the end of a turn.

## 0. Ground rules

- **The project's own rules win.** Read CLAUDE.md, README and the project's skills first. If the project has a
  feature list or a bug/feature skill (for example `knx-feature` / `knx-bug` with `docs/features.md`), every change in
  the loop goes through it: requirements first, tests that claim them, the list checker green.
- **Never test against production or the user's own running instance** (ports, data files, live projects). Run
  a separate instance on other ports with a write-restricted copy of the data, as the project's e2e config does.
- **Branch and push rules** come from the session: develop on the given branch, commit with the attribution lines,
  `git push -u origin <branch>` with retries on network errors. No pull request unless asked.
- **Product data you add must be real.** Verify every order number, spec and image against a shop or manufacturer
  page; record where it came from; never invent numbers. Say when a value comes only from shop data.
- **Report faithfully.** Pre-existing failures stay labelled as such (with the reason); your own regressions get fixed.

## 1. First round only: know the app and the baseline

1. Read the docs and the code structure; list the pages/screens and the core tasks.
2. Install and run the full suite (typecheck, unit, e2e, any list/consistency checker). Write down the counts and
   which failures were already there and why (missing cache, live data, environment). This is the baseline.
3. Start a review instance and screenshot every page in light and dark at the app's main size (and the sizes it
   claims to support). Look at all of them. Note bugs, clutter, inconsistencies, missing states.
4. If the goals need research (products, standards, data, images), start **one background research agent now**
   with a precise brief (`references/briefs.md`) so it runs while you work on other things.
5. Create a task list for the round.

## 2. Every round

1. **Pick the work.** From the screenshots, the audit, the previous review, the user's goals and the backlog
   (`--todo` of the feature list, open findings), choose a handful of items by value: correctness bugs, then what
   the user named as focus, then UX/a11y problems, then polish and new features. Prefer removing and restructuring
   over adding. Say what you picked in one line.
2. **Measure what can be measured.** For UI rounds run the `app-ux` audit script (with axe-core) on the main pages
   and fix the real failures: names on fields, contrast in both themes, target sizes, tablist/ARIA misuse,
   reduced motion. Lock fixes in with e2e tests so they stay fixed.
3. **Implement each item through the project's process**: requirement rows, logic in the platform-free core, UI on
   top, unit tests for the logic, e2e tests for what a user does. Reproduce a bug in a failing test before fixing it.
   When a test fails, first suspect the test (fixture, overlapping rooms, missing element), then the app.
4. **Look at the result.** Screenshot the changed screens (light and dark) and read them. Fix what looks wrong:
   clipped text, spacing, a font feature with side effects, contrast.
5. **Independent review.** Start a background reviewer agent on the round's diff (`git diff <last pushed>..` or the
   working tree) with `references/briefs.md` › Reviewer. Don't share your hypotheses. While it runs, close test gaps
   or do the next small item - not the same files.
6. **Triage the review.** Its findings are claims: reproduce each in a test or script, fix the real ones with the
   smallest change, reword requirements that claimed too much, and note what you leave and why.
7. **Full regression.** Typecheck, all unit tests, all e2e tests (and the dark/other projects), the list checker.
   Run them as separate commands so one red step does not skip the rest. Everything green except the documented
   baseline failures. Read the checkers' problem lines, not only their totals: a list checker can print correct
   counts and still report "listed twice" or "claims it - set it to yes" below them.
8. **Document.** Feature list rows, glossary terms, README usage lines, the product/data sources doc, and a review
   log (`docs/review-<date>.md`) with a table per round: number, severity, problem, fix, requirement IDs.
9. **Commit and push.** One commit per round (or per review fix-up), a message that lists what changed and why.
   Clean up temporary data copies first. Check `git status` is clean afterwards. If the reviewer is still running at
   the end of a turn, commit and push what is green now and put its fixes in a follow-up commit.
   Also check the tests clean up after themselves (no test copies piling up in data folders).
10. **Report** (see below) and offer the next round with two or three concrete candidates.

## What a good round contains

- At least one thing the user can see or use that was not there (a feature, a page that reads better, data).
- Every new behaviour has a requirement and tests; every fixed bug has a regression test.
- Nothing pre-existing got worse: the test counts only go up, the baseline failures are the same ones.
- Real data with sources when the goal is completeness (products, images, standards): images resized to what the
  UI shows (about 400 px), licence/source recorded in an index, a script that can rebuild them without losing
  entries it could not fetch this time.
- When giving an app a characteristic look: name and logo that fit its domain, colour tokens defined once with a
  dark-mode variant and an `--on-accent` text colour, contrast checked in both themes, no global font features that
  change punctuation, the change locked in with an e2e test of the header and title.

## Report (short, in the user's language)

- what changed this round, grouped (new, fixed, from the review), each in one plain line;
- what it means for the user's own data where that is interesting (e.g. "your garden detector only covers 40 %");
- test results with counts, and the baseline failures named once with their reason;
- where it is documented, and that it is pushed (branch);
- what is left on purpose, and two or three candidates for the next round.

## Files

- [`references/briefs.md`](references/briefs.md) - the prompts for the research agent and the reviewer agent, and
  the screenshot script pattern.
