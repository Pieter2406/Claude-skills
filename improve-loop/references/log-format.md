# Template for `docs/improve-loop.md`

Keep it short: it is read at the start of every round. One line per finding; details live in commits and tests.
IDs are stable (U = UX/UI, F = feature, C = code) so rounds and commits can refer to them.

```markdown
# Improve loop

How this app gets better, round by round (the improve-loop skill). Newest round first.

## Core tasks

1. <what people come here to do>
2. …

## Next round: start with

- <the one or two things the last round pointed at>

## Waiting for the owner

- F7 · <decision needed> · recommendation: <…>

## Backlog (ranked)

| ID | Sev | Effort | What | Why it matters | Evidence |
|---|---|---|---|---|---|
| U12 | 3 | S | Loop sheet: Save hides under the keyboard | every saved spot | shots/r2-loop-kbd.png |
| C4 | 2 | M | playback.ts schedules passes in two places | double count-in bug came from here | playback.ts:210, :388 |

## Rounds

### Round 2 · 2026-11-13 · scope: practice screen

- Done: U3 loop handles (test: loop.test.ts "drag end handle"; before/after shots) · C2 one pass scheduler
  (removed 80 lines; 3 new tests) · U9 contrast of chips 3.1 → 4.8
- Dropped: F2 (needs the owner: changes what "Save spot" means)
- Tests: 284 passing · build ok · commits abc123..def456

### Round 1 · …

## Closed

- U1, U2, C1 (round 1) …
```
