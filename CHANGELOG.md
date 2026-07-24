# Cairn changelog

The app and the contract share one version number, declared in
`CONTRACT-TEMPLATE.md` and the three package files. Changes are explicit local
work; they are never downloaded or activated silently.

## 0.1.2 — connecting is one paste — 2026-07-24

- Added a one-paste default to the connect card: paste an OpenRouter key and
  connect — the provider base URL and model are already set to Cairn's
  curated starting pick, so the base URL and model fields no longer show
  until asked for. The consent checkbox and its text, and the gating that
  requires a checked box, a non-empty key, and a non-empty model before
  Connect enables, are unchanged.
- Added a small curated picker behind "Choose a different brain": three
  models (`app/src/renderer/bodies.ts`) — Kimi K2 (the starting
  recommendation, labeled honestly as not yet evaluated), DeepSeek V3.1, and
  GPT-5 Mini — each with a plain-language blurb naming a rough cost feel.
  "Custom…" reveals the free-text base URL and model fields exactly as
  before (also where a local Ollama URL will go later).
- Added an in-app key walkthrough behind "Where do I get a key?": four
  plain-language steps (create an account, add a few dollars of credit,
  create a key on the Keys page, paste it here) ending with an honest cost
  note, plus a button that opens openrouter.ai/keys directly. The main-
  process `openExternal` allowlist gained the `https://openrouter.ai/`
  prefix so that button can open.
- Added no dependency.

## 0.1.1 — the disclosure tells the whole truth — 2026-07-23

- Fixed an under-disclosure: the conductor's briefing has always sent a git
  summary (branch, clean/dirty, the last five commit titles) as part of what
  Cairn reads each turn, but neither the connect card's data-scope text nor
  the contract's "The connected conductor" section named it. Both now say so
  plainly, so the standing consent the owner gives actually names everything
  that flows.
- Fixed a worktree hazard: connecting and chatting used to write `/.cairn/`
  into the project's own `.gitignore` on the first send — a tracked-file
  change that made the project look "dirty" the moment chat started, which
  can make a later task's exact-path commit skip itself the same way Tasks
  010/011 recorded. The exclusion now lives in `.git/info/exclude` instead:
  same one-line, append-once guard, but per-clone and never tracked, so
  chatting with Cairn never dirties the owner's worktree.
- Fixed a false failure message: a conversation that grows large enough used
  to eventually hit the provider's own context-length error, which Cairn
  reported as "trying again in a moment usually works" — untrue, since
  retrying resends the same oversized request. Cairn now recognizes an
  oversized conversation itself, before ever calling the provider, and says
  so in plain words: start a new conversation, since the project's own
  records — not the chat history — are what it relies on anyway.
- Fixed a hang: a hand-edited or corrupted `conductor.json` with an
  unparseable provider address used to make the status check throw instead
  of returning, which could leave the home screen stuck instead of showing
  the connect card. A connection file that does not parse now reads the same
  as "not connected," same as every other malformed-file case already did.
- Added no dependency.

## 0.1.0 — the connected conductor — 2026-07-23

- Added the conductor: an optional connected conversation model that reads
  the project's real records (contract facts, `PROJECT.md`, the work log,
  recent briefs and reports, a git summary, and the file tree by name) and
  talks with the owner in the chat screen, which is now the app's home view
  for a governed project — Dashboard stays one click away. The conductor
  cannot read file contents, cannot use tools, cannot touch git, and cannot
  dispatch a task on its own; when it proposes one well-scoped task, the
  owner still opens today's existing route-preview-disclosure-run path and
  presses the dispatch button.
- The connection itself is one standing authorization, given once on a
  connect screen naming the provider, the model, exactly what may flow
  during conversation, and the pay-as-you-go cost basis; while connected, a
  visible pill names the provider and model and conversation proceeds
  without a per-message prompt. Every other boundary keeps confirming per
  action regardless: each worker dispatch, each paid worker call, and every
  concrete-risk action still waits for its own approval, and a risk the
  conductor raises rides the proposed task as a chip the owner must answer
  or knowingly set aside before it can be sent. The owner can revoke the
  connection at any time, which deletes the stored credential immediately.
- The provider key is encrypted with Electron's `safeStorage` and held only
  in the main process — the renderer, the conversation log, and Cairn's own
  logs never see it, and a provider failure (bad key, no credit, model gone,
  network down) reaches the owner in plain words with a reconnect path,
  never a raw status code.
- Added the contract's own `## The connected conductor` section describing
  this boundary, mirrored across `AGENTS.md` and the `cairn.html` embed, and
  the amendment lands with this same version bump so the contract never
  trails the capability.
- A fake-body Playwright suite (`app/tests/conductor.spec.ts`) proves the
  whole loop offline — connect, converse, the proposed-task card with a risk
  chip, offline dispatch through the unchanged serial path, disk
  persistence across a relaunch, and honest failure copy — against a
  scripted local server, never a real provider or real spend.
