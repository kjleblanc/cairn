import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOWN_FACES, faceForAdapter } from "../src/renderer/town/faces.js";

test("each model family gets its own face from its adapter id", () => {
  assert.equal(faceForAdapter("codex-exec").id, "codex");
  assert.equal(faceForAdapter("kimi-exec").id, "kimi");
  assert.equal(faceForAdapter("claude-code").id, "claude");
  assert.equal(faceForAdapter("gemini-cli").id, "gemini");
});

test("unknown or missing adapters keep the previous shared worker face", () => {
  for (const id of [null, undefined, "", "lab-worker", "some-future-adapter"]) {
    assert.equal(faceForAdapter(id).id, "worker-fallback");
  }
  const fallback = TOWN_FACES["worker-fallback"];
  // Whatever the state, the fallback is the previous working marks.
  assert.deepEqual(fallback.states.ready, fallback.states.working);
  assert.deepEqual(fallback.states.done, fallback.states.working);
  assert.deepEqual(
    fallback.states.working.map((s) => s.d),
    ["M 28 36 L 44 42", "M 70 34 L 57 41", "M 35 63 L 42 58 L 50 67 L 58 59 L 68 61"],
  );
});

test("Cairn's ready/thinking/working marks are the app's original geometry", () => {
  const cairn = TOWN_FACES.cairn;
  assert.deepEqual(
    cairn.states.ready.map((s) => s.d),
    ["M 36 35 L 36 48", "M 64 39 L 64 46", "M 33 63 Q 48 70 70 57"],
  );
  assert.deepEqual(
    cairn.states.thinking.map((s) => s.d),
    ["M 33 33 L 40 41", "M 65 32 L 65 41", "M 35 63 L 43 63 M 49 60 L 56 67 M 63 61 L 70 61"],
  );
  assert.deepEqual(
    cairn.states.working.map((s) => s.d),
    ["M 28 36 L 44 42", "M 70 34 L 57 41", "M 35 63 L 42 58 L 50 67 L 58 59 L 68 61"],
  );
});

test("every cast face has all four states, a distinct color, and its own blink", () => {
  const ids = ["cairn", "kimi", "codex", "claude", "gemini"] as const;
  const states = ["ready", "thinking", "working", "done"] as const;
  const colors = new Set<string>();
  const blinks = new Set<string>();
  for (const id of ids) {
    const face = TOWN_FACES[id];
    for (const state of states) {
      assert.ok(face.states[state].length >= 3, `${id} ${state} has strokes`);
    }
    colors.add(face.color);
    blinks.add(face.blink);
  }
  assert.equal(colors.size, ids.length);
  assert.equal(blinks.size, ids.length);
});

test("the owner-approved identity colors stay exact and separate from outcome colors", () => {
  assert.equal(TOWN_FACES.cairn.color, "var(--garden-cyan)");
  assert.equal(TOWN_FACES.kimi.color, "var(--face-kimi)");
  assert.equal(TOWN_FACES.codex.color, "var(--face-codex)");
  assert.equal(TOWN_FACES.claude.color, "var(--face-claude)");
  for (const face of Object.values(TOWN_FACES)) {
    assert.doesNotMatch(face.color, /green|stop|moss|coral/i);
  }

  const tokensCss = readFileSync(join(__dirname, "..", "..", "src", "renderer", "tokens.css"), "utf8");
  assert.match(tokensCss, /--garden-cyan:\s*#7fd8c8;/);
  assert.match(tokensCss, /--face-kimi:\s*#c9a7e8;/);
  assert.match(tokensCss, /--face-codex:\s*#f2a35c;/);
  assert.match(tokensCss, /--face-claude:\s*#9fb8d8;/);
});
