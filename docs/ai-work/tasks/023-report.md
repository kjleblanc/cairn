# Task 023 — Report

What changed:

- Created `app/src/main/conductor/keystore.ts` (69 lines): `encryptionAvailable()`
  wraps `safeStorage.isEncryptionAvailable()`; `readConnection()` reads and
  validates `userData/conductor.json` (a malformed or missing file reads as
  "not connected", never throws); `saveKey(baseUrl, model, apiKey)` encrypts
  with `safeStorage.encryptString` and persists `{ baseUrl, model, keyB64 }`;
  `updateModel(model)` rewrites the model field only, leaving the encrypted
  key untouched, and reports whether there was a connection to update;
  `clearConnection()` deletes the file (missing file is not an error);
  `decryptedKey(conn)` is the only place the key is turned back into plain
  text, and only ever called from inside `service.ts`.

- Created `app/src/main/conductor/service.ts` (179 lines): `conductorConsentCard`
  builds the disclosure card with the two owner-facing strings copied
  verbatim from the brief; `sameCard` does the field-by-field comparison;
  `connect` is the dispatch-gate — it re-derives the card from
  `request.card.baseUrl`/`model`, refuses with the fixed
  `CONDUCTOR_CONNECT_NOT_AUTHORIZED` on any field mismatch or
  `consentConfirmed !== true` (no log write for that expected decline,
  mirroring `tasks.ts`'s `SERIAL_RUN_ACTIVE`/`REAL_MODEL_CALL_NOT_AUTHORIZED`
  early returns), then checks `encryptionAvailable()` and fails with the
  exact plain copy "This computer cannot store the key securely, so Cairn
  did not save it." before ever calling `saveKey`. `status()` returns
  booleans/strings only. `send()` is the other gate: refuses
  (`SERIAL_RUN_ACTIVE: …`) when `isTaskRunning(dir)` is true, refuses when a
  stream is already active for that dir (a second AbortController would
  orphan the first), refuses when there's no stored connection, then persists
  the owner turn, opens one `AbortController` per dir, and returns
  `{ conversationId }` immediately while `runStream` continues in the
  background. `runStream` builds
  `[system: CONSTITUTION, system: assembleBriefing(dir), …turns]`, streams
  via `streamChat` forwarding each delta, and on completion calls
  `extractTaskBlock`, persists the cairn turn (raw text + usage), and emits
  `{kind:"done", turn, taskBlock}`. On abort it persists the partial text
  with the trailing `\n\n(stopped early)` marker and emits
  `{kind:"error", message:"Stopped."}`; on `ConductorHttpError` it emits
  `{kind:"error", message: err.ownerMessage}`; any other error is logged via
  `log.ts` (never the raw text) and a plain-words delta is emitted instead.
  `stop(dir)` aborts the controller; the stream's own `finally` clears it.

- Modified `app/src/shared/ipc.ts`: added `ConductorStatus`,
  `ConductorConsentCard`, `ConductorConnectRequest`, `ConductorSendRequest`,
  `ConductorDelta`, `ConductorConversationSummary`, and extended `CairnApi`
  with `conductorStatus/Connect/Disconnect/SetModel/Send/Stop/Conversations/
  Turns` and `onConductorDelta`.

- Modified `app/src/main/ipc.ts`: added `registerConductorIpc()` registering
  all eight `conductor:*` channels in the file's existing
  `handle(channel, (event, payload) => Result<T>)` style (`toResult` for the
  plain-throw handlers; `connect`/`send` forward the `Result<T>` their
  service functions already return, since those two have "expected decline"
  paths that must not be logged as errors). `conductor:send`'s handler
  captures `event.sender` and passes `(delta) =>
  event.sender.send("conductor:delta", delta)` into `service.send` — the
  push channel is scoped to the sender's webContents without needing a
  `BrowserWindow` getter threaded in from `main.ts`.

- Modified `app/src/preload.ts`: exposed all nine
  `window.cairn.conductor*`/`onConductorDelta` bindings, `onConductorDelta`
  mirroring `onTaskActivity`'s listener/unsubscribe shape exactly.

- Modified `app/src/main/tasks.ts`: the running-set (`running`) was not
  exported. Added the smallest possible helper,
  `export function isTaskRunning(dir: string): boolean { return
  running.has(dir); }`, directly below the set's declaration, so
  `service.send` can share the one running-set instead of tracking its own.
  No other change to `tasks.ts`.

Deliberate scope decision — `registerConductorIpc()` is not called from
anywhere yet. The brief's file list for this task is `keystore.ts`,
`service.ts`, `shared/ipc.ts`, `ipc.ts`, `preload.ts` (plus `tasks.ts` for
the disclosed helper); it does not include `main.ts`, and the plan's Task 7
(repo Task 024) explicitly owns wiring the conductor feature into `main.ts`
behind a `CAIRN_CONDUCTOR=1` flag "the same way `CAIRN_MOCK` reaches the
app." Registering it unconditionally here would pre-empt that flag gate.
The function is written, typechecks, and is ready for Task 024 to call; until
then nothing it defines is reachable, matching the task's "nothing
user-reachable changes" hard rule.

Checks run (all real, from this session, in `app/`):
- `npm run typecheck` — clean, no errors.
- `npm run test:unit` — 37 tests, 37 pass, 0 fail (unchanged; no new unit
  tests were added or required for this Electron-bound code).
- `npm run build:vite` — all three bundles (main, preload, renderer) built
  cleanly; `main.js` grew from prior size to 50.40 kB (the new conductor
  module is bundled but dormant).
- `npm run test:smoke` — the full Playwright suite, 13/13 passed (away,
  projects ×3, routing ×6, serial, smoke).

How to try it: nothing is user-reachable yet (no renderer edits, and
`registerConductorIpc()` isn't called from `main.ts`). To exercise it
directly, a Node script or future Playwright test can import
`app/src/main/conductor/service.ts` inside an Electron main context and call
`connect({ card: conductorConsentCard(baseUrl, model), apiKey, consentConfirmed: true })`,
then `send(dir, null, "hello", onDelta)` against a real or mocked
OpenAI-compatible endpoint.

Limitations:
- Behavior coverage (a real connect/send/stop round trip exercised through
  the running app) arrives with Task 026's Playwright suite, as the plan
  anticipates; this task is verified by typecheck, unit tests, and build
  only, plus the untouched existing smoke suite proving nothing regressed.
- `registerConductorIpc()` is dead code until Task 024 wires it into
  `main.ts`; this is intentional (see scope decision above) but means a
  reviewer running the app today will not see any conductor channel
  respond.
- `conductor:disconnect` does not abort any in-flight send for the dir being
  disconnected (not specified by the brief); a stream already holding a
  decrypted key in memory will finish or be stopped independently via
  `conductor:stop`.
- The "second `conductor:send` for the same dir while one is already
  streaming" refusal (distinct from the serial-task-running refusal) is an
  addition beyond the brief's literal text, added because a second
  `AbortController` for the same dir would silently orphan the first and
  both streams would interleave writes to the same conversation file.

Self-review: re-read `service.ts`/`keystore.ts` end to end for the key-never-
leaves-main rule — `decryptedKey` is called only inside `runStream`, its
result only ever passed as `SlotWithKey.apiKey` into `streamChat`, never
logged, never included in any `ConductorDelta`, `Result`, or thrown `Error`
message. Verified the two verbatim consent strings and the fixed
encryption-unavailable message char-for-char against the brief with a small
script (diff confirmed exact match). Verified `git status --porcelain`
lists only the six intended files before staging.

Milestone movement: NO

Disposition: DONE
