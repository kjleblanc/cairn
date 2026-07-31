# Task 143 brief: the first mobile task — "hello, phone" (pair and read)

**Lane:** A (main checkout)

## Requested visible outcome

On the owner's phone, on home Wi-Fi: open the address shown in the Cairn
desktop app, type the short-lived pairing code the desktop shows, and then
see the current conductor conversation and connection status update live in
the phone browser. Sending is not possible yet — this slice is pair + read
only.

## Authority and scope

The accepted design is
`docs/superpowers/specs/2026-07-30-cairn-mobile-groundwork-design.md`.
Decisions 1 (transport seam), 2 (pairing + device list), and 5 (discovery:
address + code shown on desktop) are implemented here. Decision 3 (approval
parity) and sending messages are LATER tasks and are NOT built. The phone UI
is the thinnest possible page (decision 4's v1 slice reduced to status +
read-only live conversation), served as static files by the listener.

## Boundary of intent — what must not change

- `app/src/main/conductor/service.ts` is NOT modified; the bridge translates
  HTTP/WebSocket to the SAME service functions the IPC handlers call today.
- No new npm dependencies (Node built-in `http`; hand-rolled minimal
  WebSocket or long-polling — implementer's choice, recorded in the report).
- The provider key never leaves main; bridge traffic carries conversation
  content only. The device token is never logged.
- Plain HTTP on the LAN with the spec's disclosure sentence on the pairing
  screen — the accepted v1 trade-off (open question 2).
- Fixed default port with an honest "already in use" fallback (open
  question 3); listener binds the LAN interface only and starts/stops with
  the app.
- Fail closed everywhere: unknown/revoked tokens get exactly one refusal
  answer; pairing codes are short-lived and single-use; the device list
  lives in the profile and is revocable from the desktop.
- Existing desktop behavior, stored data, and security posture otherwise
  unchanged.

## Checks that will show the outcome holds

- New `app/tests-unit` coverage in the existing style: pairing
  accept/refuse/expiry/single-use, device revocation (live session cut,
  one refusal answer), listener lifecycle (start/stop with app, port-in-use
  fallback, LAN bind).
- Core test suite green.
- App typecheck green.
- App unit suite green.
- A local end-to-end simulation of the phone flow against the real listener
  (HTTP pairing exchange + read endpoints + live update channel), with the
  exact commands recorded in the report.
- E2E (Playwright) needs the app token: hold it for the whole run or skip
  E2E and say why in the report.

## DONE and STOPPED here

DONE means: all checks above pass, and the owner can perform the pairing
flow from their phone and watch the conversation and status update live.
The final on-phone confirmation is the owner's; the report gives exact safe
steps. STOPPED means any check fails or the flow cannot be completed, with
the reason named.

## Precondition needing owner confirmation

None for the checks themselves. The on-phone trial requires the owner's
phone on the same Wi-Fi as the PC; that step is the owner's to run.
