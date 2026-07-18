import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MODEL, MockEngine, pickEngine, resolveModel } from "../src/agents.js";

/** Run body with CAIRN_MODEL set to a given value (or unset), then restore it. */
function withEnvModel(value: string | undefined, body: () => void | Promise<void>): void | Promise<void> {
  const prev = process.env.CAIRN_MODEL;
  if (value === undefined) delete process.env.CAIRN_MODEL;
  else process.env.CAIRN_MODEL = value;
  const restore = () => {
    if (prev === undefined) delete process.env.CAIRN_MODEL;
    else process.env.CAIRN_MODEL = prev;
  };
  try {
    const r = body();
    if (r instanceof Promise) return r.finally(restore);
    restore();
  } catch (err) {
    restore();
    throw err;
  }
}

test("resolveModel: an explicit choice wins over the environment", () => {
  withEnvModel("env-model", () => {
    assert.equal(resolveModel("explicit-model"), "explicit-model");
  });
});

test("resolveModel: falls back to CAIRN_MODEL when no explicit choice is given", () => {
  withEnvModel("env-model", () => {
    assert.equal(resolveModel(), "env-model");
    assert.equal(resolveModel(""), "env-model");
    assert.equal(resolveModel("   "), "env-model"); // blank counts as "no choice"
  });
});

test("resolveModel: falls back to the built-in default when nothing is set", () => {
  withEnvModel(undefined, () => {
    assert.equal(resolveModel(), DEFAULT_MODEL);
    assert.equal(resolveModel(""), DEFAULT_MODEL);
  });
});

test("the built-in default model string is unchanged", () => {
  assert.equal(DEFAULT_MODEL, "claude-opus-4-8");
});

test("mock engine echoes the active model so a selection is visible offline", async () => {
  await withEnvModel(undefined, async () => {
    const seen: string[] = [];
    const engine = pickEngine(true, "demo-model-x");
    assert.ok(engine instanceof MockEngine, "mock=true should give the offline engine");
    // A reviewer run writes nothing; it only needs a root and a system/user prompt.
    await engine.run(
      { role: "reviewer", root: process.cwd(), system: "s", user: "u" },
      { onText: (t) => seen.push(t) },
    );
    assert.ok(
      seen.some((t) => t.includes("demo-model-x")),
      "the chosen model should be echoed in the mock engine's status text",
    );
  });
});
