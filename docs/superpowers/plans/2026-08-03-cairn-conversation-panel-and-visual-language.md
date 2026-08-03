# Cairn Conversation Panel and Visual Language — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bright white conversation rectangle with the approved Lantern on Water — a warm lit panel resting on still dark water — and carry its pastel palette, its earned ripples, and its New Horizons treatment into the real app, including the narrow window.

**Architecture:** Four layers, in the order the codebase already separates them. Colour is data: the pastel set lands on the token names the cast already reads (`tokens.css`), so `faces.ts` needs no change and every surface re-tones at once. Shape and skin land in `app.css`, where `.town-square` and `.chat-column-villager` already live; the lantern re-points the app's paired tokens (`--card`, `--card-ink`, `--card-muted`, `--line`, `--card-solid`) inside its own scope, so its dozens of descendants re-tone through the cascade instead of being rewritten rule by rule. Motion lands in `motion.css`. The narrow window is the one piece needing new React: a status line component plus a `pondOpen` flag in `Workspace`, with Chat publishing the needs-you signal it already computes rather than a second component recomputing it.

**Tech Stack:** TypeScript, React, plain CSS, `node:test`, Playwright. No new dependencies.

This is **plan 2 of 4** from `docs/superpowers/specs/2026-08-02-cairn-showing-not-asking-design.md`, covering Decision 9 in full. It is second because it holds the spec's only unsolved problem — four panel directions failed at 760×620 — and because it is the container plan 3 fills.

**None of this exists yet.** The pastel palette appears zero times in `app/src/renderer/tokens.css`. This is a build, not a refactor.

## Global Constraints

- **No new dependencies.** Nothing is added to any `package.json`. `@fontsource/quicksand/700.css` (Task 6) is a weight already shipped inside the installed `@fontsource/quicksand`.
- **The approved reference is two files**, both outside the repository's history (excluded via `.git/info/exclude`, so they never enter a task commit):
  - `.superpowers/brainstorm/19609-1785686173/content/lantern-v3.html` — the look.
  - `.superpowers/brainstorm/52918-1785736835/content/narrow-v2.html` — the narrow behaviour.
  Open both before starting. Every literal colour, easing curve, and radius in this plan is transcribed from them.
- **Invent no colours.** Three of the four generated directions asserted in their own headers that they had invented none, and all three had. Every value below is either one of the seven approved colours, a value copied verbatim from an approved mockup, or a `color-mix` of one of those. **The plan contains exactly one derived value** — the ERROR chip's ink `#4a201c` in Task 4 — and it is labelled there so the owner can look at it.

  **What this rule protects, stated exactly, because three tasks in a row turned up borderline cases:** it protects against inventing a **hue**. That is the failure the spec records — directions that shipped colours the palette never approved and then said they hadn't.

  Three consequences, each one checkable rather than a matter of taste:

  1. **Every hue-bearing value must trace** to one of the seven approved colours, a mockup line, or an approved token — or be a `color-mix` of those. In a `color-mix`, the percentage is a blend ratio, not an alpha, and does not itself need a source.
  2. **The alpha on a traced hue must match** its mockup source or the rule it replaces. The hue being right does not make the alpha free. Three of this plan's own defects were exactly this, all caught in review: `--card: rgb(246 236 225 / 6%)` in Task 4 (fixed in `96c1284`), and `rgb(246 236 225 / 15%)` plus `rgb(22 27 44 / 94%)` in Task 5 (fixed in `61fb550`).
  3. **A neutral black shadow carries no hue** and does not need a mockup line — but it must use an alpha `app.css` already contains, so "the app's idiom" is a grep rather than a feeling. That set is `{.14, 16%, .18, 24%, 32%, 42%}` as of this plan's base. A shadow wanting a value outside it is proposing a new idiom and should say so.
- **The seven approved colours, with the roles they land on:** Cairn `#a3ddd0` → `--garden-cyan`; Kimi `#d5c0ec` → `--face-kimi`; Codex `#f3c49a` → `--face-codex`; Claude `#b8c9de` → `--face-claude`; done `#c2ddb6` → `--pond-done`; stopped `#f2aaa4` → `--pond-stop`; work in transit `#f7d3a8` → `--pond-task`.
- **Face geometry stays verbatim from `app/src/renderer/town/faces.ts`.** Now the owner's choice, not a constraint. Task 1 pins it and every later task must keep that test green.
- **Still water is the default.** At rest the pond is one continuous blend — no rings, no drawn contours, no perpetual ripple. A ripple exists only because a real event landed, in the receiver's own colour. **This changes Task 168's shipped behaviour**: the pond currently draws three permanent contour rings. That is a rule 168's brief stated and its implementation did not reach — not a defect it introduced.
- **`app/src/renderer/town/presentation.ts` stays the only arbiter of "an event happened."** No new notion of when something occurred, in CSS or anywhere else.
- **No new breakpoints.** 1260px and 620px already exist in `app/src/renderer/app.css`. Every failed direction invented its own.
- **Nothing above 1260px changes about the narrow work.** The approved wide layout is untouched by Task 7.
- **`prefers-reduced-motion` reaches the same final state.** Both reduced-motion blocks — `app.css` (currently line 718) and `motion.css` (currently line 112) — must cover every animation and transition this plan adds. `motion.css` is imported after `app.css` and wins ties, which is why its own block re-kills what it declares; keep that discipline.
- **The renderer may import from `@cairn/core` only with `import type`.** All five existing imports are type-only. Do not introduce the first runtime import.
- **Every line number below is as of this plan's HEAD**, before any task has run. Six of the seven tasks edit `app/src/renderer/app.css`, so line numbers shift as you go. Locate each edit by the selector or rule named beside the number, not by the number alone.
- Run app checks from `app/`: `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build:vite`, `npm.cmd run build:lab`.
- Playwright runs from `app/` as `npm.cmd run test:smoke` (it builds first). **Three failures are proven pre-existing** — two fail identically at `84abc91`, and `routing.spec.ts:387` needs a real `codex` on PATH. Compare against that baseline; do not claim you introduced or fixed them.
- **The E2E app token is a mutex directory.** `mkdir %TEMP%\cairn-app-token` fails if held. Hold it for the whole run, remove it after, and name it in the report.
- **Look at it.** Every automated check passed on Task 169 while the app still showed `STOPPED — CANCELLED_BY_OWNER`. A screenshot read aloud caught it; no command did.

---

### Task 1: Pin the approved face geometry

**Files:**
- Create: `app/tests-unit/lanternfaces.test.ts`

**Interfaces:**
- Consumes: `TOWN_FACES`, `TownFaceDef`, `TownFaceState` from `app/src/renderer/town/faces.ts` (all already exported).
- Produces: nothing imported by later tasks. It is the guard the next five tasks must keep green.

This task is first and changes no behaviour. The owner approved the mockups on the promise that every face path in them came verbatim from `faces.ts` — 20 of 20, checked by hand. That promise is currently held by a sentence in a spec. After this task it is held by a test, so a redesign cannot quietly redraw a face.

The mockups are excluded from the repository's history, so the test cannot read them. It carries their paths as literals instead, which is the stronger arrangement: the bar is fixed here, in tracked code.

`app/tests-unit/**/*.ts` is already inside `tsconfig.unit.json`'s `include` list, so a new test file needs no config change.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/lanternfaces.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { TOWN_FACES, type TownFaceDef, type TownFaceState } from "../src/renderer/town/faces.js";

/**
 * The approved mockups' faces, transcribed.
 *
 * The owner approved `lantern-v3.html` (the look) and `narrow-v2.html` (the
 * narrow behaviour) on the promise that every face path in them came verbatim
 * from `app/src/renderer/town/faces.ts` — 20 of 20 checked by hand. Both files
 * live outside this repository's history (`.git/info/exclude`), so this test
 * carries their paths as literals rather than reading them. That is the
 * stronger arrangement: the bar is fixed here, in tracked code, and a redesign
 * that redraws a face fails rather than passing quietly.
 *
 * Order matters and is the order the mockups draw in, which is the order
 * `TownFace` renders: the signature mark first, then eyeL, eyeR, mouth.
 */
type DrawnPath = [d: string, width: number, opacity: number];

function drawn(face: TownFaceDef, state: TownFaceState): DrawnPath[] {
  return [...face.mark, ...face.states[state]].map((stroke) => [stroke.d, stroke.w, stroke.o ?? 1]);
}

/** The four cast faces in lantern-v3, at rest. 4 + 5 + 5 + 3 = 17 paths. */
const LANTERN_V3_AT_REST: Record<"claude" | "kimi" | "codex" | "cairn", DrawnPath[]> = {
  claude: [
    ["M 42 25 L 58 25", 2.2, 0.7],
    ["M 28 40 L 44 40", 3.2, 1],
    ["M 56 40 L 72 40", 3.2, 1],
    ["M 35 61 Q 50 66 65 61", 2.8, 1],
  ],
  kimi: [
    ["M 77 23 Q 71 28.5 77 34", 2, 1],
    ["M 81.5 28 L 81.5 28.1", 2.4, 0.8],
    ["M 29 42 Q 37 33 45 42", 3.4, 1],
    ["M 57 40 Q 63 34 69 40", 2.6, 0.8],
    ["M 38 61 Q 50 69 64 59", 3, 1],
  ],
  codex: [
    ["M 24 17 L 24 25", 2, 1],
    ["M 20 21 L 28 21", 2, 1],
    ["M 27 33 L 43 40", 3.6, 1],
    ["M 60 36 L 68 36", 2.8, 0.85],
    ["M 36 62 Q 50 68 69 57", 3, 1],
  ],
  cairn: [
    ["M 36 35 L 36 48", 3.8, 1],
    ["M 64 39 L 64 46", 2.6, 0.75],
    ["M 33 63 Q 48 70 70 57", 3, 1],
  ],
};

/** narrow-v2 draws Codex mid-run instead of at rest. Its 5 paths again. */
const NARROW_V2_CODEX_WORKING: DrawnPath[] = [
  ["M 24 17 L 24 25", 2, 1],
  ["M 20 21 L 28 21", 2, 1],
  ["M 26 32 L 44 40", 3.8, 1],
  ["M 73 31 L 58 39", 3.2, 1],
  ["M 38 64 L 47 61 L 55 66 L 63 62 L 71 63", 3, 1],
];

test("every face in the approved look mockup is verbatim from faces.ts", () => {
  for (const [id, paths] of Object.entries(LANTERN_V3_AT_REST)) {
    assert.deepEqual(
      drawn(TOWN_FACES[id as keyof typeof LANTERN_V3_AT_REST], "ready"),
      paths,
      `${id}'s resting face no longer matches the approved lantern-v3 mockup`,
    );
  }
});

test("the narrow mockup's working Codex is verbatim from faces.ts too", () => {
  assert.deepEqual(
    drawn(TOWN_FACES.codex, "working"),
    NARROW_V2_CODEX_WORKING,
    "Codex mid-run no longer matches the approved narrow-v2 mockup",
  );
});

test("all twenty approved paths are accounted for", () => {
  // lantern-v3 draws Cairn twice: once on the pond, once in the lantern's own
  // header. 17 distinct strokes + Cairn's 3 again = the 20 the owner was told
  // had been checked.
  const distinct = Object.values(LANTERN_V3_AT_REST).reduce((total, paths) => total + paths.length, 0);
  assert.equal(distinct + LANTERN_V3_AT_REST.cairn.length, 20);
});

