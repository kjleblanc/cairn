# Task 143 report: the first mobile task — "hello, phone" (pair and read)

**Lane:** A (main checkout) · **Base synced from:** main @ 5ef07ec (Task 144) — lane C landed 144 into main *while this task was in flight*; see "The mid-task landing" below.

## What changed

The app now hosts one small HTTP listener inside the main process — the
accepted scope bend, decisions 1, 2, and 5 of
`docs/superpowers/specs/2026-07-30-cairn-mobile-groundwork-design.md`.
The conductor service layer is **untouched**; the bridge calls the same
`status` / `conversations` / `turns` / `current` functions the IPC handlers
call. Approval parity (decision 3) and sending are later tasks and do not
exist here.

**New files**

- `app/src/main/bridge/server.ts` — the Electron-free bridge core: Node
  built-in `http` only, no new dependencies. Serves the phone page, the
  pairing exchange, the read-only state snapshot, and the live stream;
  owns pairing codes, port walking, and the device-session registry.
- `app/src/main/bridge/devices.ts` — the revocable device list, stored as
  `devices.json` in the profile beside `conductor.json`. Only each token's
  SHA-256 hash is stored; the raw token crosses once, in the pairing
  response's `Set-Cookie`, and is never logged and never on disk.
- `app/src/main/bridge/hub.ts` — the "something the phone can see changed"
  signal. The desktop's existing delta-forwarding sites emit it; the
  bridge's open streams subscribe.
- `app/src/main/bridge/phonepage.ts` — the phone UI: ONE self-contained
  HTML page embedded as a string (no asset pipeline, byte-identical in dev
  and packaged builds). Pairing form, status header, the current
  conversation, live updates. Renderer styling reused at the token level
  (same palette via `light-dark()`); every conversation string renders
  through `textContent` — model output can never become page script.
- `app/src/main/bridge/runtime.ts` — the Electron half: LAN-address
  discovery, device-store path, wiring the real service + registry in,
  start/stop lifecycle, and the IPC-facing state/pair/revoke functions.
- `app/src/renderer/components/PairPhone.tsx` — the desktop surface
  (Settings → "pair a phone"): the address, a "Show a pairing code"
  button, the big code with its live countdown, the spec's disclosure
  sentence verbatim, and the paired-device list with Unpair.
- `app/tests-unit/bridge.test.ts` — 17 tests (below).
- `app/tests/bridge.spec.ts` — the E2E: the whole phone flow against the
  real built app (below).

**Modified files**

- `app/src/main/ipc.ts` — `registerBridgeIpc()` (state / pairBegin /
  revokeDevice) plus five one-line hub signals at the sites that already
  forward conductor events: send deltas, connect, OAuth completion,
  disconnect, setModel.
- `app/src/main/tasks.ts` — two one-line hub signals: the envelope's
  result-card delta and the commentary stream's deltas.
- `app/src/main/main.ts` — registers the bridge IPC, starts the bridge
  with the app, stops it on `will-quit`.
