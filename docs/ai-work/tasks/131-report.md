# Task 131 report: sign in with OpenRouter — one click, no key

**Lane:** A (main checkout) · **Base:** landed on `main` at 2318ab6 (task 130)

## What actually changed

The connect card's paste screen for any OpenRouter seat now leads with a
**"Sign in with OpenRouter"** button. Same consent checkbox as the paste
path; clicking it opens OpenRouter's authorization page in the owner's
browser (with a fallback link on the waiting panel), the card waits with a
Cancel button, and the approval redirect completes the PKCE exchange
entirely in the main process. The minted key goes straight into the existing
encrypted keystore through the same `saveKey` call a pasted key takes; it
never crosses IPC, never touches localStorage, never logs. Success lands
exactly where a pasted-key connect lands (connected; Task 127's seat memory
records baseUrl+model only). The paste field stays on the same screen,
byte-identical, as the universal fallback; Kimi and custom seats show no
sign-in button.

Files touched:

- `app/src/main/conductor/oauth.ts` — **new.** The electron-free PKCE core:
  verifier/challenge/state minting, exact auth-URL layout, one-shot loopback
  listener (`createLoopbackListener`, 127.0.0.1 ephemeral port only),
  callback handling (wrong state 400 + keep waiting; state absent tolerated
  because OpenRouter doesn't promise to echo it — the PKCE binding ties the
  code to this attempt's challenge regardless; missing code 400; other paths
  404; post-settle 410 guard), the exchange POST, and the four fixed refusal
  strings (cancelled / timeout 180s / exchange failed / listener failed).
  Listener and fetch are injected seams — no unit test binds a port or
  reaches a network.
- `app/tests-unit/oauth.test.ts` — **new**, written red-first (TS2307
  missing module), 12 tests pinning all of the above, including the exact
  exchange body and that the verifier hashes to the auth URL's challenge.
- `app/src/shared/ipc.ts` — `ConductorOAuthRequest` (card + consent, **no
  key**), `ConductorOAuthEvent` (`done` / `failed`), three `CairnApi`
  members.
- `app/src/main/conductor/service.ts` — `beginOAuth`/`cancelOAuth`: the SAME
  re-derived consent gate as `connect()` (doctored card or unchecked box →
  `CONDUCTOR_CONNECT_NOT_AUTHORIZED`), a fail-closed pin that only the
  curated OpenRouter base URL may use the channel
  (`CONDUCTOR_OAUTH_NOT_AUTHORIZED`), one attempt app-wide (a new begin
  supersedes), `saveKey` on success, silent cancel. Env seams:
  `CAIRN_OPENROUTER_AUTH_BASE` (auth page + exchange target),
  `CAIRN_OAUTH_NO_BROWSER=1` (skip the real browser launch; the fallback
  link carries the flow).
- `app/src/main/ipc.ts` — `conductor:oauthBegin` / `conductor:oauthCancel`
  handlers; the terminal event goes out on `conductor:oauth` with a
  destroyed-sender guard.
- `app/src/preload.ts` — the three bridges.
- `app/src/renderer/components/ConnectCard.tsx` — the sign-in button block
  above the key field (OpenRouter seats only, checkbox-gated), the `oauth`
  waiting panel (fallback link, Cancel), the mount-time `onConductorOAuth`
  subscription (`done` = seat memory + close, identical to paste success;
  `failed` = back to the paste screen with the fixed refusal as the error),
  and the task-131 history paragraph. Consent surface untouched.
- `app/lab/mock-cairn.ts` — mock OAuth surface (begin shows the waiting
  panel; no event ever arrives; Cancel returns).
- `app/tests/fixtures/fake-openrouter.mjs` — **new.** Fake auth+exchange
  server: `GET /auth` 302s straight back with a minted code (state echoed);
  `POST /api/v1/auth/keys` 403s anything whose verifier doesn't hash to the
  recorded challenge — so a green E2E proves the PKCE binding end-to-end.
- `app/tests/conductor.spec.ts` — three new tests (below) plus the fixture
  boot in beforeAll.
- `app/tsconfig.unit.json` — include the new module.
- `docs/ai-work/tasks/131-brief.md` (committed alone, 1f8abaa), this report,
  `docs/ai-work/LOG.md`.

## Checks run, real results

- `npm run test:unit` — red-first confirmed (module missing), then **123/123
  green** (111 baseline + 12 new).
- `npm run typecheck` — green. `npm run build:vite` and `npm run build:lab` —
  green.
- Full Playwright with the app token held: `conductor.spec.ts` **26/26**
  (3 new), the six other specs **21/21** — **47/47 total**, re-run on the
  merged tree AFTER task 130 landed mid-task (2318ab6), so the result covers
  both lanes' work combined.
  - *Sign in with OpenRouter lands connected, no key anywhere*: button is
    checkbox-gated; auth URL parsed and pinned (fixture origin, S256,
    loopback callback); the test plays the browser (fetch auth URL → 302 →
    follow into the app's real loopback listener → 200 "return to Cairn");
    card closes; status shows the curated K3 seat on openrouter.ai; the
    fixture's own verdict confirms verifier↔challenge.
  - *Cancel*: returns to the paste screen, still disconnected, and a late
    browser finish finds the loopback door fully closed — connection
    refused. (First draft asserted an HTTP 410; the honest behavior after
    cancel is a torn-down listener, so the test now asserts the refusal.)
  - *Gates*: doctored card and unchecked box → `CONDUCTOR_CONNECT_NOT_AUTHORIZED`;
    a valid Kimi card → `CONDUCTOR_OAUTH_NOT_AUTHORIZED`; nothing stored.
  - Disclosed flake: `while one chip's reply streams…` failed once under
    machine load (its transient busy-text elapsed between two sequential
    assertions); green in isolation and in both full-file reruns. No code
    change — pre-existing timing sensitivity, noted for a future hardening
    task.
- Screenshots (untracked scratch, visually inspected; scratch spec deleted
  after): `app/test-results/task-131-paste-screen.png` (button, hint, "…or
  paste a key instead", unchanged consent block) and
  `app/test-results/task-131-waiting.png` (waiting panel with fallback link
  and Cancel).

## How to try it

- **Visual lab:** open the lab; with the brain disconnected the connect card
  shows "Sign in with OpenRouter" on the Kimi K3 screen — the mock never
  completes, so the waiting panel is previewable and Cancel returns.
- **The real dance (owner, first time):** in the packaged app, choose Kimi
  K3, check the consent box, click "Sign in with OpenRouter", approve in the
  browser. That first real run is also the live confirmation (see below).

## Limitations and remaining human judgment

- **The real OpenRouter service has not been touched.** Every test runs
  against the fixture; the URL layouts, parameters, and `{ key }` exchange
  response are pinned from OpenRouter's PKCE documentation (read 2026-07-29),
  not from a live handshake. If the real service deviates (a renamed
  parameter, an unechoed state — tolerated by design), the exchange refusal
  is honest and nothing is stored. The owner's first real sign-in is the
  live confirmation; if it fails, the exact refusal string names where.
- No key-validation call at connect — identical to the paste path today.
- `state` is sent but only validated when echoed (documented in `oauth.ts`);
  the PKCE challenge binding is what actually ties a callback to its attempt.
- OAuth remains OpenRouter-only by design; ChatGPT Plus / Claude Pro have no
  API door at all, and the Kimi membership seat keeps its console key (its
  endpoint offers no OAuth).

**Disposition: DONE**
