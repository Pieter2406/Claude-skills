#!/usr/bin/env node
// Lists the Workers on the Cloudflare account with their addresses, to see which subdomains are taken.
//   node list_apps.mjs            (run inside any folder where `npx cf` works and you are logged in)
import { execFileSync } from 'node:child_process';

let workers;
try {
  workers = JSON.parse(execFileSync('npx', ['--yes', 'cf', 'workers', 'list'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
} catch (e) {
  console.error('`cf workers list` failed. Logged in? Try `npx cf auth whoami`.\n' + (e.stderr || e.message));
  process.exit(1);
}
for (const w of workers) {
  const hosts = (w.references?.domains ?? []).map((d) => d.hostname);
  console.log(`${w.name.padEnd(32)} ${hosts.join(' ') || '(no custom domain)'}`);
}
