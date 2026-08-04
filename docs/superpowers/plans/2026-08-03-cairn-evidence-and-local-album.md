# Cairn Evidence and Local Album — Implementation Plan

**Task:** 173

**Plan:** 3 of 4 from `docs/superpowers/specs/2026-08-02-cairn-showing-not-asking-design.md`

**Decisions covered:** 1–4

**Execution base:** `58f8977ca69dd44ce093de726446e6df9bff6f2d`

**Lane:** B

## Outcome

A real worker run can leave a Cairn-owned before/after pair without asking the
owner to run a capture script. The pair leads the matching result card, one
control opens the same run in a local album, and the album can browse earlier
captures. No captures means no evidence section.

This plan deliberately photographs Cairn's own window. That is the product in
the current self-building milestone, and it is the only surface Cairn's main
process can capture without launching or trusting arbitrary project code. A
future capture adapter will be needed before Cairn can photograph an unrelated
web app or native program. The card captions say what was actually captured;
they never claim that a Cairn-window picture proves arbitrary changed code ran.

## The trust problem this plan must solve

`app/shots/` is ignored by Git, not protected from the worker. A worker can
write a plausible PNG and edit `manifest.json` without appearing in Git's
verification. Reading that file directly into the verified half of a result
card would reopen the exact authorship hole Task 165 closed for cards.

The answer follows `app/src/main/conductor/cardauth.ts`:

1. Cairn's main process owns `BrowserWindow.capturePage()`.
2. Main generates an opaque run ID. Project paths do not become evidence IDs.
3. Main writes each local PNG, records its SHA-256, dimensions, cue identity,
   and run identity in Electron `userData`, outside the selected project.
4. Album reads re-open and re-hash the file before returning bytes. A missing,
   linked, replaced, malformed, oversized, or moved file disappears fail-closed.
5. The authenticated result card carries only the opaque run ID. A worker
   claims object, path, filename, or manifest entry is never consulted.

The registry is not a secret and does not use an HMAC. The security boundary is
that the worker may read outside its workspace but cannot write Electron's
`userData`, the same boundary the existing card marker uses.

## Storage and compatibility

- On Cairn itself, new files go under ignored `app/shots/` so the existing
  local collection stays one collection.
- On another governed project, Cairn first proves `app/shots/` is ignored. If
  it is not, new files go under the already excluded `.cairn/evidence/` tree;
  capture must never dirty a project's Git status.
- The out-of-project registry is authoritative for card-visible evidence.
- The old `app/shots/manifest.json` remains a compatibility source for the
  album. Its inconsistent historical task values are normalized in memory.
  Those rows are labelled past review shots and never become verified card
  evidence because they predate custody markers.
- The legacy manifest may receive a best-effort compatible row for a new run,
  written atomically only when the old structure is readable. A corrupt
  manifest is preserved, never overwritten. The authenticated registry still
  lets the current card and album work.
- No image, clip, registry, or manifest is staged or committed.

## Run identity and event truth

`app/src/main/tasks.ts` creates `evidenceRunId` with `randomUUID()` when main
accepts a run. It travels in `RunSessionSnapshot`, then into the result card.
It carries no project path, provider data, prompt text, or credential.

Capture requests come only from the presentation reducer's keyed cues:

- the first real `Run / working` cue is the **before** picture;
- `Run / done` may become an album-only return/checking moment;
- the real terminal `done`, `stopped`, or `error` cue is the **after** picture.

The reducer gains a pending-capture queue built from the same additions that
drive motion. React polling, Strict Mode, cue timers, and reduced motion all
consume that one queue; none derives events again. Main independently checks
the submitted key against the current trusted session before capture, then the
registry de-duplicates the run/key pair. Repeated requests return the same
descriptor without a second screenshot.

Hydrating an already-finished run never replays historical capture. A very fast
run first observed after dispatch may have only an after picture; it gets no
pair and therefore no card section. Absence is more honest than manufacturing
a before state.

## Data shapes

Shared renderer-safe shapes are bounded metadata only:

```text
EvidenceCaptureRequest
  dir, runId, cue { key, kind }

EvidenceAlbum
  selectedRunId
  entries[] { runId?, taskNumber?, title, caption, trusted, images[] }

EvidenceImage
  id, role(before|after|moment), label, mime, width, height, trusted
```

The image method accepts an opaque image ID and returns one bounded data URL
only after main revalidates custody. Filesystem paths never cross preload.

`ResultCard.evidenceRunId` is optional on read for old persisted cards and null
for non-run/error/connection-required cards. `cardBriefing()` removes it before
building provider context. Evidence bytes, labels, paths, IDs, and local album
content therefore do not widen Task 172's conductor authorization. The phone
bridge may receive the harmless opaque field as part of the card, but receives
no evidence metadata or bytes; its card can say the pictures are on the PC.

## Implementation sequence

### 1. Pure custody store

Create `app/src/main/evidence.ts` with injectable roots and capture bytes so its
security rules are unit-testable without Electron.

