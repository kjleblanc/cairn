# Task 135 report: move the lab to port 7640

## What actually changed

- `app/vite.lab.config.ts` — one number: the lab dev server's default port is
  now **7640** (was 7410), comment updated. `strictPort: false` and CLI
  `--port` override are unchanged.

## Checks run and their real results (exact commands)

- `cd app && npm.cmd run typecheck` — green.
- `cd app && npm.cmd run lab` (temporary instance): started, and after the
  port-holder investigation below, HTTP 200 from `curl` for
  `http://localhost:7640/`, `/shots.html`, and `/shots/manifest.json`.
- `cd app && npm.cmd run build:lab` — green (621 ms).
- Final socket check (`netstat -ano | grep LISTENING | grep -E ':(7640|7641|7642) '`):
  only the two Kimi Work preview servers remain, on 7640 and 7641; my
  temporary instance is gone. No server of mine left running.

## What the port survey found (disclosed)

The new instance announced `http://localhost:7642`, not 7640 — 7640 and 7641
were already taken. Inspecting the holders (`Get-CimInstance
Win32_Process`): both are **Kimi Work's own preview servers** (runtime
`node.exe … vite.js dev -c vite.lab.config.ts`, started 2026-07-29 16:22 and
2026-07-30 02:10, before this task). They carry no CLI `--port`, so they
follow the config default; Vite's config watcher reloaded this task's edit
into them live, which is why 7640 now serves the lab (shots page included)
without anyone restarting anything. Those two processes belong to the Kimi
Work preview lifecycle and were deliberately left running; only my own
verification instance (7642) was stopped.

Also disclosed: the candidate-port check in the brief moment used a grep
pattern that missed `[::1]:PORT` socket lines; corrected during the task.

## How to try it

The lab (and the shots page) now live at `http://localhost:7640/`
(`/shots.html` for the review page) when run directly. The preview card is
unaffected — it keeps its own logical 7100 address.

## Limitations / remaining human judgment

- 7640 was the owner's "a different port" with no number specified; chosen as
  a recognizable port outside the 7100 preview block and the old 7410.
- The two long-lived preview server processes are Kimi Work's to manage; if
  their number ever looks wrong, that's a preview-lifecycle question, not a
  lab-config one.

**Disposition: DONE**
