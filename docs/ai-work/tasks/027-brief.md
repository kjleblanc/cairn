# Task 027 — Contract amendment, 0.1.0, chat becomes home

Requested visible outcome: the connected-conductor capability built across
Tasks 018–026 stops being dark. The contract gains a new
`## The connected conductor` section (verbatim from the spec's amendment
paragraph), mirrored byte-for-byte across `CONTRACT-TEMPLATE.md`,
`AGENTS.md`, and the `cairn.html` embed; every version declaration moves
0.0.5 → 0.1.0 (`CONTRACT-TEMPLATE.md`, `AGENTS.md`, `cairn.html`'s eyebrow
and embed, `core/package.json`, `cli/package.json`, `app/package.json`, and
the three lockfiles); `CHANGELOG.md` gains an honest 0.1.0 entry; and core
is rebuilt so `core/assets/contract.md` regenerates from the template. The
`CAIRN_CONDUCTOR` env gate is removed entirely (the preflight field, the
main-process read, and Dashboard's conditional "Talk with Cairn" pill) —
the conductor UI is always reachable now. A governed project boots straight
into the chat screen (which shows the connect card when the owner hasn't
connected yet); the dashboard stays one click away behind chat's existing
"← Project home" control, unchanged. Playwright specs that assumed
dashboard-first boot gain one extra navigation step to reach the dashboard
where their assertions still need it; `conductor.spec.ts`'s own helper no
longer needs to click into chat first, since boot already lands there.
Finally, `docs/superpowers/evals/conductor-v0.md` holds the eight scripted
evaluation scenarios from the spec plus an empty per-body comparison table,
for a later paid session against a real connected provider.

Boundary of intent: no change to the conductor's own behavior (client,
service, briefing, task-block parsing, storage) — this task only removes
the flag gating whether the UI is reachable and changes which screen a
governed project's boot lands on. No change to the serial dispatch path,
Codex Exec adapter, or offline demo adapter. No new dependency. No paid
model call — the eval doc is scaffolding only; running it against a real
body is explicitly deferred to a separate owner-confirmed session (the
contract's concrete-risk boundary on paid/data-bearing calls applies).

Checks that will show the outcome holds:
- Root `npm test` — core 51/51 (including `contract mirrors match the
  canonical template` at 0.1.0) + cli 9/9.
- `cd app && npm run typecheck && npm run test:unit && npm run build:vite
  && npm run test:smoke` — 37 unit tests, all 20 Playwright tests green.
- A byte-for-byte check that `cairn.html`'s embedded contract script block
  equals `CONTRACT-TEMPLATE.md` (EOL-normalized) — the same equality the
  core test enforces, checked directly as a second source of evidence.
- A fresh-clone check: `git clone . <scratch>/fresh-verify && cd
  <scratch>/fresh-verify && npm ci && npm test` green against the committed
  state.

DONE means the outcome above holds and every check passes, with the
milestone still correctly reported as not yet moved (it needs a real
connected body, which this task does not run). STOPPED means a check fails
or a genuine spec conflict blocks a change without losing a spec's
substance.
