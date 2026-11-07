# Running and checking each kind of app

Pick the row that fits (an app can be several: a web front end plus an API). Commands come from the project; these
are the shapes to look for.

## Web app (browser front end)

- **Run**: the project's dev server or a local production build; note the port it really prints.
- **End to end**: Playwright (`require('playwright')`, Chromium) through the UI, at every size the app supports
  (phone, tablet, desktop). `scripts/e2e-kit.cjs` sets up a context with a device or viewport, time zone, optional
  geolocation and a fake clock, and collects page errors and HTTP ≥ 400. Separate browser contexts = separate users or
  devices. `ctx.setOffline(true)` for no network.
- **Old data**: `ctx.addInitScript` writing localStorage/IndexedDB in the previous format, or seed the local database.
- **Verify live**: the URL answers (200, or the login redirect when it's behind access control), a changed static file
  is served with the new content or version, no console errors on a read-only visit.

## API / backend service

- **Run**: locally with a local database or test containers (docker compose if the repo has it).
- **End to end**: an HTTP client script (`curl`, `fetch`, the project's API tests) through the public routes, with
  real auth where possible; two clients in parallel for concurrency; repeated and out-of-order requests for retries;
  old-shaped payloads and rows written by the previous version.
- **Verify live**: health/status endpoint, version endpoint or response header showing the new build, a read-only GET
  on a changed route, error rate/logs if the platform shows them. Migrations ran (if any).

## CLI tool

- **Run**: the built binary or the package's entry point in a temporary directory.
- **End to end**: every changed command with real arguments and files; invalid input and missing files (exit codes
  and messages); two runs at once if it writes shared files; interrupt with Ctrl-C/kill mid-run and run again; config
  and data files from the previous version.
- **Verify release**: install the published version the way users do (`npm i -g`, `pipx install`, `brew`, the
  download) in a clean place and run `--version` plus one read-only command.

## Mobile app (native or cross-platform)

- **Run**: emulator/simulator if the environment has one; otherwise the web build or the shared logic's tests, and say
  which parts couldn't be run.
- **End to end**: the platform's UI test tool if the project has one; flight mode on and off; app killed and reopened;
  upgrade over the previous version's stored data; two devices for shared state.
- **Release**: the project's pipeline (store upload, beta track). Store review is the user's step; report it.

## Desktop app

- **Run**: the dev build; the packaged build when packaging changed.
- **End to end**: the project's UI automation if present (Playwright works for Electron), else a scripted smoke run;
  upgrade over the previous version's settings and data.
- **Verify release**: the published installer/update feed shows the new version.

## Library / package

- **Run**: the test suite plus a small example program that imports the built package from the packed artifact
  (`npm pack`, `python -m build`), not from the source tree.
- **End to end**: the public API as the README shows it; the previous version's serialized data or config if the
  library reads any; supported runtime versions if the project lists several.
- **Verify release**: the registry shows the new version; a clean install in a temp directory imports and runs the
  example.

## Data pipeline / scheduled job

- **Run**: locally on a small copy or fixture of the real input.
- **End to end**: a full run; a run interrupted halfway and restarted (idempotent?); two overlapping runs; input in the
  previous format.
- **Verify live**: the next scheduled run's status and output counts; nothing triggered by hand on production data
  unless the user asks.
