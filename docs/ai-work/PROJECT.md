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
here as Task 055).

First visible milestone (current): one conversation on Cairn itself runs
request → pushback → dispatch → verified DONE → honest explanation, delivered
as the envelope's result card with the conductor's commentary.

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

Evidence level (contract v0.5.0): **Verified** — this project keeps executable
checks, written specs and decision docs, and receipts-style reports on top of
the Core records.
