# Task 100 report — garden design tokens and the night ground

## What actually changed

- `app/src/renderer/tokens.css` — a new garden token group, documented as
  night-in-both-themes by design: deep ink grounds (`--garden-deep`,
  `--garden-ink`), hologram cyan (`--garden-cyan`, dim and glow variants),
  hearth amber (`--garden-amber`, soft and glow variants), serious-moment
  rose (`--garden-rose`), a ten-star `--garden-stars` field, and a
  low-opacity `--garden-scanline` texture. Every color the new ground uses
  lives here as a named token.
- `app/src/renderer/app.css` — the `.town-square` background only: the
  flat sky-to-ground gradient is replaced by the night ground — scanlines,
  star field, a soft cyan glow from above, a warm amber glow from below,
  over the ink gradient. No layout, component, motion, or behavior change;
  no raw hex added to component styles.

## Checks run and their real results

1. `npm.cmd run build:vite` — green.
2. `npm.cmd run build:lab` — green; the lab serves the repainted town.
3. Desktop unit suite — 100/100 pass.
4. `git diff --stat` for this task's files: tokens.css +27, app.css ±7.

**Mixed-tree disclosure.** While these checks ran, a parallel chat's
uncommitted work sat in the tree (`app/src/main/main.ts`, +77/−42, and an
overwrite of the committed `docs/ai-work/tasks/099-brief.md`). The builds
above therefore compiled more than this task's changes. That code compiled
cleanly and no check touched it, but this task's green covers the mixed
tree, and the owner was told. The parallel work's brief-overwrite of
committed Task 099 records violates the contract's never-rewrite-history
rule; the committed 099 records are safe in Git (`7db6f97`), and restoring
the working-tree copy is the parallel chat's repair, not this task's.

## How to try it

```powershell
npm.cmd --prefix app run lab
```

Open the printed URL, switch to the town view, and flip the scenario
panel: quiet, thinking, running, DONE, STOPPED — each state now sits on
the night ground. (The faces, pads, tethers, and archive are still the old
shapes; they are the next tasks.)

## Limitations and remaining human judgment

- Readability of existing entities over the night ground is verified by
  build and by the lab's posed states, but final contrast judgment is the
  owner's eye — the decorative layers are low-opacity and behind all
  content by construction.
- The chat screen's hillside (`Scene.tsx`) is unchanged; whether the
  garden atmosphere spreads there is a design decision for a later task.

Disposition: DONE
