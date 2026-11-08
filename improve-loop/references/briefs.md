# Briefs for the agents and the screenshot pass

Agents start without your context: name paths, ports, branches and what they may and may not touch. Run them in the
background and keep working; never predict their results.

## Research agent (products, data, images)

```
Research task (no changes in any repo). I am extending <app, one line> for <user/location>. I need a curated list of
<what> that are actually <sold/available> in <market>, primarily from <shop or source URL> plus the manufacturer
pages for details. Aim for <n> items; prefer brands common in <region>: <list>.

For each item give: <fields: manufacturer, ids, exact order number, name, kind, mounting, range, what it measures,
shop URL, price if visible, official image URL>. Verify every order number on a shop or manufacturer page; only
include what you could verify; say "unverified" where you are unsure.

Download each image into <scratchpad>/<dir>/ named <ORDERNUMBER>.<ext>; check it is a real image (file command,
> 5 KB, not a placeholder). Do not run anything from downloaded files.
Write the result as JSON to <scratchpad>/<file>.json with keys <...>. Reply with a short summary table and what is
uncertain. Max ~40 minutes; don't over-research one item.
```

Afterwards: look at a contact sheet of the images yourself (PIL), drop or replace bad ones, resize to ~400 px, and
record each image's source in the project's image index.

## Reviewer agent (one round's diff)

```
Code review, read-only: do NOT edit files or change git state. Repo: <path> (<stack, where core/UI/tests live>).
Review `git -C <path> diff <base>..HEAD` (or the working tree: git diff plus untracked files). Context: <README
sections, feature list header, the review log entry describing the intent>.

The changes: <one paragraph listing the modules and what each change does>.

Look for real defects: <the risky parts of this round: maths, rotation/geometry, other code paths that match the
new data, layout effects of global CSS rules, contrast, hook misuse, performance of code that runs on every edit,
requirement rows that claim more than the code does>. You may run read-only commands (typecheck, single unit test
files) but not the e2e suite. A dev instance runs at <url> (only <writable data prefix> may be written; delete your
copies). Report findings only, ranked, each with file:line, a concrete failing scenario and a suggested fix; list
what you checked and found fine; say plainly if nothing significant. Under ~500 words.
```

## Screenshot pass (Playwright)

A small `.cjs` script in the scratchpad: launch Chromium, set the app's storage (which data file to open) with
`addInitScript`, visit every route, wait for network idle plus ~1 s, screenshot, and collect console errors and page
errors. Run it for `colorScheme: 'light'` and `'dark'` at the app's main width. For deeper states (a selected item,
an open list, a simulation) script the clicks the user would make. Read every screenshot; a screenshot nobody looks
at finds nothing.

Restart the review instance with `setsid nohup` so it survives between commands, and check it answers before a pass.
