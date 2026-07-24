# Task 030 — Report

What changed:

- **New curated-brain module.** `app/src/renderer/bodies.ts`: exports
  `Body` (`id`, `name`, `blurb`, optional `recommended: true`), `BODIES`
  (three entries), `RECOMMENDATION_NOTE` (the exact honest label), and
  `RECOMMENDED_BODY`. Ids were checked directly against the live public,
  keyless catalog `GET https://openrouter.ai/api/v1/models` on 2026-07-24
  (a read-only lookup, no project or personal data sent) before writing the
  file:
  - `moonshotai/kimi-k2` (recommended) — "Kimi K2."
  - `deepseek/deepseek-chat-v3.1` — "DeepSeek V3.1."
  - `openai/gpt-5-mini` — "GPT-5 Mini," the capable-cheap third option.
  All three ids were present in the fetched catalog at the time of writing;
  every blurb is a plain sentence naming a rough cost feel and is under 140
  characters (enforced by the new unit test below).
- **`app/tests-unit/bodies.test.ts`** (new): ids non-empty and unique,
  exactly one `recommended` entry, every blurb non-empty and under 140
  chars. Added to `app/tsconfig.unit.json`'s `include` list alongside a new
  entry for `src/renderer/bodies.ts` itself (renderer-side files weren't
  previously compiled by the unit tsconfig).