test("the mockups drew a face for every cast member the app can show", () => {
  // Gemini and the fallback worker are absent from both mockups, so nothing
  // here pins them — but their geometry must still exist, or a live run with
  // one of those adapters would render an empty head.
  for (const id of ["gemini", "worker-fallback"] as const) {
    assert.ok(TOWN_FACES[id].states.ready.length >= 3, `${id} has no resting face`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

First, prove the test bites rather than passing vacuously. In `app/src/renderer/town/faces.ts` line 43, temporarily change Cairn's resting left eye from `"M 36 35 L 36 48"` to `"M 36 35 L 36 47"`, then run from `app/`:

```bash
npm.cmd run test:unit
```

Expected: FAIL — `every face in the approved look mockup is verbatim from faces.ts` reports `cairn's resting face no longer matches the approved lantern-v3 mockup`.

Now **revert that one character** (`M 36 35 L 36 48`) and move to Step 3.

- [ ] **Step 3: Write minimal implementation**

None. `faces.ts` already satisfies the test; the whole point of this task is that it does. Confirm `git diff app/src/renderer/town/faces.ts` is empty before continuing.

- [ ] **Step 4: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests, including the four new ones.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/tests-unit/lanternfaces.test.ts
git commit -m "Pin the approved mockups' face geometry against faces.ts"
```

---

### Task 2: The pastel palette

**Files:**
- Modify: `app/src/renderer/tokens.css:35-38` (no change — read only), `:61-66` (garden cyan), `:75-78` (pond semantics), `:82-87` (the cast), and a new block before `:113` (`--mono`)
- Modify: `app/tests-unit/faces.test.ts:70-75`
- Modify: `app/tests/conductor.spec.ts` — twelve computed-colour pins
- Test: `app/tests-unit/palette.test.ts` (create)

**Interfaces:**
- Consumes: the Task 1 guard stays green (this task changes no geometry).
- Produces: CSS custom properties `--lantern-deep`, `--lantern-mid`, `--lantern-plum`, `--lantern-paper`, `--lantern-paper-lit`, `--lantern-ink`, `--lantern-soft`, `--pop`, `--ease`. Tasks 3 through 7 all read them.

The pastel set lands on the token names the cast already reads, so `faces.ts` is untouched and every surface re-tones at once. Pastels on a dark pond raise contrast rather than lowering it, so this costs no legibility.

Two colours the owner did not name are handled by naming them, not by guessing:

- **`--pond-result` (`#70e3d3`)** becomes `#a3ddd0`. It is not an eighth colour: `--pond-result` means "the result is with Cairn", and `TownSquare.tsx:277` already paints a returning ripple with Cairn's own colour. After this they finally agree.
- **`--face-gemini` (`#8ad8b0`) and `--garden-amber` (`#f2b95c`) are deliberately left alone.** The owner approved four cast colours; Gemini and the fallback worker are not among them, and picking pastels for them would be exactly the invention the spec's process note warns about. They will read as more saturated than the four beside them. That is a real, visible loose end and belongs in front of the owner at review, not in this plan.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/palette.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tokens = readFileSync(join(__dirname, "..", "..", "src", "renderer", "tokens.css"), "utf8");

/**
 * Decision 9, rule 3: the muted pastels supersede the saturated set. These
 * seven were chosen by the owner on 2026-08-02 and are the only colours this
 * work is allowed to introduce.
 */
const APPROVED: Array<[token: string, hex: string]> = [
  ["--garden-cyan", "#a3ddd0"],
  ["--face-kimi", "#d5c0ec"],
  ["--face-codex", "#f3c49a"],
  ["--face-claude", "#b8c9de"],
  ["--pond-done", "#c2ddb6"],
  ["--pond-stop", "#f2aaa4"],
  ["--pond-task", "#f7d3a8"],
];

/** The values the pastels replace. Any survivor is a half-finished re-tone. */
const SUPERSEDED = ["#7fd8c8", "#c9a7e8", "#f2a35c", "#9fb8d8", "#a9d39b", "#ff8178", "#ffb467", "#70e3d3"];

test("every approved pastel is on its own token", () => {
  for (const [token, hex] of APPROVED) {
    assert.match(tokens, new RegExp(`${token}:\\s*${hex};`), `${token} is not ${hex}`);
  }
});

test("no superseded saturated value survives on a re-toned token", () => {
  // --neon (#7fd8c8) is the project rail's own colour and is NOT part of
  // Decision 9, so it is excluded here by name rather than by accident.
  const withoutRail = tokens.replace(/--neon:\s*#7fd8c8;/, "--neon: RAIL;");
  for (const hex of SUPERSEDED) {
    assert.ok(!withoutRail.includes(hex), `${hex} is still in tokens.css after the pastel re-tone`);
  }
});

test("each cast glow is derived from its own pastel, not the old one", () => {
  assert.match(tokens, /--garden-cyan-dim:\s*rgb\(163 221 208 \/ 35%\);/);
  assert.match(tokens, /--garden-cyan-glow:\s*rgb\(163 221 208 \/ 9%\);/);
  assert.match(tokens, /--face-kimi-glow:\s*rgb\(213 192 236 \/ 9%\);/);
  assert.match(tokens, /--face-codex-glow:\s*rgb\(243 196 154 \/ 9%\);/);
  assert.match(tokens, /--face-claude-glow:\s*rgb\(184 201 222 \/ 9%\);/);
});

test("the lantern's own surfaces and easings exist for the panel work", () => {
  for (const [token, value] of [
    ["--lantern-deep", "#161b2c"],
    ["--lantern-mid", "#212739"],
    ["--lantern-plum", "#2f2946"],
    ["--lantern-paper", "#332c3a"],
    ["--lantern-paper-lit", "#3d3444"],
    ["--lantern-ink", "#f6ece1"],
    ["--lantern-soft", "#c3b3a6"],
  ] as const) {
    assert.match(tokens, new RegExp(`${token}:\\s*${value};`), `${token} is not ${value}`);
  }
  assert.match(tokens, /--pop:\s*cubic-bezier\(\.34, 1\.56, \.64, 1\);/);
  assert.match(tokens, /--ease:\s*cubic-bezier\(\.22, \.9, \.3, 1\);/);
});

test("Gemini and the fallback worker are left saturated on purpose", () => {
  // Recorded, not fixed. The owner approved four cast colours; these two are
  // not among them, and inventing pastels for them is exactly the failure the
  // design spec's process note records. Delete this test the day they are
  // chosen — never by changing the values under it.
  assert.match(tokens, /--face-gemini:\s*#8ad8b0;/);
  assert.match(tokens, /--garden-amber:\s*#f2b95c;/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL. `every approved pastel is on its own token` reports `--garden-cyan is not #a3ddd0`; `no superseded saturated value survives` reports `#c9a7e8 is still in tokens.css`; `each cast glow is derived from its own pastel` and `the lantern's own surfaces and easings exist` both fail. The `Gemini and the fallback worker` test passes already, which is correct — it pins a deliberate absence.

- [ ] **Step 3: Write minimal implementation**

In `app/src/renderer/tokens.css`, replace lines 59-66 (the garden block's cyan) so it reads:

```css
  --garden-deep: #2c2842;
  --garden-ink: #35304f;
  /* Decision 9, rule 3 (owner, 2026-08-02): the muted pastels supersede the
     saturated set. Cairn's is #a3ddd0; its dim and glow are that colour, not
     a second choice. --neon below keeps the old teal — it is the project
     rail's colour and is outside Decision 9. */
  --garden-cyan: #a3ddd0;
  --garden-cyan-dim: rgb(163 221 208 / 35%);
  --garden-cyan-glow: rgb(163 221 208 / 9%);
```

Replace lines 74-78 (the pond's semantic colours; `--pond-line` and the ground colours are Task 3's) so that block reads:

```css
  --pond-line: rgb(112 227 211 / 17%);
  --pond-task: #f7d3a8;
  /* "The result is with Cairn" — Cairn's own approved colour, not an eighth.
     TownSquare.tsx already paints a returning ripple with it; now the ripple
     and the status text agree. */
  --pond-result: #a3ddd0;
  --pond-done: #c2ddb6;
  --pond-stop: #f2aaa4;
```

Replace lines 82-87 (the cast) with:

```css
  --face-kimi: #d5c0ec;
  --face-kimi-glow: rgb(213 192 236 / 9%);
  --face-codex: #f3c49a;
  --face-codex-glow: rgb(243 196 154 / 9%);
  --face-claude: #b8c9de;
  --face-claude-glow: rgb(184 201 222 / 9%);
  /* Not part of Decision 9: the owner approved four cast colours, and Gemini
     is not one of them. Left saturated deliberately rather than guessed at. */
  --face-gemini: #8ad8b0;
  --face-gemini-glow: rgb(138 216 176 / 9%);
```

Immediately before line 113 (`--mono: ...`), insert:

```css
  /* Lantern on Water (Decision 9). The panel's own warm paper and the water it
     rests on, transcribed from the approved lantern-v3 mockup, plus its two
     easing curves: --pop overshoots (New Horizons), --ease settles. */
  --lantern-deep: #161b2c;
  --lantern-mid: #212739;
  --lantern-plum: #2f2946;
  --lantern-paper: #332c3a;
  --lantern-paper-lit: #3d3444;
  --lantern-ink: #f6ece1;
  --lantern-soft: #c3b3a6;
  --pop: cubic-bezier(.34, 1.56, .64, 1);
  --ease: cubic-bezier(.22, .9, .3, 1);
```

In `app/tests-unit/faces.test.ts`, replace lines 70-75 (the end of the last test) with:

```typescript
  // Decision 9, rule 3: the cast keeps its identity tokens; the values inside
  // them moved to the owner's pastel set on 2026-08-02.
  const tokensCss = readFileSync(join(__dirname, "..", "..", "src", "renderer", "tokens.css"), "utf8");
  assert.match(tokensCss, /--garden-cyan:\s*#a3ddd0;/);
  assert.match(tokensCss, /--face-kimi:\s*#d5c0ec;/);
  assert.match(tokensCss, /--face-codex:\s*#f3c49a;/);
  assert.match(tokensCss, /--face-claude:\s*#b8c9de;/);
});
```

In `app/tests/conductor.spec.ts`, update every computed-colour pin. These are the exact rgb() forms Chromium reports for the new hexes — `#a3ddd0` is `rgb(163, 221, 208)`, `#f3c49a` is `rgb(243, 196, 154)`, `#c2ddb6` is `rgb(194, 221, 182)`, `#f2aaa4` is `rgb(242, 170, 164)`:

| Line | Was | Becomes |
|---|---|---|
| 1021 | `entry.cairnStroke === "rgb(127, 216, 200)"` | `entry.cairnStroke === "rgb(163, 221, 208)"` |
| 1022 | `entry.workerStroke === "rgb(242, 163, 92)"` | `entry.workerStroke === "rgb(243, 196, 154)"` |
| 1025 | `entry.rippleColor === "rgb(242, 163, 92)"` | `entry.rippleColor === "rgb(243, 196, 154)"` |
| 1027 | `entry.workerStroke === "rgb(242, 163, 92)"` | `entry.workerStroke === "rgb(243, 196, 154)"` |
| 1379 | `entry.rippleColor === "rgb(255, 129, 120)"` | `entry.rippleColor === "rgb(242, 170, 164)"` |
| 1380 | `entry.cairnStroke === "rgb(127, 216, 200)"` | `entry.cairnStroke === "rgb(163, 221, 208)"` |
| 1394 | `.evaluate(...)).toBe("rgb(127, 216, 200)")` | `.evaluate(...)).toBe("rgb(163, 221, 208)")` |
| 1445 | `entry.cairnStroke === "rgb(127, 216, 200)"` | `entry.cairnStroke === "rgb(163, 221, 208)"` |
| 1448 | `entry.rippleColor === "rgb(127, 216, 200)"` | `entry.rippleColor === "rgb(163, 221, 208)"` |
| 1455 | `entry.rippleColor === "rgb(169, 211, 155)"` | `entry.rippleColor === "rgb(194, 221, 182)"` |
| 1456 | `entry.cairnStroke === "rgb(127, 216, 200)"` | `entry.cairnStroke === "rgb(163, 221, 208)"` |
| 1478 | `.evaluate(...)).toBe("rgb(127, 216, 200)")` | `.evaluate(...)).toBe("rgb(163, 221, 208)")` |

- [ ] **Step 4: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Confirm no stale pin survived:

```bash
grep -n "rgb(127, 216, 200)\|rgb(242, 163, 92)\|rgb(169, 211, 155)\|rgb(255, 129, 120)" app/tests/conductor.spec.ts
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add app/src/renderer/tokens.css app/tests-unit/palette.test.ts app/tests-unit/faces.test.ts app/tests/conductor.spec.ts
git commit -m "The cast and the pond wear the owner's pastel palette"
```

---

### Task 3: Still water — the pond stops rippling for nothing

**Files:**
- Modify: `app/src/renderer/components/TownSquare.tsx:372-376`
- Modify: `app/src/renderer/app.css:460-467` (`.town-square`), `:490-493` (`.town-skyglow`), `:495-518` (pond layer, contours, outcomes)
- Modify: `app/src/renderer/tokens.css` (delete the dead ground tokens)
- Modify: `app/src/renderer/motion.css:78-82`
- Test: `app/tests-unit/stillwater.test.ts` (create), `app/tests-unit/townpresentation.test.ts` (append)

**Interfaces:**
- Consumes: `--lantern-deep`, `--lantern-mid`, `--lantern-plum` from Task 2; the pastel `--pond-done` / `--pond-stop`.
- Produces: nothing later tasks import. The `.town-skyglow` element keeps its class name and becomes the sheen.

The shipped pond draws three permanent contour rings inside a bordered blob (`TownSquare.tsx:373-375`, `app.css:504-510`). Nothing animates them, and that is the problem: they are ripples that never happened, drawn forever. Decision 9 rule 4 says at rest the pond is one continuous blend.

The outcome tint moves with them. A settled DONE currently draws a coloured *rim*; still water has no rim, so it colours the water instead.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/stillwater.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");

/**
 * Decision 9, rule 4: "At rest the pond is one continuous blend — no rings, no
 * drawn contours, no perpetual animation." Task 168's brief already required
 * that motion be information and never perpetual decoration; its pond drew
 * three permanent contour rings anyway. These tests hold the rule where the
 * rings actually lived, so it cannot quietly come back.
 */
test("no drawn contour ring survives anywhere in the renderer", () => {
  for (const file of [["app.css"], ["components", "TownSquare.tsx"], ["motion.css"]]) {
    const source = renderer(...file);
    assert.ok(
      !source.includes("town-pond-contour"),
      `${file.join("/")} still draws a pond contour ring`,
    );
  }
});

test("the pond has no rim to draw", () => {
  // --pond-line was the contour and border colour. With still water there is
  // nothing for it to outline, so its absence is the rule made structural.
  assert.ok(!renderer("tokens.css").includes("--pond-line"), "--pond-line is still defined");
  assert.ok(!renderer("app.css").includes("--pond-line"), "--pond-line is still used");
});

test("the water breathes rather than drawing", () => {
  const motion = renderer("motion.css");
  assert.ok(motion.includes("town-sheen-drift"), "the sheen has no drift");
  assert.ok(!motion.includes("town-sky-breathe"), "the old skyglow pulse is still declared");
  // The drift must be killed for reduced motion like every other loop here.
  const reduced = motion.slice(motion.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(reduced.includes(".town-skyglow"), "the sheen is not killed for reduced motion");
});

test("a settled outcome colours the water instead of ringing it", () => {
  const css = renderer("app.css");
  const layer = css.slice(css.indexOf(".town-pond-layer {"), css.indexOf(".town-threads"));
  assert.ok(!/\bborder:/.test(layer), "the pond layer still draws a border");
  assert.ok(!/border-radius/.test(layer), "the pond layer still draws a blob edge");
  assert.ok(layer.includes("var(--pond-done)"), "DONE no longer tints the water");
  assert.ok(layer.includes("var(--pond-stop)"), "STOPPED no longer tints the water");
});
```

Append to `app/tests-unit/townpresentation.test.ts`:

```typescript
test("still water: a quiet pond makes no ripple, however often it is polled", () => {
  let state = hydrateTownPresentation(null, null);
  for (let poll = 0; poll < 12; poll += 1) {
    state = observeTownPresentation(state, null, null, true);
    assert.equal(state.activeCue, null, `poll ${poll} made a ripple out of nothing`);
    assert.deepEqual(state.queuedCues, [], `poll ${poll} queued a ripple out of nothing`);
  }
});

test("still water: a spent ripple is never replayed by a later poll", () => {
  const closed = session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  });
  // One observation of a finished run earns two landings: the result returning
  // to Cairn, then DONE. The obsolete dispatch is dropped — a handoff that is
  // already over is not news. (`a collapsed snapshot omits an obsolete dispatch
  // but keeps return then DONE`, above, pins that ordering.)
  let state = observeTownPresentation(hydrateTownPresentation(null, null), closed, null, true);
  assert.equal(state.activeCue?.kind, "return");

  // Drain every earned ripple, then the water must be still.
  const spent: string[] = [];
  for (let step = 0; state.activeCue && step < 10; step += 1) {
    const key = state.activeCue.key;
    if (!spent.includes(key)) spent.push(key);
    state = advanceTownCue(state, key);
  }
  assert.equal(state.activeCue, null, "the water never went still");
  assert.deepEqual(spent.map((key) => key.split(":").at(-1)), ["return", "done"]);

  // Every later poll of the same snapshot leaves it still.
  for (let poll = 0; poll < 12; poll += 1) {
    state = observeTownPresentation(state, closed, null, true);
    assert.equal(state.activeCue, null, `poll ${poll} replayed a spent ripple`);
    assert.deepEqual(state.queuedCues, [], `poll ${poll} queued a spent ripple`);
  }
  assert.equal(state.settledOutcome, "done");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL. `no drawn contour ring survives anywhere in the renderer` reports `app.css still draws a pond contour ring`; `the pond has no rim to draw`, `the water breathes rather than drawing`, and `a settled outcome colours the water instead of ringing it` all fail. The two `still water:` reducer tests **pass already** — the reducer was always right; it is the drawing that was not. Keeping them is deliberate: they are the guard that the fix below stays a CSS fix.

- [ ] **Step 3: Write minimal implementation**

In `app/src/renderer/components/TownSquare.tsx`, replace lines 372-376 with:

```tsx
        {/* Still water (Decision 9, rule 4). Three drawn contour rings used to
            live here — ripples that never happened, drawn forever. At rest the
            pond is now one continuous blend, and this layer carries only the
            colour a settled outcome washes over it. A real ripple exists only
            inside the keyed cue below. */}
        <div className={`town-pond-layer town-pond-${presentation.settledOutcome ?? "quiet"}`} aria-hidden="true" />
```

In `app/src/renderer/app.css`, replace lines 460-467 (`.town-square`) with:

```css
.town-square {
  position: relative; height: 100%; min-height: 360px; overflow: hidden;
  color: var(--lantern-ink);
  /* One continuous blend, from the approved lantern-v3 frame: three soft
     ellipses over a single diagonal. Nothing here has an edge that could read
     as a drawn ring. */
  background:
    radial-gradient(ellipse 90% 70% at 30% 68%, #2b3350, transparent 70%),
    radial-gradient(ellipse 70% 55% at 74% 14%, #352c4e, transparent 72%),
    radial-gradient(ellipse 60% 45% at 50% 100%, #1d2438, transparent 70%),
    linear-gradient(165deg, var(--lantern-plum), var(--lantern-mid) 45%, var(--lantern-deep));
}
```

Replace lines 490-493 (`.town-skyglow`) with:

```css
/* The sheen: the water breathes, it does not draw. Two soft pastel blooms from
   the approved lantern-v3 frame, blurred well past any edge. Its drift lives
   in motion.css. */
.town-skyglow {
  position: absolute; inset: 0; pointer-events: none; filter: blur(46px); opacity: .5;
  background:
    radial-gradient(ellipse 30% 20% at 32% 62%, rgb(163 221 208 / 13%), transparent 70%),
    radial-gradient(ellipse 22% 15% at 62% 40%, rgb(213 192 236 / 10%), transparent 72%);
}
```

Replace lines 495-518 (the pond layer, the three contour rules, and the two outcome rules) with:

```css
/* The outcome wash. Still water has no rim, so a settled DONE or STOPPED
   colours the water itself rather than drawing a ring around it. Quiet water
   carries no wash at all. */
.town-pond-layer {
  position: absolute; z-index: 0; inset: 0; pointer-events: none;
  opacity: 0; transition: opacity 300ms ease, background 300ms ease;
}
.town-pond-done {
  opacity: 1;
  background: radial-gradient(ellipse 62% 48% at 44% 56%,
    color-mix(in srgb, var(--pond-done) 13%, transparent), transparent 72%);
}
.town-pond-stopped, .town-pond-error {
  opacity: 1;
  background: radial-gradient(ellipse 62% 48% at 44% 56%,
    color-mix(in srgb, var(--pond-stop) 13%, transparent), transparent 72%);
}
```

In `app/src/renderer/tokens.css`, replace the pond block's now-dead ground colours. The block currently reads `--pond-deep`, `--pond-mid`, `--pond-plum`, `--pond-water`, `--pond-line`, then the four semantic colours. `.town-square` no longer names the first three, `--pond-water` never had a use, and `--pond-line` was the contour colour. Delete all five, leaving:

```css
  /* Task 168, re-toned by Decision 9: the pond's semantic colours. Identity
     stays on the faces above; these say what happened, not who did it. The
     ground colours that used to sit here are gone — still water is one blend,
     drawn by .town-square from the --lantern-* set. */
  --pond-task: #f7d3a8;
  --pond-result: #a3ddd0;
  --pond-done: #c2ddb6;
  --pond-stop: #f2aaa4;
```

In `app/src/renderer/motion.css`, replace lines 78-82 with:

```css
.town-skyglow { animation: town-sheen-drift 24s ease-in-out infinite; }
@keyframes town-sheen-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -16px) scale(1.06); }
}
```

`motion.css`'s reduced-motion block already lists `.town-skyglow` under `animation: none` (line 114) and `.town-pond-layer` under `transition: none` (line 119), so both new declarations are already covered. Confirm both lines are still present rather than assuming it.

- [ ] **Step 4: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Confirm nothing else referenced the deleted tokens. The guard test you just wrote necessarily quotes the very strings it forbids, so exclude it — otherwise its own assertions read as survivors:

```bash
grep -rn "pond-deep\|pond-mid\|pond-plum\|pond-water\|pond-line\|pond-contour" app/src app/tests app/tests-unit app/lab | grep -v "tests-unit/stillwater.test.ts"
```

Expected: no output. Run it once without the exclusion too: every hit must be inside `stillwater.test.ts`, and nowhere else.

- [ ] **Step 5: Commit**

```bash
git add app/src/renderer/components/TownSquare.tsx app/src/renderer/app.css app/src/renderer/tokens.css app/src/renderer/motion.css app/tests-unit/stillwater.test.ts app/tests-unit/townpresentation.test.ts
git commit -m "Still water: the pond ripples only for events that happened"
```

---

### Task 4: The lantern

**Files:**
- Modify: `app/src/renderer/app.css:386-405` (the villager column and its tail), and a new block after `:458`
- Modify: `app/src/renderer/app.css:451-458` (add the sway keyframes beside `villager-rise`)
- Test: `app/tests-unit/lantern.test.ts` (create)

**Interfaces:**
- Consumes: `--lantern-paper`, `--lantern-paper-lit`, `--lantern-ink`, `--lantern-soft`, `--pond-done`, `--pond-task`, `--pond-stop` from Task 2.
- Produces: the `.chat-column-villager` scope re-points `--card`, `--card-solid`, `--card-ink`, `--card-muted`, and `--line`. Task 6's lantern button rules and Task 7's narrow rules both sit inside that scope and rely on it.

The conversation is currently a large bright white rectangle occupying about a third of the screen and fighting the whole scene. It becomes a warm lit lantern resting on the dark water: light spills out of it onto the pond instead of covering the pond.

The load-bearing mechanic is the token re-point. `.chat-column` and its several dozen descendants are written against the app's paired tokens; redefining those five tokens on the lantern element re-tones every card, rule, and muted line inside it through the cascade. Only the surfaces that carry their own colour in the approved mockup are named explicitly below.

**The tail goes.** `.chat-column-villager::before` draws a cream pointer at Cairn. The approved lantern has none, and a cream tail against warm plum paper reads as a seam rather than an anchor.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/lantern.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "..", "..", "src", "renderer", "app.css"), "utf8");

/** The `.chat-column.chat-column-villager` rule body. */
function lanternRule(): string {
  const start = css.indexOf(".chat-column.chat-column-villager {");
  assert.notEqual(start, -1, "the villager column rule is gone");
  return css.slice(start, css.indexOf("}", start));
}

/**
 * app.css's `prefers-reduced-motion` block, brace-balanced.
 *
 * Slicing to end-of-file instead would be worse than useless here: the ≤620px
 * block further down carries `.chat-column.chat-column-villager`, whose text
 * contains `.chat-column-villager`, so a regression that dropped this element
 * from the real reduced-motion rule would still find the substring and pass.
 */
function reducedMotionBlock(): string {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "app.css has no reduced-motion block");
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}" && --depth === 0) return css.slice(start, index + 1);
  }
  return assert.fail("app.css's reduced-motion block never closes");
}

/**
 * Decision 9: "Lantern on Water". The conversation is a warm, softly lit
 * lantern resting on dark water — light spills from it onto the pond instead
 * of covering the pond. It replaces a large bright white rectangle that
 * occupied roughly a third of the screen and fought the whole scene.
 */
test("the panel is warm lit paper, not a bright rectangle", () => {
  const rule = lanternRule();
  assert.ok(rule.includes("var(--lantern-paper-lit)"), "the lantern is not lit paper");
  assert.ok(rule.includes("var(--lantern-paper)"), "the lantern has no paper body");
  assert.ok(!rule.includes("var(--card-solid);"), "the lantern is still the app's flat card fill");
});

test("light spills out of the lantern onto the water", () => {
  // Three shadows from the approved mockup: a hairline halo, a wide warm
  // spill, and the drop that lifts it off the pond. Two would be a border.
  const rule = lanternRule();
  const shadow = rule.slice(rule.indexOf("box-shadow:"), rule.indexOf(";", rule.indexOf("box-shadow:")));
  assert.equal(shadow.match(/rgb\(/g)?.length, 3, "the lantern does not spill light onto the water");
  assert.ok(shadow.includes("247 211 168"), "the spill is not the mockup's lantern gold");
});

test("the lantern re-points the paired tokens instead of rewriting its children", () => {
  const rule = lanternRule();
  for (const token of ["--card:", "--card-solid:", "--card-ink:", "--card-muted:", "--line:"]) {
    assert.ok(rule.includes(token), `${token} is not re-pointed inside the lantern`);
  }
  assert.ok(rule.includes("--card-ink: var(--lantern-ink)"), "the lantern's ink is not lantern ink");
});

test("the lantern has no tail", () => {
  assert.ok(
    !css.includes(".chat-column-villager::before"),
    "the villager tail is still drawn; the approved lantern floats free",
  );
});

test("the lantern sways, and stops swaying for reduced motion", () => {
  assert.ok(css.includes("@keyframes lantern-sway"), "the lantern does not sway");
  assert.ok(lanternRule().includes("lantern-sway"), "the sway is declared but never used");
  assert.ok(reducedMotionBlock().includes(".chat-column-villager"),
    "the sway is not killed for reduced motion");
});

test("each disposition chip wears its own approved colour", () => {
  for (const [selector, token] of [
    [".chat-column-villager .result-card-done", "var(--pond-done)"],
    [".chat-column-villager .result-card-stopped", "var(--pond-task)"],
    [".chat-column-villager .result-card-error", "var(--pond-stop)"],
  ] as const) {
    const start = css.indexOf(selector);
    assert.notEqual(start, -1, `${selector} has no lantern rule`);
    assert.ok(css.slice(start, css.indexOf("}", start)).includes(token), `${selector} is not ${token}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL. Five failures — `the panel is warm lit paper` reports `the lantern is not lit paper`; `light spills out of the lantern` fails on the shadow count; the token re-point, sway, and chip tests all fail. `the lantern has no tail` fails too, because the `::before` rule is still there.

- [ ] **Step 3: Write minimal implementation**

In `app/src/renderer/app.css`, replace lines 386-405 — the whole `.chat-column.chat-column-villager` rule **and** the `.chat-column-villager::before` tail rule that follows it — with:

```css
.chat-column.chat-column-villager {
  position: absolute; top: 12%;
  /* Wide enough for the conversation's contents (the run strip's two
   * controls, the top bar's three items); the 400px of Task 146 squeezed
   * them into wraps and clips. The width never pushes the left edge back
   * over Cairn's node while there is room to avoid it: calc(50% - 128px)
   * keeps the 96px anchor clearance plus the 32px pane margin, with a 400px
   * floor — below the floor (very narrow panes) the dialog slides left over
   * the node, the same overlay tradeoff the ≤620px centered mode already
   * makes, and tucking reveals him again. */
  left: max(16px, min(calc(50% + 96px), calc(100% - 32px - var(--town-chat-width))));
  width: var(--town-chat-width);
  height: auto; max-height: 76%; margin: 0;
  /* Lantern on Water (Decision 9). Warm paper lit from inside, resting on the
     dark pond: the light spills OUT of the panel onto the water instead of the
     panel covering the water. Three shadows do it — a hairline halo, a wide
     warm spill, and the drop that lifts it off the surface. */
  padding: 21px;
  border: 1px solid rgb(246 236 225 / 12%);
  border-radius: 34px;
  background: linear-gradient(170deg, var(--lantern-paper-lit), var(--lantern-paper) 62%, #2b2533);
  box-shadow:
    0 0 0 7px rgb(247 211 168 / 4%),
    0 0 70px rgb(247 211 168 / 11%),
    0 22px 54px rgb(0 0 0 / 42%);
  /* The paired tokens are re-pointed once, here. Every card, rule, and muted
     line inside the lantern is already written against them, so they re-tone
     through the cascade rather than being rewritten rule by rule. Only what
     carries its own colour in the approved mockup is named below.
     Each alpha is the mockup's own value for the surface that token serves:
     5% is `.l3-card` / `.l3-menu`, the card fill (lantern-v3.html:99,110);
     7% is `.l3-input`, the composer field (lantern-v3.html:130); 13% is the
     hairline rule (narrow-v2.html:66,69). */
  --card: rgb(246 236 225 / 5%);
  --card-solid: rgb(246 236 225 / 7%);
  --card-ink: var(--lantern-ink);
  --card-muted: var(--lantern-soft);
  --line: rgb(246 236 225 / 13%);
  color: var(--card-ink);
  /* The rise lands the panel; the sway begins where the rise ended, so the two
     never fight over `transform`. Both die together under the reduced-motion
     rule below, which already names this element. */
  animation: villager-rise .42s var(--spring) both, lantern-sway 8s ease-in-out .42s infinite;
}
```

Immediately after the `@keyframes villager-bob` block (currently ending at line 458), add:

```css
@keyframes lantern-sway {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  50% { transform: rotate(-.3deg) translateY(-5px); }
}

/* Inside the lantern (Decision 9). Everything not named here re-tones through
   the paired tokens re-pointed on the panel itself. */
.chat-column-villager .chat-topbar {
  padding-bottom: 14px; border-bottom: 1px solid rgb(246 236 225 / 9%);
}
.chat-column-villager .chat-messages { gap: 13px; padding: 15px 3px 10px; }
.chat-column-villager .bubble-cairn { line-height: 1.62; }
/* The owner's own voice keeps a fill so the two stay scannable — the mockup's
   warm peach, which is the one bright thing on the dark paper. */
.chat-column-villager .bubble-owner {
  background: linear-gradient(165deg, #fae3c8, #f3d0a8); color: #453120;
  border-radius: 20px 20px 7px 20px; box-shadow: 0 4px 15px rgb(247 211 168 / 20%);
}
.chat-column-villager .result-card,
.chat-column-villager .task-card,
.chat-column-villager .push-confirm,
.chat-column-villager .dispatch-panel { border-radius: 22px; }
.chat-column-villager .result-card-claims,
.chat-column-villager .task-card-details,
.chat-column-villager .task-chip { border-radius: 16px; }
/* The disposition chips. DONE's moss and its ink are verbatim from the
   approved mockup, as is STOPPED's amber pair (the mockup's own warm button).
   ERROR has no mockup precedent: its coral is approved, its ink #4a201c is
   derived the same way the mockup derives its own — the chip colour, heavily
   darkened. That is the ONE derived value in this plan; look at it. */
.chat-column-villager .result-card-done { background: var(--pond-done); color: #1e2e18; }
.chat-column-villager .result-card-stopped { background: var(--pond-task); color: #4a3520; }
.chat-column-villager .result-card-error { background: var(--pond-stop); color: #4a201c; }
.chat-column-villager .chat-composer {
  padding-top: 14px; border-top: 1px solid rgb(246 236 225 / 9%);
}
.chat-column-villager .chat-composer textarea { border-radius: 18px; padding: 12px 16px; }
.chat-column-villager .bubble-system { border-radius: 16px; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests, including Task 1's face pins and Task 3's still-water pins.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Run from `app/`: `npm.cmd run build:lab` — Expected: builds clean. `lab/chatmock.tsx` imports the same `app.css`, so this proves the lantern rules parse in the lab's build too.

- [ ] **Step 5: Commit**

```bash
git add app/src/renderer/app.css app/tests-unit/lantern.test.ts
git commit -m "The conversation becomes a lantern resting on the water"
```

---

### Task 5: The furniture goes warm and rounded

**Files:**
- Modify: `app/src/renderer/app.css:475-489` (header type), `:519-523` (threads), `:527-534` (the packet), `:563-567` (node status), `:613-623` (the bed), `:624-627` (overflow), `:628-648` (thread target), `:661-681` (detail chrome)
- Test: `app/tests-unit/furniture.test.ts` (create)

**Interfaces:**
- Consumes: `--lantern-ink`, `--lantern-soft` from Task 2; the pastel `--garden-cyan`, `--pond-task`, `--pond-result`.
- Produces: nothing later tasks import.

Decision 9 rule 1, second half: **the cast carries the identity; the furniture does not.** The owner said the imagery read *"too sci fi"*. The resolution is that the crisp luminous face strokes on dark **are** the Ghost in the Shell half, and everything around them goes warm, rounded, and friendly — so *"hairline rules, monospaced type, HUD labels, and crawling data-threads are removed."*

Every one of those four is still in the shipped town: eight rules set `var(--mono)`, five set `text-transform: uppercase`, the relationship threads are dashed with a glow (`stroke-dasharray: 4 4`), and each character stands inside a drawn 1px ellipse (`.town-node-bed span`).

Two boundaries, drawn once so this task does not sprawl:

- **In scope: the town square and the conversation.** Out of scope: the project rail, the welcome scene, and the overlay screens. Decision 9 is about the pond, the cast, and the conversation; the rail is a different room, and re-toning it was neither asked for nor approved.
- **`--mono` survives where the text really is machine text** — a file path in a result card is genuinely a path, and `.mono` is the right typeface for it. What goes is monospace used as *decoration*: status readouts, kickers, button faces, and the packet's label.

**The bed's `<span>` is restyled, not deleted.** `conductor.spec.ts:1194` locates `.town-worker-pad span` to check its animation under reduced motion; removing the element would fail that test with "element not found" rather than honestly.

**Nothing is resized.** *"The characters must be large and central"* already holds: `lantern-v3` draws Cairn in a 104px blob whose svg fills 76% — 79px — and ours is 78px; it draws the others in 68px blobs, 52px of svg, and ours are 68px, so they are larger than the approved mockup's, not smaller. A resize would put the 760×620 containment checks at risk for nothing.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/furniture.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "..", "..", "src", "renderer", "app.css"), "utf8");

/** Every `.town-*` rule, from the square down to its keyframes. */
const town = css.slice(css.indexOf(".town-square {"), css.indexOf("@keyframes town-face-float"));

/**
 * Decision 9, rule 1: the cast carries the identity; the furniture does not.
 * The owner's words were that the imagery read "too sci fi". The crisp
 * luminous faces ARE the Ghost in the Shell half; everything around them goes
 * warm, rounded, and friendly, and "hairline rules, monospaced type, HUD
 * labels, and crawling data-threads are removed."
 */
test("the town labels itself in words, not in machine type", () => {
  assert.ok(!town.includes("var(--mono)"), "a town surface is still set in machine type");
  assert.ok(!/text-transform:\s*uppercase/.test(town), "a town surface still shouts in HUD caps");
});

test("machine type survives where the text really is machine text", () => {
  // A file path in a result card IS a path. What Decision 9 removes is
  // monospace used as decoration, not monospace used correctly.
  assert.match(css, /\.mono \{[^}]*font-family: var\(--mono\)/s);
});

test("the threads no longer crawl", () => {
  assert.ok(!town.includes("stroke-dasharray"), "the relationship threads are still dashed");
});

test("no character stands inside a drawn ring", () => {
  const bed = town.slice(town.indexOf(".town-node-bed span {"));
  const rule = bed.slice(0, bed.indexOf("}"));
  assert.ok(!/border:/.test(rule), "each character still stands inside a hairline ellipse");
});

test("the cast is already the approved size and is deliberately not resized", () => {
  assert.match(town, /\.town-face \{[^}]*width: 78px/s);
  assert.match(town, /\.town-face-kimi[^{]*\{[^}]*width: 68px/s);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL. Three failures — `the town labels itself in words` reports `a town surface is still set in machine type`, `the threads no longer crawl` fails, and `no character stands inside a drawn ring` fails. The two tests that pin what stays (`.mono` and the face sizes) pass already, which is correct.

- [ ] **Step 3: Write minimal implementation**

In `app/src/renderer/app.css`, replace lines 475-489 (the header's type and its button) with:

```css
.town-square-header span {
  color: var(--lantern-soft); font-size: .68rem; font-weight: 700; letter-spacing: .02em;
}
.town-square-header strong { overflow: hidden; color: var(--lantern-ink); font-size: .9rem; text-overflow: ellipsis; white-space: nowrap; }
.town-header-actions { display: flex; min-width: 0; align-items: center; justify-content: flex-end; gap: 9px; }
.town-square-header p {
  min-width: 0; max-width: min(42vw, 390px); margin: 0; overflow: hidden; color: var(--lantern-ink);
  font-size: .74rem; text-align: right; text-overflow: ellipsis; white-space: nowrap;
}
.town-square-header button {
  flex: none; padding: 6px 12px; border: 0; border-radius: 999px;
  background: rgb(246 236 225 / 8%); color: var(--lantern-soft);
  font: inherit; font-size: .68rem; font-weight: 700; cursor: pointer;
}
/* 14% is the mockup's own hover fill (`.l3-ghost:hover`, lantern-v3.html:81). */
.town-square-header button:hover:not(:disabled) { background: rgb(246 236 225 / 14%); color: var(--lantern-ink); }
.town-square-header button:disabled { opacity: .38; cursor: default; }
```

Replace lines 519-523 (`.town-threads` and its path) with:

```css
.town-threads { position: absolute; z-index: 1; inset: 0; width: 100%; height: 100%; overflow: visible; }
/* A soft tether, not a data feed. The dashes and the glow were the crawling
   thread Decision 9 names; what a thread has to say is that two villagers are
   working together, and a faint continuous line says exactly that. */
.town-threads path {
  fill: none; stroke: color-mix(in srgb, var(--garden-cyan) 26%, transparent);
  stroke-width: .55; vector-effect: non-scaling-stroke;
}
```

Replace lines 527-534 (`.town-transfer-packet` and its dot) with:

```css
/* The packet keeps its word — the owner should be able to read what is
   crossing the water — but says it in the app's own rounded voice.
   `rgb(22 27 44 / …)` throughout this task is --lantern-deep (#161b2c) with an
   alpha, the same shape the old rules used with the retired --pond-deep — and
   with the SAME alphas those rules carried (92% here, 88% and 62% on the thread
   target below), so only the hue moves. It is a derivation of an approved
   colour, not a new one. */
.town-transfer-packet {
  position: absolute; left: var(--town-from-x); top: var(--town-from-y); display: flex; align-items: center; gap: 6px;
  min-width: 48px; max-width: 86px; padding: 5px 11px; transform: translate(-50%, -50%);
  border: 0; border-radius: 999px;
  background: color-mix(in srgb, var(--town-packet-color) 22%, rgb(22 27 44 / 92%));
  color: var(--lantern-ink); box-shadow: 0 0 18px color-mix(in srgb, var(--town-packet-color) 28%, transparent);
  font: inherit; font-size: .68rem; font-weight: 700; white-space: nowrap;
}
.town-transfer-packet i { width: 7px; height: 7px; flex: none; border-radius: 50%; background: var(--town-packet-color); box-shadow: 0 0 7px var(--town-packet-color); }
```

Replace lines 563-567 (`.town-node-status` and its dot) with:

```css
.town-node-status {
  position: relative; z-index: 1; display: flex; align-items: center; gap: 5px;
  color: var(--lantern-soft); font-size: .68rem; font-weight: 700;
}
.town-node-status i { width: 7px; height: 7px; border: 0; border-radius: 50%; background: var(--pond-task); }
```

Replace lines 613-627 (`.town-node-bed`, its two parts, and `.town-overflow-shape`) with:

```css
.town-node-bed {
  position: absolute; z-index: 0; left: 50%; top: 91px; width: 96px; height: 24px;
  transform: translate(-50%, -50%); pointer-events: none;
}
.town-node-bed::before {
  content: ""; position: absolute; inset: -8px 8px; border-radius: 50%;
  background: radial-gradient(ellipse, color-mix(in srgb, var(--agent-color) 12%, transparent), transparent 70%);
}
/* The hairline ellipse each character used to stand inside is now the light
   it casts. The element stays — conductor.spec.ts locates it for the
   reduced-motion check, and an absent element would fail that dishonestly.
   No `border` declaration at all, not `border: 0`: a span has no default
   border to reset, so the reset would be a no-op that reads — to a later
   maintainer and to this task's own test — as a border still being managed
   here. Absence is the assertion. */
.town-node-bed span {
  position: absolute; inset: 3px 7px; border-radius: 50%;
  background: radial-gradient(ellipse, color-mix(in srgb, var(--agent-color) 16%, transparent), transparent 72%);
}
.town-overflow-shape {
  width: 64px; height: 48px; display: grid; place-items: center; border: 0;
  border-radius: 24px; background: rgb(246 236 225 / 9%); color: var(--lantern-ink);
  font: inherit; font-size: .9rem; font-weight: 700;
}
```

Replace lines 628-648 (`.town-thread-target` and its parts) with:

```css
.town-thread-target {
  position: absolute; z-index: 4; min-width: 74px; padding: 5px 10px; transform: translate(-50%, -50%);
  border: 0; border-radius: 999px; background: rgb(22 27 44 / 88%);
  color: var(--lantern-ink); font: inherit; cursor: pointer;
  box-shadow: 0 4px 14px rgb(0 0 0 / 28%);
  transition: left 320ms var(--spring), top 320ms var(--spring), background-color 160ms ease;
}
.town-thread-target span { color: var(--pond-result); }
.town-thread-target small { display: block; color: var(--lantern-soft); font-size: .58rem; font-weight: 700; }
.town-thread-target[aria-pressed="true"] { background: color-mix(in srgb, var(--garden-cyan) 16%, rgb(22 27 44 / 88%)); }
.town-thread-target-transfer {
  min-width: 18px; width: 18px; height: 18px; padding: 0;
  background: rgb(22 27 44 / 62%); box-shadow: none;
}
.town-thread-target-transfer > * {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap;
}
.town-thread-target-transfer::after {
  content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--pond-result);
  box-shadow: 0 0 6px color-mix(in srgb, var(--pond-result) 45%, transparent);
}
```

Replace lines 661-681 (the detail card's kicker, state shape, and action) with:

```css
.town-detail-kicker { color: var(--town-muted); font-size: .62rem; font-weight: 700; letter-spacing: .02em; }
.town-detail h3 { margin: 2px 0 8px; font-size: .9rem; }
.town-detail p { margin: 0; color: var(--town-muted); font-size: .72rem; line-height: 1.45; }
.town-detail dl { display: grid; gap: 4px; margin: 0; font-size: .7rem; }
.town-detail dl div { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 8px; }
.town-detail dt { color: var(--town-muted); }
.town-detail dd { margin: 0; overflow-wrap: anywhere; }
.town-state-shape {
  flex: none; padding: 4px 10px; border: 0; border-radius: 999px;
  background: color-mix(in srgb, currentColor 14%, transparent);
  color: var(--garden-cyan); font: inherit; font-size: .62rem; font-weight: 700;
}
.town-state-working { color: var(--pond-task); }
.town-state-returned, .town-state-checking { color: var(--pond-result); }
.town-state-stopped, .town-state-error { color: var(--pond-stop); }
.town-state-thinking { opacity: .75; }
.town-state-more { color: var(--garden-cyan); }
.town-thread-key { color: var(--garden-cyan); font-size: 1.25rem; }
.town-detail-action {
  width: 100%; margin-top: 9px; padding: 8px 12px; border: 0;
  border-radius: 999px; background: var(--town-node-selected); color: var(--town-ink);
  font: inherit; font-size: .72rem; font-weight: 700; cursor: pointer;
}
.town-detail-action:hover { background: var(--town-node-hover); }
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Confirm the town's own chrome is genuinely clear of HUD type:

```bash
grep -n "town-.*var(--mono)\|stroke-dasharray" app/src/renderer/app.css
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add app/src/renderer/app.css app/tests-unit/furniture.test.ts
git commit -m "The town's furniture goes warm and rounded; the cast keeps the identity"
```

---

### Task 6: The New Horizons treatment

**Files:**
- Modify: `app/src/renderer/main.tsx:1-5` (the 700 weight)
- Modify: `app/src/renderer/app.css:3-10` (body and headings), `:22-32` (`.pill`), `:178-184` (`.followup-chip`), `:572-574` (`.town-face`), `:718-723` (reduced motion), and a new block after Task 4's lantern children
- Modify: `app/src/renderer/motion.css:89-97` (retire the generic composer-button treatment the new pill supersedes)
- Test: `app/tests-unit/newhorizons.test.ts` (create)

**Interfaces:**
- Consumes: `--pop`, `--ease` from Task 2; the `.chat-column-villager` scope from Task 4.
- Produces: the CSS custom property `--pill-edge`, read by `.pill` and set per variant. Task 7's `.pond-line` uses `--pop` and `--ease` directly, not `--pill-edge`.

Decision 9 rule 5, on every interactive surface: buttons are chunky pills with a solid lower edge that compresses on press; motion uses overshoot easing rather than linear ease-out; menu items stagger in and slide on hover; characters spring when touched; type is rounded and heavy, never thin.

**One honest substitution.** The mockup asks for weights up to 850. `@fontsource/quicksand` ships 300–700, and asking a browser for 850 gets synthesized faux-bold, which looks worse than the real 700. Every weight in this task is 600 or 700, and the 700 face is imported so none of it is faked.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/newhorizons.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * Decision 9, rule 5. Buttons are chunky pills with a solid lower edge that
 * compresses on press; motion overshoots rather than easing out; menu items
 * stagger; characters spring when touched; type is heavy, never thin.
 */
test("a pill has a solid lower edge that compresses under a press", () => {
  assert.ok(rule(".pill").includes("--pill-edge"), "the pill has no lower edge");
  const pressed = rule(".pill:active:not(:disabled)");
  assert.ok(pressed.includes("translateY(2px)"), "the pill does not sink when pressed");
  assert.ok(/box-shadow:\s*0 1px 0/.test(pressed), "the pill's edge does not compress");
});

test("motion overshoots instead of easing out", () => {
  assert.ok(rule(".pill").includes("var(--pop)"), "the pill does not overshoot");
  assert.ok(rule(".town-face").includes("var(--pop)"), "the cast does not spring");
});

test("the cast springs when touched", () => {
  assert.ok(css.includes(".town-node:hover .town-face"), "the cast does not react to a pointer");
  assert.ok(css.includes(".town-node:active .town-face"), "the cast does not compress when touched");
});

test("suggestions stagger in and slide on hover", () => {
  assert.ok(css.includes("@keyframes lantern-arrive"), "there is no arrival to stagger");
  for (const nth of [1, 2, 3, 4]) {
    assert.ok(
      css.includes(`.followup-chip:nth-child(${nth})`),
      `suggestion ${nth} does not take its own turn`,
    );
  }
  assert.ok(rule(".followup-chip:hover:not(:disabled)").includes("translateX(5px)"),
    "a suggestion does not slide under the pointer");
  // `both` would leave the final keyframe's `transform: none` pinned over the
  // hover slide forever. `backwards` fills only the delay, which is the half
  // the stagger actually needs.
  assert.ok(/animation:[^;]*lantern-arrive[^;]*backwards/.test(css),
    "the staggered arrival would freeze the hover slide");
});

test("type is heavy, and the heavy face is really loaded", () => {
  assert.match(css, /body\s*{[^}]*font-weight:\s*600/s);
  assert.match(css, /h1, h2, h3\s*{[^}]*font-weight:\s*700/s);
  assert.ok(!/font-weight:\s*[89]\d\d/.test(css),
    "a weight above 700 was asked for; Quicksand tops out at 700 and the rest is faux bold");
  assert.ok(renderer("main.tsx").includes("@fontsource/quicksand/700.css"),
    "700 is used but never imported, so it renders as synthesized bold");
});

test("every added motion stops for reduced motion", () => {
  // Brace-balanced, not sliced to end-of-file: the ≤620px and 621–1260px
  // blocks further down mention `.pill` and `.chat-column-villager`, so an
  // end-of-file slice would find those selectors and pass even after a
  // regression removed them from the reduced-motion rule itself.
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "app.css has no reduced-motion block");
  let depth = 0;
  let end = -1;
  for (let index = css.indexOf("{", start); index < css.length && end < 0; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}" && --depth === 0) end = index + 1;
  }
  assert.notEqual(end, -1, "app.css's reduced-motion block never closes");
  const reduced = css.slice(start, end);
  for (const selector of [".pill", ".town-face", ".followup-chip"]) {
    assert.ok(reduced.includes(selector), `${selector} keeps moving under reduced motion`);
  }
  // The rule is the same FINAL STATE, not merely less motion: a pill must
  // still sit on its edge and a suggestion must still be fully arrived.
  // Killing the animations is half of that; neutralising the hover and press
  // geometry is the other half, and naming only the selectors above would
  // pass with that half deleted.
  for (const selector of [
    ".pill:hover:not(:disabled)",
    ".town-node:hover .town-face",
    ".followup-chip:hover:not(:disabled)",
  ]) {
    assert.ok(reduced.includes(selector), `${selector} keeps its transform under reduced motion`);
  }
  assert.ok(reduced.includes("transform: none"),
    "reduced motion leaves a hover or press transform applied");
});

test("the lantern's own buttons are the mockup's mint and ghost", () => {
  assert.ok(rule(".chat-column-villager .pill-primary").includes("#bfe8dd"),
    "Send is not the approved mint gradient");
  assert.ok(rule(".chat-column-villager .pill-primary").includes("#7cbdae"),
    "Send has no solid lower edge to compress");
});

test("nothing outranks the pill's own press", () => {
  // `.chat-composer` holds exactly one button — the Send pill — and
  // `motion.css`'s `.chat-composer button:hover:not(:disabled)` is (0,3,1)
  // against `.pill:hover:not(:disabled)`'s (0,3,0), in a file imported AFTER
  // app.css. So a generic button rule there wins twice over, and the app's
  // most-clicked control keeps the old flat press while every test, the
  // typecheck, and both builds stay green. It happened; this is the guard.
  // Unqualified, not just `:hover`/`:active`: the bare
  // `.chat-composer button { transition: … }` shorthand alone is (0,1,1)
  // against `.pill`'s (0,1,0), which would silently drop `box-shadow` from
  // Send's transition list and make the edge snap instead of compress.
  const motion = renderer("motion.css")
    // A comment may name the selector — that is how the rule explains itself.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Killing the transition under reduced motion is correct, and this block
    // runs to the end of the file.
    .replace(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/, "");
  assert.ok(!motion.includes(".chat-composer button"),
    "a live rule in motion.css outranks the pill treatment on the Send button");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL. Seven failures — `.pill:active:not(:disabled)` has no rule at all, `--pill-edge` does not exist, `@keyframes lantern-arrive` is missing, `body`'s weight is unset, `700.css` is not imported, and the lantern's primary pill has no rule.

- [ ] **Step 3: Write minimal implementation**

In `app/src/renderer/main.tsx`, replace lines 1-5 with:

```typescript
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
// Decision 9, rule 5: type is rounded and heavy, never thin. Quicksand ships
// 300–700; asking for the mockup's 750–850 would get synthesized faux bold, so
// the heaviest real face is the one we load and the one we use.
import "@fontsource/quicksand/700.css";
import "./tokens.css";
import "./app.css";
import "./motion.css";
```

In `app/src/renderer/app.css`, replace lines 3-10 with:

```css
body {
  background: var(--bg); color: var(--ink);
  font-family: "Quicksand", ui-rounded, "Segoe UI", system-ui, sans-serif;
  font-size: 15.5px; line-height: 1.55; overflow-x: hidden;
  /* Decision 9, rule 5: heavy, never thin. 700 is Quicksand's real top. */
  font-weight: 600;
}
#root { min-height: 100vh; display: flex; flex-direction: column; }
h1, h2, h3 { line-height: 1.2; margin: 0 0 .35em; letter-spacing: -.01em; font-weight: 700; }
h1 { font-size: 1.65rem; }
h2 { font-size: 1.2rem; }
```

Replace lines 22-32 (`.pill` and its variants) with:

```css
/* New Horizons pills (Decision 9, rule 5): a chunky pill with a solid lower
   edge. It lifts under the pointer and sinks onto its own edge when pressed,
   so a press has weight instead of a colour change. --pill-edge is the edge
   colour each variant sets for itself. */
.pill {
  font: inherit; font-weight: 700; font-size: .95rem; border: none; border-radius: 999px;
  padding: 11px 22px; background: var(--card-solid); color: var(--card-ink); cursor: pointer;
  /* Every edge is a wash of a token this pill already carries, never a raw
     black: a real solid edge is a darker shade of the button, and deriving it
     keeps the "invent no colours" rule true without a neutral escape hatch. */
  --pill-edge: color-mix(in srgb, var(--card-ink) 16%, transparent);
  box-shadow: 0 4px 0 var(--pill-edge);
  transition: transform .3s var(--pop), box-shadow .3s var(--ease), background-color .2s, opacity .15s;
}
.pill:hover:not(:disabled) { transform: translateY(-2px) scale(1.04); }
.pill:active:not(:disabled) {
  transform: translateY(2px) scale(.97); box-shadow: 0 1px 0 var(--pill-edge);
  transition-duration: .09s;
}
.pill:focus-visible { outline: 3px solid var(--garden-cyan); outline-offset: 3px; }
.pill:disabled { opacity: .5; cursor: default; transform: none; }
.pill-primary { background: var(--green); color: var(--green-ink); --pill-edge: color-mix(in srgb, var(--green-deep) 55%, transparent); }
.pill-quiet { background: transparent; color: var(--card-muted); --pill-edge: transparent; }
.pill-danger { background: var(--stop-soft); color: var(--stop); --pill-edge: color-mix(in srgb, var(--stop) 34%, transparent); }
```

Replace lines 178-184 (`.followup-chip` and its two states) with:

```css
/* Suggestions stagger in and slide under the pointer (Decision 9, rule 5).
   The arrival fills BACKWARDS, not both: a forwards fill would pin the final
   keyframe's `transform: none` over the hover slide for good. */
.followup-chip {
  padding: 6px 12px; border: 1px dashed var(--line); border-radius: 999px;
  background: transparent; color: var(--card-ink); font: inherit; font-size: .85rem;
  cursor: pointer; text-align: left; max-width: 100%;
  animation: lantern-arrive .5s var(--pop) backwards;
  transition: transform .3s var(--pop), background-color .2s, border-color .2s;
}
.followup-chip:nth-child(1) { animation-delay: .05s; }
.followup-chip:nth-child(2) { animation-delay: .11s; }
.followup-chip:nth-child(3) { animation-delay: .17s; }
.followup-chip:nth-child(4) { animation-delay: .23s; }
.followup-chip:hover:not(:disabled) { background: var(--card); border-style: solid; transform: translateX(5px) scale(1.02); }
.followup-chip:active:not(:disabled) { transform: translateX(5px) scale(.98); }
.followup-chip:disabled { opacity: .5; cursor: default; }
@keyframes lantern-arrive {
  from { opacity: 0; transform: translateY(10px) scale(.94); }
  to { opacity: 1; transform: none; }
}
```

Replace lines 572-574 (`.town-face`) with:

```css
/* The cast springs when touched (Decision 9, rule 5). The transform lives on
   .town-face, which carries none of its own — .town-face-holo owns the float,
   .town-face-tilt owns the tilt, so nothing here fights either. */
.town-face {
  position: relative; z-index: 1; width: 78px; height: 78px; display: block; margin-bottom: 4px;
  transition: transform .45s var(--pop);
}
.town-node:hover .town-face { transform: scale(1.06); }
.town-node:active .town-face { transform: scale(.94); }
```

Replace the reduced-motion block at lines 718-723 with:

```css
@media (prefers-reduced-motion: reduce) {
  .town-node, .town-thread-target, .town-face-thought, .town-face, .pill,
  .followup-chip, .town-pond-layer { transition: none; }
  .town-face-holo, .town-face-eye, .town-face-thought circle, .town-face-mark path,
  .town-worker-pad span, .town-node-working .town-node-status i,
  .chat-column-villager, .chat-villager-chip, .followup-chip { animation: none; }
  /* Reduced motion reaches the same final state, so a pill still sits on its
     edge and a suggestion is still fully arrived — they simply get there
     without travelling. */
  .pill:hover:not(:disabled), .pill:active:not(:disabled),
  .town-node:hover .town-face, .town-node:active .town-face,
  .followup-chip:hover:not(:disabled), .followup-chip:active:not(:disabled) { transform: none; }
}
```

Finally, append the lantern's own button variants **after** Task 4's `.chat-column-villager` children block (so their source order beats the equal-specificity globals above):

```css
/* The lantern's buttons. The globals above give every pill its chunky edge;
   these give the lantern's three the mockup's own colours. Specificity note:
   `.pill:active:not(:disabled)` is 0,3,0 and beats these 0,2,0 rules, which is
   exactly right — the press must still compress whatever the resting colour. */
/* Only the edge needs saying: `--card-solid` and `--card-ink` are already
   re-pointed on the lantern (Task 4), so the base `.pill` rule above resolves
   to exactly these values inside this scope on its own. */
.chat-column-villager .pill {
  --pill-edge: color-mix(in srgb, var(--lantern-deep) 40%, transparent);
}
.chat-column-villager .pill-primary {
  background: linear-gradient(165deg, #bfe8dd, var(--garden-cyan)); color: #17302b;
  --pill-edge: #7cbdae;
  box-shadow: 0 5px 0 var(--pill-edge), 0 8px 20px rgb(163 221 208 / 22%);
}
.chat-column-villager .pill-quiet {
  background: rgb(246 236 225 / 7%); color: var(--lantern-soft); --pill-edge: transparent;
}
.chat-column-villager .pill-quiet:hover:not(:disabled) {
  background: rgb(246 236 225 / 14%); color: var(--lantern-ink);
}
.chat-column-villager .chat-tuck { color: var(--lantern-soft); }
.chat-column-villager .chat-tuck:hover { background: rgb(246 236 225 / 14%); color: var(--lantern-ink); }
```

Finally, in `app/src/renderer/motion.css`, retire the generic composer-button treatment that the new pill supersedes. **This is the step that makes the whole task real on the button the owner will press most.** `.chat-composer` holds exactly one button — the Send pill (`Chat.tsx:1225` renders `<Pill kind="primary">`, and `Ui.tsx:15` gives it `class="pill pill-primary"`) — and `motion.css`'s `.chat-composer button:hover:not(:disabled)` is specificity (0,3,1) against `.pill:hover:not(:disabled)`'s (0,3,0), in a file imported *after* `app.css`. It therefore wins twice over, and Send would keep its old flat `-1px` lift and 140ms `ease` while every test, the typecheck, and both builds stayed green.

Replace lines 89-97 with the same three rules minus `.chat-composer button`, which now has a better home:

```css
/* Buttons respond under the pointer. Named classes only — town nodes are
   transform-positioned buttons and must keep their own transform.
   `.chat-composer button` is deliberately absent: its only member is the Send
   pill, and `.pill` in app.css now owns every pill's hover and press. Putting
   it back would silently outrank that treatment, because this file loads last
   and the descendant selector is more specific. */
.town-square-header button, .rail-action, .rail-collapse {
  transition: transform 140ms ease, background-color 160ms ease, color 160ms ease, border-color 160ms ease;
}
.town-square-header button:hover:not(:disabled),
.rail-action:hover, .rail-collapse:hover { transform: translateY(-1px); }
.town-square-header button:active:not(:disabled),
.rail-action:active, .rail-collapse:active { transform: translateY(0) scale(.97); }
```

Leave `motion.css`'s reduced-motion block alone: it still names `.chat-composer button` under `transition: none`, which stays true and harmless — `.pill` is killed there by `app.css`'s own block as well.

- [ ] **Step 4: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Run from `app/`: `npm.cmd run build:lab` — Expected: builds clean.

- [ ] **Step 5: Commit**

```bash
git add app/src/renderer/main.tsx app/src/renderer/app.css app/src/renderer/motion.css app/tests-unit/newhorizons.test.ts
git commit -m "New Horizons treatment: pills with weight, springs, staggered suggestions"
```

---

### Task 7: The narrow window — a line, or the whole pond

**Files:**
- Create: `app/src/renderer/components/PondLine.tsx`
- Modify: `app/src/renderer/town/presentation.ts` (append two pure functions)
- Modify: `app/src/renderer/screens/Workspace.tsx` (the narrow query, `pondOpen`, `chatNeedsYou`, the pane)
- Modify: `app/src/renderer/screens/Chat.tsx:368-373` (the new prop), `~:992` (publish it)
- Modify: `app/src/renderer/components/TownSquare.tsx:172-190` (the `wholePond` prop), `:206-214`, `:307-314` (the shore)
- Modify: `app/src/renderer/app.css` — a `.pond-line` base rule, and a new `@media (max-width: 1260px)` block **after** the existing `@media (min-width: 621px) and (max-width: 1260px)` block
- Modify: `app/tests/conductor.spec.ts:1064-1104` (the 760×620 block)
- Test: `app/tests-unit/pondline.test.ts` (create)

**Interfaces:**
- Consumes: `TownRuntimePresentation` and `townPresentationStatus` from `town/presentation.ts`; `TOWN_BOUNDS` from `town/layout.ts`; `--pop`, `--ease`, `--lantern-ink`, `--lantern-soft` from Task 2.
- Produces: `pondLineTone(state: TownRuntimePresentation, needsYou: boolean): PondLineTone` and `pondLineLabel(state: TownRuntimePresentation, needsYou: boolean): string`, both exported from `town/presentation.ts`; the `PondLine` component; `TownSquare`'s new required `wholePond: boolean` prop; `Chat`'s new optional `onNeedsYouChange?: (needsYou: boolean) => void` prop.

All four explored panel directions failed at 760×620, each differently, and all for one reason: each tried to shrink its wide layout. A first attempt kept a reduced pond as a band and the owner's verdict was that it *"reads more consolation prize"*, which settled the rule:

> **A line is honest because it is a line. A small pond is dishonest because it pretends to be a picture.**

So: the pond is never reduced. At any width it is either its whole self or it is a sentence. Below 1260px the conversation is the default and takes the window; a status line at the top carries who is working and the water's state, and pressing it opens the pond **whole**, over the window.

Three things this needs from the existing code rather than from new invention:

1. **The needs-you signal is Task 155's, published, not recomputed.** `Chat.tsx:988` already computes `needsYou` from the proposal, dispatch, and push flows. Two independent answers to "is something waiting?" would eventually disagree, and the line would be the one that lied.
2. **The line's words are `townPresentationStatus`'s.** No second notion of what the water is doing.
3. **The whole pond uses the whole width.** `TownSquare.tsx:212` clamps every villager to `x ≤ 0.52` to keep them on the pond side of the conversation. With the conversation put away there is no shore to stay behind, so the clamp relaxes to `TOWN_BOUNDS.maxX` — a constant that already exists, not a new number.

`1260px` and `620px` are the only breakpoints used. The new rules go in a **second** `@media (max-width: 1260px)` block placed after the existing `@media (min-width: 621px) and (max-width: 1260px)` block, because that block sets `left`, `width`, and `.town-square-ground { right: 152px }` at equal specificity and would otherwise win on source order. That is placement, not a new breakpoint.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/pondline.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunSessionSnapshot } from "../src/shared/ipc.js";
import {
  hydrateTownPresentation,
  pondLineLabel,
  pondLineTone,
} from "../src/renderer/town/presentation.js";

function session(overrides: Partial<RunSessionSnapshot> = {}): RunSessionSnapshot {
  return {
    dir: "C:\\project",
    outcome: "Make the pond explain the work",
    adapterId: "codex-exec",
    conversationId: "conversation-1",
    worker: true,
    startedAt: "2026-08-02T12:00:00.000Z",
    activities: [],
    phase: "running",
    result: null,
    error: null,
    ...overrides,
  };
}

const runWorking = { stage: "Run", state: "working", detail: "Codex Exec is working." } as const;

/**
 * The narrow window, resolved 2026-08-03 and owner-approved. Below 1260px the
 * conversation takes the window and the pond becomes a line you can press. The
 * line is honest because it is a line: it never pretends to be a picture, so
 * it cannot read as a shrunken one.
 */
test("the line says who is working, in the pond's own words", () => {
  const working = hydrateTownPresentation(session({ activities: [runWorking] }), null);
  assert.equal(pondLineLabel(working, false), "Codex Exec worker is working.");
  assert.equal(pondLineTone(working, false), "busy");
});

test("a waiting decision turns the line amber and changes what it says", () => {
  const working = hydrateTownPresentation(session({ activities: [runWorking] }), null);
  assert.equal(pondLineTone(working, true), "needs-you");
  assert.notEqual(pondLineLabel(working, true), pondLineLabel(working, false));
  assert.match(pondLineLabel(working, true), /waiting for you/);
});

test("the line carries the water's settled state", () => {
  const quiet = hydrateTownPresentation(null, null);
  assert.equal(pondLineTone(quiet, false), "quiet");
  assert.equal(pondLineLabel(quiet, false), "Town is quiet.");

  const done = hydrateTownPresentation(session({
    activities: [runWorking, { stage: "Result", state: "done", detail: "DONE — verified." }],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  }), null);
  assert.equal(pondLineTone(done, false), "done");

  const stopped = hydrateTownPresentation(session({
    activities: [{ stage: "Run", state: "stopped", detail: "The worker stopped safely." }],
    phase: "closed",
  }), null);
  assert.equal(pondLineTone(stopped, false), "stopped");
});

test("a decision waiting outranks everything else the water is doing", () => {
  // Amber is the one state the owner has to act on; nothing may bury it.
  for (const state of [
    hydrateTownPresentation(null, null),
    hydrateTownPresentation(session({ activities: [runWorking] }), null),
  ]) {
    assert.equal(pondLineTone(state, true), "needs-you");
  }
});

const css = readFileSync(join(__dirname, "..", "..", "src", "renderer", "app.css"), "utf8");

test("the pond is never reduced — it is whole, or it is a line", () => {
  // Wide: the line is not there at all. Narrow: the line is, and the pond's
  // contents wait behind it. Nothing anywhere shrinks the pond to fit.
  const base = css.slice(css.indexOf("\n.pond-line {"), css.indexOf("}", css.indexOf("\n.pond-line {")));
  assert.ok(base.includes("display: none"), "the line shows on the approved wide layout");
  const narrow = css.slice(css.lastIndexOf("@media (max-width: 1260px)"));
  assert.ok(narrow.includes(".pond-line { display: flex"), "the line never appears at any width");
  assert.ok(narrow.includes("visibility: hidden"), "the pond's contents do not wait behind the line");
});

test("no new breakpoint was invented for the narrow window", () => {
  const widths = [...css.matchAll(/@media \(m(?:in|ax)-width: (\d+)px\)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(widths)].sort(), ["1260", "620", "621"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL at the TypeScript build step with `TS2305: Module '"../src/renderer/town/presentation.js"' has no exported member 'pondLineLabel'`.

- [ ] **Step 3: Write minimal implementation**

Append to `app/src/renderer/town/presentation.ts`:

```typescript
export type PondLineTone = "quiet" | "busy" | "needs-you" | "done" | "stopped";

/**
 * The narrow window's status line (Decision 9, resolved 2026-08-03). Below
 * 1260px the conversation takes the window and the pond becomes a sentence the
 * owner can go and look at — so this line carries who is working and what
 * state the water is in, and turns amber when a decision is waiting.
 *
 * `needsYou` is Task 155's signal, computed once in Chat and passed in. Two
 * independent answers to "is something waiting?" would eventually disagree,
 * and the line would be the one that lied.
 */
export function pondLineTone(state: TownRuntimePresentation, needsYou: boolean): PondLineTone {
  if (needsYou) return "needs-you";
  if (state.truth === "done") return "done";
  if (state.truth === "stopped" || state.truth === "error") return "stopped";
  if (state.truth === "quiet") return "quiet";
  return "busy";
}

/** The line's words. Never a second notion of what the water is doing. */
export function pondLineLabel(state: TownRuntimePresentation, needsYou: boolean): string {
  if (needsYou) return "Something in the conversation is waiting for you.";
  return townPresentationStatus(state);
}
```

Create `app/src/renderer/components/PondLine.tsx`:

```tsx
import { pondLineLabel, pondLineTone, type TownRuntimePresentation } from "../town/presentation";

/**
 * The honest line (Decision 9, the narrow-window resolution, owner-approved
 * 2026-08-03).
 *
 * A line is honest because it is a line: it never pretends to be a picture, so
 * it cannot read as a shrunken pond. Pressing it opens the pond WHOLE, over
 * the window; the control below brings the conversation back. Above 1260px the
 * whole thing is `display: none` — the approved wide layout is untouched.
 */
export function PondLine({ presentation, needsYou, open, onToggle }: {
  presentation: TownRuntimePresentation;
  needsYou: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const tone = pondLineTone(presentation, needsYou);
  return (
    <>
      <button type="button" className={`pond-line pond-line-${tone}`}
        aria-expanded={open}
        onClick={() => onToggle(!open)}>
        <span className="pond-line-dot" aria-hidden="true" />
        <span className="pond-line-text">{pondLineLabel(presentation, needsYou)}</span>
        <span className="pond-line-peek">
          look at the pond
          <span className="pond-line-chevron" aria-hidden="true">⌃</span>
        </span>
      </button>
      {open ? (
        <button type="button" className="pond-back" onClick={() => onToggle(false)}>
          Back to the conversation
        </button>
      ) : null}
    </>
  );
}
```

In `app/src/renderer/screens/Chat.tsx`, replace lines 368-377 — the whole signature, from `export function Chat({` through the `}) {` that closes its type literal — with:

```tsx
export function Chat({ dir, onBack, onOpenRun, embedded = false, focusSignal = 0, initialComposer = "", onNeedsYouChange }: {
  dir: string;
  onBack: () => void;
  onOpenRun: () => void;
  embedded?: boolean;
  focusSignal?: number;
  /** Task 160: words carried in once (a checkup suggestion) — read only at
   * mount, so later re-renders and project switches never re-seed them. */
  initialComposer?: string;
  /** Decision 9: the narrow window's status line turns amber when a decision
   * is waiting. That signal is Task 155's, computed below; this publishes it
   * rather than letting a second component work it out again. */
  onNeedsYouChange?: (needsYou: boolean) => void;
}) {
```

`useEffect` is already imported at `Chat.tsx:1`, so the effect below needs no import change.

Immediately after the `needsYou` constant (currently ending at line 991), insert:

```tsx
  // The narrow window's status line lives outside this component, so the
  // needs-you signal is published rather than recomputed there. One answer,
  // one place.
  useEffect(() => { onNeedsYouChange?.(needsYou); }, [needsYou, onNeedsYouChange]);
```

In `app/src/renderer/components/TownSquare.tsx`, add `wholePond` to the props. Replace lines 172-190 with:

```tsx
export function TownSquare({
  projectName,
  task,
  stream,
  presentation,
  positions,
  wholePond,
  onPositionsChange,
  onFocusChat,
  onOpenRun,
}: {
  projectName: string;
  task: RunSessionSnapshot | null;
  stream: ConductorStreamSnapshot | null;
  presentation: TownRuntimePresentation;
  positions: Record<string, TownPoint>;
  /** True only while the narrow window is showing the pond whole, over the
   *  conversation. There is then no shore to keep the cast behind. */
  wholePond: boolean;
  onPositionsChange: (positions: Record<string, TownPoint>) => void;
  onFocusChat: () => void;
  onOpenRun: () => void;
}) {
```

Replace lines 206-214 (the `points` memo) with:

```tsx
  // Chat is part of this same Town at every desktop width, so villagers stay
  // on the pond side of its shore — including at the 1260/1261 rail
  // breakpoint. When the narrow window shows the pond WHOLE there is no
  // conversation beside it, so the cast uses the layout's own full bound.
  // Stored coordinates are never rewritten either way.
  const shore = wholePond ? TOWN_BOUNDS.maxX : 0.52;
  const points = useMemo(() => Object.fromEntries(
    Object.entries({ ...automaticPoints, ...dragPoints }).map(([id, point]) => [
      id,
      { ...point, x: Math.min(point.x, shore) },
    ]),
  ), [automaticPoints, dragPoints, shore]);
```

Replace the clamp inside `pointFromClient` (line 311) with the same bound:

```tsx
      x: Math.max(TOWN_BOUNDS.minX, Math.min(shore, (clientX - bounds.left) / bounds.width)),
```

In `app/src/renderer/screens/Workspace.tsx`, add the import beside the others:

```tsx
import { PondLine } from "../components/PondLine";
```

Add two state hooks beside `reducedMotion` (after line 58):

```tsx
  // The narrow window (Decision 9). 1260px is the app's existing breakpoint;
  // this mirrors it in JS only because the cast's shore depends on it, and
  // CSS cannot tell the layout algorithm anything.
  const [narrow, setNarrow] = useState(() => window.matchMedia?.("(max-width: 1260px)").matches ?? false);
  const [pondOpen, setPondOpen] = useState(false);
  const [chatNeedsYou, setChatNeedsYou] = useState(false);
```

Add the matching effect immediately after the existing `prefers-reduced-motion` effect (after line 140):

```tsx
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1260px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
```

In the `activeDir` effect (line 142), add the reset beside `setError(null)`:

```tsx
    // A new active project is a new context: a stale error card from the old
    // one never follows the owner across it, and neither does an open pond.
    setError(null);
    setPondOpen(false);
```

Replace the `workspace-town-pane` section (lines 298-313) with:

```tsx
          <section className={`workspace-town-pane${pondOpen ? " workspace-town-pane-pond-open" : ""}`}
            aria-label="Town square">
            <PondLine presentation={runtimePresentation} needsYou={chatNeedsYou}
              open={pondOpen} onToggle={setPondOpen} />
            <TownSquare key={`town:${activeDir}`} projectName={projectStatus.facts.name || "Project"}
              task={townTask} stream={townStream}
              presentation={runtimePresentation}
              positions={townPresentation.positions}
              wholePond={narrow && pondOpen}
              onPositionsChange={(positions: Record<string, TownPoint>) => {
                const state = { ...townPresentationRef.current, positions };
                persistTownPresentation(activeDirRef.current, state);
              }}
              onFocusChat={focusChat}
              onOpenRun={() => setCenterView("task")} />
            <Chat key={`chat:${activeDir}`} dir={activeDir} embedded focusSignal={chatFocusSignal}
              initialComposer={composerSeedRef.current ?? undefined}
              onNeedsYouChange={setChatNeedsYou}
              onBack={openDashboard}
              onOpenRun={() => setCenterView("task")} />
          </section>
```

In `app/src/renderer/app.css`, add the line's base rule immediately after the `.workspace-town-pane` rule (currently ending at line 383):

```css
/* The narrow window's status line (Decision 9, approved 2026-08-03). Absent
   from the approved wide layout, which is untouched; the ≤1260px block below
   turns it on. */
.pond-line {
  display: none; position: absolute; z-index: 9; inset: 0 0 auto; width: 100%; height: 54px;
  align-items: center; gap: 11px; padding: 0 15px;
  border: 0; border-bottom: 1px solid rgb(246 236 225 / 9%);
  background: rgb(33 39 57 / 72%); backdrop-filter: blur(14px);
  color: var(--lantern-ink); font: inherit; font-size: .78rem; font-weight: 700;
  text-align: left; cursor: pointer;
  transition: background-color .25s var(--ease);
}
.pond-line:hover { background: rgb(43 51 74 / 82%); }
.pond-line:focus-visible { outline: 3px solid var(--garden-cyan); outline-offset: -3px; }
.pond-line-dot {
  flex: none; width: 7px; height: 7px; border-radius: 50%;
  background: var(--lantern-soft); box-shadow: 0 0 9px var(--lantern-soft);
}
.pond-line-busy .pond-line-dot { background: var(--pond-task); box-shadow: 0 0 9px var(--pond-task); }
.pond-line-done .pond-line-dot { background: var(--pond-done); box-shadow: 0 0 9px var(--pond-done); }
.pond-line-stopped .pond-line-dot { background: var(--pond-stop); box-shadow: 0 0 9px var(--pond-stop); }
/* Amber is the one state the owner has to act on, so it colours the whole
   line rather than a 7px dot. Task 155's needs-you signal decides it. */
.pond-line-needs-you {
  color: var(--pond-task);
  background: color-mix(in srgb, var(--pond-task) 14%, rgb(22 27 44 / 82%));
}
.pond-line-needs-you .pond-line-dot { background: var(--pond-task); box-shadow: 0 0 9px var(--pond-task); }
.pond-line-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pond-line-peek {
  display: flex; align-items: center; gap: 6px; margin-left: auto; flex: none;
  color: var(--lantern-soft); font-size: .72rem;
}
.pond-line-chevron { transition: transform .4s var(--pop); }
.workspace-town-pane-pond-open .pond-line-chevron { transform: rotate(180deg); }
.pond-back {
  display: none; position: absolute; z-index: 10; left: 50%; bottom: 18px;
  transform: translateX(-50%); padding: 10px 20px;
  border: 1px solid rgb(246 236 225 / 16%); border-radius: 999px;
  background: rgb(33 39 57 / 88%); color: var(--lantern-ink);
  font: inherit; font-size: .78rem; font-weight: 700; cursor: pointer;
  transition: transform .35s var(--pop), background-color .2s;
}
.pond-back:hover { transform: translateX(-50%) translateY(-2px) scale(1.04); }
.pond-back:focus-visible { outline: 3px solid var(--garden-cyan); outline-offset: 3px; }
```

Then add a **new** `@media (max-width: 1260px)` block immediately after the existing `@media (min-width: 621px) and (max-width: 1260px)` block (currently ending at line 806), before the Task 160 checkup comment:

```css
/* The narrow window, resolved 2026-08-03 and owner-approved.
   "A line is honest because it is a line. A small pond is dishonest because it
   pretends to be a picture." So the pond is never reduced: at this width it is
   either its whole self or it is a sentence. The conversation is the default,
   because that is where the owner acts; the pond is orientation, and
   orientation is something you go and check.
   This is a SECOND block at the SAME 1260px breakpoint, not a new one. It sits
   after the 621–1260 block because that block sets `left`, `width`, and
   `.town-square-ground { right }` at equal specificity and would otherwise win
   on source order. */
@media (max-width: 1260px) {
  .pond-line { display: flex; }
  .workspace-town-pane-pond-open .pond-back { display: block; }

  /* The town header is replaced by the line at this width. */
  .workspace-town-pane .town-square-header { display: none; }

  /* The pond's contents wait behind the line. `visibility`, not `opacity`:
     nothing hidden may be focusable, hoverable, or reported as visible. */
  .workspace-town-pane .town-square-ground,
  .workspace-town-pane .town-empty-note,
  .workspace-town-pane .town-detail { visibility: hidden; }
  .workspace-town-pane-pond-open .town-square-ground,
  .workspace-town-pane-pond-open .town-empty-note,
  .workspace-town-pane-pond-open .town-detail { visibility: visible; }

  /* Whole, not reduced: the ground fills the pane under the line. */
  .workspace-town-pane .town-square-ground { inset: 54px 12px 12px; }
  .workspace-town-pane .town-detail { inset: auto 12px 68px 12px; }

  /* The conversation takes the window. */
  .chat-column.chat-column-villager {
    left: 11px; right: 11px; top: 65px; bottom: 11px;
    width: auto; height: auto; max-height: none; transform: none;
    border-radius: 26px; padding: 15px;
    animation: villager-rise .42s var(--spring) both;
  }
  /* With the full width back, the top bar and run controls need none of the
     621–1260 block's cramping. */
  .chat-column-villager .chat-topbar { display: flex; }
  .chat-column-villager .run-strip-controls { flex: none; width: auto; margin-left: auto; }
  .chat-column-villager .run-strip-controls .pill { flex: none; padding: 11px 22px; font-size: .95rem; }
  .chat-column-villager .route-facts { grid-template-columns: repeat(3, 1fr); }

  /* Opening the pond puts the conversation away rather than shrinking it. */
  .workspace-town-pane-pond-open .chat-column.chat-column-villager {
    transform: translateY(102%); opacity: .35; pointer-events: none;
    transition: transform .48s var(--pop), opacity .3s var(--ease);
  }
  .workspace-town-pane-pond-open .chat-villager-chip { display: none; }
}
```

Finally, replace `app/tests/conductor.spec.ts` lines 1064-1104 (the old 760×620 block, from the `// At the minimum supported Town size` comment through `expect(narrowLayout).toEqual({ ... });`) with:

```typescript
  // The narrow window (Decision 9, approved 2026-08-03). All four explored
  // panel directions failed here, each by shrinking its wide layout. The
  // resolution: the pond is never reduced — at 760×620 it is either its whole
  // self or it is a sentence. Closed, the conversation takes the window and
  // the cast waits behind the line; opened, the pond is whole.
  await win.setViewportSize({ width: 760, height: 620 });
  await expect(win.getByRole("button", { name: /Conductor.*worker task running/ })).toBeVisible();
  const pondLine = win.locator(".pond-line");
  await expect(pondLine).toBeVisible();
  await expect(pondLine).toHaveAttribute("aria-expanded", "false");
  await expect(pondLine).toContainText("Codex Exec worker is working");
  await expect(town.locator(".town-node-cairn")).toBeHidden();
  await expect(worker).toBeHidden();
  const narrowClosed = await win.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>(".chat-column-villager")?.getBoundingClientRect();
    const pane = document.querySelector<HTMLElement>(".workspace-town-pane")?.getBoundingClientRect();
    const line = document.querySelector<HTMLElement>(".pond-line")?.getBoundingClientRect();
    if (!dialog || !pane || !line) throw new Error("Expected the narrow line and the conversation");
    const contains = (outer: DOMRect, inner: DOMRect) => inner.left >= outer.left - 1
      && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
    return {
      // Takes the window, and sits clear of the line rather than under it.
      dialogTakesTheWindow: dialog.width > pane.width - 40,
      dialogClearsTheLine: dialog.top >= line.bottom - 1,
      dialogFits: contains(pane, dialog),
      controlsFit: Array.from(document.querySelectorAll<HTMLElement>(
        ".chat-topbar button, .run-strip-controls button",
      )).every((control) => contains(dialog, control.getBoundingClientRect())),
      pageFits: document.documentElement.scrollWidth <= window.innerWidth
        && document.documentElement.scrollHeight <= window.innerHeight,
    };
  });
  expect(narrowClosed).toEqual({
    dialogTakesTheWindow: true,
    dialogClearsTheLine: true,
    dialogFits: true,
    controlsFit: true,
    pageFits: true,
  });

  // Pressing the line opens the pond WHOLE, over the window. Both villagers
  // are fully inside it and clear of each other — not crowded into the half
  // that used to be reserved for the conversation.
  await pondLine.click({ noWaitAfter: true });
  await expect(pondLine).toHaveAttribute("aria-expanded", "true");
  await expect(town.locator(".town-node-cairn")).toBeVisible();
  await expect(worker).toBeVisible();
  const narrowOpen = await win.evaluate(() => {
    const town = document.querySelector<HTMLElement>(".town-square")?.getBoundingClientRect();
    const cairnNode = document.querySelector<HTMLElement>(".town-node-cairn")?.getBoundingClientRect();
    const workerNode = document.querySelector<HTMLElement>(".town-node-worker")?.getBoundingClientRect();
    if (!town || !cairnNode || !workerNode) throw new Error("Expected the whole pond at 760x620");
    const contains = (outer: DOMRect, inner: DOMRect) => inner.left >= outer.left - 1
      && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
    const overlaps = (left: DOMRect, right: DOMRect) => left.left < right.right && left.right > right.left
      && left.top < right.bottom && left.bottom > right.top;
    return {
      cairnFits: contains(town, cairnNode),
      workerFits: contains(town, workerNode),
      castIsSeparate: !overlaps(cairnNode, workerNode),
      pageFits: document.documentElement.scrollWidth <= window.innerWidth
        && document.documentElement.scrollHeight <= window.innerHeight,
    };
  });
  expect(narrowOpen).toEqual({
    cairnFits: true, workerFits: true, castIsSeparate: true, pageFits: true,
  });

  // One control brings the conversation back.
  await win.getByRole("button", { name: "Back to the conversation" }).click({ noWaitAfter: true });
  await expect(pondLine).toHaveAttribute("aria-expanded", "false");
  await expect(town.locator(".town-node-cairn")).toBeHidden();

  // The rule fires at exactly the size it was written for. Terminal Glass's
  // never did, which is one of the four failures this resolution replaces —
  // so both sides of the boundary are checked, not just a comfortable width.
  await win.setViewportSize({ width: 1260, height: 820 });
  await expect(pondLine).toBeVisible();
  await win.setViewportSize({ width: 1261, height: 820 });
  await expect(pondLine).toBeHidden();

  // Above 1260px nothing about any of this exists: the approved wide layout is
  // untouched, and the line is gone rather than merely hidden from view.
  await win.setViewportSize({ width: 1320, height: 820 });
  await expect(pondLine).toBeHidden();
  await expect(town.locator(".town-node-cairn")).toBeVisible();
  await expect(town.locator(".town-square-header")).toBeVisible();
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0. This is also what catches a missed `wholePond` prop at the one `<TownSquare>` call site.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Run from `app/`: `npm.cmd run build:lab` — Expected: builds clean.

Take the E2E token, run Playwright, and release it:

```bash
mkdir "$TEMP/cairn-app-token" && npm.cmd run test:smoke; rmdir "$TEMP/cairn-app-token"
```

Expected: the same **three** pre-existing failures and no others. If a fourth appears, it is this task's, and the narrow block above is where to look first.

Two failure modes worth naming, so neither becomes a hunt:

- **`castIsSeparate: false`** means the two villagers still overlap with the pond whole. The shore relax is the lever: confirm `wholePond` is actually reaching `TownSquare` (React DevTools, or a temporary `console.log`), because `narrow && pondOpen` is false if the `matchMedia` effect never ran. The ground at 760×620 is 736×554, a node is 136px wide, and `TOWN_BOUNDS` spans `x ∈ [0.13, 0.87]` — there is room for both, so an overlap means the clamp is still 0.52.
- **A control asserted visible that Playwright calls hidden** means `visibility: hidden` is reaching further than intended. Playwright treats `visibility: hidden` as hidden and `opacity: 0` as visible; that asymmetry is why the narrow block uses visibility, and it is also why a stray inherited `hidden` is easy to miss by eye.

- [ ] **Step 5: Commit**

```bash
git add app/src/renderer/components/PondLine.tsx app/src/renderer/town/presentation.ts app/src/renderer/screens/Workspace.tsx app/src/renderer/screens/Chat.tsx app/src/renderer/components/TownSquare.tsx app/src/renderer/app.css app/tests/conductor.spec.ts app/tests-unit/pondline.test.ts
git commit -m "The narrow window: an honest line, or the pond whole"
```

---

## Final verification

- [ ] Run from `app/`: `npm.cmd run typecheck` — Expected: exit 0, no output.
- [ ] Run from `app/`: `npm.cmd run test:unit` — Expected: all pass, including every test added by Tasks 1–7.
- [ ] Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.
- [ ] Run from `app/`: `npm.cmd run build:lab` — Expected: builds clean.
- [ ] Run from `core/`: `npm test` — Expected: all pass. This plan touches no core file; run it anyway, because a green core is what proves that.
- [ ] Run from `app/`, holding the token: `npm.cmd run test:smoke` — Expected: the three proven pre-existing failures and no others.
- [ ] Run: `git diff --check` — Expected: no output.
- [ ] Run: `git status --short` — Expected: clean. In particular, confirm nothing under `.superpowers/brainstorm/` was staged.
- [ ] **Confirm the mockups are still excluded**: `git check-ignore -v .superpowers/brainstorm/19609-1785686173/content/lantern-v3.html` — Expected: a line naming `.git/info/exclude`.
- [ ] **Look at it — the pond at rest.** Launch the app with no run in flight and watch for ten seconds. Expected: one continuous blend, a sheen that drifts, and **no ring of any kind**. If you can see where the pond's edge is, this plan failed regardless of what the tests say.
- [ ] **Look at it — the narrow window.** Resize to 760×620. Expected: a line at the top, the conversation filling the window under it, no cast. Press the line: the pond fills the window whole with both villagers spread across it. Press "Back to the conversation": the conversation returns.
- [ ] **Look at it — reduced motion.** Turn on `prefers-reduced-motion` and repeat both. Expected: the same final states, arrived at without travel — no sway, no drift, no stagger, no pending ripple.
- [ ] **Show the owner.** Take one capture of the wide layout with a settled DONE card and one of the narrow window in both states, and put them in front of them. Decision 9 is a taste decision; the tests only prove it was implemented as written.

## What this plan deliberately does not do

- **It does not run the eval.** A run costs real money on the owner's account and needs their explicit go. Scenarios 11 and 12 still have written bars and no results, which is honest. The visual language is not scored by the eval in any case — it is scored by the owner's eyes.
- **It does not build the evidence section.** Decision 2 puts a before/after pair at the top of the card and an album behind it. That is plan 3, built into a panel this plan has already proven holds a full-width image pair at both sizes. The `.l3-ba` grid and the narrow mockup's stacked pair are the shapes it inherits; nothing here reserves space for them.
- **It does not touch attribution.** The "You said so / You weren't sure / Cairn chose" tags visible in `lantern-v3.html` are Decision 5, which is plan 4. Their styling is not carried over here, because styling a control that does not exist would leave dead CSS behind for someone to wonder about.
- **It does not pick colours for Gemini or the fallback worker.** The owner approved four cast colours; those two are not among them, and `palette.test.ts` pins their absence deliberately so the gap stays visible rather than being quietly filled in. They will read as more saturated than the four beside them.
- **It does not change the project rail's `--neon`.** Decision 9 is about the pond, the cast, and the conversation. The rail is a different room, and re-toning it was neither asked for nor approved.
- **It does not change what earns a DONE.** Every risk boundary keeps its pause, Git remains the ledger, the claim/verified split stays load-bearing, and `presentation.ts` remains the only arbiter of whether an event happened. Decision 9's release of visual preservation covers appearance only.
- **It does not adopt the recorded fallback.** If the toggle proves wrong in the real app, the recorded fallback is no pond below 1260px at all — only the line. That is a worse product and still an honest one, and it is the owner's call to make after looking, not this plan's to pre-empt.
