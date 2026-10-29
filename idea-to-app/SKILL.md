---
name: idea-to-app
description: Turns an idea, need or requirement into a working web app online on its own subdomain of pieterverlinden.be (Cloudflare). It grills Pieter with a thorough interview, writes a one-page spec, builds a mobile-first app (static, or with a Cloudflare Worker plus a D1 database or live Durable Object rooms), saves it in a new private GitHub repo, deploys it with the cf CLI and checks it live. Use this whenever Pieter describes something they want to exist ("make an app for…", "I need a tool that…", "can you build a site where…", "maak een app om…", "zet dit online"), whether a game, tracker, quiz, list, timer, calculator, or a family, club or school tool. Also use it when they ask to publish or host something on their own domain, even if they never say "app", "website" or "Cloudflare".
---

# Idea → app on pieterverlinden.be

Pieter has ideas and needs; this skill turns one into a real, polished app at `https://<name>.pieterverlinden.be`,
saved in its own private GitHub repo so it can be changed later from any session. It's the same workflow that produced
`trombone`, `cijferdans` and `code23` on Pieter's domain, with the pitfalls of those builds already handled.

The flow has six steps. Don't skip the interview, and don't start building before the spec is approved: Pieter asked
explicitly to be grilled first, because building the wrong thing fast is the expensive mistake.

## 1. Quick checks (while you start the interview)

- `npx cf auth whoami` (any folder). If not logged in, see `references/cloudflare.md` §1, but only start a device login
  when they're ready to approve it, since codes expire in minutes.
- GitHub: the GitHub MCP tools (`mcp__github__*`; load with ToolSearch if they're deferred) must be available to create
  the repo. If they aren't, say so and continue: the app can still go online, and the code gets pushed later.

Don't let these block the interview; ask questions first, fix logins in between.

## 2. Grill (the interview) → spec → go

Read `references/interview.md` and follow it: rounds of multiple-choice questions with the AskUserQuestion tool
(problem and people, the core moment, data, access, feel, scope and name), challenging vague or conflicting answers,
then a one-page spec and a final "Build it like this?".

Defaults Pieter already chose, so don't ask them again unless the idea contradicts them:
- **Unlisted**: anyone with the link can open it; search engines are told not to index it.
- **Private GitHub repo** under `Pieter2406`, one per app.
- **Language**: the interface in the language they asked in (Dutch or English).
- Phone first, but it must look deliberate on a desktop too.

Their "Build it" on the spec is the go-ahead for everything in steps 3–5: creating the repo, deploying, and pushing.
Deleting anything (an app, a database, a repo) always needs its own explicit yes.

## 3. Repo and scaffold

1. Choose the names: `<sub>` is the subdomain from the spec, `<repo>` is usually the same (lowercase, dashes).
   Check the address is free (`node <skill-dir>/scripts/list_apps.mjs`, plus the DNS check in
   `references/cloudflare.md` §2).
2. Create the repo: `mcp__github__create_repository` with `name: <repo>`, `private: true`, a one-line description, no
   auto-init. In a cloud session, then call `mcp__claude-code-remote__add_repo` (owner `Pieter2406`, access `push`) so
   pushes are allowed, and follow its clone instructions. Otherwise `git init` in the app folder and add the remote.
3. Scaffold into the clone (it must be empty apart from `.git`):
   ```bash
   node <skill-dir>/scripts/scaffold.mjs --dir <clone> --name <worker-name> --sub <sub> --title "<App title>" --lang <nl|en> [--public] [--d1] [--room]
   cd <clone> && npm install
   ```
   Pick the flags with the table in `references/build.md`. `<worker-name>` is usually `<sub>`; add a random suffix for
   apps whose address should be hard to guess.

## 4. Build and test

Read `references/build.md`. In short: design the one screen that matters most first, give the app its own character
(palette, type and one visual idea, all as CSS tokens with a dark mode), keep it robust and accessible, and test it
like a user would:

- `bash <skill-dir>/scripts/dev.sh start <clone>` (prints the local URL; `stop` when done);
- click through the core flow with Playwright, one browser context per role for shared or live apps, and screenshot
  every important state (phone and, where it matters, tablet/TV; light and dark); look at every screenshot;
- `node <skill-dir>/scripts/shoot.mjs <url> <scratch>/shots` for errors, sideways scrolling and small tap targets;
- `node <skill-dir>/scripts/make_icon.mjs <clone>` after designing `public/icon.svg`.

Replace the template's placeholders with the real app, and don't leave unused template code behind:
- `index.html` body, the `style.css` tokens (palette, font), `app.js`;
- the `theme-color` meta tags in `index.html` and `background_color`/`theme_color` in `manifest.webmanifest` (set them
  to the new background colour);
- `public/icon.svg` (then `make_icon.mjs`);
- with a Worker: the example `items` table and the room code in `worker/index.js`;
- the example test in `tests/` (keep `npm test` passing).

## 5. Deploy and verify

`references/cloudflare.md` §5: `npx cf deploy --dry-run`, then `npx cf deploy`. The first deploy of a new subdomain
creates DNS records, so the session may ask Pieter to approve it; that's expected, and they have already said yes to it
with the spec. Wait for the new subdomain to answer (it can take a minute or two), then run `shoot.mjs` against the live URL and click the core flow once more on the real
address (for live apps: two devices in the same room).

Then write two files in the repo and push:
- `README.md`, in the language of the app's users: what the app is for, the address, how to use it in three lines,
  and "Add to home screen" instructions.
- `CLAUDE.md`, in English, for future sessions: the spec (short), the stack and file layout, how to run it locally
  (`npm run dev`), how to deploy (`npm run deploy`), what data it stores and where, and any decision that isn't obvious
  from the code.

Commit with a clear message (follow the session's commit attribution instructions) and push to the default branch.

## 6. Hand over

Reply in their language, short:
- the link (`https://<sub>.pieterverlinden.be`) and the repo;
- what version 1 does, in 3–5 bullets, and the assumptions you made;
- how to put it on the home screen (Safari: Share → Add to Home Screen);
- how to change it later: "open a session on the `<repo>` repo and ask for the change";
- one or two ideas for version 2 that came up in the interview (not built).

## Changing an existing app

If Pieter asks to change one of their apps rather than start a new one: attach its repo (`add_repo`), read its `CLAUDE.md`,
make the change, test the same way (step 4), `npm run deploy`, commit and push. The interview shrinks to the questions
the change actually raises.

## Files in this skill

- `references/interview.md`: the grilling rounds, how to challenge answers, and the spec template.
- `references/build.md`: choosing static / D1 / live room / Vite, the design and quality bar, and testing.
- `references/cloudflare.md`: login, address check, config shapes, local dev, deploy, secrets, access, removal, pitfalls.
- `scripts/scaffold.mjs`: creates the app folder from `assets/templates/` (static, plus optional Worker with D1 and/or a server-run live room with its `room.js` client).
- `scripts/list_apps.mjs`: which Workers and subdomains already exist.
- `scripts/dev.sh`: start/stop the local server on a free port.
- `scripts/shoot.mjs`: phone/tablet/desktop × light/dark screenshots (optionally with stored data) and a problem report.
- `scripts/make_icon.mjs`: the iPhone home-screen icon from `public/icon.svg`.
