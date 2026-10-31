# Attack inventory and checks

Work through the sections that apply. For each item: what goes wrong, how to check it, and the usual fix. "Check"
means reading code unless it says *live* (read-only requests) or *test* (local dev or a test deploy only).

## Contents
1. Transport and security headers
2. Access, authentication, sessions
3. Authorization and object access
4. Cross-site requests (CSRF, XS-leaks, embedding)
5. XSS and HTML injection (client)
6. Injection and parsing (server)
7. File uploads and media
8. Business logic, races and integrity
9. Abuse, resource limits and cost
10. Secrets and sensitive data exposure
11. AI / LLM features
12. Mobile browsers and PWAs
13. Client-side storage and offline
14. Redirects and URL handling
15. Third parties and supply chain
16. Privacy
17. Operations: logs, backups, recovery, rotation

## 1. Transport and security headers

- **Plain HTTP served.** A link or typed code sent over `http://` crosses the network in cleartext, and on shared
  Wi-Fi an attacker can strip TLS and serve a fake login page. *Live*: `curl -sI http://host/` must answer 301/308 to
  https and not serve the app. Fix: redirect at the edge (Cloudflare "Always Use HTTPS") and send
  `Strict-Transport-Security: max-age=31536000` (add `includeSubDomains` only if every subdomain does HTTPS).
- **CSP.** Look for `script-src 'self'` with no `'unsafe-inline'`/`'unsafe-eval'`, `object-src 'none'`,
  `base-uri 'none'`, `frame-ancestors 'none'` (clickjacking), `form-action 'self'`, and `connect-src` limited to
  what the app calls. `style-src 'unsafe-inline'` is common and acceptable, but it allows CSS injection. Check the
  CSP is on every response, including error pages and the lock page.
- **The other headers.** `X-Content-Type-Options: nosniff` (essential when serving uploads), `Referrer-Policy:
  no-referrer` or `strict-origin-when-cross-origin` (secrets in URLs leak via Referer otherwise),
  `Permissions-Policy` (camera, microphone, geolocation off unless used), `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-origin` (stops other sites from embedding your images and JSON).
- **Caching of private responses.** Private JSON and HTML need `Cache-Control: no-store` or `private`. A `public`
  cache header on something behind a login can let a CDN or shared proxy serve it to others.
- **Conflicting sources.** Static `_headers` files, framework defaults and Worker code can disagree. *Live*:
  compare what is actually served with what the code intends.

## 2. Access, authentication, sessions

- **Where the gate runs.** Does every route (including static assets, uploads, websockets, health and debug
  endpoints) pass the access check? A common miss: the Worker only sees `/api/*`, so `public/` files, including
  data or images that should be private, are open. *Live*: unauthenticated GETs on a few asset paths.
- **Fail closed.** With the secret missing or empty, nobody should get in.
- **Shared codes and passwords.** Enough entropy (≥ 60 bits for a code nobody rate-limits), normalised the same way
  on both sides, compared in constant time on hashes. Is the code in URLs (`?k=`)? Then check that it's stripped by a
  redirect, that no Referer leaks it, and that logs keep it out (see section 10).
- **Brute force.** Rate limit or lockout on login and unlock endpoints, or enough entropy that guessing is
  hopeless. Don't test this live.
- **Cookies.** `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`, the `__Host-` prefix (no `Domain`, `Path=/`), and a
  sensible lifetime. Is the cookie value a bearer token equal to "having the code" forever? Then there's no
  per-device revocation: rotating the code is the only way out, and the review should say so. Are legacy cookie names
  still accepted? They may lack the prefix protections.
- **Login CSRF and session fixation.** Can another site log the victim in to the attacker's account or session?
  Usually only matters with personal accounts.
- **Logout and rotation.** Is there a documented way to rotate the secret and lock out every old session?

## 3. Authorization and object access

- **IDOR.** Every `:id` route must check that the object belongs to the scope the caller may see: the right
  edition, room, family or user. Sequential integer ids are enumerable.
