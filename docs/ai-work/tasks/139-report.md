# Task 139 report: move the lab to port 7390

## What actually changed

- `app/vite.lab.config.ts` — one number: the lab dev server's default port is
  now **7390** (was 7640), comment updated. `strictPort: false` and CLI
  `--port` override unchanged.

## Checks run and their real results (exact commands)

- `cd app && npm.cmd run typecheck` — green.
- `cd app && npm.cmd run lab` (temporary): server reported
  `http://localhost:7390/`; `curl` HTTP 200 for `/`, `/shots.html`, and
  `/lab/chatmock.html`.
- `cd app && npm.cmd run build:lab` — green (698 ms).
- Final socket check (`netstat -ano | grep LISTENING | grep ":7390 "`): port
  free — see the note below.

## Harness note (disclosed)

The first stop attempt killed the port-holder identified mid-run, but a
surviving child process (PID 45444, the Vite node process orphaned by killing
its npm wrapper first) was still bound to 7390 on the re-check. It was
stopped with `taskkill //F //PID 45444` and the port confirmed free. The two
Kimi Work preview servers (7640/7641) were never touched.

## How to try it

`npm run lab` in `app/` now serves at `http://localhost:7390/`
(`/shots.html`, `/lab/chatmock.html` on the same port). The preview card is
unaffected — it keeps its own logical 7100 address and passes its own port.

## Limitations

- Third port choice by owner request with no number specified; chosen as a
  recognizable port outside prior picks (7410, 7640) and the 7100-block.

**Disposition: DONE**
