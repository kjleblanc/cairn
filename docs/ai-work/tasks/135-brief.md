# Task 135 brief: move the lab to port 7640

**Lane:** A (main checkout)

## Requested visible outcome

"Launch it on a different port." The lab dev server (and with it the shots
page) defaults to a new port — **7640** — instead of Task 129's 7410. All
candidate ports checked free on the owner's machine (netstat, none
listening), so this is preference, not a conflict.

## Boundary of intent

- One number in `app/vite.lab.config.ts`, matching Task 129's shape:
  `strictPort: false` kept, CLI `--port` still overriding, so the Kimi Work
  preview card (7100-logical) is unaffected.
- No other code, dependency, or behavior change.

## Checks (exact commands)

- `cd app && npm.cmd run typecheck` — green (config is TypeScript).
- `cd app && npm.cmd run lab` (temporary): server reports
  `http://localhost:7640/`; `curl` HTTP 200 for `/`, `/shots.html`, and
  `/shots/manifest.json`. Server stopped afterwards, port confirmed free.
- `cd app && npm.cmd run build:lab` — green.

## DONE / STOPPED

- **DONE:** the lab serves on 7640, checks green, commit contains only the
  config line and records.
- **STOPPED:** the port change breaks the preview card or the build.
