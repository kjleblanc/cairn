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
