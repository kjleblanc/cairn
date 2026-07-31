# Cairn Mobile Groundwork — Design

**Status:** accepted 2026-07-31 (Task 141); originally proposed 2026-07-30
(Task 139). Sits on top of the Task 138 lane model, adopted as contract
v0.6.0 in Task 140. The owner delegated the four open questions; the answers
are recorded in the final section.

## Where this comes from

The owner's words: "My bottleneck to using/proving Cairn right now is not
being by my machine." The constraint is proximity, not attention. Two owner
decisions are locked and govern everything below:

1. **v1 works on the home network.** The phone reaches the PC over the house
   Wi-Fi. Away-from-home access is a later phase, not this one.
2. **The phone is a full participant.** Chat, respond, approve dispatches and
   paid calls — everything the desktop conversation can do.

PROJECT.md today lists "accounts, servers, analytics, or paid infrastructure
of any kind" as out of scope. This spec deliberately bends "servers" exactly
once: a small HTTP/WebSocket listener inside the existing Electron main
process, bound to the LAN interface, serving the owner's own phone. No
cloud, no relay, no accounts, no third party. If that bend is not acceptable,
the honest alternative is to stop here — there is no account-free,
server-free way to put a conversation on a second device.

## The fixed reference: what must not move

- **Secrets never leave the PC.** The provider key stays in the main process,
  encrypted at rest, exactly as today. The phone never sees, holds, or
  forwards it; bridge traffic contains conversation content only.
- **The risk boundaries keep their pauses.** Every item on the contract's
  concrete-risk list still waits for an explicit approval of that exact
  action. What changes is *which screen the pause appears on*, never whether
  it appears.
- **The envelope stays serial.** One dispatched worker task at a time,
  whatever device is talking.
- **The consent machinery is untouched.** Connecting a conductor still
  happens on the desktop with the same field-by-field re-derived card
  (Task 131's OAuth door included). Pairing a phone is not connecting a
  provider and grants no provider authority.

## Decision 1 — The transport seam: one listener in main

The conductor is already a clean function surface in the main process
(`app/src/main/conductor/service.ts`: `status`, `connect`, `send`, `stop`,
`conversations`, `turns`, `current`, `commentary`), and the renderer reaches
it through IPC. The seam is therefore small and real:

- Main hosts an HTTP + WebSocket listener (Node's built-in `http`; **no new
  framework dependency**) bound to the machine's LAN address, started and
  stopped with the app.
- A thin bridge module translates between that listener and the *same*
  service functions the IPC handlers call today. The desktop renderer keeps
  using IPC; the phone uses the bridge. Equal citizens, one service.
- Streaming turns (`conductor:stream`-style events) map onto one WebSocket
  per phone session; request/response calls map onto plain HTTP endpoints.
- The listener serves the phone UI itself (decision 4) as static files.

Named cost: one new main-process module plus its tests; the service layer is
untouched, which is what makes this cheap.

## Decision 2 — Pairing: one code, a device list, no accounts

- Pairing starts on the desktop: a "Pair a phone" action shows a **short-lived
  pairing code** (and a QR encoding it with the address, decision 5).
- The phone opens the address, enters the code, and receives a **durable
  device credential** (a random token) stored in the phone browser's storage.
  Main keeps a **device list** in the profile: name, first-paired date, last
  seen. Any entry is revocable from the desktop; revocation deletes the token
  and ends that device's sessions immediately.
- Every bridge request carries the device credential; an unknown or revoked
  credential gets exactly one answer. Pairing codes expire in minutes and are
  single-use.
- This mirrors what the contract already does for the conductor connection:
  a standing authorization, visibly indicated, revocable at any time — one
  level removed from the provider key it can never reach.

## Decision 3 — Approval parity: the same object, the same gates

Today a dispatch approval travels as one whole object threading four app
gates (`app/src/shared/ipc.ts`: "One dispatch request, whole"), and the push
button re-reads git and shows its exact target before the press. Parity means:

- Every approval surface the desktop has — the paid-call disclosure with its
  six facts, the dispatch confirmation, the push pause, stop-task — renders
  on the phone with the **same content, derived by main**, not a phone-side
  summary. The phone submits the same whole-object approval the renderer
  would; the same gates validate it, unchanged.
- A risk the conductor raises still rides the proposed task as a chip the
  owner answers or knowingly sets aside — on the phone, identically.
- If the bridge is down or the app is quitting, no approval path exists at
  all: fail closed, same as a closed desktop window today.

The rule for every future approval kind: *if it can't be shown whole on the
phone, it doesn't get an approval path on the phone.*

## Decision 4 — The phone UI: the same chat surface, built for web

- Reuse the renderer's chat components in a **web build** (the app already
  builds its renderer with Vite; the lab shows a second build target is
  routine) served by the listener as static files. No native app, no app
  store, no push infrastructure.
