import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TownPresentationState } from "../src/shared/ipc.js";
import { readTownState, townStatePath, writeTownState } from "../src/main/townstore.js";

function project(t: test.TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-townstore-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function state(x = 0.3): TownPresentationState {
  return {
    version: 1,
    positions: { "worker:codex-exec": { x, y: 0.62 } },
    dividerWidth: 688,
  };
}

test("town presentation state round-trips and stays ignored by Git", (t) => {
  const root = project(t);
  const saved = writeTownState(root, state());
  assert.deepEqual(readTownState(root), saved);
  assert.equal(
    execFileSync("git", ["check-ignore", ".cairn/town-square.json"], { cwd: root, encoding: "utf8" }).trim(),
    ".cairn/town-square.json",
  );
  const raw = JSON.parse(readFileSync(townStatePath(root), "utf8")) as Record<string, unknown>;
  assert.deepEqual(Object.keys(raw).sort(), ["dividerWidth", "positions", "version"]);
});

test("corrupt or unknown state falls back without blocking the project", (t) => {
  const root = project(t);
  writeTownState(root, state());
  writeFileSync(townStatePath(root), "{\"version\":99,\"positions\":\"bad\"}\n", "utf8");
  assert.deepEqual(readTownState(root), { version: 1, positions: {}, dividerWidth: 620 });
});

test("town stores are isolated by project root", (t) => {
  const first = project(t);
  const second = project(t);
  writeTownState(first, state(0.21));
  writeTownState(second, state(0.79));
  assert.equal(readTownState(first).positions["worker:codex-exec"]?.x, 0.21);
  assert.equal(readTownState(second).positions["worker:codex-exec"]?.x, 0.79);
});

test("writes reject invalid coordinates, unsafe keys, and divider widths", (t) => {
  const root = project(t);
  assert.throws(() => writeTownState(root, { ...state(), positions: { worker: { x: -1, y: 0.5 } } }), /TOWN_STATE_INVALID/);
  assert.throws(() => writeTownState(root, { ...state(), positions: { constructor: { x: 0.5, y: 0.5 } } }), /TOWN_STATE_INVALID/);
  assert.throws(() => writeTownState(root, { ...state(), dividerWidth: 1000 }), /TOWN_STATE_INVALID/);
});

test("caller extras are never serialized into the presentation file", (t) => {
  const root = project(t);
  const input = { ...state(), provider: "must-not-persist", task: "must-not-persist" } as TownPresentationState;
  writeTownState(root, input);
  const raw = readFileSync(townStatePath(root), "utf8");
  assert.equal(raw.includes("must-not-persist"), false);
});
