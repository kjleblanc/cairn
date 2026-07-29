# Handoff — model picker: pin Kimi K3, open the list, simplify the connect screen (2026-07-29)

**Read first:** this note, then `app/src/renderer/bodies.ts`,
`app/src/renderer/components/ConnectCard.tsx`,
`app/src/main/conductor/consent.ts`, and the latest LOG rows. The
rules-that-bite section of `HANDOFF-level3a.md` applies too (app token for
E2E, Node not on the shell's PATH, never touch the real signed-in Kimi CLI
from any suite).

## The owner's request and decisions (2026-07-29)

Owner report: pressing "Kimi — your subscription" asks for an API key, and
the model selection screen in general feels messy and confusing. Direction
given: pin Kimi K3 as the recommended model, then simplify model selection
overall. Decisions, in the owner's own words or confirmed back:

1. **Pin Kimi K3 as the recommended model.** Confirmed real in OpenRouter's
   keyless catalog (`GET https://openrouter.ai/api/v1/models`) on 2026-07-29:
   `moonshotai/kimi-k3` ("MoonshotAI: Kimi K3"), $3/M input, $15/M output —
   about **5× K2's** price ($0.57/$2.30). The owner was told the 5× figure
   and accepted it ("The cost is fine"). The blurb must stay honest: K2's
   "a long chat usually costs a few cents" does not transfer; a long K3
   conversation is dimes, not cents. `RECOMMENDATION_NOTE` stays as is
   ("not yet evaluated; the evaluation set will confirm or change it").
2. **The picker is open, not closed:** "The idea is to be able to pick any
   model, and if the option isn't there, start a task to add it." So
   simplification means CLARITY, not fewer doors. Any model stays pickable
   (the Custom… path already accepts any provider/model), and the design
   adds a first-class path that turns "the model I want isn't listed" into
   a Cairn task that adds it — a self-hosting loop: the task edits
   `bodies.ts`, verifying the id against the provider's keyless catalog
   exactly as the existing entries were. Whether DeepSeek V3.1 and
   GPT-5 Mini stay in the curated list is a design question for that chat —
   recommendation: KEEP them (cheap, already honest); the confusion was
   presentation, not the entries. What should get clearer: the recommended
   pin is visible at a glance, and each entry names how it bills (per-use
   key vs membership quota) without jargon.
3. **Lane:** the owner's call was "your choice" — decided: this lane (A)
   takes it, coordinating with the renderer lane if it is mid-task
   (`ConnectCard.tsx` and `bodies.ts` are renderer files; the connect card
   is consent machinery more than visual layer, and the add-a-model path is
   dispatch-shaped).
4. **Continue in another chat.** Suggested start: "Work on: the model
   picker — read docs/ai-work/HANDOFF-model-picker.md first." The redesign
   is presentation for a beginner owner: show the concrete shape as it
   lands rather than describing it abstractly first.

## Why "my subscription" asks for a key (answered — do not re-derive)

Two different sign-ins exist. The Kimi Code CLI uses OAuth (the Level 3
worker; no key anywhere). The connect card's subscription seat talks to the
membership's API endpoint (`api.kimi.com/coding/v1`), which accepts only
Kimi Code Console API keys — there is no OAuth in that transport, so the
key prompt is honest. The true no-key path is **Level 3b** (a conductor
body over the CLI's ACP connection): designed, spike-cleared, blocked on
the Phase 4 conductor-body seam. Never automate credential extraction
(reading `~/.kimi-code/`, scraping the console, borrowing the CLI's OAuth
identity) — contract-forbidden. An allowed interim improvement: the card
may tell the truth about the CLI sign-in and keep the one-click console
guide.

## Likely blast radius (from a fresh read today)

- `app/src/renderer/bodies.ts` — the K3 entry; `recommended: true` moves.
- `app/src/renderer/components/ConnectCard.tsx` — the
  `"e.g. moonshotai/kimi-k2"` placeholder, picker presentation, the
  any-model and add-a-model paths, possibly the truthful CLI-sign-in line.
- `app/src/main/conductor/consent.ts` — only if the redesign changes what
  the card must derive; today's kimi/API split is by host and is honest.
- Pins to expect: `app/tests/conductor.spec.ts:61,193` (the placeholder
  text), `app/tests-unit/bodies.test.ts`,
  `app/tests-unit/consent.test.ts` (uses `moonshotai/kimi-k2` as a fixture
  id — likely not a recommendation pin; verify before editing).
- Next free task number at this writing: **121** (118 and 120 landed by the
  parallel lane; 119 landed by this lane). Check `main` history, the tasks
  directory, lane B, and every ref as always before claiming.
