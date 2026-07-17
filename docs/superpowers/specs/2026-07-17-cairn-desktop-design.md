# Cairn Desktop — design

**Date:** 2026-07-17
**Status:** approved pending user review
**Scope:** a double-clickable desktop app that becomes the primary way novices use Cairn. The CLI remains for terminal users.

## Goal

Cairn's audience is people who have never shipped software. Today the gated loop lives
in a terminal (`cairn task`), which is exactly where that audience will not go. Cairn
Desktop puts the same loop — define → approve → build → verify → decide — behind
buttons in a friendly window, with the same safety rules enforced by the same code.

Requirements settled during brainstorming:

- **Form:** desktop app (Electron), installable by double-click.
- **Scope:** the full Cairn home — project picker, per-project dashboard, task loop,
  and init for new projects.
- **Platforms:** Windows and Mac from day one, installers on GitHub Releases.
- **Auth:** rides on the user's Claude Code sign-in, as the CLI does. No API keys.
- **Look:** cozy and friendly — faded pastels, nature blended with technology,
  no mascots.

## Approach

Electron, sharing the CLI's engine code. The engine (`agents.ts`, `gates.ts`,
`files.ts`, `prompts.ts`) is already Node/TypeScript; Electron's main process is Node,
so the app imports the same modules the CLI uses. One implementation of the safety
rules serves both skins.

Rejected: Tauri with a Node sidecar (tiny installers, but adds Rust, sidecar
packaging, and an extra IPC layer to a solo-maintained project); a `cairn app` local
server (fails the double-clickable requirement — users would still need Node and a
terminal).

Known cost: installers around 100 MB, and Electron's security setup (context
isolation, preload bridge) must be deliberate. Both are acceptable.

## Architecture

The repo becomes an npm-workspaces monorepo with three packages:

```
core/   the Cairn engine — files, gates, prompts, agents (real + mock)
cli/    terminal skin: @clack prompts, spinners, banner (existing, slimmed)
app/    desktop skin: Electron ("Cairn Desktop")
```

### core/

Extracted from today's `cli/src`: `files.ts`, `gates.ts`, `prompts.ts`, `agents.ts`,
and the text parsers (`dispositionOf`, `finalVerdictOf`). No terminal dependencies.
The `assets/contract.md` sync from `CONTRACT-TEMPLATE.md` moves into core's build.

One real refactor: today's `taskFlow` is a single 160-line function that owns the
whole loop. Core instead exposes **resumable steps**, each reading its state from the
project files:

- `defineTask(root, outcome)` → writes the brief, returns its path
- `approveBrief(root, taskNumber)` → records the SHA-256 approval (the gate)
- `buildTask(root, taskNumber)` → verifies the hash, builds, writes the report
- `reviewTask(root, taskNumber)` → fresh-context review, report locked until the
  reviewer states a provisional verdict
- `closeTask(root, taskNumber, decision)` → appends the log row
- `runDirectionCheck(root, reason)` → the Direction Gate's alternative to a fourth
  step: explores genuinely different options, changes nothing

This changes approval storage. The CLI today holds the approval record in memory for
the length of one `cairn task` run; the app's approve and build are separate calls,
possibly across an app restart, so `approveBrief` now persists the record to
`docs/ai-work/tasks/NNN-approval.json` and `buildTask` re-reads and re-verifies it
from disk. The CLI adopts the same persistence — one behavior, both skins.

The CLI's flow and the app both become thin sequencers over these calls. The files
stay the single source of truth, so either skin can resume a task the other started.

### app/

A standard secure Electron split:

- **Main process** hosts the engine, owns a recent-projects registry (JSON in
  `userData`), and runs a preflight check (is the Claude Agent SDK usable, is the
  user signed in).
- **Preload** exposes a narrow typed API as `window.cairn` via `contextBridge`.
  Context isolation on, node integration off, sandbox on, strict CSP, no remote
  content.
