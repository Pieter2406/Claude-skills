#!/usr/bin/env bash
# Starts `cf auth login` (OAuth device flow) in the background and prints the link to approve.
# Usage: bash login.sh [log-file]
# The login keeps waiting in the background (about 5 minutes); check it with:  tail -3 <log-file>
set -u
LOG="${1:-${TMPDIR:-/tmp}/cf-login.log}"
if npx cf auth whoami 2>/dev/null | grep -q '"authenticated": true'; then
  echo "Already logged in."
  npx cf auth whoami 2>/dev/null | grep -E '"expiresAt"|"email"' || true
  exit 0
fi
# No browser in a container: --no-browser prints the link instead of trying to open one.
( nohup npx cf auth login --no-browser > "$LOG" 2>&1 & )
for _ in $(seq 1 20); do
  sleep 1
  grep -q 'user_code=' "$LOG" 2>/dev/null && break
done
LINK=$(grep -oE 'https://dash\.cloudflare\.com/oauth2/device/verify\?user_code=[A-Za-z0-9]+' "$LOG" | head -1)
CODE=$(grep -A2 'enter the code' "$LOG" | grep -oE '^[[:space:]]+[A-Za-z0-9]{6,}' | tr -d ' ' | head -1)
if [ -z "$LINK" ]; then
  echo "No login link yet. Log so far:"; cat "$LOG"; exit 1
fi
echo "LINK=$LINK"
echo "CODE=$CODE"
echo "LOG=$LOG"
