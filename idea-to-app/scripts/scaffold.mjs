#!/usr/bin/env node
// Creates a new app folder from the templates, ready for `cf deploy`.
//
//   node scaffold.mjs --dir ~/apps/boodschappen --name boodschappen --sub boodschappen \
//     --title "Boodschappen" --lang nl [--public] [--d1] [--room]
//
// --d1    adds a Worker with a D1 database (shared lists, records, anything stored server-side)
// --room  adds a Worker with a Durable Object "Room" (live sync between devices over WebSockets)
// Without either, the app is static files only (state in the browser).
// Unlisted (noindex) is the default; --public lets search engines index it.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const DOMAIN = 'pieterverlinden.be';
const here = dirname(fileURLToPath(import.meta.url));
const templates = join(here, '..', 'assets', 'templates');

function args(argv) {
  const out = { flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (['public', 'd1', 'room'].includes(key)) out.flags.add(key);
    else out[key] = argv[++i];
  }
  return out;
}

const a = args(process.argv.slice(2));
const missing = ['dir', 'name', 'sub', 'title'].filter((k) => !a[k]);
if (missing.length) {
  console.error(`Missing --${missing.join(', --')}. See the header of this file for usage.`);
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(a.name)) throw new Error('--name: lowercase letters, digits and dashes (it becomes the Worker name)');
if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(a.sub)) throw new Error('--sub: one DNS label, e.g. "boodschappen"');
const dir = resolve(a.dir.replace(/^~(?=\/|$)/, homedir()));
if (existsSync(dir) && readdirSync(dir).filter((f) => f !== '.git').length) throw new Error(`${dir} is not empty`);

const lang = a.lang ?? 'en';
const unlisted = !a.flags.has('public');
const d1 = a.flags.has('d1');
const room = a.flags.has('room');
const worker = d1 || room;
const conditions = { unlisted, d1, room, worker };
const today = new Date().toISOString().slice(0, 10);
const values = {
  __NAME__: a.name,
  __TITLE__: a.title,
  __LANG__: lang,
  __INITIAL__: [...a.title.trim()][0]?.toUpperCase() ?? 'A',
  __URL__: `https://${a.sub}.${DOMAIN}`,
};

/** Keeps the lines between "#if x" / "#else" / "#endif" that apply, then fills in the placeholders. */
function render(text) {
  const out = [];
  const stack = [];
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^#(if|else|endif)\b\s*(\w*)/);
    if (m && line.trim().startsWith('#')) {
      if (m[1] === 'if') stack.push(!!conditions[m[2]]);
      else if (m[1] === 'else') stack.push(!stack.pop());
      else stack.pop();
      continue;
    }
    if (stack.every(Boolean)) out.push(line);
  }
  let s = out.join('\n');
  for (const [k, v] of Object.entries(values)) s = s.split(k).join(v);
  return s;
}

function renderTree(root) {
  for (const f of readdirSync(root)) {
    const p = join(root, f);
    if (statSync(p).isDirectory()) renderTree(p);
    else if (/\.(html|css|js|mjs|json|webmanifest|svg|txt|ts|md)$|^_headers$|^\.assetsignore$|^gitignore$/.test(f)) writeFileSync(p, render(readFileSync(p, 'utf8')));
  }
}

mkdirSync(dir, { recursive: true });
cpSync(join(templates, 'static'), dir, { recursive: true });
if (worker) cpSync(join(templates, 'worker'), dir, { recursive: true });
if (room) cpSync(join(templates, 'room'), dir, { recursive: true });
renameSync(join(dir, 'gitignore'), join(dir, '.gitignore'));
renderTree(dir);
if (!worker) rmSync(join(dir, 'worker'), { recursive: true, force: true });

// cloudflare.config.ts: one Worker on its own subdomain; with an API, only /api/* runs the Worker.
const imports = ['defineConfig', ...(worker ? ['bindings'] : []), ...(room ? ['exports'] : [])];
const env = [
  ...(d1 ? ['"DB": bindings.d1()'] : []),
  ...(room ? ['"ROOMS": bindings.durableObject({ worker: NAME, exportName: "Room" })'] : []),
];
const config = `import { ${imports.join(', ')} } from "cf/config";

// ${a.title}: ${values.__URL__} (${unlisted ? 'unlisted: anyone with the link, not indexed' : 'public'}).
// Static files come from public/ (wrangler.config.ts).${worker ? ' Only /api/* runs the Worker in worker/index.js.' : ''}
const NAME = "${a.name}";

export default defineConfig({
  worker: {
    "name": NAME,
    "compatibilityDate": "${today}",
    "domains": ["${a.sub}.${DOMAIN}"],
    // One address only: no *.workers.dev copy and no preview URLs.
    "workersDev": false,
    "previewUrls": false,
    "observability": { "enabled": true },${worker ? `
    "entrypoint": "./worker/index.js",
    "assets": { "runWorkerFirst": ["/api/*"] },` : ''}${room ? `
    "exports": { "Room": exports.durableObject({ storage: "sqlite" }) },` : ''}${env.length ? `
    "env": { ${env.join(', ')} },` : ''}
  },
});
`;
writeFileSync(join(dir, 'cloudflare.config.ts'), config);

console.log(JSON.stringify({ dir, url: values.__URL__, worker: worker ? { d1, room } : false, unlisted }, null, 2));
console.log('Next: cd into it, `npm install`, write the app, `npm test`, then `npm run check` (a dry-run deploy).');
