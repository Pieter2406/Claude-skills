# Cloudflare: login, config, deploy, verify

The domain **pieterverlinden.be** is a zone on Pieter's Cloudflare account (nameservers moved from GoDaddy; nothing to
do at GoDaddy any more). Every app is one Worker with static assets, on its own subdomain. Use the **cf CLI**
(`npx cf …`), not Wrangler commands, unless a project already has a `wrangler.toml`/`wrangler.jsonc`.

To discover a command, use `npx cf cli search "<what you want to do>"` (keep the query anonymous: no names, domains or
IDs), then `<command> --help`. Don't crawl nested `--help` output.

## 1. Logged in?

```bash
npx cf auth whoami
```

- `"authenticated": true` → carry on.
- A `CLOUDFLARE_API_TOKEN` environment variable also works (cf picks it up automatically). If Pieter wants to skip the
  login in future cloud sessions, they can store such a token as a secret in the environment's settings. Never ask them to
  paste a token into the chat.
- Otherwise: `npx cf auth login --no-browser` prints a link and a code. Tell Pieter to open the link and approve, and
  wait for them. The code expires after a few minutes, so if they're not ready, stop the command and start a fresh login
  when they say "ready", instead of letting it time out.

## 2. Is the address free?

```bash
node <skill>/scripts/list_apps.mjs
```

prints every Worker and its addresses (for example `trombone`, `cijferdans`, `code23`). Pick a subdomain that isn't
there. Also make sure it isn't another DNS record:
`curl -s -H 'accept: application/dns-json' "https://cloudflare-dns.com/dns-query?name=<sub>.pieterverlinden.be&type=A"`
must have no `Answer`.

## 3. Scaffold

```bash
node <skill>/scripts/scaffold.mjs --dir <dir> --name <worker-name> --sub <subdomain> --title "<Title>" --lang <en|nl> [--public] [--d1] [--room]
cd <dir> && npm install
```

It writes `cloudflare.config.ts`, `wrangler.config.ts` (assets from `public/`), `package.json`, `.gitignore`, a skeleton
`public/` (index.html, style.css with light/dark tokens, app.js with localStorage helpers, manifest, icon, `_headers`,
`robots.txt`, `.assetsignore`) and with `--d1`/`--room` a `worker/index.js`. Unlisted is the default: it adds
`X-Robots-Tag: noindex` and a `Disallow: /` robots.txt. With `--public` both allow indexing.

For an unlisted app whose address must be hard to guess (a surprise, a private game), use a random-ish subdomain
(`code23` style) and a random suffix in the Worker name.

### What the config looks like (for reference or hand edits)

```ts
import { defineConfig, bindings, exports } from "cf/config";
const NAME = "boodschappen";
export default defineConfig({
  worker: {
    "name": NAME,
    "compatibilityDate": "2026-10-28",
    "domains": ["boodschappen.pieterverlinden.be"],   // creates the DNS record and certificate on deploy
    "workersDev": false, "previewUrls": false,        // one address only
    "observability": { "enabled": true },
    "entrypoint": "./worker/index.js",                // only with an API
    "assets": { "runWorkerFirst": ["/api/*"] },       // the Worker sees /api/*, everything else is a static file
    "exports": { "Room": exports.durableObject({ storage: "sqlite" }) },
    "env": { "DB": bindings.d1(), "ROOMS": bindings.durableObject({ worker: NAME, exportName: "Room" }) },
  },
});
```

- Bindings go under **`env`** (not `bindings`). Others: `bindings.kv()`, `bindings.r2()`, `bindings.secret()`,
  `bindings.ai()`. Cron jobs: `"triggers": [triggers.scheduled({ schedule: "0 7 * * *" })]` with
  `import { triggers } from "cf/config"` and a `scheduled(event, env, ctx)` handler in the Worker.
- D1 and KV should be created on the first deploy. If a deploy instead complains that the database doesn't exist, create
  it (`npx cf d1 create --name <worker-name>-db --jurisdiction eu`), then bind it by name:
  `"DB": bindings.d1({ name: "<worker-name>-db" })`. Pieter is in Belgium, so keep stored data in the EU. The template
  creates its tables with `CREATE TABLE IF NOT EXISTS` on first use, so there's no migration step.
- Durable Object classes declared with `exports.durableObject(...)` are created on the first deploy (code23 runs this
  way); there is no separate migrations list. Renaming or removing a class later needs the `renamed`/`deleted` forms of
  `exports.durableObject` (check `cf docs search "durable object rename"`); never just delete the export, or its data
  is gone.
- A single-page app with path routes (not `#/` hash routes) needs `"assets": { "notFoundHandling": "single-page-application" }`.

### Vite / TypeScript apps

For a bigger app (several screens, npm libraries, TypeScript), use Vite instead of plain files: `npm create vite@latest`
(vanilla-ts) in the folder, then `npm i -D cf @cloudflare/vite-plugin`, add `plugins: [cloudflare()]` (from
`@cloudflare/vite-plugin`) and `base: './'` to `vite.config.ts`, and keep the same `cloudflare.config.ts` without
`wrangler.config.ts` (the plugin provides the assets). `cf deploy` builds it. Static files go in `public/`.

## 4. Run it locally

```bash
bash <skill>/scripts/dev.sh start <dir>   # cf dev in the background on a free port; prints the URL when it answers
bash <skill>/scripts/dev.sh stop <dir>    # stops it and all its child processes
```

It serves `public/` and the Worker with a local D1 and Durable Objects (`npm run dev` does the same in the
foreground). Don't stop it with `pkill -f <pattern>`: a pattern that matches its own shell kills the command you're in.

## 5. Deploy

```bash
npx cf deploy --dry-run     # builds and checks without uploading; shows the bindings
npx cf deploy
```

Deploy prints the version ID and `<sub>.pieterverlinden.be (custom domain)`. A brand-new subdomain can take a minute
for DNS and the certificate: retry `curl -sI https://<sub>.pieterverlinden.be/` every 10 s for up to 3 minutes before
calling it broken. Then run `scripts/shoot.mjs` against the live URL.

## Secrets (API keys for the app itself)

Never put a key in the code or the repo, and never ask for it in the chat. Declare it with `bindings.secret()` under
`env`, ask Pieter to add it to the environment's secrets (or to a local `.dev.vars` that is git-ignored), and upload it
with `npx cf deploy --secrets-file .dev.vars` or `npx cf workers secrets update`.

## Access beyond "unlisted"

- **Passphrase**: for family-only apps, a shared passphrase checked by the Worker (store only its hash as a secret,
  set an HttpOnly cookie for 30 days) is usually enough.
- **Real logins**: Cloudflare Access (Zero Trust, email one-time codes, free for up to 50 users) in front of the
  subdomain. Set it up with Pieter; it's an account-wide setting.

## Removing an app

Only when Pieter asks: `npx cf workers delete <worker-name>` (removes the Worker and its custom domain), then any D1
database it had (`npx cf d1 list`, then `npx cf cli search "delete d1 database"`). Confirm with them first; it can't be
undone.

## Pitfalls already hit

- A root `package.json` with `"type": "module"` turns CommonJS `.js` files in `public/` into errors for Node tests: put a
  `package.json` with `{"type":"commonjs"}` next to them and list it in `public/.assetsignore`.
- Files in `public/` are all published. Keep notes, tests and source material outside it (tests go in `tests/`), or
  list them in `public/.assetsignore`.
- Auto-deploy on push (Workers Builds) needs the Cloudflare GitHub app installed on the repo by Pieter
  (dashboard → Workers & Pages → the Worker → Settings → Build → Connect). Until then, deploy from the session.
