# Task 098 — Kimi subscription as a curated brain

Requested outcome: The connect card's brain picker offers a fourth curated
entry — "Kimi — your subscription" — that connects Cairn's conductor to the
Kimi membership the owner already pays for, through the subscription's own
OpenAI-compatible endpoint (`https://api.kimi.com/coding/v1`, model
`kimi-for-coding`, a `sk-kimi-…` key from the Kimi Code Console). Choosing it
shows consent wording that tells the truth about a subscription: conversation
uses the membership's included quota, which Cairn cannot see or predict — not
the pay-as-you-go wording that is true only of metered API accounts.

Owner direction (2026-07-28): the owner asked for Kimi-subscription detection
with the option to use Kimi as Cairn's orchestrator or elsewhere. Scoping
conversation settled on "Level 2" first: the curated subscription entry on the
existing API transport. Detection of a locally installed Kimi Code CLI and a
Kimi worker adapter remain future work; no Kimi CLI is installed on this
machine (`~/.kimi-code` holds only a stray `bin/rg.exe` — no binary, no
credentials).

Facts pinned to sources verified 2026-07-28:

- Endpoint, model id, key source, and membership-quota billing: Kimi Help
  Center, "Kimi Code CLI Installation & Quick Start", and Kimi Code Docs,
  "Membership Benefits Guide" / "Claude Code" (`kimi-for-coding` is a fixed
  model id that auto-maps to the latest model).
- Kimi Code Console URL `https://www.kimi.com/code/console` returns HTTP 200
  (checked with curl today).

Boundary of intent:

- Files that may change: `app/src/renderer/bodies.ts`,
  `app/src/renderer/components/ConnectCard.tsx`, `app/src/shared/ipc.ts`,
  `app/src/main/conductor/service.ts`, new `app/src/main/conductor/consent.ts`,
  new `app/tests-unit/consent.test.ts`, new `app/tests/connect-kimi.spec.ts`,
  and this task's records.
- Files that must NOT change (task 097's in-flight, uncommitted work):
  `app/src/renderer/screens/Chat.tsx`,
  `app/src/renderer/components/TaskCard.tsx`,
  `app/src/renderer/components/DisclosureConfirm.tsx`,
  `app/tests/conductor.spec.ts`, `app/tests/fixtures/fake-conductor.mjs`,
  `app/tests/routing.spec.ts`, `app/tests/diag.spec.ts`.
- The OpenRouter path is byte-identical in behavior and strings: the
  recommended body stays Kimi K2; the picker keeps the three existing entries
  and "Custom…"; the guide keeps the OpenRouter walkthrough for API bodies;
  the consent data sentence is unchanged for every body; the pay-as-you-go
  cost sentence and the existing checkbox label remain exactly as they are
  for non-Kimi hosts. `conductor.spec.ts` must pass UNMODIFIED — it is the
  pin that proves this.
- Consent strings stay derived in main and compared field-by-field before any
  key is stored (the dispatch-gate pattern). The new body-specific checkbox
  label joins that comparison as a new card field; the renderer never
  originates a consent string.
- No dependency, layout, styling (existing classes only), stored-data,
  model-facing-string, or behavior changes beyond the above. No real provider
  call in any test: the new E2E renders the card and stops before Connect.
- The Kimi entry is not marked recommended, and its blurb claims nothing
  Cairn has not checked: it names the quota truth and the key source.

Checks:

1. `npm.cmd run test:unit` passes (96 existing + new consent tests).
2. The Vite renderer build and full type check pass.
3. `npm.cmd run test:smoke` passes with `conductor.spec.ts` unmodified, and
   the new `connect-kimi.spec.ts` is green.
4. Final diff and Git status contain only the scoped files and records; the
   097 dirty set is untouched.

DONE means a beginner can pick "Kimi — your subscription", read consent
wording that is true for a plan (derived in main, unfakeable by the
renderer), follow the guide to the real console, and every suite is green
with 097's work untouched.

STOPPED means the OpenRouter flow cannot stay byte-identical, a suite fails
without an in-scope correction, or commit isolation from 097's files proves
impossible (in which case: report, no commit).
