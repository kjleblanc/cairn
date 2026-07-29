# Task 117 report — avatar concept board

## What actually changed

- `app/lab/concepts.html` — a new lab-only page with a clear `mock
  concepts · visual lab` badge and the same local-only CSP posture as the
  existing lab.
- `app/lab/concepts.tsx` — the concept board itself: three directions —
  **Lopsided hologram**, **Grown-up Ed**, and **Interface spirit** — each
  posed as ready, thinking, working, DONE, and STOPPED. Each lane includes
  the design trait to keep and the risk to watch.
- `app/lab/concepts.css` — the night-garden board presentation, using the
  existing garden tokens, three-column comparison layout, concept-specific
  hologram styling, and reduced-motion disablement.
- `app/lab/controls.ts` and `app/lab/index.html` — the scenario panel gains
  an **Avatar concepts** link, styled like the other lab controls.
- `app/vite.lab.config.ts` — the lab build now bundles both `index.html`
  and `concepts.html`; the root-preview middleware remains lab-only.

Nothing under `app/src` changed. The shipped Electron renderer, town
runtime, core, CLI, contract, dependencies, credentials, and Git behavior
are untouched.

## Checks run and their real results

1. `npm.cmd run typecheck` in `app/` — green.
2. `npm.cmd run build:lab` — green; both `lab/index.html` and
   `lab/concepts.html` bundled.
3. In-process Vite serve check — `/`, `/lab/index.html`, and
   `/lab/concepts.html` each returned HTTP 200 with the correct mock badge;
  the server closed in the same command.
4. Isolated Electron render with the machine-wide app token — the concept
   board rendered all three concept names and all five state labels; a
   screenshot was captured to `design/attachments/task-117-concepts.png`
   and visually inspected for layout and contrast. The token was released
   and verified free.
5. Harness disclosure: the first Electron text check missed the lowercase
   ready/thinking/working labels because the page renders them uppercase
   through CSS. The check was made case-insensitive and rerun; the passing
   result above is the real rendered page.
6. `git diff --check` before commit — clean. The temporary Electron harness
   files were removed. The untracked `design/` directory, including the
   owner-supplied references and the inspection screenshot, is not part of
   the commit.

## How to try it

Open the visual lab preview, then choose **Avatar concepts** in the
scenario panel. The board can also be opened directly at
`/lab/concepts.html` on the same dev server.

## Limitations and remaining human judgment

- These are visual poses only, not runtime states and not a proposal that
  all three directions belong in the product.
- The final choice — especially whether “Lopsided hologram” is still too
  emoji-like, whether “Grown-up Ed” has the right amount of mischief, or
  whether “Interface spirit” feels too distant — remains the owner's.

Disposition: DONE
