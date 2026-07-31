# Task 139 brief: move the lab to port 7390

**Lane:** A (main checkout)

## Requested visible outcome

"Change the labs port." The lab dev server defaults to a new port — **7390** —
replacing Task 135's 7640. No number was specified; 7390 is a recognizable
port outside the 7100-block preview range and prior choices (7410, 7640),
verified free on the owner's machine via
`netstat -ano | grep LISTENING | grep -E ':(7230|7390|...)'` (only 7640/7641,
the two Kimi Work preview servers, are occupied).

## Boundary of intent

- One number and its comment in `app/vite.lab.config.ts`; `strictPort: false`
  and CLI `--port` override unchanged, so the preview card is unaffected.
- The two long-lived Kimi Work preview server processes are not touched.
- No other change.

## Checks (exact commands)

- `cd app && npm.cmd run typecheck` — green.
- `cd app && npm.cmd run lab` (temporary): server reports 7390 (or shifts if
  raced); `curl` HTTP 200 for `/`, `/shots.html`, `/lab/chatmock.html` on the
  port it reports. Server stopped afterwards.
- `cd app && npm.cmd run build:lab` — green.

## DONE / STOPPED

- **DONE:** the lab serves on 7390, checks green, commit contains only the
  config line and records.
- **STOPPED:** the change breaks serving or the build.
