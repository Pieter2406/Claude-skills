---
name: app-ux
description: UX/UI guidelines and a review method for apps and web apps, phone first. Use it whenever you design, build, review, audit or improve the interface of an app, website or screen — "make it nicer", "it's hard to use on my phone", "review the UX", "optimize for mobile", "improve the design", "is this accessible?", "the UI is too full", "maak het gebruiksvriendelijker", "optimaliseer voor gsm" — and before shipping any new screen. It gives a checklist of concrete, sourced rules (touch targets, thumb reach, safe areas, accessibility WCAG 2.2 AA, navigation and sheets, forms and feedback, visual design, motion, performance, social use, microcopy), a step-by-step review workflow with severity ratings, and a Playwright audit script that measures what a browser can measure (tap targets, reach, contrast, zoom, overflow, input zoom, labels, layout shift).
---

# App UX/UI: build it right, review it honestly

Most UI problems in small apps are the same few: things you tap are too small or out of thumb reach, the screen is
too full, state changes are silent, phones' safe areas and keyboards cover things, and contrast or labels fail people
who aren't the developer. This skill turns that into concrete rules with IDs (in `references/checklist.md`), a review
method (`references/process.md`) and a script that measures the measurable part (`scripts/audit.mjs`).

Two modes:
- **BUILD** — designing or building a screen: follow the build order below and start from the defaults table.
- **REVIEW** — improving an existing app: follow the review workflow, then fix in small verified steps.

## The rules that catch most problems (phone first)

1. **MOB-1** Every tap target ≥ 44×44 CSS px (48 for frequent/primary), never < 24×24 (WCAG 2.5.8 floor); ≥ 8 px between targets.
2. **MOB-4** Frequent and primary actions live in the lower half (thumb zone); the top corners hold only rare actions.
3. **MOB-6** Fixed top/bottom UI respects `env(safe-area-inset-*)` with `viewport-fit=cover`; nothing sits under the status bar or home indicator.
4. **MOB-8** Content never hides behind fixed bars: scroll padding ≥ bar height + safe-area inset.
5. **MOB-12** Inputs use ≥ 16 px text (iOS zooms otherwise); never disable pinch zoom.
6. **MOB-14** The focused field and its submit action stay visible above the on-screen keyboard.
7. **NAV-4** Every sheet/dialog has a visible Close, closes by Esc/back/scrim/swipe-down, and asks before discarding typed input.
8. **NAV-5** One modal at a time; one dominant primary action per screen.
9. **IN-6** Common destructive actions act at once with Undo; confirm only rare, irreversible ones.
10. **IN-8** Every action gives feedback within 0.1 s; > 1 s shows progress; failures say what happened and how to fix it.
11. **IN-11** Design the empty, loading, error, offline and long-content states of every screen, not just the happy path.
12. **VIS-1** Body text ≥ 16 px, contrast ≥ 4.5:1 (text) / 3:1 (large text, icons, borders); never colour alone.
13. **VIS-6** Show less: one job per screen, progressive disclosure, collapse what's done; density is a choice, not an accident.
14. **A11Y-3** Native elements (`button`, `a`, `label`, `dialog`) with accessible names; visible focus; status messages in a live region.
15. **A11Y-9** Works at 320 px wide and 200 % text without horizontal scrolling or clipped text.
16. **VIS-10** Motion 150–300 ms, transform/opacity only, and off under `prefers-reduced-motion`.
17. **PERF-1** LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 on a mid-range phone; reserve space for images and late content.
18. **CTX-1** Design for the real situation (one hand, a dim room, mid-conversation, glanced at): big, high-contrast, interruptible.
19. **COPY-1** Labels are short verbs in the user's language; errors say what happened, why, and what to do.

## REVIEW workflow

1. **Context first.** Who uses it, where, on which devices (home-screen app?), in what situation, and the 3–5 core
   tasks. Read the project notes (CLAUDE.md, README) and skim the UI code. Write the core tasks down: every finding
   is judged against them.
2. **Measure.** Run the audit script against the running app at phone sizes (it also saves screenshots):
   ```bash
   node <skill-dir>/scripts/audit.mjs <url> --out ux-audit --sizes phone,small [--click "#openDialog"]... [--safe-area 47,34]
   ```
   Then take screenshots of every important screen and state at 390×844 and 320×568: dialogs, empty, loading, error,
   offline, long names, many items, keyboard open. Use the app's own test helpers (Playwright) to reach deep states.
   Put them on one contact sheet and look at all of them.
3. **Walk the core tasks** screen by screen with `references/checklist.md` (heuristic evaluation, see
   `references/process.md`): mark fail/pass per relevant ID, note where the thumb has to travel, what is silent, what is
   crowded, what is hidden.
4. **Write findings**: ID, screen/state, what's wrong and why it matters, evidence (screenshot, measurement),
   severity 0–4 and effort (S/M/L). Merge duplicates; one finding per root cause.
5. **Prioritize**: severity × frequency of the task; quick wins (high severity, small effort) first, then structural
   changes. When changes are large or change how the app works, agree the plan with the user first.
6. **Fix in small, verified steps**, keeping the app's visual identity (colours, fonts, tone). Prefer removing and
   moving over adding.
7. **Verify**: rerun the audit and screenshots, compare before/after, run the app's tests; add a test for layout
   rules that could regress (e.g. "primary buttons are in the bottom quarter").
8. **Report** what changed (by finding ID), what was deliberately left, and what needs a real-device check
   (VoiceOver/TalkBack, a notched phone in standalone mode).

## BUILD order for a screen

Task (what must the user get done here, in one sentence) → layout zones (content in the middle, actions at the bottom,
status at the top) → hierarchy (one primary action, secondary as text/outlined, destructive apart) → states (empty,
loading, error, offline, long/many) → copy (verbs, the user's language) → motion and feedback → check against the
checklist and run the audit.

| Default | Value |
|---|---|
| Body text | 16–17 px, line height 1.4–1.6, 45–75 characters per line |
| Inputs | ≥ 16 px text, ≥ 44 px tall, visible label, right `type`/`inputmode`/`autocomplete`/`enterkeyhint` |
| Tap targets | 44–48 px, ≥ 8 px apart; full row/card clickable |
| Spacing | 4/8 px scale (4, 8, 12, 16, 24, 32, 48); 16 px side gutter on phones |
| Contrast | text ≥ 4.5:1, large text/icons/borders ≥ 3:1 |
| Primary actions | bottom of the screen, full-width or thumb-side; ≤ 1 filled button per view |
| Safe areas | `viewport-fit=cover` + `env(safe-area-inset-*)` on every fixed bar/sheet/toast |
| Heights | `100dvh` (fallback `100vh`); sheets ≤ `100dvh − safe-area-top − 12px` |
| Motion | 150–300 ms, ease-out to enter, ease-in to leave; reduced-motion respected |
| Feedback | < 0.1 s acknowledge, > 1 s progress, > 10 s progress with estimate/cancel |
| Toast | bottom, above fixed bars, one at a time, 4–10 s, Undo for destructive actions |

## Files

- [`references/checklist.md`](references/checklist.md) — all rules with IDs, thresholds, how to check, severity, sources.
  Read the sections that apply; in REVIEW mode go through all of them.
- [`references/process.md`](references/process.md) — heuristic evaluation, Nielsen's heuristics, severity scale,
  finding format, prioritizing, lightweight user testing.
- [`references/sources.md`](references/sources.md) — the standards and research behind the rules.
- `scripts/audit.mjs` — automated checks (Playwright; uses axe-core too when installed). Its findings carry checklist
  IDs. It measures, it doesn't judge: always look at the screenshots yourself.