- marker root set during bootstrap, fail-closed until set;
- canonical project key and per-project registry file;
- bounded v1 registry parser, atomic replacement, append-without-deletion;
- collision-free safe filenames and per-run/key de-duplication;
- PNG signature, byte, dimension, regular-file, link, containment, device/inode,
  and SHA-256 validation;
- legacy manifest parser with basename-only image references and strict caps;
- trusted pair selection: first before plus last terminal after;
- album merge: selected trusted run first, then trusted history, then legacy;
- opaque image lookup and revalidation before bytes leave main.

Tests go red first for worker path injection, symlinks/junctions, traversal,
replacement after attestation, hash mismatch, wrong project/run, duplicate cue,
oversize, invalid PNG, corrupt registry/manifest, and legacy rows never being
eligible for a verified pair.

### 2. One event source at every motion setting

Extend `town/presentation.ts` with pending evidence cues and one acknowledgement
function. The existing activity scan remains the only cue constructor.

- animated state queues motion and evidence together;
- reduced motion settles motion immediately but leaves the same evidence cue
  pending;
- acknowledging one cue is key-checked and idempotent;
- hydration has an empty pending queue;
- stale prefixes and repeated polls cannot requeue a consumed cue.

Extend `townpresentation.test.ts` before renderer wiring.

### 3. Main-owned capture and final card binding

- add the opaque run ID to the trusted session at acceptance;
- register bounded evidence IPC with the main window and current session lookup;
- validate project, run, worker identity, and cue against that session;
- call `capturePage()`, then hand only the resulting PNG bytes and dimensions to
  the custody store;
- finalize task number, outcome, disposition, and terminal timestamp when the
  envelope builds its card;
- put only the opaque ID on the card and preserve card-marker authentication;
- log capture failures without changing a run's DONE/STOPPED outcome.

Capture is additional evidence. It never rescues failed Git verification and a
capture failure never rewrites the run disposition.

### 4. Preload and renderer subscriber

Add three typed APIs:

- `evidenceCapture(request)` — renderer cue subscriber to main;
- `evidenceAlbum(dir, selectedRunId)` — bounded metadata;
- `evidenceImage(dir, imageId)` — one revalidated local image.

`Workspace` submits the first pending cue after React has painted it, waits for
the IPC result, and acknowledges that exact key. Failure is logged in main and
acknowledged so a two-second poll cannot hammer the disk forever.

### 5. Evidence-first result card and album

`ResultCardView` receives `dir` and loads only its authenticated run ID.

- pair directly after the card header and before verified text;
- side by side above 1260px, stacked at or below the existing 1260px rule;
- plain captions and useful alt text;
- `See every picture` opens the shared `Overlay` focused on this run;
- selected run first, earlier runs below, and historical unmarked entries carry
  a clear `past review shots` label;
- no pair means no section, no button, and no placeholder;
- data URLs live only in mounted image components and are never persisted;
- reduced motion removes image/overlay transitions but changes no final state.

The album does not depend on the lab server or `app/lab/shots.html`.

### 6. Provider and phone containment

- `cardBriefing` deliberately omits `evidenceRunId` and all local evidence;
- store validation accepts old cards without the optional field and rejects a
  malformed present field;
- bridge tests prove no data URL, filename, caption, or path enters snapshots;
- phone copy points to the computer when a card has local evidence, without an
  image endpoint or implicit LAN data widening.

### 7. End-to-end proof

Use the existing fake conductor and fake worker. Add a focused flow that:

1. starts a real routed fake run in the conversation;
2. lets the keyed dispatch cue produce one before capture;
3. lets terminal truth produce one after capture;
4. shows the pair first on the matching card;
5. opens the album on that run and reaches a seeded past row;
6. repeats refresh/Strict Mode observations and proves only one file per cue;
7. replaces a captured file and proves it disappears rather than rendering;
8. supplies an image-looking worker claim and proves it remains claims text;
9. runs at 1320×820 and 760×620, including reduced motion.

Both machine app-token locations are held for every Electron run. The test uses
an isolated profile and fake providers only.

## Verification

Run serially where build outputs overlap:

1. `cd app && npm.cmd run typecheck`
2. `cd app && npm.cmd run test:unit`
3. `cd app && npm.cmd run build:vite`
4. `cd app && npm.cmd run build:lab`
5. focused evidence Playwright with both app-token directories held
6. full `npm.cmd run test:smoke`, compared with Task 171's proved three-failure
   baseline; no new failure is accepted
7. `cd core && npm.cmd test`
8. `git diff --check`
9. exact diff, ignored-file, registry-custody, process, and final status audit
10. inspect wide, narrow, and reduced-motion captures by eye

## DONE boundary

DONE means a main-owned, revalidated pair leads only its own authenticated
result card; no pair produces no chrome; the album opens on that run and keeps
trusted and historical evidence honestly distinct; cue replay, worker files,
provider context, phone transport, Git status, and reduced motion all remain
inside their stated boundaries.

If a meaningful product screenshot requires launching arbitrary changed code,
this plan stops rather than doing so implicitly. That future capture adapter is
a separate capability and a separate risk review.
