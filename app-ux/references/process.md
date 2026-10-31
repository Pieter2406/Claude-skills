# How to run a UX review

## Method: heuristic evaluation + task walk
1. Fix the **core tasks** (3–5) and the **situation** (device, one/two hands, lighting, alone or in a group).
2. Walk each task screen by screen as the user would, on a phone-sized viewport, with the checklist open. Note every
   point where the user would hesitate, travel far with the thumb, read twice, or not see what happened.
3. Sweep each screen once more against Nielsen's 10 heuristics (below) for anything the checklist missed.
4. One evaluator finds roughly a third of the problems; several independent passes (or several people) find far more
   ([Nielsen](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/)). When it matters, do a
   second pass with fresh eyes, focusing on a different lens (accessibility, first-time user, power user).

Nielsen's heuristics ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)): visibility of system status ·
match with the real world · user control and freedom · consistency and standards · error prevention · recognition
rather than recall · flexibility and efficiency · aesthetic and minimalist design · help users recognize, diagnose and
recover from errors · help and documentation.

Useful laws: **Fitts** (bigger and closer targets are faster), **Hick** (more choices, slower decisions: cut and group
options), **Jakob** (people expect your app to work like the others they use), **recognition over recall**, **peak-end**
(the best moment and the end of a session shape the memory: make finishing a game feel good).

## Severity (Nielsen 0–4)
Rate by frequency × impact × persistence ([NN/g](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/)):
- **4 catastrophe** — blocks a core task or loses data; fix before release.
- **3 major** — slows or confuses many users on a core task; high priority.
- **2 minor** — annoying, workaround obvious; fix when convenient.
- **1 cosmetic** — fix if there's time.
- **0** — not a usability problem.

## Writing a finding
```
[A11Y-1] Home · leader card — "16 punten na 4 spellen" is #8a84b8 on #2a2140 (3.1:1 < 4.5:1).
Why: unreadable in a dim room and for low vision. Evidence: audit.mjs phone, shots/01-home.png.
Severity 3 · Effort S · Fix: lighten to var(--muted-strong) (#b9b2e0, 6.2:1).
```
One finding per root cause; link duplicates. Say what to do, not only what's wrong.

## Prioritizing and fixing
- Order by severity × how often the task happens; do quick wins (severity ≥ 3, effort S) first.
- Structural changes (navigation, moving actions, merging screens) need a short plan, and the user's OK when they
  change how the app works.
- Fix in small steps, keep the visual identity, prefer removing/moving over adding.
- After each batch: rerun `scripts/audit.mjs`, retake the screenshots, run the app's tests, compare before/after.
- Add regression tests for layout rules that matter (e.g. "the primary buttons are in the bottom quarter at 320×568",
  "no horizontal scroll at 320 px", "dialogs never open under the status bar").

## Lightweight user testing
Five users per round find most problems in one design ([NN/g](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/));
three rounds of five beat one of fifteen. Give a task, watch silently, ask them to think aloud, note where they hesitate.
For a friends' app: hand the phone to someone mid-evening and watch them do one task.
