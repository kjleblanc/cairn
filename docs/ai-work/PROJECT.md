# Cairn

Goal: Cairn is a character — an AI conductor in a swappable, upgradeable model
slot. It holds the project in its head, talks with the owner in plain
language, surfaces gaps and risks, then follows the owner's decision. It
dispatches coding work to swappable worker AIs through a deterministic safety
envelope and relays verified results honestly. The long-term mission: Cairn
becomes able to build itself into the product its owner directs.

Users: complete beginners — and Cairn's own maintainers. This project develops
itself through its own workflow.

Milestone history: the first visible milestone — a real-model `cairn task`
completing an improvement to Cairn itself, end to end — was achieved twice on
2026-07-23 (Task 006, commit 80f7ba3, and Task 010). The conductor milestone —
reading the real project records, turning a vague request into a well-scoped
task that dispatches and completes DONE — was achieved on 2026-07-24 in the
owner's Bookshelf evaluation project (its task 004, commit 5b65dab; recorded
here as Task 055). The conversation-loop milestone — one conversation on Cairn
itself running request → pushback → dispatch → verified DONE → honest
explanation, delivered as the envelope's result card with the conductor's
commentary — was reached on 2026-08-17 by **Task 268, commit `daa1bdb`**, and
the owner confirmed it. That run began with the owner's own words about the
window's title bar, carried a concern the owner set aside, dispatched a real
paid call to Codex Exec (OpenAI / gpt-5.6-sol), verified DONE against Git
rather than against the worker's claims, retained only bounded numeric worker
evidence, and made one exact-path commit — with each requirement labelled "You
said so" or "Cairn chose", the latter stated plainly as not evidence of owner
preference. Task 268's own LOG row says `Milestone moved? NO`, and that is
correct and stays: that column carries the WORKER's answer, and the worker was
asked to fix a title bar. Recorded as Task 269.

First visible milestone (current): from the owner's paired phone on the home
network, one conversation takes a task through dispatch approval, verified
DONE, and the push decision, with every approval the desktop requires. This is
the mobile-groundwork direction already accepted on 2026-07-31 and described
below, promoted to the current milestone rather than newly chosen. The shipped
companion is LAN-only and read-only after pairing today, so full approval
parity is accepted and unbuilt.

Route: the owner-approved phases live in
`docs/superpowers/specs/2026-07-23-cairn-conductor-route-design.md`.
Multi-agent concurrency is explicitly late. The mobile groundwork — Cairn
from the owner's phone on the home network, full approval parity — is the
accepted next direction
(`docs/superpowers/specs/2026-07-30-cairn-mobile-groundwork-design.md`,
adopted 2026-07-31): from the phone, pair once, converse, and take one full
task through dispatch approval, verified DONE, and the push decision.

Out of scope for now: accounts, analytics, or paid infrastructure of any
kind; no cloud, no relay. The one deliberate bend (2026-07-31): the app may
host a single LAN HTTP/WebSocket listener so the owner's paired phone can
reach the conductor on the home network — no third party, no external
dependency, secrets never leaving the PC. External dependencies in the public
artifacts stay out (the browser companion stays one self-contained file).

Working rule: one serial task at a time per lane; a small number of lanes
under the contract's "Working in lanes" rules. Reviews are optional evidence,
and real risk pauses only at the concrete action boundary.

Evidence level (contract v0.8.0): **Verified** — this project keeps executable
checks, written specs and decision docs, and receipts-style reports on top of
the Core records.
