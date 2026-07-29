# Task 129 report: pin the lab's own port

## What actually changed

- `app/vite.lab.config.ts` — the lab dev server now defaults to port **7410**
  (`server: { port: 7410, strictPort: false }`), with a comment noting that a
  CLI `--port` still overrides it. This was the only code file touched.

Nothing else changed: shipped Electron configs, Playwright, build inputs, and
dependencies are all untouched. The other lane's in-flight Task 127 files were
never staged.

## Checks run and their real results

- `npm run lab` → Vite reported `Local: http://localhost:7410/`; `curl` of the
  lab root returned HTTP 200. Server was then stopped and port 7410 confirmed
  free again (no dev server left running).
- `npm run typecheck` → green.
- `npm run build:lab` → built successfully (633 ms).

## How to try it

Run `npm run lab` (or `npm run dev`) in `app/` and open the URL it prints —
now `http://localhost:7410/` instead of 5173. If 7410 is occupied, Vite
shifts to the next free port rather than failing (unchanged behavior). The
Kimi Work preview card is unaffected: it passes its own `--port`, which
overrides this default.

## Limitations / remaining human judgment

- 7410 was chosen as a recognizable, unoccupied port outside the 7100-block
  the preview card uses; no deeper port-policy reasoning.
- If the owner would rather the lab *fail* than shift ports when 7410 is busy,
  that is a one-word change (`strictPort: true`) — left as-is to preserve
  current forgiving behavior.

**Disposition: DONE**