- **Role checks on the server.** Hidden buttons are not authorization. Look for actions only the UI restricts
  (admin, host, owner, "only while live").
- **Mass assignment.** Does the server copy client JSON into stored rows wholesale? Then the client can set fields
  the UI never shows (`live`, `finishedAt`, `role`, `created_at`, `version`). Check the sanitiser's allow-list.
- **State transitions.** Can a client move an object back to an earlier state (finished → live, closed → open,
  deleted → restored) to reopen something that should be final?

## 4. Cross-site requests (CSRF, XS-leaks, embedding)

- **CSRF.** `SameSite=Lax` blocks cross-site POSTs from other domains, but **sibling subdomains of the same
  registrable domain are the same site**: `other.example.com` can POST to `app.example.com` with the cookie. Also, a
  `text/plain` or multipart POST needs no CORS preflight. Fix: check `Sec-Fetch-Site: same-origin` (fall back to
  `Origin`) on every state-changing request, and require `application/json` where possible.
- **Side effects on GET.** GETs are allowed cross-site (top-level navigation sends Lax cookies), so a GET must never
  change state.
- **XS-leaks and embedding.** Same-site sibling pages can embed your images (`<img>`), time your endpoints, or count
  frames. Fix: CORP `same-origin`, and refuse `/api/*` reads whose `Sec-Fetch-Site` is `same-site` or `cross-site`.
- **CORS.** Look for `Access-Control-Allow-Origin` echoing the request origin with credentials, or `*` on private
  data.
- **postMessage.** Every `message` listener must check `event.origin`, and every `postMessage` must name a target
  origin, not `*`.

## 5. XSS and HTML injection (client)

- **Sinks.** `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `srcdoc`, `setAttribute('on…')`,
  `href`/`src` from data, jQuery `.html()`, framework escape hatches (`dangerouslySetInnerHTML`, `v-html`,
  `{@html}`). For each, trace every interpolated value back to its source.
- **Context matters.** An escape function covering `& < > " '` is enough for element text and quoted attributes. It
  is *not* enough for unquoted attributes, URLs (`javascript:`), inline event handlers, CSS (`style="--c:${x}"`
  needs a strict allow-list such as `/^#[0-9a-f]{6}$/`) or script contexts.
- **Data from everywhere.** Names, captions, scores, edition titles, file names, URL parameters, localStorage, other
  users' input relayed by the server, LLM output and third-party API data are all attacker-controlled.
- **Markdown and rich text.** Escape first, then add a small set of tags by pattern (as in an `answerHtml` that turns
  `**x**` into `<b>`). Never render arbitrary markdown or HTML from users or an LLM without a sanitiser.
- **Links to user-supplied URLs.** Allow `https:` only, with `rel="noopener noreferrer"` on `target=_blank`.
- **Defence in depth.** Even with a missed escape, a strict CSP (no inline scripts) turns most XSS into harmless
  HTML injection. Still report the missed escape: CSS injection and fake UI (phishing inside the app) remain.

## 6. Injection and parsing (server)

- **SQL.** Every value must be bound (`prepare(…).bind(…)`). Watch for template literals inside `prepare(` and
  table or column names built from input.
- **Prototype pollution.** Objects keyed by user input (`obj[name] = …`, `Object.assign`, deep merges) need
  `__proto__`, `constructor` and `prototype` rejected, or `Object.create(null)` / `Map`. Check `in` versus `hasOwn`.
- **JSON parsing.** Require the content type, cap the size, and require an object (not an array, number or null).
  Validate types per field: numbers finite and bounded, strings length-capped, arrays capped.
- **Header and log injection.** User text in `Location`, `Set-Cookie` or `Content-Disposition`, and CRLF in log
  lines.
- **SSRF.** Any server-side `fetch` whose URL, host or path comes from input (including image proxies and URL
  previews).
- **Path traversal.** File or asset paths built from input (`/games/${id}.js`): `id` must come from an allow-list.

## 7. File uploads and media

