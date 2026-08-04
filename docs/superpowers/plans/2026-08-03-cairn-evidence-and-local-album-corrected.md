# Cairn Evidence and Local Album (Corrected) — Implementation Plan

**Task:** 173

**Supersedes:** `2026-08-03-cairn-evidence-and-local-album.md`

**Why corrected:** an independent pre-implementation review found that the
first plan could label an already-started worker view “before,” could put
conversation/other-project pixels where a later worker could read them, and
could post the card before its terminal image existed. Those are trust defects,
not polish. No product source had been wired when they were found.

## Exact Task 173 slice

Task 173 delivers the first complete, independently useful evidence slice:

- a main-owned still immediately before a real worker starts;
- a main-owned still immediately after that worker settles;
- one or both pictures first on the matching authenticated result card;
- a local album opened on that run, with earlier trusted runs and legacy review
  shots available behind it;
- no picture, no evidence section.

It does not pretend to complete two later data problems:

- Decision 1's source-marked “What you asked for” section needs Decisions 5–6,
  which the governing spec itself assigns to Plan 4. Task 173 does not invent
  attribution data before that plan exists.
- A meaningful motion clip requires a trusted way to launch and drive the
  changed product after the worker exits. Automatically executing arbitrary
  changed project code would be a new risk boundary. Task 173 stores and shows
  stills only; a capture-adapter task must solve clips rather than calling a
  Cairn-shell recording proof of an unrelated product's motion.

The visible Task 173 outcome remains the committed brief's before/after card and
album. The report names these two deliberate limits instead of claiming all of
Decisions 1–4 are exhausted.

## Correction 1 — the pictures never enter the selected project

All new trusted media and metadata live below Electron `userData`:

```text
userData/
  evidence/
    <project-sha256>/
      <run-uuid>/
        record.json
        <capture-uuid>.png
```

This is local, app-owned, and outside every project. A worker running with
workspace-write can read broadly outside its workspace, so this is not treated
as a secrecy boundary; the safety property is that Cairn never copies owner
conversation pixels into a worker-readable project path and the worker cannot
write the record or image files.

`app/shots/` remains untouched protected local history. Its manifest is parsed
strictly and shown only as **past review shots**, never as checked evidence.
Task 173 does not copy, migrate, rewrite, or append that manifest. This is the
smallest safe correction to the brief's storage assumption; the final report
must name it.

Per-run records avoid one ever-growing bounded registry. Each record has a hard
eight-image cap and atomic replacement; album reads page/sort independent run
directories. Keeping more runs creates more bounded records rather than one
file that eventually refuses the owner's history.

## Correction 2 — “before” is before worker execution

Presentation cues remain the sole arbiter of **motion**. They are not a safe
pre-work barrier: Core emits `Run / working` immediately before calling the
adapter, while renderer polling and `capturePage()` are asynchronous.

The envelope already owns a stronger boundary. In `task:run`, after route and
approval validation but before `runSerialTask` can invoke an adapter, main:

1. creates the opaque evidence run ID;
2. captures the selected project's `.workspace-stage` rectangle;
3. records it with role `before` and boundary `worker-not-started`;
4. only then calls the serial runner.

No worker process exists during that capture. The label therefore says exactly
what holds: **Before — the worker had not started.** It does not claim the
picture depicts an arbitrary target program.

The rectangle is obtained from the already-loaded trusted renderer with a
constant DOM query and validated against the BrowserWindow's content bounds.
If the selected-project stage cannot be proven, capture is skipped. The app
never falls back to a full-window shot containing the project rail.

## Correction 3 — terminal capture completes before the card

After the serial promise settles, the worker is gone (or its close is the
envelope's reported failure). Before composing/posting the card, main:

1. publishes/refreshes terminal runtime state;
2. waits at most two animation frames for that state to paint;
3. captures the same validated selected-project rectangle;
4. records role `after` with the actual DONE/STOPPED/ERROR boundary;
5. finalizes run metadata;
6. composes the card with the opaque run ID and posts it.

Capture is bounded by a short timeout and caught separately. Failure never
changes DONE to STOPPED, delays records, or suppresses the card. Because the
attempt finishes before posting, the first card load sees the final available
set; no evidence-change race or polling protocol is needed.

Connection-required and offline-demo closes get no trusted evidence. A thrown
run may carry its pre-work image and, if terminal capture succeeds, its error
image; error cards therefore keep the run ID too.

## Correction 4 — one honest picture is still evidence

The card section appears when the authenticated run has at least one valid
capture:

- before + after: the approved pair;
- before only: one full-width figure, labelled as pre-work only;
- after only: one full-width figure, labelled as terminal only;
- zero: no section, control, or placeholder.

This follows the owner's concrete Decision 2 rule: presence depends on whether
captures exist, not whether a complete pair happened to survive.

## Custody and serving

- Main accepts raw PNG bytes from `BrowserWindow.capturePage()`, never a path
  supplied by renderer, worker, manifest, or claims.
- Each per-run record binds canonical project key, opaque run ID, boundary,
  SHA-256, byte length, dimensions, media ID, and timestamp.
- New files use create-only names. Record replacement is atomic.
- Reads require a regular non-link file under that exact run directory and
  revalidate identity, PNG signature, size, dimensions, and hash from one open
  descriptor before returning one data URL.
- A changed, missing, linked, malformed, or oversized file disappears.
- Renderer receives bounded metadata plus opaque media IDs. No path crosses
  preload.
- `cardBriefing()` removes `evidenceRunId`; no evidence ID, caption, metadata,
  path, or bytes enter a conductor request under Task 172's consent.
- The phone snapshot carries at most the opaque card field and a plain “open on
  the computer” sentence. It receives no album metadata or image bytes.

## Source sequence

1. Pure per-run evidence store and adversarial unit tests.
2. Optional `evidenceRunId` on sessions/cards plus strict persisted-card shape.
3. Main pre-worker/terminal capture coordinator with injectable capture seam.
4. Album and one-image loader IPC in preload; no renderer capture IPC.
5. Evidence-first card section and accessible album overlay.
6. Wide/narrow/reduced-motion styles using only the existing 1260px breakpoint.
7. Fake-only E2E: two captures, one-capture degradation, wrong-run/worker-claim
   exclusion, album selection/history, reload persistence, and file replacement.
8. Full checks, real legacy-manifest fixture compatibility, and visual review.

## DONE boundary

DONE means the worker has provably not started at the before boundary; the
terminal attempt finishes before the authenticated card is posted; every shown
new image revalidates against app-owned per-run custody; one surviving capture
still shows honestly; legacy/worker files never enter the verified section;
no evidence data reaches provider or phone; Git status stays untouched; and the
wide, narrow, and reduced-motion views hold.

Task 173 will not claim that a picture of Cairn proves an unrelated product ran,
that motion clips exist, or that Plan 4's attribution data exists.
