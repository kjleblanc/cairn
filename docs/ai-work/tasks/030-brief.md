# Task 030 — Connecting is one paste, 0.1.2

Requested visible outcome: the connect card's default view asks for only an
OpenRouter key. The base URL (`https://openrouter.ai/api/v1`) and model are
already set to Cairn's curated starting pick, so the existing gating
(checkbox checked, key non-empty, model non-empty) is satisfied by the
defaults alone — nothing to choose before pasting a key. Two quiet links
reach the rest: "Choose a different brain" opens a small curated picker
(three models from a new `app/src/renderer/bodies.ts`, plus "Custom…" for
any provider/model, including a future local Ollama URL), and "Where do I
get a key?" opens an in-card walkthrough with a button that opens
openrouter.ai/keys directly. Version moves 0.1.1 → 0.1.2 as a patch (UX
refinement — no contract-body change, version line only).

Boundary of intent — this honestly supersedes the v0 conductor spec's
original ConnectCard field list (always-visible base URL + model fields)
per the owner-approved one-paste design from this conversation, 2026-07-24.
Unchanged, byte for byte: the consent checkbox's label text, the gate
requiring it checked before Connect enables, `conductor:consentCard` /
`conductor:connect`'s main-process re-derivation and dispatch-gate pattern,
the key field's password type and clear-after-attempt behavior, and every
other contract text. No change to the constitution, task-block parsing, the
proposed-task card, dispatch, storage, or the serial/offline/Codex adapters.
The only main-process change is one additional allowlist prefix
(`https://openrouter.ai/`) on the existing `app:openExternal` handler, kept
exact-prefix style like the two prefixes already there.

Checks that will show the outcome holds:
- A new `app/tests-unit/bodies.test.ts` (added to `tsconfig.unit.json`'s
  include list): curated ids are non-empty and unique, exactly one entry is
  marked `recommended`, and every blurb is non-empty and under 140 chars.
- `app/tests/conductor.spec.ts` updated: the default view has zero
  `input[type="text"]` elements and shows the recommended brain's name; the
  picker lists all three curated brains plus "Custom…"; the walkthrough
  panel renders its steps and an "Open openrouter.ai/keys" button; every
  connect scenario reaches the fixture's local URL through "Choose a
  different brain" → "Custom…" (the fixture isn't a curated brain). All
  prior assertion substance (consent-gating, disconnect, persistence,
  malformed blocks, 401 handling, mid-stream navigation, concurrent chips)
  kept.
- Root `npm test` — core 51/51 (mirror test green at 0.1.2, contract body
  otherwise untouched) + cli 9/9.
- `cd app && npm run typecheck && npm run test:unit && npm run build:vite &&
  npm run test:smoke` — all green, test:unit grown by the new bodies tests.
- The three curated model ids checked directly against the public, keyless
  OpenRouter catalog (`GET https://openrouter.ai/api/v1/models` — a
  read-only lookup sending no project or personal data) before shipping.

DONE means the one-paste default holds, the picker and walkthrough behave
as specified, every check above is green, and the version/changelog/mirror
state is consistent and honest at 0.1.2. STOPPED means a check fails or a
genuine conflict with existing consent-gating or dispatch-gate behavior
blocks a change without losing the design's substance.