- **Type.** Check magic bytes, and serve with a fixed `Content-Type` plus `nosniff`. Don't serve uploads as
  `text/html` or `image/svg+xml` (an SVG can carry script). Polyglot files are harmless with a fixed type and nosniff.
- **Size.** Limit each file and the total. A `Content-Length` check alone is bypassed by chunked uploads, so check
  the real size too (section 9).
- **Metadata.** EXIF GPS in photos reveals where people live. If only the client strips it (canvas re-encode), a
  direct upload or a client bug keeps it. Fix: strip APP1 to APP15 segments on the server, or reject Exif.
- **Storage quota.** A per-app cap so uploads can't fill the database that also holds the core data. Make the check
  atomic or accept a small race.
- **Deletes.** Soft delete with undo, then purge. Can deleted files still be fetched by id? They shouldn't be.

## 8. Business logic, races and integrity

- **Check-then-act.** A limit checked in one statement and recorded in another (budgets, rate limits, "one per
  player", stock, storage caps) lets concurrent requests all pass. Fix: a single atomic statement, a reservation row
  written before the expensive work, or compare-and-swap.
- **Lost updates.** Concurrent edits need versioning (CAS) or per-field merges.
- **Rules enforced only in the UI.** Prediction windows, voting deadlines, turn order, "can't change after scores":
  replay the request with curl (in your head or *test*). If the server accepts it, it's a finding.
- **Secrets inside the data.** Hidden picks, sealed votes, quiz answers: does any endpoint, or any state transition
  (e.g. finishing then reopening), reveal them early?
- **Identity by choice.** With no logins, "who am I" is client-chosen, so anyone can act as anyone. That's fine by
  design, but integrity features (votes, predictions) inherit it; say so.
- **Client-trusted values.** Timestamps, `created_at`, prices, scores computed on the client.

## 9. Abuse, resource limits and cost

- **Body size.** `request.text()`, `.json()`, `.formData()` and `.arrayBuffer()` buffer everything. If the cap is
  only checked against `Content-Length`, a chunked body without that header bypasses it, up to the platform maximum
  (100 MB on Workers, more than an isolate's memory). This matters most on unauthenticated endpoints (login, unlock).
  Fix: read the stream with a running byte cap.
- **Rate limits.** Login, expensive endpoints, anything that calls a paid API, uploads.
- **Quota exhaustion as DoS.** On free tiers (Workers 100k requests a day), anyone on the internet can burn the
  quota and take the app down. Fix: an edge rate-limiting rule. Never demonstrate this live.
- **Storage exhaustion.** Unbounded rows (editions, comments, log tables) or large JSON blobs can fill the database
  and stop every write.
- **Paid APIs.** Budget checks must be hard caps: atomic reservation in code, plus a spend limit on the provider's
  side (API console). Bound `max_tokens` and input size.
- **Polling cost.** Clients that poll too fast can multiply load; check the backoff when idle or hidden.

## 10. Secrets and sensitive data exposure

- **Repo and history.** `git log -p --all` for keys, tokens, `.env`/`.dev.vars` contents and access codes. Check
  `.gitignore` covers local secret files. A secret ever committed must be rotated, not just deleted.
- **Shipped to the client.** Secrets in static files, bundles, source maps, the manifest (`start_url` with a code),
  HTML comments, or JSON responses that include more fields than the page needs.
- **URLs.** Codes or tokens in query strings end up in history, screenshots, Referer headers, proxy logs and
  platform request logs (Workers observability records full URLs).
- **Error messages.** Stack traces, SQL errors or upstream API errors returned to the client.
- **Over-fetching.** Endpoints that return whole rows (including emails, hidden fields, secret picks) and let the
  page filter.

## 11. AI / LLM features

- **Prompt injection.** Every string that reaches the prompt and isn't yours (user questions, names, captions,
  scores, fetched documents, client-sent "history") can steer the model. What can it reach? With no tools and only
  text out, the impact is limited to what's in the context, so check that nothing secret is in there (hidden picks,
  other users' private data, keys).
- **Forged history.** Client-sent conversation history lets a user put words in the assistant's mouth. Usually
  harmless; matters if the history grants permissions.
- **Output handling.** Render model output escaped (section 5). Never `eval` it or follow URLs from it automatically.
- **Cost.** Hard budget (section 9), per-minute limits made atomic, `max_tokens`, input caps, an end date, and a
  provider-side spend limit on the key.
- **Key handling.** The key is a server secret, never sent to the client. Is the feature closed when the key is
  missing?

## 12. Mobile browsers and PWAs

- **Home-screen apps.** iOS standalone apps have their own cookie jar, so apps often put the access code in the
  manifest's `start_url`. Anyone who can fetch the manifest gets the code; serve the manifest only behind the gate,
  with `no-store`.
- **Service workers.** Do they cache private API responses or HTML on shared devices? Check the scope, the cache
  names, and logout clearing.
- **Back/forward cache and screenshots.** Sensitive screens can reappear after logout via bfcache; the app switcher
  captures screenshots. Usually acceptable for group apps.
- **Inputs.** `autocomplete="off"` and `autocapitalize="off"` on codes; `type="password"` if shoulder surfing matters.
- **Permissions.** Camera and file pickers (`<input capture>`), geolocation, clipboard, Web Share: requested only on
  user action, and limited via `Permissions-Policy`.
- **Tapjacking and overlays.** `frame-ancestors 'none'` covers framing. Watch confirm-less destructive actions on
  big tap targets (accidental deletes are also a security-adjacent loss).
- **Deep links and URL parameters.** Parameters parsed on load (`?e=`, `#…`) must be validated like any input.
- **Old webviews.** In-app browsers (Instagram, Facebook, WhatsApp) may ignore some headers. Don't rely on one
  header alone for a critical control.

## 13. Client-side storage and offline

- **What's stored.** localStorage and IndexedDB are readable by any script on the origin (so by any XSS) and persist
  on shared phones. No tokens there; cookies should be HttpOnly.
- **Trusting stored data.** Values read back from storage are input: validate them before rendering or sending.
- **Offline outboxes.** Queued writes replayed later: are they still authorized, and are they idempotent?

## 14. Redirects and URL handling

- **Open redirects.** `Location` built from user input, including the request path: `new URL('https://a//evil.com/')`
  has the pathname `//evil.com/`, so `location: url.pathname + url.search` becomes a protocol-relative redirect to
  another site. Fix: build the target from a known path, or collapse leading slashes (`'/' +
  pathname.replace(/^\/+/, '')`).
- **`next=`/`return=` parameters** after login: allow-list same-origin relative paths only.
- **Host header.** Absolute URLs built from the request's `Host` (password reset links, redirects).

## 15. Third parties and supply chain

- **Dependencies.** `npm audit --omit=dev`, plus a lockfile committed; `npm audit` including dev tools for build-time
  risk.
- **CDN scripts.** Pinned exact versions with Subresource Integrity, or self-hosted.
- **Fonts, analytics, embeds.** Each third-party host sees visitors' IPs and the Referer; the CSP should list exactly
  these.
- **GitHub Actions and CI.** Secrets exposed to pull requests from forks, `pull_request_target`, third-party actions
  not pinned.

## 16. Privacy

- **Data minimisation.** First names versus full names, photos, location, ages (especially children).
- **Retention.** Kept forever? Fine if intended; say so.
- **Search engines.** `noindex`, `robots.txt`, and no private pages linked from public ones.
- **Who can see what.** The audience of the data should match what the users expect (e.g. everyone with the link
  sees every photo).

## 17. Operations: logs, backups, recovery, rotation

- **Recovery.** Hard deletes plus no backups means one bad actor or bug wipes history. Know the restore path (D1
  Time Travel, exports) and its retention.
- **Rotation.** A documented way to rotate each secret (access code, API keys) and what happens to existing sessions.
- **Logs.** What do platform logs keep (URLs with codes, request bodies)? Who can read them?
- **Monitoring.** Would anyone notice abuse (a budget being spent, mass deletes)?
