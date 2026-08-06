# Task 194 brief — private commentary, paper next steps

**Lane:** E

**Base commit:** `f04e5fd4e7aec93b43e41e3978d70eeafcd54d4d`

**Synced main base:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

## Requested visible outcome

Continue the approved visual overhaul at the handoff after a result. While
Cairn's short comment is still forming, its private follow-up control must never
flash as backticks, a protocol label, JSON, or suggestion text. Once the comment
settles, the optional next steps should arrive as a shallow cyan-ruled paper
annotation with flat, readable note rows rather than dashed pill buttons.

The annotation must feel quiet at wide and compact sizes, keep a 140-character
suggestion inside the lantern, show unmistakable keyboard focus, and return
focus to the composer after a suggestion is successfully sent as the owner's
ordinary message.

## Boundary of intent

- This slice changes safe streaming presentation, follow-up parsing hardening,
  follow-up markup, styling, and keyboard continuity only. Preserve the
  commentary call, ordinary owner-message send path, latest-turn-only rule,
  persisted authenticated turn, validation limits, exact-once behavior, and
  the rule that suggestions are never dispatch or approval authority.
- Keep parsing from the untouched provider response while every public live,
  reattached, reloaded, and bridge-facing streaming view uses one sanitized
  text projection. Ordinary Markdown, unrelated code fences, and lookalike
  labels must remain visible.
- Multiple, malformed, invalid, or unterminated recognized follow-up blocks
  may never create controls or leak raw protocol; settled prose must survive.
- Keep native buttons and the accessible suggestion group. If a send fails and
  the chosen suggestion remains, its focus must remain available; only a
  successful send moves focus to the composer.
- Add no dependency, provider/model/worker call, credential use, external
  service, storage schema, IPC contract, dispatch change, authority change,
  project fact, milestone change, or redesign of ConnectCard, TaskRun, result
  receipts, publication checkpoint, or the outer lantern.
- Do not touch or land into main's protected Task 180/183 work. Executable
  evidence may use only the existing fake conductor, offline worker, temporary
  project, and local fixtures; it must not contact a real provider or remote.

## Checks

1. Add red-first parser/stream contracts covering every partial exact fence,
   a complete valid block, malformed JSON, duplicate and unterminated blocks,
   ordinary lookalikes, unrelated fenced code, settled prose, and monotonic
   public streaming output with no private-fragment leak.
2. Add red-first renderer contracts for a shallow ruled annotation, flat
   full-width paper rows, registration marks, wrapped long text, practical
   targets, 2px keyboard focus, compact containment, restrained arrival, and
   final reduced-motion precedence.
3. Extend the existing fake-conductor Electron follow-up journey to hold after
   the private control chunk, prove live and reloaded streams stay clean, then
   prove validated rows, keyboard order/focus, long-text containment,
   exact-once ordinary send, removal, composer focus, persistence, and reload.
4. Run focused checks, the full App unit suite, typecheck, production Vite
   build, and Lab build. Run the Electron journey only under both app locks with
   `CAIRN_TEST_LANE=1`, using no real provider, worker, or network remote.
5. Capture and inspect safe-stream, wide, compact, and keyboard-focus evidence;
   inspect the real diff, exact-path custody, final Git status, and main's
   unchanged protected state; obtain the owner's visual judgment before
   recording completion.

## DONE / STOPPED

**DONE** means no public streaming surface can reveal the private follow-up
protocol; valid settled suggestions read as quiet paper notes at wide and
compact sizes; send, persistence, reload, focus, accessibility, containment,
motion, builds, units, and guarded fake-only Electron evidence pass; the owner
accepts the result; and the implementation, report, log row, and one isolated
Lane E commit are complete.

**STOPPED** means private protocol is still visible, the paper-note outcome or
any preserved send/storage/authority/accessibility behavior does not hold, the
guarded evidence cannot run safely, the owner rejects the visual result,
protected work changes unexpectedly, or the task reaches a concrete risk
boundary outside this brief.
