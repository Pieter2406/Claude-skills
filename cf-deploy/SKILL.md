---
name: cf-deploy
description: Log in to Cloudflare from a (cloud) session and deploy an existing app that runs as a Cloudflare Worker, then check it live. Covers the cf CLI device login (a link and code for Pieter to approve), pre-flight tests and build, missing D1/KV resources, secrets (never through the chat), the deploy itself and a live check of the site and its API. Use it whenever Pieter says "deploy", "cf login", "log in to Cloudflare", "zet het online", "publiceer", "push it live", "redeploy", or asks why a deploy failed, for any repo with a `cloudflare.config.ts`, `wrangler.config.ts`, `wrangler.toml` or `wrangler.jsonc` (for example the trombone app or an app made with idea-to-app). For building a new app from an idea, use idea-to-app instead.
---

# Log in to Cloudflare and deploy

Pieter's apps are Workers (static assets, sometimes an API, D1 or KV) on `*.pieterverlinden.be`, deployed with the
**cf CLI** (`npx cf …`). Use Wrangler only when the repo has a `wrangler.toml`/`wrangler.jsonc` and no cf config.
To find a command: `npx cf cli search "<what you want to do>"` (keep the query anonymous: no names, domains or IDs),
then `<command> --help`. Don't crawl nested `--help` output.

Work through the steps in order and keep Pieter posted in one line per step. A deploy changes the live site, so say
what you're deploying (branch and commit) before step 6.

## 1. Know the project

- Read `CLAUDE.md` and `README.md` for the deploy command (`npm run deploy` usually runs `cf deploy`), the live URL
  and any setup (databases, secrets).
- Read the config (`cloudflare.config.ts` or `wrangler.config.ts`): worker name, `domains`, `entrypoint`, the
  bindings under `env` (`bindings.d1`, `bindings.kv`, `bindings.secret()`).
- `git status` and `git log -1`: deploy committed work. If the branch isn't `main`, say so ("deploying branch X,
  commit abc123"); deploy it if that's what Pieter asked for, it's their call.

## 2. Pre-flight

Run the repo's checks before touching the live site: `npm test` and `npm run build` (or whatever the README names).
If they fail, stop and report; don't deploy a red build.

## 3. Logged in?

```bash
npx cf auth whoami          # "authenticated": true → go on
```

Otherwise run the login helper; it starts the OAuth device flow in the background (a container has no browser) and
prints the link:

```bash
bash <skill>/scripts/login.sh <scratch-dir>/cf-login.log
```

Give Pieter the **link** (it already holds the code) and the **code** in case the page asks for it, say it expires in
about 5 minutes, and wait for their reply. Then `tail -3 <log>` must show `Successfully logged in.` If it expired,
run the helper again for a fresh link instead of retrying the old one.

- The token lasts about an hour; a long session may need a new login.
- `CLOUDFLARE_API_TOKEN` in the environment also works (cf reads it). If Pieter wants to skip the login in future
  cloud sessions, they can store a token with Workers edit rights in the environment's settings (cloud environment
  menu → Edit → Network secrets, or an environment variable). Never ask them to paste a token into the chat.
- The Cloudflare connector (`mcp__Cloudflare_Developer_Platform__*`), when present, can list Workers and create or
  query D1/KV without the CLI login, but it cannot deploy code.

## 4. Resources the config needs

- A D1/KV binding with a placeholder id (all zeros) or a name that `npx cf d1 list` doesn't show: create it
  (`npx cf d1 create --name <name>`, or the connector's `d1_database_create`), put the real id in the config, and apply
  the schema if the repo has one (`worker/schema.sql`: `npx cf d1 execute <name> --file …`, or the connector's
  `d1_database_query`). Commit the config change.
- Creating a resource on Pieter's account is part of "deploy" when the config needs it. Anything else (deleting,
  renaming, touching other Workers) needs a question first.

## 5. Secrets

- **Never through the chat**: don't ask for a key, don't echo one, don't write one into the repo or a log.
- Writing secrets from the session (`cf workers secrets update`) may be blocked by the session's permission rules;
  that's fine. Give Pieter the exact commands to run on their own machine:
  `npx cf workers secrets update <NAME> --worker <worker> --type secret_text --text "<value>"`.
- A secret declared with `bindings.secret()` **blocks the deploy** until it is set ("The following required secrets
  have not been set"). If the app works without it (the feature just says it isn't set up), take the declaration out
  of the config with a comment saying why: secrets set later still reach the Worker on `env`. If the app can't run
  without it, stop and ask Pieter to set it first.
- Local dev reads secrets from `.dev.vars` (git-ignored). Remove any dummy `.dev.vars` you made for testing.

## 6. Deploy

```bash
npx cf deploy --dry-run     # optional: builds and lists the bindings without uploading
npm run deploy              # or: npx cf deploy
```

Deploy prints the uploaded assets, the bindings, the URLs (`*.workers.dev` and the custom domain) and the
**Current Version ID**. Keep the version ID for the report.

## 7. Check it live

- `curl -s -o /dev/null -w "%{http_code}\n" https://<domain>/` must be 200. A brand-new subdomain can take a minute
  for DNS and the certificate: retry every 10 s for up to 3 minutes before calling it broken.
- If the Worker has an API with a status route (for example `/api/status`), `curl` it and check what it says is
  configured (database bound, secrets present).
- Open the changed pages with Playwright (`require('playwright')`, `chromium.launch()`) at phone width (390 px),
  listen for `pageerror`, and screenshot the main screen. Only read-only visits: never post forms, write data or
  trigger paid APIs on the live site.

## 8. Report

One short message: what's live (URL, branch, commit, version ID), what the live check showed, and what Pieter still
has to do (secrets to set, with the commands; anything that showed "not set up"). Offer a commit of any config change
if you haven't pushed it.

## Pitfalls already hit

- `pkill -f "<pattern>"` kills your own shell when the pattern also appears in the command you're running (exit code
  144). Kill by PID (`pgrep` in one call, `kill <pid>` in another), or split the pattern into two variables.
- After `npm install` of a new package, a running Vite dev server can hang on its pre-bundled deps; restart it with
  `npx vite --force`.
- `cf deploy` needs the login to still be valid: an expired token fails with an auth error mid-deploy. Run
  `npx cf auth whoami` first when the login is older than about 50 minutes.
- Auto-deploy on push (Workers Builds) needs the Cloudflare GitHub app on the repo, installed by Pieter in the dashboard
  (Workers & Pages → the Worker → Settings → Build → Connect). Until then, deploy from the session.
