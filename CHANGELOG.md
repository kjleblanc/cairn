# Cairn changelog

The app and the contract share one version number, declared in
`CONTRACT-TEMPLATE.md` and the three package files. Changes are explicit local
work; they are never downloaded or activated silently.

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
