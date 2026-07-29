# Task 129 brief: pin the lab's own port

**Lane:** A (main checkout)

## Requested visible outcome

The visual lab's dev server (`npm run lab` / `npm run dev`) starts on its own
fixed, easily recognizable port instead of Vite's default (5173) or whatever
the launcher hands it. When the owner runs the lab directly, the URL is
predictable and distinct from the Kimi Work preview port (7100) and the other
lane's app runs.

## Boundary of intent

- Lab serving only. The shipped Electron bundle, main/preload/renderer Vite
  configs, Playwright config, and `build:lab` output are untouched.
- CLI `--port` arguments must still win over the configured default, so Kimi
  Work's preview card keeps working exactly as before (it passes its own
  conflict-free port).
- No dependency changes. No behavior change besides the default port.
- The other lane's in-flight Task 127 files are never staged or touched.

## Checks

- `npm run lab` starts and reports the chosen port; `curl` the lab root and
  confirm it serves the lab HTML. Server stopped afterwards.
- `npm run build:lab` still succeeds.
- `npm run typecheck` stays green (config is TypeScript).

## DONE / STOPPED

- **DONE:** the lab dev server defaults to the chosen port, CLI override still
  works, checks above pass, commit contains only the lab config + records.
- **STOPPED:** the port cannot be pinned without breaking the preview card or
  the other lane's work.
