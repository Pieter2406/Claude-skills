#!/usr/bin/env bash
# Starts or stops the app's local server (`cf dev`) in the background, on the first free port from 8787.
#
#   bash dev.sh start <app-dir>    prints the URL once it answers (keeps a log in <app-dir>/.wrangler/dev.log)
#   bash dev.sh stop  <app-dir>    stops it and every process it started
#
# cf dev runs several processes (npm, cf, wrangler, workerd); they share one process group, which `stop` ends as a
# whole. Don't use `pkill -f <pattern>` for this: the pattern can match the shell you're running in.
set -euo pipefail
cmd=${1:-}; dir=${2:-.}
cd "$dir"
mkdir -p .wrangler
pidfile=.wrangler/dev.pid; portfile=.wrangler/dev.port

free_port() {
  for p in $(seq 8787 8899); do
    if ! (exec 3<>/dev/tcp/127.0.0.1/$p) 2>/dev/null; then echo $p; return; fi
  done
  echo "no free port between 8787 and 8899" >&2; exit 1
}

case "$cmd" in
  start)
    if [[ -f $pidfile ]] && kill -0 "$(cat $pidfile)" 2>/dev/null; then
      echo "already running: http://localhost:$(cat $portfile)/"; exit 0
    fi
    port=$(free_port)
    setsid npx cf dev --port "$port" > .wrangler/dev.log 2>&1 < /dev/null &
    echo $! > $pidfile; echo "$port" > $portfile
    for _ in $(seq 1 60); do
      if curl -s -o /dev/null "http://localhost:$port/"; then echo "http://localhost:$port/"; exit 0; fi
      if ! kill -0 "$(cat $pidfile)" 2>/dev/null; then echo "cf dev exited; see $dir/.wrangler/dev.log" >&2; tail -20 .wrangler/dev.log >&2; exit 1; fi
      sleep 1
    done
    echo "cf dev did not answer within 60 s; see $dir/.wrangler/dev.log" >&2; exit 1
    ;;
  stop)
    if [[ -f $pidfile ]]; then
      pgid=$(cat $pidfile)
      kill -- -"$pgid" 2>/dev/null || true
      for _ in $(seq 1 20); do kill -0 -- -"$pgid" 2>/dev/null || break; sleep 0.25; done
      kill -9 -- -"$pgid" 2>/dev/null || true
      rm -f $pidfile $portfile
      echo "stopped"
    else
      echo "not running"
    fi
    ;;
  *) echo "usage: bash dev.sh start|stop <app-dir>" >&2; exit 2 ;;
esac
