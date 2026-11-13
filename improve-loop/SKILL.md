---
name: improve-loop
description: Improve an existing app in repeated, verified rounds. Each round reviews the app through three lenses (a UX/UI review, feature improvements, a code review), ranks the findings, makes the few changes that matter most, proves them with tests and screenshots, commits, and logs the round in the project so the next round (or session) continues where this one stopped. Use it whenever Pieter says "improve loop", "/improve-loop", "keep improving the app", "do a round of improvements", "review and improve", "polish the app", "what should we improve next?", "verbeter de app", "maak het beter", "doe een verbeterronde", or asks for a UX review, feature ideas and a code review in one go. Works on any app with a repo (web apps first); it never deploys unless asked. For a single security audit use app-security-review; for shipping a finished change use review-test-deploy or cf-deploy.
---

# Improve loop

An app gets better through many small, proven changes, each chosen because it matters more than the alternatives.
This skill is that routine: **look** (three lenses), **choose** (few, ranked), **change** (small), **prove** (tests,
screenshots), **record** (so the next round starts informed), then go round again.

Keep the user posted in one line per phase. The user's words narrow the loop: "improve loop on the practice screen"
limits every lens to that screen; "improve loop, code only" runs one lens; "3 rounds" sets the count.

## Ground rules

- **Small rounds.** A round changes 3–6 things and ends with a green test suite and a commit. Never one giant diff.
- **Evidence over opinion.** Every finding has evidence (a screenshot, a measurement, a file and line, a failing
  case) and every fix has proof (a test, a before/after screenshot, a number that moved).
- **The owner decides the big things.** Fix freely what is clearly broken or clearly better. Ask first (one question,
  with your recommendation) before: removing a feature, changing how a core task works, a new dependency, a data or
  schema change, anything that costs money, or more than about half a day of work. New features are proposed, not
  built, unless they are small and obviously wanted, or the user said to build.
- **Don't deploy or merge** unless the user asked in this conversation. Commit and push to the working branch.
- **The project's rules win** (CLAUDE.md, README, style guides, test conventions). Keep its look, tone and structure.
- **Use what exists.** If an `app-ux` skill is installed, the UX lens follows it (its checklist IDs and audit
  script). If a code-review or security-review skill is installed, the code lens may use it. Don't duplicate them.

## 0. Start: context and the log

1. Read the project notes (CLAUDE.md, README) and `git log --oneline -20`: what the app is, who uses it, where, on
   what devices; how to build, test and run it; recent work.
2. Open the loop's log, `docs/improve-loop.md` in the project (create it from `references/log-format.md` if
   missing). It holds the **core tasks**, the **backlog** of open findings, and one entry per **round**. Findings
   from earlier rounds are not re-discovered: re-check the open ones and carry on.
3. Collect what the owner already said: open issues, TODOs, feedback the app stores (ratings, comments, bug
   reports), and anything from this conversation. The owner's own complaints outrank anything you find.
4. Write (or confirm) the 3–5 **core tasks**: what people come to this app to do. Every finding is judged against
   them.
5. Run the tests and the build once. Red before you change anything → that is finding number one.

## 1. Look: three lenses

Run the app locally and look at the real thing; read the code second. Details and checklists per lens are in
`references/lenses.md`. With a subagent tool available, run the three lenses in parallel as independent reviewers
(findings only, no edits), each given the core tasks, the scope and the open backlog; otherwise do them in turn.

| Lens | Question | Evidence |
|---|---|---|
| **UX/UI** | Can people do the core tasks quickly, on their real device, without thinking? | screenshots at phone and desktop size, the audit script's measurements, a task walk-through with taps counted |
| **Features** | What is missing, half-finished or unused that would make a core task better? | where a task dead-ends or needs a workaround, the owner's feedback, what similar apps do |
| **Code** | What is wrong, fragile or needlessly complicated in the code behind those tasks? | file and line, a failing input, a missing test, duplicated logic, a slow path with a timing |

Each finding, in one line each: **what** (screen or file), **why it matters** (which core task, how often),
**evidence**, **severity** 1–4 (4 = blocks a core task or loses data, 3 = hurts a core task every time, 2 = hurts
sometimes or looks wrong, 1 = polish), **effort** S/M/L, and a proposed change.

## 2. Choose

1. Merge duplicates across lenses: one finding per root cause (a cluttered screen and a 600-line file are often the
   same problem).
2. Rank by severity × how often the task happens ÷ effort. Order of ties: bugs and data loss, then core-task
   friction, then missing pieces of existing features, then code health that makes the next rounds cheaper, then
   polish, then new features.
3. Pick this round's batch: 3–6 items that fit together (same screen or same module), at least one visible to the
   user and at least one that makes the code safer to change. Everything else goes in the backlog with its rank.
4. If the batch contains anything from "the owner decides", ask now, once, with the list and your recommendation.
   Otherwise say in two lines what this round will do, and start.

## 3. Change

One item at a time, the smallest change that removes the cause:

- reproduce first (a failing test, a screenshot, a measurement), then fix;
- prefer removing and moving over adding; reuse the app's own components, helpers and words;
- a new behaviour gets a test at the cheapest level that proves it; a UI rule that could regress gets one too;
- keep unrelated refactors out: note them as findings for a later round.

## 4. Prove

- The full test suite, type check, linter and build: green.
- For each visible change: before and after screenshots at the sizes people use, looked at, not just taken. Rerun
  the UX audit if one was run.
- For each code change: the test that fails without it; for performance, the number before and after.
- Walk the core tasks once more through the real entry points: nothing else broke.

A change that can't be proven is reverted or moved back to the backlog with what blocked it.

## 5. Record and commit

1. Update `docs/improve-loop.md`: the round (date, scope, what changed and its proof, what was dropped and why), the
   backlog re-ranked, and "next round: start with …".
2. Update the project notes where behaviour or structure changed (CLAUDE.md, README), in their style.
3. Commit with a clear message per coherent change (or one for the round), following the repo's rules, and push the
   working branch.

## 6. Go round again, or stop

Start the next round at step 1 with fresh eyes on the changed app (the last round's changes are the first thing to
review: did they create new problems?). Default: **2 rounds**, or the number the user gave. Stop earlier when:

- nothing above severity 2 is left in scope;
- the remaining top items all need the owner's decision;
- a round produced no change that could be proven;
- the tests or the build are red for a reason you can't fix in the round.

## 7. Report

Short, in the user's language, most important first:

- what changed for the user, one plain line each, with the proof (screenshot, test, number);
- what changed in the code and why it makes the next change easier;
- decisions waiting for the owner, each with a recommendation;
- the top 5 of the backlog: what the next round would do;
- where it is (branch, commits) and that nothing is deployed, unless the user asked for a deploy.

## Files

- [`references/lenses.md`](references/lenses.md): what each lens looks at, how to collect evidence, the prompt for a
  parallel reviewer.
- [`references/log-format.md`](references/log-format.md): the template of `docs/improve-loop.md`.
