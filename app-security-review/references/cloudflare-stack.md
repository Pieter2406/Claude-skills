# Cloudflare Workers apps on pieterverlinden.be

Pieter's apps (built with the `idea-to-app` skill) share one stack: a Worker with static assets from `public/`,
optionally D1 or Durable Objects, one app per `<sub>.pieterverlinden.be`, config in `cloudflare.config.ts`, the `cf`
CLI (`npx cf …`) for deploys. These are the weak spots found in that stack so far, and how to test safely.

## Recurring weak spots

- **Plain HTTP is served.** Unless the zone has "Always Use HTTPS" on, `http://<sub>.pieterverlinden.be/` reaches
  the Worker over cleartext (seen live on gameathon in Oct 2026). Fix, no deploy needed: dashboard → the
  pieterverlinden.be zone → SSL/TLS → Edge Certificates → **Always Use HTTPS** on, and **HSTS** on. In code, add
  `strict-transport-security` to the Worker's security headers. One zone setting fixes every app at once.
- **Sibling apps count as the same site.** Every app shares the registrable domain `pieterverlinden.be`, so
  `SameSite=Lax` does not separate them. A compromised or malicious sibling app can POST with your cookie (a
  `text/plain` or multipart POST needs no preflight), embed your images, and plant cookies with
  `Domain=.pieterverlinden.be` (cookie tossing). Defences: `__Host-` cookies, a `Sec-Fetch-Site: same-origin` check on
  state-changing requests and on `/api/*` reads, CORP `same-origin`. Legacy cookie names without the prefix weaken
  this.
- **Static files skip the access check.** idea-to-app's default `"assets": { "runWorkerFirst": ["/api/*"] }` serves
  everything else straight from `public/` without the Worker. For a passphrase app, that means every static file is
  public. Private apps need `runWorkerFirst: true` (gameathon does this). Also check `public/.assetsignore` and that
  no data or notes sit in `public/`.
- **Every request is a Worker invocation.** With `runWorkerFirst: true`, anyone on the internet can spend the free
  plan's 100k requests a day, including on the lock page. Fix: a WAF rate-limiting rule on the hostname (the free
  plan includes one rule). Never test this live.
- **Body limits that trust Content-Length.** `request.text()`/`formData()` buffer whole bodies; a chunked request
  without `Content-Length` skips a header-only `limit()` check. Read `request.body` with a byte counter instead.
- **D1.** Always `.bind()`. `env.DB.batch([...])` is one transaction, but separate `prepare().run()` calls are not:
  check-then-insert across them races. The free plan allows 500 MB per database, so photos or blobs in D1 need a
  cap. Restores use D1 Time Travel (`npx cf cli search "d1 time travel"`); check its retention on the current plan.
- **Secrets.** Declared with `bindings.secret()` in `cloudflare.config.ts`; locally in `.dev.vars` (must be
  git-ignored); uploaded with `npx cf deploy --secrets-file <file>`. A secret written into a response (a manifest
  `start_url`, an HTML template, a JSON field) is exposed to everyone who can load that response.
- **Logs.** `"observability": { "enabled": true }` records request URLs, including query strings such as `?k=<code>`.
- **Extra hostnames.** `workersDev: false` and `previewUrls: false` keep the app on one address. A `*.workers.dev`
  or preview URL skips zone-level settings (WAF rules, Always Use HTTPS, rate limits).
- **Headers in two places.** `public/_headers` and the Worker's `secure()` wrapper can both set headers. When the
  Worker wraps asset responses, its values win; check live which one is served.
- **Durable Object rooms and websockets.** Check the `Origin` on the upgrade request, cap message size and rate per
  connection, make room ids unguessable if rooms are private, and validate every message as untrusted input.

## A safe test deploy

Use one when a finding needs real writes, bursts, uploads or paid calls to confirm. Ask Pieter first: it creates a
Worker, a database and a DNS name on their account.

1. **Local first.** `npm run dev` (or `bash <idea-to-app>/scripts/dev.sh start <dir>`) gives a local Worker with a
   local D1 and `.dev.vars` secrets (use a throwaway test code, never the real one). Most findings can be confirmed
   here, at zero risk.
2. **If it has to be on Cloudflare** (edge behaviour, zone settings, real TLS):
   - Work in a copy or a branch. In `cloudflare.config.ts` change the Worker name to `<name>-sectest`, the domain to
     `<name>-sectest.pieterverlinden.be`, and **replace the D1 binding** with a new database:
     `npx cf d1 create --name <name>-sectest-db --jurisdiction eu`, then
     `"DB": bindings.d1({ name: "<name>-sectest-db" })`. Never keep the live database's id: a test deploy bound to
     it would write to live data.
   - Use test secrets: a new random access code, and no real paid API key (or a key with a tiny spend limit).
   - `npx cf deploy --dry-run` and read the bindings it prints **before** deploying. Then `npx cf deploy --secrets-file
     <test-secrets-file>`.
   - Run the tests, record the results, then ask whether to remove it: `npx cf workers delete <name>-sectest` and
     delete the test database. Deleting needs Pieter's explicit yes.
3. Bursts and load tests stay small even on a test deploy: they count against the same account's quota.
