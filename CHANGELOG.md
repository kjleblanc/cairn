# Cairn changelog

The app and the contract share one version number, declared in
`CONTRACT-TEMPLATE.md` and the three package files. Changes are explicit local
work; they are never downloaded or activated silently.

## 0.3.0 — the whole task, in one conversation — 2026-07-25

- Closed a record hole on the throwing path. Only the clean close verified
  records, so a worker that forged a log row and then forced the run to throw
  could leave that row standing. Every `RECORD_VERIFICATION_FAILED` throw now
  restores the log Cairn last verified, reads the restore back, and says so in
  the thrown message when the restore itself could not be written. Quitting
  became a real gate too: while the app drains its quit grace period, a new
  task request is refused instead of starting a worker the quit is about to
  kill.
- Added the owner data channel. The adapter task contract bumped to
  `cairn-serial-task/v2` with a `details` field that carries the owner's own
  specifics — numbers, names, exact wording — verbatim from chat into the
  brief and the worker's prompt. The integrity digest binds outcome and
  details together, so a tampered `details` is refused exactly as a tampered
  outcome always was, and the paid-call authorization gate re-derives its
  disclosure from both parts. The reason is a failure this project watched: in
  the first milestone run the owner supplied three word counts, the proposed
  task dropped them, and the worker invented plausible replacements rather
  than saying it had none.
- Moved dispatch into the conversation. A proposed task is now confirmed and
  started where it was discussed — the paid-call confirmation and its six
  facts are inline, the run request is one object threading all four app
  gates, and the old navigation to a separate preview screen is deleted. The
  run stays in view: a status strip carries its stage, clock, stop control and
  terminal line, the composer says why it is closed, and a reload reattaches
  to the same run rather than orphaning it.
- Added the envelope-authored result relay. Every closed run now carries the
  report's own structured truth — Git-derived file lists, verified
  protected-work findings, and one shared paid-call predicate — so the card
  and the report cannot disagree. A third conversation role posts a result
  card for every terminal state, built from that record rather than from any
  model, with Git-derived facts kept visibly separate from the worker's own
  claims. The conductor then takes exactly one short comment turn on the card,
  skipped in full when no body is connected and never started while the app is
  quitting. A Git failure while composing the safety close's record no longer
  escapes as a raw error: it restores Cairn's log and closes
  `RECORD_VERIFICATION_FAILED`, so no worker-forged row survives a thrown run.
- Added the push button and the pause in front of it. When a verified DONE
  card sits on a project whose local commits are ahead of the remote, a chip
  offers to publish them. Pressing the chip only opens the contract's pause:
  Cairn re-reads git and shows the exact remote, branch, commit subjects,
  publication effect and recovery plan, and the press there is the one
  approval that runs one plain push — never retried, never forced. The main
  process bounds the push independently of the screen that asked for it: git
  accepts a URL wherever a remote name goes, so a target this project has not
  configured as a remote is refused, and both halves of the refspec are
  shape-checked, since a caller-supplied `+<sha>` really did force a rewind
  and an empty head really did reach git as a branch deletion. Failures are
  classified honestly — no remote, sign-in, remote-ahead, other — and a
  refusal for a legal branch name says the limit is Cairn's rather than
  blaming the project.
- Added a second constitution for the conductor, three rules written from
  failures this project watched happen: carry what the owner supplies into
  the task's details verbatim and never invent values; never attribute to a
  source a fact that source cannot contain, since the briefing holds records,
  a git summary and file names but never file contents; and state a result
  fact only with the card or the records in view, naming which. The contract
  takes its one revisit of the phase. An envelope-dispatched run has Cairn's
  runtime author the report and log row from its own verification plus the
  worker's claims — an AI working directly under the contract still writes
  its own, unchanged. The connected-conductor section now names the result
  card and the conductor's one comment turn, says that turn costs like any
  other, and names the push button while every push still waits on the
  owner's approval of that exact action. The connect card says the same about
  the comment turn before the owner ever connects.
