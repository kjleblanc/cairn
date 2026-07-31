# Task 145 report — Lantern Dusk, ported into the real app

**Lane:** C (main checkout) · **Base:** main @ 724d97c (Task 143)

## What was asked

The owner picked **Lantern dusk** from the Task 144 world palette board. Port
it into the real app: plum-dusk night world, lamp-lit cream panels with warm
dark ink, Cairn in soft teal, worker/activity in lantern gold, the cyan glow
gone — colors only, light theme untouched.

## What changed (every file touched)

- `app/src/renderer/tokens.css` — the port. Dark side of every `light-dark()`
  pair moved to the Lantern family: sky #2e2a4e, cloud #443d63, hills
  #46406a/#35304f, ground/bg #2c2842, cards cream rgb(244 234 217/88%) and
  #fffaf0, ink #f4ead9, line #5a5278, amber #f2b95c/#ffd98a, stop (serious)
  #ff9e8a, stones/trail warmed, rail plum (#28223f…#403860), thread #8d80a8.
  In-world town panels flip to cream (entity/detail/header/thread-bg) with
  dark ink #54452f and muted #97856b. Garden tokens (night in both themes, by
  design): deep #2c2842, ink #35304f, Cairn's accent coral→soft teal #7fd8c8
  (the de-neon signature), amber hearth-light #ffd27a→lantern gold #f2b95c,
  rose→coral #ff9e8a, faces warmed. **Two new tokens** (declared in the
  brief): `--card-ink` and `--card-muted` — cream panels can no longer
  inherit the light `--ink`. The green family (primary actions, done states)
  is unchanged; the green still reads AC-natural. The garden comment block
  now records the Task 145 choice.
- `app/src/renderer/app.css` — surface rules follow the flip: every
  card-surface rule carries `color: var(--card-ink)` (cards, pills, inputs,
  chat column, overlays, switcher, feed, chips, md-code/table, …); on-card
  muted text uses `--card-muted`. Cairn's chat bubble and the run strip move
  from `--bg` (dusk) to `--card` (cream) so they stay lamp-lit. Town node
  labels and status text — the only town text that sits directly on the dusk
  ground — now use the global `--ink`/`--muted` (light) instead of the
  flipped town tokens. Three hardcoded strays de-neoned: the rail gradient
  (deep violet → plum), the rail Cairn-mark glow (cyan → teal), the thread
  chip shadow (cyan → lantern gold). No layout, no behavior.
- `app/src/main/bridge/phonepage.ts` — the phone page embeds its own token
  mirror (a self-contained string page; it cannot import tokens.css). Its
  dark values harmonized to the same palette, with the same two card-ink
  additions applied to its cards, bubbles, and inputs. Structure untouched.
- `app/shots/task-145-{workspace,chat,town}.png` + `manifest.json` entry
  (gitignored content).

## Checks run (exact commands, real results)

- `npm.cmd run typecheck` (in `app/`) — passes.
- `npm.cmd run test:unit` (in `app/`) — 141 pass, 0 fail.
- `npm.cmd run build:vite` (in `app/`) — passes. (The brief said
  `npm run build`; that script does not exist — the app's bundle script is
  `build:vite`. Disclosed as a brief typo, not a skipped check.)
- `npm.cmd run build:lab` (in `app/`) — passes.
- Captures via a throwaway Playwright/Electron harness (`app/tmp-capture/`,
  deleted after use; windows shown briefly — hidden-window captures stall
  the compositor here, the Task 144 lesson): the lab chatmock page and the
  real app (CAIRN_MOCK=1) forced to `data-theme="dark"`. Inspected by eye,
  including a native-resolution crop of the town header (small-caps labels
  and the disabled "Reset layout" read fine; the washed look was only image
  downsampling).
- `curl -s -o /dev/null -w "%{http_code}" …/shots/manifest.json` and the new
  shot URLs on the lab server — all 200.

## Repairs made during the task

None beyond plan: no test pins referenced the old colors (verified before
editing); `--garden-rose` proved unused, so remapping it was free. One
pre-planned judgment call to restate: town node labels sit on the open
ground, so they keep light ink via the global tokens rather than following
the cream-panel ink — without that, names would have been dark-on-dusk.

## How to judge it

Open `/shots.html` (top entry) or the live app. The whole dark side and the
always-night garden should read as one lamp-lit dusk: cream paper panels,
plum world, teal Cairn, gold hearth-light. Flip your OS/app theme to light
and the chrome is exactly as before — only the garden stays night, as
designed.

## Limitations / remaining human judgment

- Accent colors at their smallest sizes (tiny status labels, the `.muted`
  utility on the open dusk) sit at the board's own chosen values; if any
  small text reads soft on your monitor at real viewing distance, that is a
  one-token nudge (`--town-muted`, `--card-muted`) — say the word.
- The worker's identity color stays lantern-gold hearth-light (its
  established meaning); the board's coral worker is carried by
  `--stop`/serious moments and `--garden-rose` instead. Cairn got the
  signature swap to teal. If you'd rather the worker glow coral, that's a
  small follow-up.
- Still open from Task 136: the chat treatment pick (A villager bubble /
  B rising drawer / C side companion).

Disposition: DONE
