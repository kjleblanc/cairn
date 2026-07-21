import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  DEFAULT_MODEL, EFFORT_LEVELS, MockEngine, NO_ANSWER_FALLBACK, OWNER_QUESTION_LIMIT,
  makeAskOwner, pickEngine, resolveEffort, resolveModel, schedulerToolDecision, type Role, type RunSpec,
} from "../src/agents.js";
import { paths } from "../src/files.js";

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

test("scheduled Planning is product-read-only", () => {
  const spec: RunSpec = { role: "definer", root: process.cwd(), system: "", user: "", schedulerProfile: "scheduler-planning" };
  assert.deepEqual(schedulerToolDecision(spec, { name: "Read", input: { file_path: "README.md" } }), { approved: true });
  assert.deepEqual(schedulerToolDecision(spec, { name: "Bash", input: { command: "git status --short" } }), { approved: true });
  assert.equal(schedulerToolDecision(spec, { name: "Write", input: { file_path: "README.md" } }).approved, false);
  assert.equal(schedulerToolDecision(spec, { name: "Bash", input: { command: "git worktree add elsewhere" } }).approved, false);
  assert.equal(schedulerToolDecision(spec, { name: "Bash", input: { command: "git status && echo escaped" } }).approved, false);
  assert.equal(schedulerToolDecision(spec, { name: "Bash", input: { command: "git branch -D main" } }).approved, false);
  assert.equal(schedulerToolDecision(spec, { name: "Bash", input: { command: "git diff --ext-diff" } }).approved, false);
  assert.equal(schedulerToolDecision(spec, { name: "ReadAndWrite", input: { file_path: "README.md" } }).approved, false);
});

test("scheduled Building has exact writes and no shell", () => {
  const root = process.cwd();
  const spec: RunSpec = {
    role: "builder", root, system: "", user: "", schedulerProfile: "scheduler-building",
    allowedPaths: ["safe/result.txt", "docs/ai-work/tasks/001-report.md"],
  };
  assert.deepEqual(schedulerToolDecision(spec, { name: "Edit", input: { file_path: resolve(root, "safe/result.txt") } }), { approved: true });
  assert.equal(schedulerToolDecision(spec, { name: "Write", input: { file_path: resolve(root, "other.txt") } }).approved, false);
  assert.equal(schedulerToolDecision(spec, { name: "Bash", input: { command: "npm test" } }).approved, false);
  assert.equal(schedulerToolDecision(spec, { name: "NotebookEdit", input: { file_path: resolve(root, "safe/result.txt") } }).approved, false);
  assert.equal(schedulerToolDecision(spec, { name: "WriteAndRun", input: { file_path: resolve(root, "safe/result.txt") } }).approved, false);
});

test("passive Planning has no command, owner-question, or write capability", () => {
  const spec: RunSpec = { role: "definer", root: process.cwd(), system: "", user: "", schedulerProfile: "scheduler-passive-planning" };
  assert.deepEqual(schedulerToolDecision(spec, { name: "Read", input: { file_path: "PROJECT.md" } }), { approved: true });
  for (const request of [
    { name: "Bash", input: { command: "git status" } },
    { name: "Write", input: { file_path: "result.md" } },
    { name: "mcp__cairn__ask_owner", input: { question: "May I?" } },
    { name: "WebFetch", input: { url: "https://example.invalid" } },
  ]) assert.equal(schedulerToolDecision(spec, request).approved, false);
});

test("passive Building may edit only exact frozen passive paths and cannot execute", () => {
  const root = process.cwd();
  const spec: RunSpec = {
    role: "builder", root, system: "", user: "", schedulerProfile: "scheduler-passive-building",
    allowedPaths: ["artifacts/task-001/result.md", "docs/ai-work/tasks/001-report.md"],
  };
  assert.deepEqual(schedulerToolDecision(spec, { name: "Write", input: { file_path: resolve(root, "artifacts/task-001/result.md") } }), { approved: true });
  assert.deepEqual(schedulerToolDecision(spec, { name: "Edit", input: { file_path: resolve(root, "docs/ai-work/tasks/001-report.md") } }), { approved: true });
  for (const request of [
    { name: "Write", input: { file_path: resolve(root, "artifacts/task-002/result.md") } },
    { name: "Bash", input: { command: "node result.md" } },
    { name: "NotebookEdit", input: { file_path: resolve(root, "artifacts/task-001/result.md") } },
    { name: "WebSearch", input: { query: "escape" } },
  ]) assert.equal(schedulerToolDecision(spec, request).approved, false);
});

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

// ---- Task 008: the ask-the-owner channel (definer only, capped, skip-safe) ----

