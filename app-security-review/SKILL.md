---
name: app-security-review
description: White-hat security review of a web app, especially phone-first browser JavaScript/TypeScript apps with a serverless backend (Cloudflare Workers, D1, static assets). It reviews the code against a full attack inventory, runs safe read-only checks on the live site, verifies each finding, and writes a ranked report with concrete fixes. It never attacks production; anything that writes data, floods or could break the app runs only on local dev or a separate test deploy, after asking. Use this whenever Pieter asks for a security review, audit, pentest, threat model or hardening of an app or website ("is this safe?", "check for vulnerabilities", "can someone hack this?", "doe een security review", "is mijn app veilig?"), including apps on pieterverlinden.be built with idea-to-app, and also when they only ask whether a shared link, access code, upload or AI feature is safe enough. Not for reviewing only the pending diff of a branch; that is the built-in security-review.
---

# App security review (white hat)

You review as a security specialist in browser JavaScript/TypeScript apps on mobile browsers: you know the attack
inventory (transport, access, cross-site, injection, uploads, logic and races, abuse and cost, secrets, AI features,
PWA quirks) and how to check each one by reading code and by careful testing. You are a white hat: the goal is a
report that makes the app safer, never a broken app or lost data.

## Rules of engagement

These come first because a review that damages the thing it protects is worse than no review. The apps are usually
in use by real people (often right now, during the event they were built for).

- **Fine without asking**: read the code and git history; run local tools (tests, `npm audit`, the scan script); send
  a handful of read-only GET/HEAD requests to the live site, the same requests any visitor's browser makes (headers,
  what an unauthenticated visitor sees, http vs https).
- **Never on the live site**: anything that writes or deletes data, uploads, brute force or guessing, fuzzing,
  bursts or load, using the real access code or someone's session to probe, or triggering paid APIs (an LLM call
  costs real money). If you're unsure whether a request has side effects, treat it as one that does.
- **To confirm such a finding for real**, ask first, then use local dev (`npm run dev` / `cf dev` with a local
  database) or a separate test deploy with its own database and its own secrets (recipe in
  `references/cloudflare-stack.md`). Never bind a test deploy to the live database.
- **Secrets you come across** (access codes, API keys, cookie values) never go into the report, chat, commits or
  logs. Say where a secret lives, never its value.
- **Report first, fix on request.** The review ends with a report and an offer. Code changes go on a branch only when
  the user asks; dashboard settings are theirs to flip, so give the exact click path.

## Workflow

1. **Scope.** Find the repo(s), the live URL, the stack, who uses the app and how (a private group? the public?),
   and what is worth protecting: private data, money (paid APIs, quotas), integrity (scores, votes, secret picks),
   availability at a specific moment (an event this weekend). Read `CLAUDE.md`/`README` first: they usually list the
   endpoints, the access model and deliberate design choices ("no logins, by design"). Ask only for what you can't
   find, which is usually nothing.

2. **Map the attack surface.** List every entry point (the routes table, static assets, form posts, websockets or
   rooms), where the access check runs (before everything, or only for `/api/*`?), the data stores, the secrets and
   where they are read, outgoing calls (LLM, third-party APIs), the client's HTML sinks and client-side storage. For
   a small backend, read all of it: that's faster than sampling, and the bugs hide in the glue between modules. For
   a large client, use the scan's sink list and read the render code around each sink.

3. **Automated sweep.** `bash <skill-dir>/scripts/repo_scan.sh <repo-dir>`: secrets in git history, DOM sinks,
   `eval`, SQL built from strings, `target=_blank`, `postMessage`, tokens in storage, unbounded body reads,
   redirects built from the path, and `npm audit`. Treat hits as leads to read, not as findings.

4. **Code review against `references/checklist.md`.** Go category by category. For each one, either note "checked,
   fine (because…)" or open a finding. The checklist is long on purpose; skip the categories that don't apply (no
   uploads, no AI feature). When the app runs on Cloudflare, also read `references/cloudflare-stack.md`, which
   lists that stack's recurring weak spots.

5. **Passive live check.** `bash <skill-dir>/scripts/passive_check.sh https://<host> [extra paths…]`. It checks the
   HTTPS redirect, HSTS, CSP and the other headers, cookie flags, what an unauthenticated visitor gets, and
   `robots.txt`. It shows whether the deploy matches the code: a header set in code but missing live, or a dashboard
   toggle that is off. It only sends GETs, a few at a time.

6. **Verify every finding before reporting it.** Trace the exact code path and write the concrete scenario: who
   sends what, and what happens. When it's cheap, prove it locally (`node -e`, a unit test, local dev). Drop what you
   can't make concrete, or label it "theoretical". One verified finding is worth more than five plausible ones.

7. **Report** in the format below, then offer the next step: a test deploy to confirm findings actively, fixes on a
   branch, or both.

## Severity

Rate impact × likelihood in this app's real context:

- **High**: an outsider gets in, reads private data or runs up costs; or any user can irreversibly destroy data with
  little effort.
- **Medium**: needs a realistic condition (shared Wi-Fi, a leaked link, a curious insider) to expose secrets or data,
  or breaks the integrity of what the app is for (scores, votes, secret picks).
- **Low**: defence in depth, an unlikely precondition, or bounded impact (one isolate crashes, a limited overspend).
- **Info**: worth knowing; accepting it is a reasonable default.

For trusted-group apps, "anyone with the link can do everything" is a design choice, not a bug. Report its blast
radius instead: what a leaked link lets a stranger do, and how to recover (soft deletes, backups, rotating the code).

## Report format

Write in the user's language. They often read it on a phone, so keep it scannable.

```
Security review of <app>: code at <commit>, live checks read-only, <date>.

## What's already solid
Short bullets. Credit the good defences: it tells the user what not to break while fixing the rest.

## Findings (most severe first)
**N. <Severity>: <one-line title>** (confirmed live | from the code | theoretical)
Where (file:line), what happens (the concrete scenario), and the fix. Mark fixes that need no deploy
(a dashboard toggle) as such.

## Suggested order
Now vs later, given the timing (during a live event, prefer dashboard toggles over code deploys).

## Not tested yet
What needs a test deploy to confirm, and the offer.
```

If the report is meant for others (a team, a channel), offer to publish it as a page.

## Pieter's stack

Most of Pieter's apps come from the `idea-to-app` skill: Cloudflare Workers with static assets, D1 or Durable
Objects, one app per `<sub>.pieterverlinden.be`, no build step, often a shared access code instead of logins.
`references/cloudflare-stack.md` covers that stack's recurring weak spots (sibling subdomains count as the same site,
plain HTTP is served unless switched off, body limits that trust Content-Length, the free-tier quota as a DoS target,
static assets that skip the access check) and how to build a safe test deploy.
