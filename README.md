# Claude skills

Source of my own Claude skills. A skill only works in Claude once it's saved to my profile; this repo is where the
source lives so it can be improved and re-uploaded.

| Skill | What it does |
|---|---|
| [`idea-to-app`](idea-to-app/SKILL.md) | Interviews me about an idea, writes a one-page spec, builds a phone-first web app, saves it in its own private GitHub repo and puts it online at `<name>.pieterverlinden.be` on Cloudflare. |

## Install or update a skill in my profile

1. Make the zip: `cd <this repo> && zip -r idea-to-app.zip idea-to-app` (one folder per skill, `SKILL.md` at its top).
2. On claude.ai: **Settings → Capabilities → Skills → Upload skill**, and pick the zip. To update, upload the new zip
   over the old one (same name).
3. Start a new session: skills load when a session starts. Check with `/idea-to-app` or "which skills do I have?".

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
