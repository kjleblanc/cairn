# Task 114 report — visual lab at the preview root

## What actually changed

- `app/vite.lab.config.ts` — added a lab-only dev-server middleware named
  `cairn-lab-at-root`. When the Kimi Work preview card opens `/` or
  `/index.html`, the middleware reads the real `lab/index.html`, rewrites
  only its entry script to `/lab/main.tsx`, lets Vite transform the page,
  and serves it with HTTP 200. The existing `/lab/index.html` route still
  uses the original lab page unchanged.

No shipped Electron renderer, main, preload, core, CLI, contract,
dependency, or runtime file changed. The parallel lane's in-flight core
files were not touched.

## Checks run and their real results

1. `npm.cmd run typecheck` in `app/` — green.
2. In-process Vite lab server — both `/` and `/lab/index.html` returned
   HTTP 200 and contained the `mock data · visual lab` badge; the server
   closed in the same command.
3. Root-entry inspection — the served root page contains
   `/lab/main.tsx`, so its relative lab imports resolve correctly. One
   over-literal follow-up assertion looked for the full `src=` fragment and
   falsely reported false; inspecting the actual served HTML confirmed the
   correct script URL.
4. `npm.cmd run build:lab` — green.
5. `git diff --check` before commit — clean. The product diff is the one
   lab config file; the unrelated modified `core/package.json`, untracked
   `core/test/kimi.test.ts`, and untracked `design/` remain outside this
   task's commit.

## How to try it

Open the Kimi Work preview card for the `app/` project again. It should go
past the launcher's "Getting ready…" page and show the visual lab, with the
mock badge and scenario panel. The direct path `/lab/index.html` remains
available too.

## Limitations and remaining human judgment

- This verifies the dev-server response and page wiring. The owner's opened
  preview is the final visual confirmation.
- The preview port is assigned by Kimi Work and may differ from the logical
  `7100` URL shown in chat; that remap is expected.

Disposition: DONE