- Added no dependency: the conductor speaks the OpenAI-compatible
  `chat/completions` API over the platform's built-in `fetch`, and the key
  store uses Electron's existing `safeStorage`.

## 0.0.5 — a phantom-dirty start no longer skips a task's commit — 2026-07-23

- Fixed the start-side twin of the 0.0.4 fix: `git status` can report a file
  as modified on stat or line-ending differences alone (identical content,
  e.g. a CRLF working copy over an LF index), and `git update-index
  --refresh` does not clear that state. Counting the phantom as a dirty start
  made a verified DONE task skip its own exact-path commit (Task 010), and
  the uncommitted work then stopped the rerun with PROTECTED_WORK_CHANGED
  (Task 011). A worktree-modification entry now counts toward the starting
  state only when a content diff confirms it; staged, untracked, renamed,
  and deleted entries still count as real work, so a genuine dirty start
  still skips the commit and still protects owner work byte for byte.
- Added no dependency, retry, fallback, or scheduler.

## 0.0.4 — a successful commit is never relabeled STOPPED — 2026-07-23

- Fixed a torn result: when Cairn committed verified model work, a
  post-commit whole-tree cleanliness check could still fail on a file that
  was dirty by stat alone (identical content, e.g. a CRLF working copy over
  an LF index), overwriting the just-committed DONE records with STOPPED.
  This mislabeled the first real milestone (Task 006), whose commit was
  correct. A confirmed exact-path commit — proven by pre-commit staging
  checks plus post-commit ancestry and single-commit count — is now reported
  DONE and never re-evaluated against whole-tree state.
- Added `.gitattributes` normalizing text line endings so tracked files stop
  producing phantom stat-only modifications on Windows checkouts.
- Added no dependency, retry, fallback, or scheduler. Genuine unexpected
  changes are still caught before the commit is made.

## 0.0.3 — stopped runs keep their evidence — 2026-07-23

- A real Codex Exec run now streams its full JSONL output and stderr to a
  local debug file under `%LOCALAPPDATA%\Cairn\debug\` (system temp
  fallback), with credential-shaped tokens redacted. The files live outside
  every project, are never committed, and belong to the owner's own disk.
- Process failures carry precise codes instead of one opaque rejection:
  spawn and stdin failures are named, and a stopped task's activity and
  safety report include the code and the debug file path.
- An oversized output line no longer kills the run: it streams to the debug
  file in full and is skipped for parsing, and the task continues to its
  honest terminal event. The first milestone attempt (Task 004) stopped with
  an undiagnosable bare ADAPTER_FAILED; this release makes that class of
  stop diagnosable from its own evidence.
- Added no dependency, retry, fallback, scheduler, or sandbox change.

## 0.0.2 — Codex Exec can actually write — 2026-07-22

- Applied Task 002's proven invocation: the non-interactive call now uses
  approval policy `never` (an `on-request` policy had every write rejected
  because exec mode has no user to ask), configures the elevated Windows
  sandbox explicitly so `workspace-write` is not silently read-only, and
  upgrades the helperless PATH launcher stub to Codex's versioned install,
  whose directory joins the child PATH so sandbox helpers can launch.
- Sealed the core and app test fakes so they can never resolve a real Codex
  install: fake installs carry their own sandbox helper marker and tests run
  against an empty LOCALAPPDATA. Before the seal, the new resolution let
  unmodified app tests start real Codex processes during one development
  test run; the seal makes that structurally impossible.
- Added no dependency, retry, fallback, scheduler, login flow, or sandbox
  widening. The one-call owner confirmation and credential-opaque readiness
  probes are unchanged.

## 0.0.1 — formal reset — 2026-07-22

- Gave the app and the contract one shared version number and restarted the
  count at 0.0.1. The earlier "Contract vN.N" numbering (v1.0 through v3.0) is
  a retired scheme, so 0.0.1 is a fresh start, not a downgrade.
- Rewrote the contract from scratch: outcomes get verified rather than
  paperwork, briefs state a boundary of intent rather than a file whitelist,
  reviews are advisory, large work gets a written plan first, and two stopped
  attempts at one goal force a step-back diagnosis.
- Rewrote the front door: README absorbed Getting Ready, and Everyday Workflow
  absorbed High-Stakes. The contract holds the single canonical risk-boundary
  list.
- Moved all pre-reset docs, task records 000–047, the work log, and the pilot
  table to `docs/legacy/`, unmodified, and pinned the pre-reset state at git
  tag `legacy-v3.0`. Task numbering restarts at 001.
- Pre-reset version history:
  [docs/legacy/CHANGELOG-pre-reset.md](docs/legacy/CHANGELOG-pre-reset.md).
- Changed no product behavior.
