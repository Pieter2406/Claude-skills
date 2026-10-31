#!/usr/bin/env bash
# Passive, read-only check of a live site: the same few GET requests any visitor's browser makes, one at a time.
# It never sends a body, credentials or cookies, and never follows redirects. Cookie values are redacted.
#
#   bash passive_check.sh https://app.example.com [/extra/path ...]
#
# Reports: HTTP -> HTTPS redirect, HSTS, CSP weaknesses, missing security headers, cookie flags, status codes of
# common paths for an unauthenticated visitor, and whether the manifest or robots.txt are public.
set -u

base="${1:-}"
if [ -z "$base" ]; then echo "usage: $0 https://host [extra paths...]" >&2; exit 2; fi
shift
base="${base%/}"
case "$base" in http://*) base="https://${base#http://}" ;; https://*) ;; *) base="https://$base" ;; esac
host="${base#https://}"; host="${host%%/*}"

paths="/ /robots.txt /manifest.webmanifest /api/health /index.html /.env /.git/config $*"
UA="security-review-passive-check"
issues=0
flag() { echo "  !! $*"; issues=$((issues + 1)); }
ok() { echo "  ok $*"; }

headers() { # url -> response headers no body, no redirects
  curl -sS -m 15 -A "$UA" -o /dev/null -D - "$1" 2>/dev/null | tr -d '\r' | awk 'BEGIN{IGNORECASE=1} /^HTTP\//{h=""} {print}'
}
hval() { # headers name -> value of the last occurrence
  printf '%s\n' "$1" | awk -v n="$2" -F': ' 'tolower($1)==n {sub(/^[^:]*: /,""); v=$0} END{print v}'
}
status() { printf '%s\n' "$1" | awk '/^HTTP\//{s=$2} END{print s}'; }

echo "== Passive check of $base ($(date -u +%Y-%m-%dT%H:%MZ))"

echo; echo "== Transport"
h_http="$(headers "http://$host/")"
st="$(status "$h_http")"; loc="$(hval "$h_http" location)"
if [ -z "$st" ]; then echo "  -- http://$host/ did not answer (port 80 closed or blocked: fine)"
elif { [ "$st" = 301 ] || [ "$st" = 308 ] || [ "$st" = 302 ] || [ "$st" = 307 ]; } && printf '%s' "$loc" | grep -qi '^https://'; then
  ok "http:// redirects ($st) to $loc"
else
  flag "http://$host/ answers $st without redirecting to https (codes or links sent over http travel in cleartext). Fix: Always Use HTTPS + HSTS"
fi

h_root="$(headers "$base/")"
hsts="$(hval "$h_root" strict-transport-security)"
if [ -n "$hsts" ]; then ok "HSTS: $hsts"; else flag "no Strict-Transport-Security header"; fi

echo; echo "== Security headers on / (status $(status "$h_root"))"
csp="$(hval "$h_root" content-security-policy)"
if [ -z "$csp" ]; then flag "no Content-Security-Policy"
else
  echo "  CSP: $csp"
  script_src="$(printf '%s' "$csp" | tr ';' '\n' | grep -i '^ *script-src' || true)"
  [ -z "$script_src" ] && script_src="$(printf '%s' "$csp" | tr ';' '\n' | grep -i '^ *default-src' || true)"
  printf '%s' "$script_src" | grep -q "'unsafe-inline'" && flag "script-src allows 'unsafe-inline'"
  printf '%s' "$script_src" | grep -q "'unsafe-eval'" && flag "script-src allows 'unsafe-eval'"
  printf '%s' "$script_src" | grep -Eq '(^| )(\*|https:|http:)( |$)' && flag "script-src allows any host"
  for d in frame-ancestors object-src base-uri; do
    printf '%s' "$csp" | grep -qi "$d" || flag "CSP has no $d"
  done
fi
for h in x-content-type-options referrer-policy permissions-policy cross-origin-opener-policy cross-origin-resource-policy; do
  v="$(hval "$h_root" "$h")"
  if [ -n "$v" ]; then ok "$h: $v"; else
    case "$h" in cross-origin-*) echo "  -- no $h (defence in depth, see checklist §1/§4)" ;; *) flag "no $h" ;; esac
  fi
done
xfo="$(hval "$h_root" x-frame-options)"; [ -n "$xfo" ] && ok "x-frame-options: $xfo"
srv="$(hval "$h_root" server)"; pw="$(hval "$h_root" x-powered-by)"
[ -n "$pw" ] && flag "x-powered-by reveals: $pw"
[ -n "$srv" ] && echo "  -- server: $srv"

echo; echo "== Cookies set to an unauthenticated visitor (values redacted)"
cookies="$(printf '%s\n' "$h_root" | awk -F': ' 'tolower($1)=="set-cookie"{sub(/^[^:]*: /,""); print}')"
if [ -z "$cookies" ]; then echo "  -- none"; else
  printf '%s\n' "$cookies" | while IFS= read -r c; do
    name="${c%%=*}"; attrs="$(printf '%s' "$c" | cut -d';' -f2- | tr 'A-Z' 'a-z')"
    echo "  cookie $name=…;$(printf '%s' "$c" | cut -d';' -f2-)"
    printf '%s' "$attrs" | grep -q 'httponly' || echo "  !! $name lacks HttpOnly"
    printf '%s' "$attrs" | grep -q 'secure' || echo "  !! $name lacks Secure"
    printf '%s' "$attrs" | grep -q 'samesite' || echo "  !! $name has no SameSite"
  done
fi

echo; echo "== What an unauthenticated visitor gets"
for p in $paths; do
  case "$p" in /*) ;; *) p="/$p" ;; esac
  h="$(headers "$base$p")"
  st="$(status "$h")"; ct="$(hval "$h" content-type)"; cc="$(hval "$h" cache-control)"; loc="$(hval "$h" location)"
  printf '  %-28s %s  %s%s%s\n' "$p" "${st:-ERR}" "${ct:-}" "${cc:+  cache: $cc}" "${loc:+  -> $loc}"
  case "$p" in
    /.env|/.git/config) [ "$st" = 200 ] && flag "$p is served (200): check it is not a real file" ;;
  esac
  sleep 0.3
done

echo; echo "== robots.txt"
curl -sS -m 10 -A "$UA" "$base/robots.txt" 2>/dev/null | head -5 | sed 's/^/  /'

echo; echo "== Done: $issues issue(s) flagged. Read them as leads; confirm each against the code before reporting."
