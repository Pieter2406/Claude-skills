#!/usr/bin/env bash
# Local scan of a repo for security leads. Read-only: it changes nothing and sends nothing anywhere
# (except `npm audit`, which asks the npm registry about the dependency list).
#
#   bash repo_scan.sh <repo-dir> [max lines per category, default 40]
#
# Prints: secrets in git history (redacted), tracked secret files, DOM/HTML sinks, eval, SQL built from strings,
# target=_blank without noopener, postMessage, tokens in web storage, unbounded body reads, redirects, CORS,
# cookie construction, and npm audit. Every hit is a lead to read in context, not a finding.
set -u

dir="${1:-.}"; max="${2:-40}"
cd "$dir" || { echo "no such dir: $dir" >&2; exit 2; }
EXCL="--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=.wrangler --exclude-dir=.cloudflare --exclude-dir=coverage --exclude-dir=.next --exclude-dir=vendor"
INCL="--include=*.js --include=*.mjs --include=*.cjs --include=*.ts --include=*.tsx --include=*.jsx --include=*.html --include=*.vue --include=*.svelte"

section() { echo; echo "== $*"; }
hits() { # title, ERE pattern [, extra grep filter ERE to drop]
  local title="$1" pat="$2" drop="${3:-}" out
  # shellcheck disable=SC2086
  out="$(grep -rnE $EXCL $INCL -e "$pat" . 2>/dev/null | grep -v '\.min\.' || true)"
  [ -n "$drop" ] && out="$(printf '%s\n' "$out" | grep -vE -e "$drop" || true)"
  out="$(printf '%s\n' "$out" | sed '/^$/d')"
  local n; n="$(printf '%s\n' "$out" | sed '/^$/d' | wc -l | tr -d ' ')"
  section "$title ($n)"
  [ "$n" -gt 0 ] && printf '%s\n' "$out" | cut -c1-220 | head -n "$max"
  [ "$n" -gt "$max" ] && echo "  … $((n - max)) more"
  return 0
}

echo "Security leads for $(pwd) at $(git rev-parse --short HEAD 2>/dev/null || echo 'no git')"

if git rev-parse --git-dir >/dev/null 2>&1; then
  section "Possible secrets in git history (all branches; values redacted)"
  git log --all -p --no-color --format='commit %h' 2>/dev/null | awk '
    /^commit / { c = $2; next }
    /^\+\+\+ b\// { f = substr($0, 7); next }
    /^\+/ {
      line = substr($0, 2)
      if (match(line, /(sk-ant-[A-Za-z0-9_-]+|sk-proj-[A-Za-z0-9_-]+|AKIA[0-9A-Z]+|ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|xox[abprs]-[A-Za-z0-9-]+|AIza[0-9A-Za-z_-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|[Pp]assword[\"'"'"' ]*[:=][ ]*[\"'"'"'][^\"'"'"']+[\"'"'"']|(api[_-]?key|secret|token)[\"'"'"' ]*[:=][ ]*[\"'"'"'][A-Za-z0-9_\/+=.-]+[\"'"'"']|[a-z0-9][a-z0-9][a-z0-9][a-z0-9]-[a-z0-9][a-z0-9][a-z0-9][a-z0-9]-[a-z0-9][a-z0-9][a-z0-9][a-z0-9]-[a-z0-9][a-z0-9][a-z0-9][a-z0-9])/)) {
        m = substr(line, RSTART, RLENGTH)
        if (RLENGTH < 12 && m !~ /BEGIN/) next
        key = c " " f " " substr(m, 1, 6)
        if (!(key in seen)) { seen[key] = 1; printf "  %s %s: %s… (%d chars)\n", c, f, substr(m, 1, 6), length(m) }
      }
    }' | head -n "$max"
  echo "  (placeholders such as xxxx-xxxx or test codes are expected; anything real must be rotated, not just deleted)"

  section "Tracked files that usually hold secrets"
  git ls-files | grep -E '(^|/)(\.env(\..*)?|\.dev\.vars|.*\.pem|.*\.p12|id_rsa|id_ed25519|.*secrets?\.(json|ya?ml|txt))$' | sed 's/^/  /' || true
  for f in .env .dev.vars; do
    if [ -e "$f" ] && ! git check-ignore -q "$f"; then echo "  !! $f exists and is not git-ignored"; fi
  done
fi

hits "HTML sinks (trace every interpolated value to its source and check escaping)" \
  'innerHTML|outerHTML|insertAdjacentHTML|document\.write|srcdoc|dangerouslySetInnerHTML|v-html|\{@html|\.html\('
hits "eval-like code" '(^|[^A-Za-z_.$])eval\(|new Function\(|set(Timeout|Interval)\(\s*["'"'"'`]'
hits "SQL built with template strings or concatenation" '(prepare|exec|query|raw)\(\s*`[^`]*\$\{|(prepare|exec|query)\([^)]*["'"'"']\s*\+'
hits "target=_blank without noopener" 'target=["'"'"']?_blank' 'noopener'
hits "postMessage and message listeners (check origins)" 'postMessage\(|addEventListener\(\s*["'"'"']message'
hits "Web storage holding something secret-looking" '(localStorage|sessionStorage)[^;]*(token|secret|auth|password|apikey|api_key|session)'
hits "Whole-body reads (is there a real byte cap, not only Content-Length?)" 'request\.(text|json|formData|arrayBuffer|blob)\(\)'
hits "Redirects (is the target built from user input or the path?)" 'Response\.redirect\(|["'"'"']?location["'"'"']?\s*:|location\.(href|assign|replace)\s*[=(]'
hits "CORS headers" 'Access-Control-Allow-(Origin|Credentials)'
hits "Cookie construction (flags: HttpOnly, Secure, SameSite, __Host-)" '[Ss]et-[Cc]ookie|document\.cookie'
hits "Server-side fetch (is any part of the URL user input? SSRF)" 'fetch\(\s*(`[^`]*\$\{|[a-zA-Z_]+\s*[,)])' 'public/'

section "npm audit (production dependencies)"
if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
  npm audit --omit=dev 2>&1 | grep -vE '^npm (notice|warn)' | tail -n 15 | sed 's/^/  /'
elif [ -f package.json ]; then
  echo "  !! package.json without a lockfile: builds are not reproducible"
else
  echo "  -- no package.json"
fi

echo; echo "== Done. Read each hit in context; most are fine. Report only what you can turn into a concrete scenario."