- **Renderer**: React + TypeScript + Vite (Electron Forge's Vite template). Hand-
  written CSS on design tokens ported from `cairn.html`.

IPC surface:

| Channel | Direction | Purpose |
|---|---|---|
| `preflight:check` | invoke | `{ claudeReady, reason? }` |
| `project:list` / `project:open` / `project:init` | invoke | registry and setup |
| `project:status` | invoke | facts, log rows, stones, Direction Gate state, orphaned-task detection |
| `task:define` / `task:approve` / `task:build` / `task:review` / `task:close` | invoke | the five core steps |
| `task:direction` | invoke | run the direction check when the gate is tripped |
| `engine:event` | stream | live agent activity: text, tool use, denied actions |

The CLI keeps working exactly as today — same commands, same behavior, now calling
core.

## Screens

Five screens, one spine: pick a project → see your cairn → run a task.

1. **Welcome / first run.** Appears when no recent projects exist or preflight fails.
   If Claude isn't ready, a guided fix-it screen — install Claude Code, sign in,
   *Check again* — written for someone who has never opened a terminal. Otherwise two
   choices: *Open a project folder* / *Start a new project*.

2. **Project picker.** Recent projects as cards: name, milestone, stone count, last
   task date. *New project* runs init as a short form (project name, first milestone),
   shows what was created, and lands on the dashboard.

3. **Dashboard.** A landscape, not a control panel: the cairn stands on a faded
   pastel hillside, one stone per closed task, with a dotted trail winding up to it.
   Below the scene: a status pill (mono type: `▸ idle · 5 stones · gate quiet`), the
   recent log as readable rows, and one big *Start a task* button. The Direction Gate
   is invisible when quiet; when tripped, an amber banner replaces the button with
   *Run a direction check* — the UI simply has no way to start a third narrow patch.
   If a brief or report exists with no logged decision, an *unfinished task* card
   offers to resume at the correct wizard step.

4. **Task wizard.** The five steps as stones on a dashed trace — define, approve,
   build, verify, decide — always visible.
   - *Define:* "What do you want to see?" in one text box with examples; live definer
     activity as a calm mono line; the brief rendered as formatted markdown.
   - *Approve:* the brief plus "Nothing is built until you approve this exact brief."
     Approving records the hash and shows the locked state. *Not yet* exits and keeps
     the brief on disk.
   - *Build:* a live activity feed — tool use as quiet mono rows, denied actions as
     amber `⊘ blocked` chips. Then the report, a done/stopped badge, and "Try it
     yourself" as its own card.
   - *Verify (optional):* offered by default after any STOPPED and every third task.
     The reviewer's verdict as a card, with a note that the report stayed locked
     until the reviewer formed its own view.
   - *Decide:* the five decisions as labeled buttons, the "what did you personally
     see?" one-liner, milestone moved? Then back to the dashboard, where the new
     stone drops onto the cairn with a spring.

5. **Settings** (light): theme, sound toggle (off by default), open project folder,
   version, links to the written guides.

## Visual identity

Cozy, in the Animal Crossing register, tuned by two decisions: colors go faded
pastel, and nature blends with technology. No mascots, no speech bubbles.

- **A place, not a program.** Soft washed sky, rolling pastel hills, drifting clouds;
  the cairn on the hillside is the log made visible. Day and night follow the system
  theme.
- **Quiet circuitry.** The technology reads as traces, not chrome: dotted trails with
  node dots, mono type for task numbers and live activity, wizard steps as stones on
  a dashed trace.
- **Round and chunky.** Large radii, pill buttons, cards on warm paper. A rounded
  typeface (Quicksand class) bundled with the app so Windows and Mac match.
- **Bouncy, rewarding motion.** The stone-drop on task close, a lock clicking shut on
  approval. One optional soft sound, off by default.
- **Cozy microcopy, unambiguous safety copy.** "A stone on your cairn!" is fine; the
  Approve button still says exactly what it does.

Palette and tokens port from `cairn.html`, desaturated toward the washed pastels
approved in the mockup. `cairn.html` itself stays as the web guide and later gains a
download link.

## Safety

All gates live in `core/`, behind the IPC boundary — the renderer cannot skip them.

- Approval writes the brief's SHA-256 to `docs/ai-work/tasks/NNN-approval.json`;
  `task:build` re-reads it and refuses if the brief changed by one byte.
- The reviewer never receives the builder's report until it states a provisional
  verdict.
- Forbidden actions (push, install, deploy, network, destructive commands) stay
  denied at the Agent SDK tool layer; every denial surfaces as an amber chip.
- The Direction Gate is computed from the log on every dashboard load.

## Error handling

Every failure state gets a plain-words card with one next step:

| State | Response |
|---|---|
| Claude not installed / not signed in | guided first-run screen, *Check again* |
| Folder isn't a Cairn project | explain; point to Project Conversion |
| Contract status isn't ACTIVE | "finish the conversion first" |
| Definer produced no brief | "nothing was approved, nothing will be built" |
| App quits mid-task | dashboard finds the orphaned files and offers resume |
| Brief edited after approval | build refuses; the mismatch is explained |

Raw stack traces go to `userData/logs/`, never the screen.

## Testing

- Core keeps and extends the existing gate/file tests, now covering the five-step
  flow against the mock engine, including resume-from-disk paths.
- The app gets a dev flag that runs the whole UI against the mock engine — the full
  loop click-testable offline in seconds.
- That same flag powers a few Playwright-for-Electron smoke tests: open project →
  run mock task → stone lands.
- Renderer components stay thin; logic worth testing lives in core.

## Shipping

- Electron Forge builds a Windows installer and a Mac DMG.
- A GitHub Actions release workflow (Windows + macOS runners) builds both on every
  version tag and attaches them to a GitHub Release — the Mac build comes from CI.
- v1 ships unsigned. SmartScreen and Gatekeeper will warn; the download page explains
  the extra click honestly. Code signing (Apple $99/year, a Windows certificate) is
  its own later task.
- No auto-update in v1. The app checks the GitHub Releases feed and shows a gentle
  "a newer version exists" note.

## Out of scope for v1

- Code signing and notarization
- Auto-update
- Linux builds (the architecture permits them later)
- API-key auth
- Sounds beyond the single optional stone-drop