- Said plainly what a stone counts. A stone is a DONE row whose
  `Milestone moved?` column says YES, and in an envelope-dispatched run that
  column carries the worker's claim — Cairn verifies records, protected paths
  and the commit, but only the owner can see a milestone move. The mechanism
  is unchanged and no existing record was touched: the contract now states
  that the column is a claim rather than Cairn's verification, and the two
  screens that show the count as a figure say the same in one plain line. A
  claim recorded honestly is still worth recording; it is now labelled as one.
  A result card that was copied into the conversation file also renders once
  rather than twice — authorship already stopped a worker manufacturing a
  card, but a byte-identical replay of a genuine one could be shown, and
  briefed to the conductor, twice.
- Added no dependency.

## 0.2.1 — CI tells the truth — 2026-07-24

- Fixed the root-identity gate so it compares real directories, not
  spellings: `snapshot()` and the Codex workspace-containment check now
  canonicalize both sides (8.3 short names, symlinks, junctions) before
  comparing, with a fail-closed fallback when the filesystem cannot answer.
  GitHub's Windows runners address the temp directory through an 8.3 short
  name, so every serial test that reached the gate failed
  `PROJECT_ROOT_MISMATCH` on CI while passing locally; the same fix covers
  a project opened through any aliased spelling. A firing gate now names
  all four compared spellings instead of a bare code.
- Killed the CI hang: the overlapping-run test's adapter-entry wait spun
  immediates forever when the watched run threw before reaching its
  adapter, holding the test process open until GitHub's six-hour job kill
  (all three `ci` runs to date died that way). The wait now fails fast when
  the run settles early, and both workflows carry job timeouts (`ci` 20
  minutes with a supersede-on-push concurrency group; `release` 45 minutes
  per matrix leg) so no future wedge can burn hours again.

## 0.2.0 — the envelope holds the pen — 2026-07-24

- Added a watchdog and an honest stop path: a wedged worker (default 600 000 ms
  inactivity, 3 600 000 ms absolute) is killed as a whole process tree — on
  Windows through an absolute-path `taskkill /PID <pid> /T /F`, on POSIX by a
  `SIGKILL` to the child's own process group (the child is spawned detached to
  lead that group) — and closes as `ADAPTER_TIMED_OUT`, naming the cost already
  spent instead of hanging forever. If the kill cannot be confirmed (the child
  never closes), the run lock is deliberately left in place rather than handing
  the next task a workspace a live orphan may still be writing. The owner can
  also stop a running worker
  directly — a "Stop this task" control reaches the same adapter seam and
  closes as `CANCELLED_BY_OWNER`, again naming the already-spent cost and
  writing no product change. Quitting the app while a task is running now
  asks first ("Stop the task and quit" / "Keep running") instead of silently
  abandoning a paid, still-running process.
- Added a cross-process run lock (`cairn-run.lock` in the Git common
  directory, never the project worktree and never `.git/cairn`) so "one task
  at a time" holds even across separate app or CLI processes; a stale lock
  from a crashed process is re-verified immediately before being cleared, which
  defeats every realistic race — a microsecond residual window remains (Node has
  no atomic compare-and-delete) and is contained downstream by the envelope's
  protected-work and exact-path staging checks.
- Added run-reattach: the main process now owns live run state, so navigating
  away from a running task and back, or reloading the window mid-run, no
  longer orphans the worker — the screen reattaches to the same run, names
  the real lane it is actually running in, and shows the same verified result
  once it closes.
- Moved task-record authorship from the worker to Cairn. A worker now ends its
  final message with one fenced `cairn-claims` JSON block instead of writing
  `docs/ai-work` files itself; Cairn parses that block fail-closed and
  authors the report and log row from the worker's claims plus its own Git
  verification. `MODEL_RECORDS_MISSING` is retired in favor of
  `WORKER_CLAIMS_MISSING` (no fence, or a malformed one, stops the task
  honestly before any commit). Every composed report keeps the worker's own
  words blockquote-quarantined so worker text can never forge a structural
  disposition, milestone, or log line. Stated plainly: Cairn now retains the
  worker's final message across the run (for claims verification) in
  addition to the existing bounded counts — previously no item text was
  retained at all, and the report's own privacy sentence says so honestly.
- Added the universal worker-result contract: one result shape, one error
  family, and one disclosure seam that every worker adapter returns through,
  replacing the Codex-specific result and validator with a single
  `validateWorkerResult`. Proven by a synthetic fixture adapter in the test
  suite that reaches a verified DONE result with no changes to the envelope
  code at all — the shape future adapters (a different model, a different
  runner) will need is already load-bearing today.
- Added no dependency.

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
