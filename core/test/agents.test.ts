import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MODEL, EFFORT_LEVELS, MockEngine, pickEngine, resolveEffort, resolveModel } from "../src/agents.js";

/** Run body with an environment variable set to a given value (or unset), then restore it. */
function withEnv(name: string, value: string | undefined, body: () => void | Promise<void>): void | Promise<void> {
  const prev = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  const restore = () => {
    if (prev === undefined) delete process.env[name];
    else process.env[name] = prev;
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

const withEnvModel = (value: string | undefined, body: () => void | Promise<void>) =>
  withEnv("CAIRN_MODEL", value, body);
const withEnvEffort = (value: string | undefined, body: () => void | Promise<void>) =>
  withEnv("CAIRN_EFFORT", value, body);

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

test("resolveEffort: an explicit choice wins over the environment", () => {
  withEnvEffort("high", () => {
    assert.equal(resolveEffort("low"), "low");
  });
});

test("resolveEffort: falls back to CAIRN_EFFORT when no explicit choice is given", () => {
  withEnvEffort("medium", () => {
    assert.equal(resolveEffort(), "medium");
    assert.equal(resolveEffort(""), "medium");
    assert.equal(resolveEffort("   "), "medium"); // blank counts as "no choice"
  });
});

test("resolveEffort: returns undefined when nothing is set — no effort option is sent", () => {
  withEnvEffort(undefined, () => {
    assert.equal(resolveEffort(), undefined);
    assert.equal(resolveEffort(""), undefined);
  });
});

test("the effort levels are the SDK's five named levels", () => {
  assert.deepEqual([...EFFORT_LEVELS], ["low", "medium", "high", "xhigh", "max"]);
});

test("mock engine echoes the chosen effort next to the model", async () => {
  await withEnvEffort(undefined, async () => {
    const seen: string[] = [];
    const engine = pickEngine(true, "demo-model-x", "low");
    await engine.run(
      { role: "reviewer", root: process.cwd(), system: "s", user: "u" },
      { onText: (t) => seen.push(t) },
    );
    assert.ok(
      seen.some((t) => t.includes("Using model: demo-model-x · effort: low (mock)")),
      "the chosen effort should be echoed beside the model in the mock engine's status text",
    );
  });
});

test("mock engine's model echo is unchanged when no effort is chosen", async () => {
  await withEnvEffort(undefined, async () => {
    const seen: string[] = [];
    const engine = pickEngine(true, "demo-model-x");
    await engine.run(
      { role: "reviewer", root: process.cwd(), system: "s", user: "u" },
      { onText: (t) => seen.push(t) },
    );
    assert.ok(
      seen.some((t) => t.includes("Using model: demo-model-x (mock)")),
      "with no effort chosen the echo must be byte-for-byte today's",
    );
  });
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