- **`app/src/renderer/components/ConnectCard.tsx`** — rewritten around a
  three-panel local state (`panel: "default" | "picker" | "guide"`, plus a
  `custom` flag):
  - **`default`** (the initial view): one-line explanation ("Paste your
    OpenRouter key — Cairn chooses everything else, and you can change it
    later."), no base URL or model input — `baseUrl` and `model` state
    already hold `DEFAULT_BASE_URL` and `RECOMMENDED_BODY.id` — a line
    naming the currently connecting brain and its blurb, the API key field
    (unchanged: password type, cleared after every connect attempt), the
    consent card fetch/display and checkbox (byte-for-byte unchanged text
    and gating: `!card || !checked || !model.trim() || !apiKey.trim() ||
    connecting`), the Connect button, and two quiet links ("Choose a
    different brain," "Where do I get a key?"). Choosing "Custom…" in the
    picker sets `custom = true`, which swaps the "connecting with X" line
    for the original free-text base URL + model fields — today's behavior,
    preserved exactly, reachable only through this path now.
  - **`picker`**: lists the three `BODIES` entries (name, blurb, and for
    the recommended one a "Recommended" chip plus the full sentence from
    `RECOMMENDATION_NOTE`) plus a fourth "Custom…" row. Selecting a curated
    body sets `baseUrl` back to the default, sets `model` to that body's
    id, clears `custom`, and returns to `default` — the existing
    `conductor:consentCard` refetch effect (keyed on `[baseUrl, model]`)
    picks up the change with no separate wiring needed. "Back" returns
    without changing anything.
  - **`guide`**: four plain-language `<ol className="welcome-steps">`
    steps (create an account, add a few dollars of credit, create a key on
    the Keys page, paste it here), a "Open openrouter.ai/keys" button
    (`cairn.openExternal`), and the honest cost note ("A long conversation
    usually costs a few cents; you can see prices per model on
    OpenRouter."). "Back" returns to `default`.
  The dispatch-gate pattern in `app/src/main/conductor/service.ts`
  (`connect()` re-derives and field-compares the consent card, requires
  `consentConfirmed === true`) was not touched — the renderer still only
  ever proposes a card that main independently re-derives and checks.
- **`app/src/renderer/app.css`**: added `.brain-list`, `.brain-item`,
  `.brain-item-head`, `.brain-item-tag`, `.brain-item-note` for the picker
  rows, following the existing `.switcher-item` button-as-list-row
  convention already used by `ProjectSwitcher.tsx`.
- **`app/src/main/ipc.ts`**: the `app:openExternal` allowlist gained the
  `openrouter\.ai\/` prefix (smallest change; still one `RegExp.test`
  anchored at `^https://`, exact-prefix style matching the two existing
  entries), so the walkthrough's "Open openrouter.ai/keys" button can
  actually open.
- **`app/tests/conductor.spec.ts`**: `connectToFixture` now clicks "Choose
  a different brain" → "Custom…" before filling the base URL and model
  fields (the fixture's local URL isn't a curated brain). The first
  scenario ("the connect card blocks until consent…") gained assertions for
  the one-paste default (`input[type="text"]` count is 0; the card contains
  "Kimi K2"), the picker (contains all three curated names plus a visible
  "Custom…" button), and the walkthrough (contains its first two steps'
  text and an "Open openrouter.ai/keys" button) before proceeding through
  Custom to connect exactly as before. Every other scenario's assertion
  substance (consent gating, disconnect-then-relaunch, the full
  proposed-task-to-dispatch loop, persistence and `.cairn` exclusion,
  malformed-block handling, the 401 plain-words message, mid-stream
  navigation releasing the lock, and the two-chip busy-state coverage) is
  unchanged — only reached through the new "Custom…" path.
- **Version 0.1.1 → 0.1.2** in `CONTRACT-TEMPLATE.md` line 3, `AGENTS.md`
  line 3, `cairn.html` (eyebrow line 43 + the embed's own "What this is"
  line), `core/package.json`, `cli/package.json`, `app/package.json`. Ran
  `npm install` at the repo root and in `app/` (`package-lock.json`: 2
  lines changed — the `cli`/`core` workspace version entries;
  `app/package-lock.json`: 3 lines — confirmed with `git diff --stat`, same
  shape as Task 028). Hand-edited `cli/package-lock.json`'s two version
  fields (lines 3 and 9), the same pattern Tasks 027/028 used, since that
  lockfile isn't regenerable from this repo layout.
- **Rebuilt core** (`npm run build --workspace core`), regenerating the
  gitignored `core/assets/contract.md` from the re-versioned template;
  `app/resources/contract.md` (also gitignored) regenerated in turn via
  `app/scripts/copy-assets.mjs` during `build:vite`. The contract **body**
  was not touched by this task — only the version line — so mirror equality
  at 0.1.2 was a pure rebuild, not a content edit.
- **`CHANGELOG.md`**: new top entry `## 0.1.2 — connecting is one paste —
  2026-07-24`, describing the one-paste default, the curated picker with
  the ids and the honest not-yet-evaluated label, and the in-app key
  walkthrough plus the allowlist prefix it needed. Closes with "Added no
  dependency" per the existing convention.

Checks run (all real, this session):

- Root `npm test` — **core 51/51** (including `contract mirrors match the
  canonical template`, now proving equality at 0.1.2) **+ cli 9/9**.
- `cd app && npm run typecheck` — clean.
- `cd app && npm run test:unit` — **43/43 pass** (grew from 40: +3 new
  `bodies.test.ts` cases).
- `cd app && npm run build:vite` — clean build (main, preload, renderer);
  `resources/contract.md synced from core` confirms the regenerated,
  re-versioned asset flowed through.
- `cd app && npm run test:smoke` (rebuilds then runs Playwright) —
  **20/20 pass**: `away.spec.ts` (1), `conductor.spec.ts` (8, all with the
  new one-paste/picker/walkthrough assertions and the "Custom…" routing),
  `projects.spec.ts` (3), `routing.spec.ts` (7), `serial.spec.ts` (1),
  `smoke.spec.ts` (1).
- Direct byte-for-byte check (Node, EOL-normalized): `core/assets/contract.md
  === CONTRACT-TEMPLATE.md` and `cairn.html`'s `id="src-contract"` block
  `=== CONTRACT-TEMPLATE.md` — both true, run after the version edits and
  the core rebuild.
- `diff` of `CONTRACT-TEMPLATE.md` and `AGENTS.md`'s first 20 lines —
  differs only in the project-facts block, as expected.
- `git diff --stat` on `package-lock.json`, `app/package-lock.json` after
  `npm install` — 2 and 3 lines changed respectively, version fields only.
- `git status --porcelain` before staging — matches exactly the 15 changed
  files plus 2 new files listed above, plus this task's own new records.
- Live catalog check: `curl https://openrouter.ai/api/v1/models` returned
  343 models; all three chosen ids (`moonshotai/kimi-k2`,
  `deepseek/deepseek-chat-v3.1`, `openai/gpt-5-mini`) were present, with
  pricing pulled from the same response used to write each blurb's cost
  feel.

How to try it:

```
git clone https://github.com/kjleblanc/cairn.git
cd cairn
npm ci && npm test
cd app && npm ci && npm run build:vite && npm start
```

On a governed project, the connect card now shows only an explanation, a
key field, "Connecting with Kimi K2 — …", the consent text, and two quiet
links — paste a real OpenRouter key, check the box, and Connect. "Choose a
different brain" shows Kimi K2 (marked recommended, with the full
not-yet-evaluated sentence), DeepSeek V3.1, GPT-5 Mini, and "Custom…";
picking a curated entry returns to the default view with that model set and
a refreshed consent card. "Custom…" reveals the base URL and model fields
for any other OpenAI-compatible provider (including a future local Ollama
URL). "Where do I get a key?" shows the four-step walkthrough and an "Open
openrouter.ai/keys" button that now opens (the allowlist gained the
`openrouter.ai/` prefix).

Limitations:

- The recommendation is honestly unevaluated: `RECOMMENDATION_NOTE` says so
  outright, and no eval-set run happened in this task — the evaluation set
  from the conductor design spec is what would confirm or change the pick.
- All three curated ids were live-verified against the public OpenRouter
  catalog on 2026-07-24 (see Checks); no best-known-id fallback was needed.
  If a later catalog change retires one of them, "Custom…" still accepts
  any model string, but the curated entry itself would need a follow-up
  task to notice and replace it — nothing in this codebase currently
  re-checks a curated id's live validity automatically.
- This is a UX refinement over the existing consent/dispatch machinery, not
  a new capability: the consent checkbox text, the main-process
  re-derivation and field-comparison gate in `conductor:connect`, key
  storage, and every adapter are untouched. No milestone movement.
- No automated test clicks the "Open openrouter.ai/keys" button itself
  (only asserts it's present and named correctly) — clicking it would
  invoke Electron's real `shell.openExternal` and open an actual browser
  window during the test run, which none of this suite's existing
  `openExternal`-adjacent UI (e.g. Settings' update-check links) exercises
  either.

Self-review: read `ConnectCard.tsx`, `BodyPill.tsx`, `Chat.tsx`, the
`openExternal` allowlist, `conductor.spec.ts`, and the `conductor:consentCard`
plumbing before starting, per the dispatch. Confirmed the consent checkbox's
label text is byte-for-byte unchanged by diffing the old and new
`ConnectCard.tsx` directly. Confirmed the Connect button's disabled
expression is unchanged. Followed the version-bump procedure from Tasks
027/028 exactly, including the same lockfile hand-edit pattern for
`cli/package-lock.json` and the same byte-for-byte mirror checks. Verified
model ids against the live catalog rather than guessing, per the dispatch's
explicit instruction and authorization for that one read-only network call.

Milestone movement: NO

Disposition: DONE
