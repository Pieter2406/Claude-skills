# UX/UI checklist

One rule per line: **ID — rule.** Threshold. *Check:* how (auto = `scripts/audit.mjs` measures it). Severity:
**C** critical (blocks a task or excludes people), **M** major (slows or confuses many), **m** minor (polish).
Review screen by screen and task by task; for every fail, write a finding (see `process.md`).

## MOB — Mobile ergonomics, touch and the mobile web

- **MOB-1 — Tap targets ≥ 44×44 CSS px** (48 for primary/frequent controls, steppers, keypads); never below 24×24 unless a 24 px circle around it touches no other target (WCAG 2.5.8 AA; 44 = WCAG 2.5.5 AAA, Apple HIG 44 pt, Material 48 dp). *Check:* auto. **C** below 24, **M** below 44. [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) · [HIG](https://developer.apple.com/design/human-interface-guidelines/buttons) · [M3](https://m3.material.io/foundations/designing/structure)
- **MOB-2 — ≥ 8 px between hit areas;** expand small glyphs with padding, not bigger icons; make the whole row/card/label clickable. *Check:* auto (gaps), manual (rows). **M** [web.dev](https://web.dev/articles/accessible-tap-targets)
- **MOB-3 — Destructive actions away from frequent ones** (not in the same tight row; different position or styling; Undo). *Check:* manual. **M** [UXmatters/Hoober](https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php)
- **MOB-4 — Thumb zone:** primary content in the middle, frequent/primary actions in the lower half or beside their object; top corners only for rare actions. Every frequent action reachable with either thumb. People hold phones one-handed (≈49 %), cradled (≈36 %) and two-handed (≈15 %) (Hoober 2013). *Check:* auto (interactive elements in the top 20 % of a phone viewport are flagged), manual (task walk). **M** [Hoober](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)
- **MOB-5 — Edge targets bigger:** ≈ 11 mm (≈ 42 px) at the top, ≈ 12 mm (≈ 46 px) at the bottom edge and corners. *Check:* manual. **m** [UXmatters/Hoober](https://www.uxmatters.com/mt/archives/2017/05/design-for-fingers-touch-and-people-part-2.php)
- **MOB-6 — Safe areas:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` and every fixed/sticky bar, sheet, toast and full-screen view pads with `env(safe-area-inset-*)` (home-screen apps on iOS draw under the status bar). *Check:* auto (meta + env usage + elements in the inset bands with `--safe-area`), manual on a notched phone in standalone mode. **C** when text/controls sit under the status bar. [WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- **MOB-7 — Use `100dvh`** (fallback `100vh`) for full-height layouts; `vh` is wrong while the browser bars move. *Check:* code. **m** [web.dev](https://web.dev/blog/viewport-units)
- **MOB-8 — Nothing hidden behind fixed UI:** scroll padding ≥ height of fixed bars/FAB + safe-area inset; one persistent bottom bar at most; keep fixed bars ≤ ~25 % of the viewport height. *Check:* auto (fixed elements' share of the viewport), manual (scroll to the end). **M**
- **MOB-9 — Gestures have tap alternatives** (swipe deck → buttons, swipe-to-dismiss → Close, finger chooser → draw names); never hide primary actions behind long-press/swipe (WCAG 2.5.1 A, 2.5.7 AA). *Check:* manual. **C** [WCAG 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)
- **MOB-10 — Keep custom swipes off the OS edges** (back gesture, home indicator); set `touch-action` on gesture surfaces (`pan-y` for horizontal swipes, `none` only where needed). *Check:* code. **M** [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)
- **MOB-11 — Contain inner scrolling** (`overscroll-behavior: contain` on sheets and scroll panes) and protect typing/scoring screens from accidental pull-to-refresh. *Check:* code. **m** [Chrome](https://developer.chrome.com/blog/overscroll-behavior)
- **MOB-12 — Input text ≥ 16 px** (iOS Safari zooms into smaller fields) and never `user-scalable=no` or `maximum-scale` < 2 (WCAG 1.4.4). *Check:* auto. **M** [WCAG 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)
- **MOB-13 — Pressed states on touch:** visible `:active` feedback; put decorative `:hover` inside `@media (hover: hover)`; act on release, not on touchstart (WCAG 2.5.2). *Check:* manual. **m** [WCAG 2.5.2](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html)
- **MOB-14 — Keyboard never hides the focused field** or its next/submit action; un-fix bottom bars while typing if needed (`visualViewport`, `scrollIntoView({block:'center'})`, `interactive-widget=resizes-content` on Android). *Check:* manual (screenshot with keyboard open). **M** [Chrome](https://developer.chrome.com/blog/viewport-resize-behavior)
- **MOB-15 — Back works:** in a standalone PWA there's no browser Back; every non-root view/overlay has its own Close/Back, and system Back/Esc closes overlays (route them through history or `<dialog>` close requests). *Check:* manual. **M** [Chrome](https://developer.chrome.com/blog/new-in-chrome-120)
- **MOB-16 — Don't lock orientation** unless essential; landscape must still work with side safe areas (WCAG 1.3.4 AA). *Check:* manual. **m** [WCAG 1.3.4](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html)
- **MOB-17 — Live data refreshes itself** (polling/push); pull-to-refresh is never the only way. *Check:* manual. **M**

## A11Y — Accessibility (WCAG 2.2 AA in practice)

- **A11Y-1 — Text contrast ≥ 4.5:1**, large text (≥ 24 px, or ≥ 18.66 px bold) ≥ 3:1, including placeholders, captions and scores (1.4.3). *Check:* auto (solid backgrounds), manual on gradients/images. **C** [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- **A11Y-2 — Non-text contrast ≥ 3:1** for control borders that define a field, focus rings, icons that carry meaning, selected states (1.4.11). *Check:* manual. **M** [WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **A11Y-3 — Native semantics and names:** `<button>` for actions, `<a href>` for navigation, `<label>` for inputs (placeholder isn't a label), `<dialog>` + `showModal()` for modals; every icon/emoji-only control has an accessible name that contains its visible text (4.1.2, 2.5.3). *Check:* auto (unnamed controls, images without alt). **C** [Using ARIA](https://www.w3.org/TR/using-aria/)
- **A11Y-4 — Visible focus** on every focusable element (`:focus-visible` outline ≥ 2 px, 3:1); never `outline: none` without replacement; sticky bars never fully cover the focused element (2.4.7, 2.4.11; use `scroll-padding`). *Check:* auto (tabs through the first elements). **M** [WCAG 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- **A11Y-5 — Never colour alone:** names/initials/icons/text for players, states, errors, winners (1.4.1). *Check:* manual (greyscale screenshot). **M** [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- **A11Y-6 — Status messages announced** through a live region present (empty) at load: saved, added, match found, errors (4.1.3). *Check:* manual/code. **M** [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- **A11Y-7 — Dialog focus:** focus moves into the dialog, stays there, returns to the opener on close; re-renders never drop focus to `<body>`. *Check:* manual (keyboard). **M** [APG dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- **A11Y-8 — Headings and landmarks:** one `h1`, `h2` per section, `main`, dialogs labelled (`aria-labelledby`). *Check:* auto (h1/landmark presence). **m**
- **A11Y-9 — Reflow and resize:** works at 320 CSS px wide without horizontal scrolling (1.4.10) and at 200 % text without clipping (1.4.4); sizes in rem/em; text spacing overrides don't break it (1.4.12). *Check:* auto (overflow at 320), manual (200 % text). **C** [WCAG 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- **A11Y-10 — Motion and flashing:** respect `prefers-reduced-motion`; anything moving > 5 s can be paused (2.2.2); never > 3 flashes per second (2.3.1). *Check:* auto (reduced-motion media query present when animations exist). **M**/**C** for flashes. [WCAG 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
- **A11Y-11 — Timed UI isn't the only path:** an auto-dismissing toast never holds the only Undo or important info for long; give it ≥ 4–10 s and an alternative (2.2.1). *Check:* manual. **M** [WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)
- **A11Y-12 — `lang` set** to the UI language (`lang="nl"`) (3.1.1). *Check:* auto. **M**
- **A11Y-13 — Accessible authentication:** allow paste and password managers in code/password fields; no memorising or retyping (3.3.8). *Check:* manual. **M** [WCAG 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)
- **A11Y-14 — Don't ask twice** in one flow; prefill what's known (3.3.7). *Check:* manual. **m** [WCAG 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)
- **A11Y-15 — Test with VoiceOver (iOS Safari) and TalkBack (Android Chrome)** and a keyboard for core flows before calling them done. *Check:* manual. **M** [GOV.UK](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies)

## NAV — Navigation, structure, sheets and dialogs

- **NAV-1 — Bottom tab bar only for 3–5 top-level destinations**, each icon + 1–2 word label, never for actions; max one persistent bottom bar. *Check:* manual. **M** [M3](https://m3.material.io/components/navigation-bar/guidelines) · [HIG](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- **NAV-2 — Shallow structure;** prefer one scrollable home with clear sections and sheets for tasks over deep hierarchies; titles short and specific. *Check:* manual. **m**
- **NAV-3 — Sheets for short contextual tasks only;** don't replace page flows with sheets; option sheets open at ≤ 50 % height; keep sheets below the status bar. *Check:* manual. **M** [NN/g](https://www.nngroup.com/articles/bottom-sheet/)
- **NAV-4 — Every overlay closes predictably:** visible Close/Cancel, Esc, Android back, scrim tap (when nothing is lost), swipe-down with a grabber; if closing would discard input, ask (Keep editing / Discard). *Check:* manual. **C** if no way out. [HIG sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
- **NAV-5 — One modal at a time** (an alert on top of a sheet is the only exception) and **one dominant primary action per view** (one filled button; secondary outlined/text; destructive separated). *Check:* manual. **M** [HIG buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- **NAV-6 — Interruptions match importance:** inline status or snackbar for information; dialogs only for decisions; no dialogs on launch. Dialog titles state the question ("Catan verwijderen?"), ≤ 2 actions, verbs on buttons. *Check:* manual. **M** [HIG alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
- **NAV-7 — Segmented controls for 2–5 views/options in one screen; chips for filters** (labels ≤ 20 chars, selected state shown by more than colour). *Check:* manual. **m** [M3 chips](https://m3.material.io/components/chips/guidelines)
- **NAV-8 — Preserve place:** scroll position and tab/filter choices survive returning to a view; deep links open the right state. *Check:* manual. **m**
- **NAV-9 — Follow both platforms' shared semantics without cloning either's chrome** (no fake iOS status bars, no Android ripples on iOS-styled UI). *Check:* manual. **m** [web.dev](https://web.dev/learn/pwa/app-design)

## IN — Input, feedback, errors and trust

- **IN-1 — Visible labels above fields;** placeholders only for examples. *Check:* auto (unlabelled inputs). **M** [NN/g](https://www.nngroup.com/articles/form-design-placeholders/)
- **IN-2 — Right keyboard:** `type`, `inputmode` (`numeric`/`decimal`; note iOS numeric pads have no minus sign — use `text` for signed numbers), `autocomplete`, `enterkeyhint`, `autocapitalize`. *Check:* code. **M** [MDN inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode)
- **IN-3 — Good defaults and prefill;** remember last choices; fewer fields; steppers/segmented controls for small ranges instead of typing. *Check:* manual. **m**
- **IN-4 — Validate on blur or submit, not on every keystroke;** error text next to the field, in words, with how to fix it; keep the input. *Check:* manual. **M** [NN/g errors](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- **IN-5 — No data loss:** autosave or keep drafts; warn before discarding; survive reloads and flaky networks. *Check:* manual. **C**
- **IN-6 — Undo over confirm:** routine destructive actions happen immediately with an Undo (toast); confirmation only for rare, irreversible, costly ones. *Check:* manual. **M** [NN/g](https://www.nngroup.com/articles/confirmation-dialog/)
- **IN-7 — Prevent double submits:** disable/busy-state the button and show progress in it. *Check:* manual. **m**
- **IN-8 — Response time:** acknowledge within 0.1 s, show progress after ~1 s, after ~10 s show progress with an estimate or a way out (Nielsen's limits); prefer optimistic UI with rollback. *Check:* manual. **M** [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/)
- **IN-9 — Toasts:** bottom, above fixed bars, one at a time, ≤ 2 lines, 4–10 s, action (Undo) optional; announced politely. *Check:* manual. **m** [M3 snackbar](https://m3.material.io/components/snackbar/guidelines)
- **IN-10 — Sync and connection status visible** for shared/live data (live/offline indicator, "saving…" / "saved"), and conflicts explained, not silently overwritten. *Check:* manual. **M**
- **IN-11 — Every state designed:** empty (explain + first action), loading (skeleton/placeholder for > 1 s), error (what + retry), offline, long names, many items, zero results. *Check:* manual (screenshots of each). **M**
- **IN-12 — First run:** explain in context (empty states, one-line hints), not with long tours; ask for permissions (camera, notifications) only at the moment they're needed, with the reason. *Check:* manual. **m** [NN/g](https://www.nngroup.com/articles/mobile-app-onboarding/)
- **IN-13 — Trust:** say who can see what (private link, photos), and make updates visible (new version → reload prompt, not silent breakage). *Check:* manual. **m**

## VIS — Visual design and motion

- **VIS-1 — Readable text:** body 16–17 px (never < 12 px for any text), line height 1.4–1.6, 45–75 characters per line; tabular figures for scores and tables (`font-variant-numeric: tabular-nums`). *Check:* auto (text < 12 px). **M** [Material type](https://m3.material.io/styles/typography/applying-type)
- **VIS-2 — Consistent spacing scale** (4/8 px: 4, 8, 12, 16, 24, 32, 48) and a 16 px side gutter on phones; related things closer than unrelated (proximity). *Check:* manual. **m**
- **VIS-3 — Clear hierarchy:** one focal point per screen; size/weight/colour budget spent on what matters; at most 2 typefaces. *Check:* manual (squint test, greyscale). **M**
- **VIS-4 — Semantic colour:** one accent for primary actions, consistent success/warning/error colours, player colours that stay distinguishable for colour-blind users (pair with names). *Check:* manual. **M**
- **VIS-5 — Dark mode done right:** dark grey/navy surfaces rather than pure black for large areas, lighter surfaces for elevation, desaturated accents; glow effects must not reduce text contrast; set `color-scheme`. *Check:* auto contrast + manual. **m** [M3 color](https://m3.material.io/styles/color/system/overview)
- **VIS-6 — Show less:** one job per screen; collapse finished or secondary parts; progressive disclosure for rare options; remove duplicate information (e.g. a note and an alert saying the same). *Check:* manual (count visible elements above the fold). **M**
- **VIS-7 — Icons with labels** for anything not universally known; icon-only only for ✕, back, search, share-like conventions. *Check:* manual. **m** [NN/g icons](https://www.nngroup.com/articles/icon-usability/)
- **VIS-8 — Text fits:** labels don't truncate or wrap awkwardly at 320 px or in the longer language; truncation keeps the distinguishing part (not "S…" for "Skull King"). *Check:* auto (overflow), manual (screenshots at 320). **M**
- **VIS-9 — Stable layouts:** nothing jumps when data arrives (reserve space, fixed heights for counters, `width`/`height` on images). *Check:* auto (CLS). **M**
- **VIS-10 — Purposeful motion:** 150–300 ms for UI transitions (enter ease-out, exit ease-in), animate `transform`/`opacity` only, no animation on every poll, celebrations brief; all under `prefers-reduced-motion: no-preference`. *Check:* auto (media query), manual. **m** [M3 motion](https://m3.material.io/styles/motion/easing-and-duration)

## PERF — Performance and perceived speed

- **PERF-1 — Core Web Vitals (75th percentile, mobile):** LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. *Check:* auto (lab LCP/CLS/long tasks), field data where available. **M** [web.dev](https://web.dev/articles/vitals)
- **PERF-2 — Fonts:** self-host, preload the main one, `font-display: swap`, subset; at most 2 families. *Check:* code. **m** [web.dev fonts](https://web.dev/articles/font-best-practices)
- **PERF-3 — Images:** sized for their display (`srcset`/resized files), `loading="lazy"` below the fold, explicit dimensions. *Check:* auto (missing width/height). **m**
- **PERF-4 — Load what's needed:** split rarely used code/content (dynamic `import()`); no work on the main thread > 50 ms during interaction. *Check:* auto (long tasks). **m**
- **PERF-5 — Polling and battery:** poll only while visible, back off when idle, cheap "unchanged" responses; no timers when hidden. *Check:* code. **m**

## CTX — Use in the moment (social, in-activity, shared)

- **CTX-1 — Design for the real situation:** one hand, mid-conversation, a dim room, glanced at between turns: large high-contrast numbers, short flows, resumable state, no reading required to act. *Check:* manual (task walk "with one thumb, in 5 seconds"). **M**
- **CTX-2 — Everyone on their own phone:** live sync visible, identity without accounts ("who am I", remembered per device), clear who changed what, no overwrites (compare-and-swap + friendly conflict message). *Check:* manual with two phones. **M**
- **CTX-3 — Readable across a table:** key numbers (scores, timers) large enough to read at arm's length (≥ 24 px), and a big-screen/TV view when the group looks at one screen. *Check:* manual. **m**
- **CTX-4 — Keep the screen awake** during active use (Screen Wake Lock API, re-acquire on `visibilitychange`), and be gentle on battery. *Check:* code. **m** [MDN Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- **CTX-5 — Fairness and transparency** for random draws, turns and scoring: show the rule, show the result clearly to everyone. *Check:* manual. **m**
- **CTX-6 — Personality without noise:** fun copy, colour and celebration are welcome but never at the cost of clarity or speed; sounds off by default, haptics short (`navigator.vibrate` where supported, never essential). *Check:* manual. **m**

## COPY — Content, microcopy and localization

- **COPY-1 — Plain, short, in the user's language:** buttons are verbs ("Opslaan", "Start"), headings say what's here, no jargon or internal names. *Check:* manual. **M** [NN/g](https://www.nngroup.com/articles/microcopy/)
- **COPY-2 — Error messages:** what happened, why (if useful), what to do next; never blame; never only a code. *Check:* manual. **M** [NN/g](https://www.nngroup.com/articles/error-message-guidelines/)
- **COPY-3 — Locale formats:** dates, times and numbers via `Intl` with the right locale (`nl-BE`: "za 31 okt", 24 h, decimal comma). *Check:* manual. **m**
- **COPY-4 — Leave room for longer text** (Dutch/German run ~20–35 % longer than English); test with the longest real names. *Check:* manual. **m**
- **COPY-5 — Accessible names match the visible label** (start with the same words) (WCAG 2.5.3). *Check:* auto (partial). **m**
- **COPY-6 — Say it once:** don't repeat the same instruction as note + alert + placeholder; one well-placed sentence. *Check:* manual. **m**
