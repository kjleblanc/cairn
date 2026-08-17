import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeTownLayout,
  TOWN_BOUNDS,
  TOWN_CENTER,
  TOWN_SHORE_BESIDE_CHAT,
  townShore,
  type TownLayoutNode,
} from "../src/renderer/town/layout.js";

function crowdedTown(): { nodes: TownLayoutNode[]; links: Array<{ source: string; target: string }> } {
  const workers = Array.from({ length: 8 }, (_, index) => ({ id: `worker:run-${index}`, radius: 0.105 }));
  return {
    nodes: [{ id: "cairn", radius: 0.12 }, ...workers],
    links: workers.map((worker) => ({ source: "cairn", target: worker.id })),
  };
}

test("the bounded force layout is deterministic and keeps Cairn pinned", () => {
  const town = crowdedTown();
  const first = computeTownLayout(town.nodes, town.links);
  const second = computeTownLayout(town.nodes, town.links);
  assert.deepEqual(first, second);
  assert.deepEqual(first.cairn, TOWN_CENTER);
});

test("eight workers settle inside the town bounds with separated centers", () => {
  const town = crowdedTown();
  const layout = computeTownLayout(town.nodes, town.links);
  const points = Object.entries(layout);
  for (const [id, point] of points) {
    assert.ok(point.x >= TOWN_BOUNDS.minX && point.x <= TOWN_BOUNDS.maxX, `${id} x is out of bounds`);
    assert.ok(point.y >= TOWN_BOUNDS.minY && point.y <= TOWN_BOUNDS.maxY, `${id} y is out of bounds`);
  }
  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const [leftId, a] = points[left]!;
      const [rightId, b] = points[right]!;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      assert.ok(distance >= 0.16, `${leftId} and ${rightId} are only ${distance.toFixed(3)} apart`);
    }
  }
});

test("a valid saved worker point is reused while automatic peers still settle", () => {
  const saved = { x: 0.24, y: 0.64 };
  const layout = computeTownLayout(
    [
      { id: "cairn", radius: 0.12 },
      { id: "worker:saved", radius: 0.105, fixed: saved },
      { id: "worker:auto", radius: 0.105 },
    ],
    [
      { source: "cairn", target: "worker:saved" },
      { source: "cairn", target: "worker:auto" },
    ],
  );
  assert.deepEqual(layout["worker:saved"], saved);
  assert.notDeepEqual(layout["worker:auto"], saved);
  assert.deepEqual(layout.cairn, TOWN_CENTER);
});

test("out-of-range saved points are clamped without moving Cairn", () => {
  const layout = computeTownLayout(
    [{ id: "cairn" }, { id: "worker:pinned", fixed: { x: -2, y: 8 } }],
    [{ source: "cairn", target: "worker:pinned" }],
  );
  assert.deepEqual(layout["worker:pinned"], { x: TOWN_BOUNDS.minX, y: TOWN_BOUNDS.maxY });
  assert.deepEqual(layout.cairn, TOWN_CENTER);
});

/* ------------------------------------------------------------------------ *
 * MOVED HERE by Task 259 (Slice 4), which deleted `pondline.test.ts` with the
 * surface that file was named after. These two tests are not about the pond:
 * they are about the Town's own shore, they still pass unchanged, and Slice 10
 * — which deletes the Town — is the slice that should decide their fate. The
 * Town no longer mounts in the running app, so `wholePond` is unreachable from
 * production; the visual lab's mock still renders the component.
 * ------------------------------------------------------------------------ */

test("the whole pond gives the cast the whole width", () => {
  // Beside the conversation a villager stops at the shore; with the pond whole
  // there is no conversation to stay clear of. Reverting this to a constant
  // used to leave every other assertion green.
  assert.equal(townShore(false), TOWN_SHORE_BESIDE_CHAT);
  assert.equal(townShore(true), TOWN_BOUNDS.maxX);
  assert.ok(townShore(true) > townShore(false), "the whole pond is no wider than the shore");
});

test("the whole-pond shore is wired to the prop, not pinned to a constant", () => {
  // townShore's value table is pinned above, but a call site that passed a
  // literal would keep every one of those assertions green.
  const town = readFileSync(
    join(__dirname, "..", "..", "src", "renderer", "components", "TownSquare.tsx"), "utf8");
  assert.match(town, /const shore = townShore\(wholePond\)/,
    "the render clamp is not wired to the wholePond prop");
});
