# Task 142 brief: mobile groundwork design — Cairn in your pocket, on home Wi-Fi

**Lane:** B (`.lanes/b`)

## Requested visible outcome

A design spec at
`docs/superpowers/specs/2026-07-30-cairn-mobile-groundwork-design.md`, in the
project's spec style, for talking to Cairn from the owner's phone while the
app runs on the home PC. Owner decisions already made (2026-07-30): **v1
works on the home network (LAN), and the phone is a full participant — chat,
respond, and approve dispatches and paid calls, everything the desktop can
do.** The owner's stated reason: the bottleneck to using and proving Cairn is
not being at the machine.

The spec must cover: the transport seam (the main-process conductor service
exposed to a LAN web client; desktop and phone as equal citizens), pairing
and device trust without accounts (one-time pairing code, revocable device
list), the honest LAN transport-security trade-off and what is deferred to a
later overlay phase, approval parity (every risk pause answerable on the
phone with the same information as desktop), UI reuse (web build of the chat
surface, no native app), discovery (QR with address + pairing code), what the
phone cannot do in v1, how the mobile conversation lands in the lane model of
the Task 138 spec, and a proposed milestone sentence.

## Boundary of intent

- One new spec file plus task records. No code, no contract edit, no
  dependency choice final — the spec recommends, the owner decides.
- Away-from-home access (overlay network), cloud relay, native app, and push
  notifications are all explicitly deferred; the spec names them and stops.
- The provider key and all secrets stay on the PC, in the main process,
  exactly as today; the spec must show that never changes.

## Checks that show the outcome holds

- The spec exists and covers every topic above, including the two locked
  owner decisions and the proximity motivation.
- Every mechanism it proposes maps to something Cairn already has (main-
  process service, consent card, approval gates) — no invented infrastructure
  without a name and a cost.
- The diff touches only the spec and task records.

## DONE / STOPPED here

- **DONE:** the spec is complete per above and presented with a plain summary.
- **STOPPED:** full approval parity on a phone proves to need infrastructure
  the project has ruled out (accounts, servers) — surface that conflict
  instead of designing around it silently.
