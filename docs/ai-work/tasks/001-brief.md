# Task 001 — Formal reset to Cairn 0.0.1

Requested visible outcome: the repository presents Cairn 0.0.1 — a fresh
contract, rewritten beginner docs, and one shared app/contract version — with
all pre-reset docs and records preserved under docs/legacy/ and at git tag
legacy-v3.0.

Boundary of intent: documentation and version strings only. No product
behavior, dependency, or provider change. History is moved, never rewritten or
deleted. One test fixture literal (core/test/serial.test.ts) changes to match
the new contract version.

Checks: core, cli, and app test suites pass; contract mirrors are identical
(CONTRACT-TEMPLATE.md ↔ core/assets/contract.md ↔ app/resources/contract.md ↔
the cairn.html embed); no active doc mentions the retired version scheme.

DONE means the outcome above holds and the checks pass. STOPPED means they do
not.