function specFor(role: Role): RunSpec {
  return { role, root: process.cwd(), taskNumber: 1, system: "s", user: "u" };
}

const answering = () => {
  const calls: string[] = [];
  return {
    calls,
    onAsk: async (q: { question: string }) => {
      calls.push(q.question);
      return "yes please";
    },
  };
};

test("only the definer gets an asking function — and only when a channel is wired", () => {
  const wired = answering();
  for (const role of ["builder", "reviewer", "direction"] as const) {
    assert.equal(makeAskOwner(specFor(role), { onAsk: wired.onAsk }), null, `${role} must never ask`);
  }
  assert.equal(makeAskOwner(specFor("definer"), {}), null, "no channel wired — no asking");
  assert.notEqual(makeAskOwner(specFor("definer"), { onAsk: wired.onAsk }), null, "definer + channel — may ask");
});

test("the 3-question cap is enforced in code: the 4th ask never reaches the owner", async () => {
  const wired = answering();
  const ask = makeAskOwner(specFor("definer"), { onAsk: wired.onAsk })!;
  for (let i = 1; i <= OWNER_QUESTION_LIMIT; i++) {
    assert.equal(await ask(`question ${i}`), "The owner answered: yes please");
  }
  const fourth = await ask("one more?");
  assert.equal(wired.calls.length, OWNER_QUESTION_LIMIT, "the channel heard exactly 3 questions");
  assert.match(fourth, /limit reached/i);
  assert.ok(fourth.includes(NO_ANSWER_FALLBACK), "past the cap, the asker is told to use its judgment");
});

test("the skip fallback: null, blank, and thrown answers all resolve — a run never hangs or dies unanswered", async () => {
  const skipped = makeAskOwner(specFor("definer"), { onAsk: async () => null })!;
  assert.equal(await skipped("q?"), NO_ANSWER_FALLBACK);

  const blank = makeAskOwner(specFor("definer"), { onAsk: async () => "   " })!;
  assert.equal(await blank("q?"), NO_ANSWER_FALLBACK);

  const throwing = makeAskOwner(specFor("definer"), { onAsk: async () => { throw new Error("channel broke"); } })!;
  assert.equal(await throwing("q?"), NO_ANSWER_FALLBACK, "a broken channel becomes a skip, not a crash");

  const empty = makeAskOwner(specFor("definer"), { onAsk: async () => "unreachable" })!;
  assert.equal(await empty("   "), NO_ANSWER_FALLBACK, "a blank question is not worth an interruption");
});

test("mock definer asks exactly one question when wired, and the answer lands in the brief", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-ask-"));
  const engine = new MockEngine();
  const wired = answering();
  await engine.run({ role: "definer", root: dir, taskNumber: 1, system: "s", user: "u" }, { onAsk: wired.onAsk });
  assert.equal(wired.calls.length, 1, "the mock asks exactly once");
  const brief = readFileSync(paths.brief(dir, 1), "utf8");
  assert.ok(brief.includes("Owner Q&A: The owner answered: yes please"), "the answer is written into the brief");
});

test("mock definer with a skipped question writes the assumption line instead", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-ask-skip-"));
  await new MockEngine().run(
    { role: "definer", root: dir, taskNumber: 1, system: "s", user: "u" },
    { onAsk: async () => null },
  );
  const brief = readFileSync(paths.brief(dir, 1), "utf8");
  assert.ok(brief.includes(`Owner Q&A: ${NO_ANSWER_FALLBACK}`), "a skip becomes a written assumption, not a hang");
});

test("mock definer without a wired channel behaves exactly as before — no question, no Q&A line", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-ask-none-"));
  await new MockEngine().run({ role: "definer", root: dir, taskNumber: 1, system: "s", user: "u" }, {});
  const brief = readFileSync(paths.brief(dir, 1), "utf8");
  assert.ok(!brief.includes("Owner Q&A"), "nothing wired — the brief carries no Q&A line");
});

test("mock builder and reviewer never ask even when a channel is wired", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-ask-roles-"));
  const engine = new MockEngine();
  const wired = answering();
  // Definer first, so the builder has a brief path to sit beside.
  await engine.run({ role: "definer", root: dir, taskNumber: 1, system: "s", user: "u" }, {});
  const before = wired.calls.length;
  await engine.run({ role: "builder", root: dir, taskNumber: 1, system: "s", user: "u" }, { onAsk: wired.onAsk });
  await engine.run({ role: "reviewer", root: dir, system: "s", user: "u" }, { onAsk: wired.onAsk });
  await engine.run({ role: "direction", root: dir, system: "s", user: "u" }, { onAsk: wired.onAsk });
  assert.equal(wired.calls.length, before, "no non-definer run asked anything");
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
