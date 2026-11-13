# The three lenses

Each lens ends with findings in the same format (what, why it matters, evidence, severity 1–4, effort S/M/L,
proposed change). Stay inside the scope the user gave. Look at the running app before the code.

## Running the app and collecting evidence

- Start it the way the project says (dev server, emulator, CLI). For a web app, drive it with Playwright (already
  installed in cloud sessions: `require('playwright')`, `chromium.launch()`), at the sizes people use: phone
  390×844 and 320×568, desktop 1280×800. Listen for `pageerror` and failed requests on every page.
- Screenshot every screen and state on the core-task paths: empty, loading, error, offline, long content, dialogs and
  sheets open, keyboard open. Read the screenshots; a screenshot nobody looked at is not evidence.
- Never test against production: no writes, no load, no paid API calls there.

## UX/UI lens

If the `app-ux` skill is installed, follow its REVIEW workflow (context, audit script, task walk-through with the
checklist IDs) and stop before its "fix" step: the loop chooses what to fix. Without it, check at least:

1. **Core tasks, counted.** For each: steps and taps from opening the app to done; where the eye and thumb travel;
   what must be remembered between screens. Fewer, closer, more obvious.
2. **First look.** What does a new user see, and is the next step obvious? One primary action per screen.
3. **Touch and reach.** Targets ≥ 44 px with ≥ 8 px between; frequent actions in the lower half on a phone; nothing
   under the status bar, home indicator or keyboard.
4. **Feedback.** Every action answers within 0.1 s; over 1 s shows progress; errors say what happened and what to do;
   destructive actions have Undo or a confirmation.
5. **States.** Empty, loading, error, offline and very long content are designed, not accidents.
6. **Density and hierarchy.** What can be removed, collapsed or moved behind a tap? Is the important thing the
   biggest thing?
7. **Readability and access.** Body text ≥ 16 px, contrast ≥ 4.5:1, never colour alone, real buttons and labels,
   visible focus, works at 320 px and 200 % text.
8. **Consistency and words.** The same thing looks and is called the same everywhere; labels are short verbs in the
   user's language.

## Features lens

Improve what the app already promises before adding to it.

1. **Dead ends and workarounds.** Where does a core task stop short, need a second tool, or need the owner to ask
   the developer? (A list you can't search, a setting you can't undo, data you can't export or find again.)
2. **Half-finished features.** Options that exist on one screen but not its sibling, features without an empty state
   or without a way back, things the docs promise that the UI hides.
3. **The owner's signals.** Feedback stored in the app, issues, TODOs, and things said in conversation. Recurrent
   requests outrank your own ideas.
4. **Unused weight.** Features nobody reaches or that duplicate another: propose merging or removing (the owner
   decides).
5. **Next steps.** At most three new-feature proposals per round, each as: the user's problem in one sentence, the
   smallest version that solves it, what it costs (effort, complexity, running cost), and how you'd know it worked.

## Code lens

Review the code behind the core tasks and whatever changed recently (`git log`, `git diff <last release>..HEAD`),
not the whole repository line by line.

1. **Correctness.** Wrong results on edge input (empty, huge, duplicate, out of order, time zones), state that goes
   stale, races between two tabs/users/requests, errors swallowed, promises not awaited.
2. **Data safety.** Anything that can lose or corrupt the user's data: migrations, overwrites without a check, storage
   that can be cleared, writes that half-complete.
3. **Trust boundaries.** Input the server or the page trusts (params, uploads, stored HTML, AI output), secrets in
   code or logs, missing limits. A full audit is the security-review skill's job; note what you see.
4. **Tests.** Core tasks without a test; tests that can't fail; slow or flaky ones. The cheapest test that proves a
   behaviour is the right one.
5. **Complexity.** Files and functions that do several jobs, duplicated logic that has already drifted, dead code,
   abstractions with one user, names that lie. Propose the smallest restructuring that makes the next change easier.
6. **Performance.** Start-up, the slowest interaction on a core task, bundle or payload size, repeated work. Measure
   before claiming.
7. **Docs and drift.** Project notes that no longer match the code; commands that don't run.

## Prompt for a parallel reviewer

Give each reviewer subagent only what it needs, and no conclusions of your own:

> Review `<project path>` through the **<lens>** lens only. Read CLAUDE.md and README first. The app's core tasks:
> <list>. Scope: <scope>. Already known, don't repeat: <open backlog titles>. Run the app locally as the docs say and
> look at the real thing before the code. Follow the <lens> section of `<skill dir>/references/lenses.md`. Report
> findings only, make no edits and no commits: for each, what (screen or file:line), why it matters (which core task,
> how often), evidence (screenshot path, measurement, failing input), severity 1–4, effort S/M/L, proposed change.
> At most 12 findings, most severe first, then anything you couldn't check and why.

Treat a reviewer's findings as leads: reproduce each one before fixing it.
