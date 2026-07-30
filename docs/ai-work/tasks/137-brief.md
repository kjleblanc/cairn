# Task 137 brief: the quiet card — few words, inline steps, sign-in first

**Lane:** A (main checkout)

## Requested visible outcome

The owner's words: "There's still a lot of text/lists… if a key is needed,
step by step and easy copy/paste field, in as few and as simple words and
steps as possible." The connect card becomes three lean flavors:

- **OpenRouter seats (K3 and the More-choices models):** body name → the
  consent block → checkbox → **Sign in with OpenRouter** (one short hint
  line). The key path collapses behind a quiet **"Use a key instead"**
  toggle, which opens three inline steps: 1. a button that opens
  openrouter.ai/keys, 2. "Create a key and copy it.", 3. "Paste it here:"
  with the field, then Connect.
- **Kimi subscription seat:** the three steps are the screen, no toggle:
  1. a button that opens the Kimi Code Console, 2. "Create a key and copy
  it — it's shown only once.", 3. "Paste it here:" with the field; one short
  CLI-truth line; consent block → checkbox → Connect.
- **Custom:** unchanged (fields + key + consent + Connect) — its provider
  has no named console to guide to.

The separate "Where do I get a key?" guide panel and its two list screens
are **removed** — the steps now live inline where they're needed. The
duplicated intro and "Connecting with X — blurb" lines go. OpenRouter
billing lines change from "key from openrouter.ai" to the post-131 truth:
**"Bills per use — sign in or paste a key"**.

## Boundary of intent

- **`consent.ts` and every consent string byte-identical.** The consent
  block stays fully visible above the checkbox — the standing authorization
  is never collapsed, shortened, or reworded. Only the text AROUND it gets
  the diet.
- **Behavior pins held:** OAuth flow, gates, and events untouched (no
  main-process, IPC, keystore, or oauth.ts changes); the paste connect path
  is the same `conductorConnect`; Task 127's seat memory still lands
  returning owners on a pre-filled screen with the key area open; Custom…,
  picker, add, and start panels unchanged except the OpenRouter billing
  line; `RECOMMENDATION_NOTE` unchanged; the key field keeps its exact
  placeholder.
- **No dependencies, no data or security-posture changes.** Renderer +
  shared strings + tests only.
- **The other lane's work is never staged or touched** (136 chat-in-scene
  mockup in flight; `design/`, `app/launch-build.log` untracked).

## Checks that show the outcome holds

- Updated E2E walks, written red-first where they assert the new flow:
  conductor.spec.ts's connect walk (sign-in first; toggle opens the 3-step
  key path; billing lines), its three OAuth tests (sign-in visible without
  the old intro), connect-kimi.spec.ts (3 inline steps, console button,
  shown-once honesty, short CLI truth, Connect still gated).
- New unit pin in bodies.test.ts, red-first: every OpenRouter body's billing
  line names the sign-in choice.
- `npm run test:unit`, `npm run typecheck`, `npm run build:vite`,
  `npm run build:lab` green.
- Full Playwright suite green with the app token held.
- Screenshots inspected: K3 sign-in screen, expanded key path, Kimi steps.

## DONE / STOPPED

- **DONE:** every screen on the connect card says only what the next click
  needs; a needed key is always three short inline steps from done; the
  guide panel is gone; consent is intact and visible; all checks green;
  commit contains only this task's paths.
- **STOPPED:** the compaction cannot hold the consent surface or a pinned
  behavior above.