- v1 scope of that UI: the conversation (messages, streaming, proposed-task
  cards, result cards), the approval surfaces of decision 3, and the
  connection indicator. Not the whole desktop shell — no town scene, no lab,
  no settings beyond the device list's own screen.
- Degraded honestly: browser closed = nothing arrives; opening the page
  re-fetches `current()` and reattaches, the same trick the desktop already
  uses on reload.

## Decision 5 — Discovery: the QR is the address

The desktop's pairing screen shows a QR encoding `http://<LAN address>:<port>`
plus the short-lived code. The phone's camera opens it; the owner types the
code. No mDNS, no discovery protocol, no config file. A fixed default port
with an honest "already in use" fallback keeps the QR stable enough to print,
if the owner wants a permanent copy by the desk.

## What the phone cannot do in v1

- Connect or change the provider (desktop-only, consent-card machinery).
- Anything physically of the machine: running the app itself, E2E suites,
  file pickers, installing things.
- Receive attention when its browser is closed (no push; deferred with the
  overlay phase).

## The mobile lane

Per the Task 138 spec, a lane is a conversation, not a device. The phone
conversation is a lane when it works the repository; its worktree lives on
the PC, and the app token's single-tenant surface (the profile, not the
device) already covers it. The phone adds no new concurrency rule — which is
the point of having done the lane work first.

## Deferred, named

- **Away from home:** a private overlay (Tailscale-style) gives encryption
  and reach without opening ports or adding accounts-as-such. This phase also
  answers LAN transport security properly (below). Owner decision, later.
- **Cloud relay / real server product:** out of scope, unchanged.
- **Native app, push notifications, offline queueing:** out of scope.
- **Multiple paired phones / family members:** the device list technically
  allows it; v1 policy is the owner's phone only.

## The honest LAN trade-off

v1 traffic inside the home network is plain HTTP plus a bearer credential.
That is readable by anything already on the owner's Wi-Fi — in practice,
WPA2 and the owner's own devices; in principle, a risk worth one sentence of
disclosure on the pairing screen: "Traffic stays inside your home Wi-Fi and
is not encrypted in v1; don't pair on a network you don't control." The
overlay phase replaces this with real encryption. Alternatives considered and
rejected for v1: self-signed TLS (browser warnings teach the owner to click
past exactly the habit Cairn exists to protect; phone browsers can't pin
comfortably) and a cloud tunnel (third party, account, scope).

## Proposed milestone

> From my phone on home Wi-Fi, I can pair once, converse with Cairn, and take
> one full task through dispatch approval, verified DONE, and the push
> decision — without touching the PC.

## Trade-offs, collected

- A main-process listener is the project's first server-shaped thing, however
  small; the bend in PROJECT.md is recorded above, in the open.
- No-framework HTTP/WebSocket code means owning a little protocol code
  instead of a dependency; the surface is deliberately tiny (a handful of
  endpoints plus one stream).
- Web-UI reuse saves a second design language but imports the renderer's
  component assumptions into a touch context; some cards will need
  touch-sized rework the desktop never demanded.
- Approval parity as a *rule* (whole object, same gates) may slow future
  approval features slightly; the alternative is two divergent trust
  surfaces, which is how remote-approval tools get scary.

## Open questions — answered 2026-07-31 (owner-delegated)

1. The PROJECT.md scope bend (one LAN listener, no cloud/accounts) — accept,
   or is even that too much server for Cairn's taste?
   **Answer: accept.** The bend is the entire point of the mobile
   groundwork; it is recorded openly in PROJECT.md with the stop-alternative
   preserved in this spec.
2. Plain-HTTP-on-Wi-Fi with the pairing-screen disclosure, acceptable for
   v1 — or is encryption a v1 requirement even at the cost of the self-signed
   UX?
   **Answer: plain HTTP with disclosure for v1.** Self-signed TLS teaches
   the click-past-warnings habit Cairn exists to prevent, and the overlay
   phase brings real encryption; the pairing screen carries the disclosure
   sentence.
3. Default port preference (fixed-and-printable vs. ephemeral-and-QR-only)?
   **Answer: fixed and printable**, with an honest "already in use" fallback
   — a stable QR the owner can print beats a fresh one per session.
4. Does the phone lane count against the lane cap (Task 138, question 3)?
   **Answer: it counts only when it works the repository** — pure phone
   conversation is no lane; claiming task numbers from any device is. (Now
   contract text at v0.6.0.)