- `app/src/preload.ts` — the three new bindings.
- `app/src/shared/ipc.ts` — `PhoneBridgeState`, `PairingOffer`,
  `BridgeDeviceInfo`, the `CairnApi` additions, and
  `BRIDGE_PAIRING_DISCLOSURE` (the spec's sentence, one shared constant).
- `app/src/renderer/screens/Settings.tsx` — renders the new card.
- `app/tsconfig.unit.json` — the four Electron-free bridge modules join
  the unit compile.
- `app/lab/mock-cairn.ts` — one disclosed adjacent repair: the lab's mock
  `CairnApi` needed the three new methods to typecheck; it answers with
  the honest not-running state. **Note:** this file is not in my commit —
  lane C's landing absorbed my uncommitted edit; see below.

## The mid-task landing (lane protocol, honest account)

Lane C landed Task 144 (commits `8283be5`, `2eff24e`, `5ef07ec`) into
main while this task's work sat uncommitted in the main checkout. Two
consequences, both verified directly:

- Their commit `5ef07ec` contains my uncommitted `app/lab/mock-cairn.ts`
  edit verbatim (the three `phoneBridge*` mock methods and their
  comment), plus their own type-only import lines referencing
  `PairingOffer`/`PhoneBridgeState` — types that only exist in my
  still-uncommitted `shared/ipc.ts`. So main @ 5ef07ec *on its own* does
  not typecheck; this task's commit supplies the missing types and makes
  main whole. Their 144 records describe their own workaround for the
  collision ("mock-cairn given type-only imports … instead of duplicate
  mock methods"). Landing over a dirty main tree is exactly what the
  landing rules exist to prevent; noted here, not rewritten — history
  stands.
- All of this task's checks ran twice: first against main @ 0bc4308 plus
  my changes (full results below), then — after the landing — the
  decisive ones re-ran against main @ 5ef07ec plus my changes: typecheck
  clean, unit 141/141, `build:vite` clean, `tests/bridge.spec.ts` 1/1,
  app token held and released each time. My commit stages only my task's
  paths; `mock-cairn.ts` is already on main and is not re-committed.

## Decisions made (AI decisions, per the contract)

- **Live updates ride Server-Sent Events, not a hand-rolled WebSocket.**
  The owner delegated this ("minimal WebSocket or long-polling … your
  call"). SSE is the HTTP-native one-way push: no framing code to own,
  `EventSource` reconnects by itself, and the spec's mapping ("one stream
  per phone session") holds exactly. Every push carries the whole visible
  snapshot (debounced to one per 150 ms slice), so a phone that slept
  self-heals on the next push. Bidirectional messaging, when a later task
  wants it, is plain request/response endpoints — no protocol swap.
- **Device tokens are hashed at rest** (SHA-256), compared with
  `timingSafeEqual`. The raw token exists only in the phone's cookie:
  `HttpOnly; SameSite=Strict; Path=/` (no `Secure` — v1 is plain HTTP on
  the home Wi-Fi, and the pairing screen says so).
- **Pairing codes**: 6 digits, memory-only, 5-minute life, single-use, one
  live code at a time (a new one supersedes), and 5 wrong guesses burn the
  code. Never logged.
- **Fail closed everywhere**: unknown and revoked tokens get exactly one
  refusal answer (`This device isn't paired with this computer.`), pinned
  by tests on every endpoint; a corrupt `devices.json` reads as "no
  devices"; a machine with no private-range LAN address (10/8,
  172.16/12, 192.168/16) gets no listener and the settings card says why;
  revocation also works while the bridge is down (it goes through the
  store, not only the live listener).
- **Fixed port 7391**, walking up to 7391+9 on `EADDRINUSE`, then an
  honest "ports are in use" reason. The desktop always shows the address
  that is actually bound.
- **The snapshot carries conversation content only**: the project appears
  by NAME (never its path), the provider's `baseUrl` is dropped, and no
  token of any kind is in scope. The conversation shown follows the
  desktop Chat screen's own rule — the live stream's conversation,
  otherwise the newest saved one. "The current project" is the registry's
  most recently opened entry.
- **No QR in this slice.** The owner's task scoped the surface to code +
  address + disclosure sentence, and a QR encoder would mean a new
  dependency or hand-rolled encoder — neither belongs in the thinnest
  slice. Named here so the choice is on record; adding one is a small
  later task.

## Checks run and their real results

All commands from the repo root `C:\Users\KenJL\Desktop\WebApp Projects\AI
Coding Workflow Framework` unless noted. (`npm` resolves as `npm.cmd` in
this shell; same tool.)

- `cd app && npm.cmd run test:unit` — **141/141 pass** (was 124; the 17
  new ones pin: page served without auth, fixed 404/401 answers, pairing
  accept + HttpOnly cookie, hash-only token storage, single-use, wrong
  code, attempt-limit burn, expiry, supersede, the one refusal for unknown
  tokens, revocation cutting a live SSE stream, hub-driven live snapshot
  pushes, the desktop's conversation-choice rule, port walking, port
  exhaustion refusal, close-stops-answers, store reload, lastSeen
  throttling, corrupt-file fail-closed).
- `cd app && npm.cmd run typecheck` — clean.
- `npm.cmd test` (repo root) — **core 139/139, cli 9/9**.
- `cd app && npm.cmd run build:vite` — builds clean.
- E2E, app token held (`mkdir "$TEMP/cairn-app-token"`; released after,
  confirmed gone). The suite outruns the 300 s foreground limit of one
  shell call, so it ran in chunks:
  - `npx.cmd playwright test tests/bridge.spec.ts` — **1/1**. The new spec
    drives the REAL flow: desktop Settings → Show a pairing code (code,
    address, and the disclosure sentence asserted on screen); a second
    BrowserWindow plays the phone at the shown address — wrong code gets
    the one refusal, right code pairs, the project name and read-only note
    render; a message sent on the desktop appears on the phone live with
    no reload; the device appears in the desktop list; Unpair lands the
    phone on "This device was unpaired…"; a forged token gets the 401
    refusal, asserted at the API level too.
  - `tests/smoke.spec.ts tests/projects.spec.ts tests/away.spec.ts` — 6/6.
  - `tests/routing.spec.ts tests/serial.spec.ts` — 14/14.
  - `tests/connect-kimi.spec.ts` — 1/1.
  - `tests/conductor.spec.ts` — 19 passed, then one failure: the
    commentary test's 15 s Stop-button wait timed out under full-suite
    load. Re-run alone: `npx.cmd playwright test "tests/conductor.spec.ts:1133"`
    — **green in 7.7 s**. This matches the suite's documented timing-flake
    history (Task 131's log), and my changes have no mechanism in that
    path: with no phone connected the hub's listener set is empty and each
    signal is a no-op. The six tests serial mode skipped behind it then
    ran by line filter — all green. Conductor file total: **26/26**.
  - Suite total: **48/48** (47 prior + 1 new).
- `git status` before commit: only the task's own files; the pre-existing
  untracked `app/launch-build.log` and `design/` are untouched and
  uncommitted.

## How to try it (the owner's phone, about two minutes)

1. Start the app as usual (`cd app && npm.cmd start`, or your normal
   Cairn launch).
2. Open your project, then **Settings → "pair a phone" → "Show a pairing
   code"**. The screen shows the address (default
   `http://<your-PC>:7391`), the 6-digit code, and the plain-HTTP
   disclosure sentence.
3. On your phone, on the same Wi-Fi, open that address and type the code.
   You should see the connection status and the current conversation;
   send a message on the desktop and watch it arrive live. Sending from
   the phone is deliberately impossible in this slice.
4. Unpair anytime from the same settings card — the phone is cut off at
   once.
5. One machine thing only you can do: Windows may ask once to allow Cairn
   through the firewall on **Private networks**. That approval is yours to
   give; if it's declined, the phone can't reach the PC (the fix is
   Windows Defender Firewall → allow Electron/Cairn on Private networks).

## Limitations / remaining human judgment

- **Your phone is the final confirmation**, as the brief named it.
  Everything executable is green, including a full dress rehearsal of the
  exact flow in a real Chromium window against the real built app — but
  the physical phone on your Wi-Fi (and the possible firewall prompt) is
  yours to run. If anything misbehaves there, that finding is the next
  task's brief.
- The phone follows the most recently opened project's current
  conversation; switching projects or conversations from the phone is not
  in this slice.
- Phone rendering is plain text (no Markdown) with compact result cards —
  honest and injection-proof; prettifying is a later taste decision.
- Plain HTTP on the LAN is the accepted v1 trade-off; the overlay phase
  owns real encryption. The disclosure sentence carries it on the pairing
  screen.

**Disposition: DONE** — every executable check is green and the flow
works end to end against the real app; the brief's named owner step (the
physical phone, same Wi-Fi) is the last confirmation, per the project's
convention for owner-confirmed landings.
