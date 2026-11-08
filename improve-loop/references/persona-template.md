# Persona file template

Put it in the project (`docs/doelgroep.md` or `docs/persona.md`, in the project's language) and point CLAUDE.md at
it. Keep it to one page; the loop reads it every round.

```markdown
# <Audience> and goal (<date>)

## The user
- Who they are, in one line (e.g. "a Belgian DIY builder planning their own electrics and home automation").
- What they know and what they half know; what they never read.
- What they want to get out of the app (two or three outcomes, e.g. pass the inspection, order the right
  material, a smart home that works).
- Where and on what they use it (laptop, phone on site).

## The goal
The question every round asks (e.g. "can this user use this screen without a manual?"), then the principles:
explanations for every term, messages with what / why / what next, safe defaults, the next step always visible,
nothing refused or changed silently, correct over complete (sources, no invented rules).

## The expertise a round brings
Which expert the reviewer is (e.g. electrical code and fuse box, a protocol), where the project already encodes
that knowledge (docs, rule code, research), and the core concepts the user must get a grip on.

## How a round checks it
Screenshots read with this user's eyes (also at phone width if they use one), at least one improvement per round
for them with requirements and tests, and the reviewer told about this user.
```

## Questions a round asks with it

- Which word on this screen would this user not know? Is its explanation one click or one glance away?
- Does every message say what is wrong, why it matters and what to do, with a way to get there?
- Does every empty state say what to do first, and every done step what comes next?
- Would this user make a dangerous or non-compliant choice by accepting the defaults? Then the default is wrong.
- Is every rule and number in the app backed by a source in the docs?
