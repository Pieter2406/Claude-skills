# Claude skills

Source of my own Claude skills. A skill only works in Claude once it's saved to my profile; this repo is where the
source lives so it can be improved and re-uploaded.

| Skill | What it does |
|---|---|
| [`app-ux`](app-ux/SKILL.md) | UX/UI rules (touch, thumb reach, safe areas, WCAG 2.2 AA, sheets, feedback, visual, motion, performance, social use, microcopy) with IDs and sources, a review workflow with severity ratings, and `scripts/audit.mjs`, a Playwright audit that measures targets, reach, contrast, zoom, overflow and more. Used when building or reviewing any app's interface. |
| [`idea-to-app`](idea-to-app/SKILL.md) | Interviews me about an idea, writes a one-page spec, builds a phone-first web app, saves it in its own private GitHub repo and puts it online at `<name>.pieterverlinden.be` on Cloudflare. |
| [`app-security-review`](app-security-review/SKILL.md) | White-hat security review of a web app (phone-first JS/TS, Cloudflare Workers): code review against a full attack checklist, read-only live checks, a ranked report with fixes. Never attacks production; active tests only on local dev or a separate test deploy, after asking. |

## Install or update a skill in my profile

1. Make the zip: `cd <this repo> && zip -r <skill>.zip <skill>`, e.g. `zip -r app-ux.zip app-ux` (one folder
   per skill, `SKILL.md` at its top).
2. On claude.ai: **Settings → Capabilities → Skills → Upload skill**, and pick the zip. To update, upload the new zip
   over the old one (same name).
3. Start a new session: skills load when a session starts. Check with `/idea-to-app`, `/app-security-review`, `/app-ux` or "which skills do I have?".

Or ask Claude in a session on this repo: "update the idea-to-app skill: …". It edits the files, commits, and gives
you the new zip (with a **Save skill** button) to install.

## Layout of a skill

```
idea-to-app/
├── SKILL.md          the instructions (name and description at the top decide when it starts)
├── references/       details Claude reads when needed (interview, build, Cloudflare)
├── scripts/          helper scripts (scaffold, dev server, screenshots, icon, app list)
└── assets/templates/ the starting files for a new app
```
