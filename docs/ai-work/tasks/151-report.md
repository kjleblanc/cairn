# Task 151 — a usable villager bubble

## What changed

One file, `app/src/renderer/app.css` (layout only — no markup, copy, or
behavior touched):

- **Dialog geometry.** The villager dialog was fixed at `min(400px, 38%)`,
  squeezing contents built for the old 720px chat pane. It is now
  `min(520px, max(400px, calc(50% - 128px)), calc(100% - 32px))` wide with
  `max-height: 76%`. The `50% - 128px` term keeps the 96px anchor clearance
  beside Cairn's node plus the 32px pane margin, so the left edge never
  slides back over the node while there is room to avoid it; the 400px floor
  keeps the dialog usable on small panes, below which it slides over the
  node — the same overlay tradeoff the ≤620px centered mode already makes
  (tucking reveals him). The tucked chip got the same right-edge clamp.
- **One shrinking region.** Every direct child of the dialog is now
  `flex-shrink: 0` except `.chat-messages`. Before, all children shrank
  proportionally once the dialog hit `max-height`, collapsing the message
  list to a one-line strip; now the list — the one region that can scroll —
  absorbs the overflow and the top bar, run strip, and composer keep their
  natural size.
- **Styled scrollbar.** `.chat-messages` gets a thin styled scrollbar
  (`scrollbar-width: thin` + `::-webkit-scrollbar` rules). Unstyled, Windows
  paints its classic bar with arrow buttons — the dark strip with up/down
  chevrons in the owner's screenshot. This is the one rule shared with the
  standalone chat screen, which had the same artifact; its layout is
  unchanged.
- **Wrapping run strip.** In the dialog the strip wraps (`flex-wrap: wrap`,
  outcome on its own row via `flex-basis: 100%; order: 5`, controls pushed
  right): "RUN 0:02 · Stop this task · Open the run screen" was clipped at
  400px; it is always fully visible now, in running and terminal states.
- **One-line top bar.** The provider·model pill wrap gets `flex: 1 1 0` with
  an ellipsizing button. `flex-wrap` decides line breaks by *hypothetical*
  sizes, so the earlier `flex: 0 1 auto` attempt (first repair, below)
  still wrapped onto three lines; only a zero basis keeps "← Project home ·
  pill · tuck away ↘" on one line.
- **Cards fit the measure.** `.route-facts` is `1fr 1fr` inside the dialog
  and long mono strings (`route-facts strong`, result-card file paths) get
  `overflow-wrap: anywhere`.
- The ≤620px fallback matches: up to 520px wide, `max-height: 84%`.

Captures: `app/shots/task-151-{running,settled,narrow,tucked}.png` plus the
top entry in `app/shots/manifest.json` (both gitignored, per convention).

## Checks run and their real results

- `npm.cmd run typecheck` (in `app/`) — clean.
- `npm.cmd run test:unit` — 141/141 pass.
- `npm.cmd run build:vite` — green; `npm.cmd run build:lab` — green.
- Visual (the decisive check): a throwaway harness (`app/tmp-capture/`,
  deleted after use) drove the real app against the conductor fixture and
  the fake-codex "slow" shim — no paid call — and captured four states,
  each inspected: **running** (one-line top bar; full run strip with both
  controls and the outcome on its own row; a real scroll region with the
  styled scrollbar; composer closed with its explanation), **settled**
  (result-card internals and the long mono debug path wrap inside the
  dialog; terminal strip complete), **narrow 940×680** (dialog clamps
  inside the pane, nothing clipped), **tucked** (clean chip).
- E2E, app token held at `app/.app-token` (released after):
  `npx.cmd playwright test tests/conductor.spec.ts` — 26/26 pass, run in
  line-targeted chunks under the 300s tool cap;
  `npx.cmd playwright test tests/bridge.spec.ts` — 1/1 pass.
  `app/tests/projects.spec.ts` deliberately not run: it is the stopped
  Task 148/150 worker's modified file, another task's in-flight work.
- `git diff --check` — clean.
- Protected work at report time: `Picker.tsx` (+13 lines), `projects.spec.ts`
  (+26), `LOG.md` (+3 rows), `design/`, both `app/*.log` files, and the
  148/150 task records all exactly as they were when this task's brief was
  committed.

## Repairs disclosed

1. **Top-bar pill basis.** The first attempt (`flex: 0 1 auto`) still
   wrapped — flex-wrap breaks lines by hypothetical size before shrinking.
   Repaired to `flex: 1 1 0`; confirmed in the recaptured shots.
2. **The widened dialog covered Cairn's node.** The first geometry clamp
   (`calc(100% - 552px)`) pulled the dialog's left edge over the town
   center at the 1320×820 default window, and conductor.spec's strip test
   caught it ("chat-villager-root intercepts pointer events" clicking the
   node). Repaired with the clearance-preserving width expression above;
   the whole spec then passed. This is exactly the check doing its job.
3. **Stale bundle captures.** The first recapture ran against the pre-repair
   `.vite` build; rebuilt and recaptured. Harness-only fix.
4. **Environmental interruptions, no code cause:** one Playwright worker
   exit (0xC0000409, the same crash family tasks 146/147 logged) and two
   300s tool-cap timeouts; three orphaned `electron.exe` processes from a
   killed run were identified by start time and killed by PID. All cleared
   on rerun; the suite then passed chunked at normal per-test speeds.

## How to try it

Open the app (`npm.cmd start` in `app/`) and open a project. The
conversation floats beside Cairn at a comfortable width: send a few
messages and watch the message list scroll with the slim scrollbar; run one
offline-demo dispatch (no paid call) and read the whole run strip —
stage, clock, both buttons, the outcome below; tuck the dialog away and
bring it back from the chip or by clicking Cairn; drag the window narrow
and watch the dialog clamp inside the pane instead of spilling off it.

## Limitations and remaining human judgment

- Geometry was tuned against captures at 1320×820 and 940×680; on very
  small panes (below the 400px floor) the dialog overlays Cairn, the same
  accepted tradeoff as the ≤620px mode.
- The ellipsized provider·model pill shows the full name on click (its
  panel is unchanged).
- `docs/ai-work/LOG.md` holds this task's row but is deliberately
  uncommitted, per the Task 149 precedent: committing it would sweep the
  stopped worker's 148/150 rows into history before the owner's decision.
- Task 150's report and log row landed mid-investigation as its live run
  settled (the owner's screenshot showed it at 1:30 elapsed); noted so the
  record explains why LOG.md moved between this task's first read and its
  brief.

Disposition: DONE
