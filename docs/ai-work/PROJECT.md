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
request → pushback → dispatch → verified DONE → honest explanation, with the
conductor relaying only what the envelope verified.

Route: the owner-approved phases live in
`docs/superpowers/specs/2026-07-23-cairn-conductor-route-design.md`.
Multi-agent concurrency is explicitly late.

Out of scope for now: accounts, servers, analytics, or paid infrastructure of
any kind; external dependencies in the public artifacts (the browser companion
stays one self-contained file).

Working rule: one serial task at a time. Reviews are optional evidence, and
real risk pauses only at the concrete action boundary.
