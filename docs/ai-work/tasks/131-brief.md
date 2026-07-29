# Task 131 brief: sign in with OpenRouter — one click, no key

**Lane:** A (main checkout)

## Requested visible outcome

On the connect card's paste screen for any OpenRouter-billed body (Kimi K3
and the models under "More choices"), a first-class **"Sign in with
OpenRouter"** button sits above the paste field. After the owner checks the
same consent checkbox as today and clicks it:

1. Their browser opens on OpenRouter's own authorization page (a fallback
   link is shown in case it doesn't).
2. The card shows a waiting state — "finish in your browser" — with a Cancel
   button.
3. When the owner approves, Cairn completes the PKCE exchange itself, stores
   the minted key through the existing encrypted keystore path, and the card
   lands exactly where a pasted-key connect lands (connected; seat memory
   records baseUrl+model only, as Task 127 established).

The owner never sees, copies, or pastes a key. The paste field stays on the
same screen as the quiet alternative, unchanged.

## Boundary of intent

- **Consent machinery byte-identical.** `consent.ts` untouched; the OAuth
  request carries the same `ConductorConsentCard` + `consentConfirmed` and
  passes the same field-by-field re-derivation gate in `service.ts` before
  any browser opens. No consent string changes anywhere.
- **The key never enters the renderer.** The browser dance and the exchange
  run in the main process; the minted key goes straight into
  `keystore.saveKey` — never over IPC, never to localStorage, never logged.
- **OpenRouter seats only.** The OAuth channel refuses (fail-closed, fixed
  message) any request whose card baseUrl is not the pinned OpenRouter base
  URL. Kimi and Custom doors are untouched and offer no OAuth button.
- **No credential borrowing, no real network in tests.** No CLI sign-in is
  read or reused. Tests use env seams (`CAIRN_OPENROUTER_AUTH_BASE` for the
  auth/exchange endpoints, `CAIRN_OAUTH_NO_BROWSER` to skip the real browser
  launch) against a local fake-OpenRouter fixture; no test contacts
  openrouter.ai or opens a browser.
- **No new dependencies.** `node:http` loopback listener, `node:crypto`
  PKCE, built-in `fetch`, Electron's existing `shell.openExternal`.
- **Paste, picker, guide, Kimi door, seat memory: unchanged.** The other
  lane's in-flight files (App.tsx, app.css, motion.css, Overlay.tsx,
  design/, the bodies.ts shim removal) are never staged or touched.

## Checks that show the outcome holds

- New `app/tests-unit/oauth.test.ts`, written red-first, pins: PKCE verifier
  shape and S256 challenge derivation; the exact auth URL; callback handling
  (right/wrong/absent state, missing code, wrong path); the exact exchange
  request body and endpoint; cancel and timeout refusals; malformed-exchange
  refusals. All with injected listener/fetch seams — no ports, no network.
- Full unit suite, `typecheck`, `build:vite`, `build:lab` green.
- New E2E in `conductor.spec.ts` against a fake-OpenRouter fixture (the
  fixture verifies the PKCE binding end-to-end: the challenge in the auth
  URL matches the verifier in the exchange body): checkbox-gated button;
  full dance lands connected with the OpenRouter seat; Cancel returns to the
  paste screen still disconnected; a doctored consent card is refused with
  the same fixed message as the paste gate. Full Playwright suite green with
  the app token held.
- Screenshot of the new paste screen + waiting state for the report.

## DONE / STOPPED

- **DONE:** the owner can check one box, click "Sign in with OpenRouter",
  approve in the browser, and land connected without ever touching a key —
  proven end-to-end against the fixture; all checks green; commit contains
  only this task's paths.
- **STOPPED:** the dance cannot keep the key out of the renderer, cannot
  reuse the existing consent gate unchanged, or cannot be tested without
  real network/browser.
