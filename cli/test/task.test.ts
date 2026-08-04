import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
  adaptersForMode,
  parseTaskArguments,
  routeSummaryLines,
  taskFlow,
  type TaskFlowDependencies,
  type TaskFlowPrompts,
} from "../src/flows/task.js";
import {
  CODEX_EXEC_MODEL,
  LONG_DIRECT_REQUEST_INTERPRETATION,
  authorizeCodexExec,
  codexExecDisclosure,
  createDirectTaskIntent,
  previewSerialRoute,
  runSerialTask,
  taskRequestSha256,
  type TaskIntent,
} from "@cairn/core";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const DIRECT_INPUT_ID = "00000000-0000-4000-8000-000000000001";

function directIntent(raw: string): TaskIntent {
  const intent = createDirectTaskIntent(raw, DIRECT_INPUT_ID);
  assert.ok(intent);
  return intent;
}

interface FlowTrace {
  events: string[];
  createCalls: number;
  detectCalls: number;
  previewCalls: number;
  disclosureCalls: number;
  authorizationCalls: number;
  runCalls: number;
  cancelCalls: number;
  intents: TaskIntent[];
  disclosureTask: string | null;
  authorizationDigest: string | null;
  errors: string[];
}

function trace(): FlowTrace {
  return {
    events: [],
    createCalls: 0,
    detectCalls: 0,
    previewCalls: 0,
    disclosureCalls: 0,
    authorizationCalls: 0,
    runCalls: 0,
    cancelCalls: 0,
    intents: [],
    disclosureTask: null,
    authorizationDigest: null,
    errors: [],
  };
}

function fakePrompts(flow: FlowTrace, confirmation: boolean | symbol): TaskFlowPrompts {
  return {
    log: {
      error: (message) => { flow.errors.push(message); },
      info: () => undefined,
      warn: () => undefined,
    },
    intro: () => undefined,
    text: async () => { throw new Error("TEST_PROMPT_WAS_NOT_EXPECTED"); },
    isCancel: (value) => typeof value === "symbol",
    cancel: () => {
      flow.cancelCalls += 1;
      flow.events.push("cancel");
    },
    confirm: async () => {
      flow.events.push("confirm");
      return confirmation;
    },
    spinner: () => ({ start: () => undefined, message: () => undefined, stop: () => undefined }),
    outro: () => undefined,
  };
}

function fakeDependencies(flow: FlowTrace, confirmation: boolean | symbol = true): TaskFlowDependencies {
  return {
    prompts: fakePrompts(flow, confirmation),
    newInputId: () => {
      flow.events.push("new-input-id");
      return DIRECT_INPUT_ID;
    },
    createDirectTaskIntent: (raw, inputId) => {
      flow.createCalls += 1;
      flow.events.push("create-intent");
      return createDirectTaskIntent(raw, inputId);
    },
    detectCodexExecStatus: async () => {
      flow.detectCalls += 1;
      flow.events.push("detect");
      return { installed: true, connected: true };
    },
    previewSerialRoute: (intent, adapters, adapterId) => {
      flow.previewCalls += 1;
      flow.events.push("preview");
      flow.intents.push(intent);
      return previewSerialRoute(intent, adapters, adapterId);
    },
    codexExecDisclosure: (root, intent) => {
      flow.disclosureCalls += 1;
      flow.events.push("disclosure");
      flow.intents.push(intent);
      const disclosure = codexExecDisclosure(root, intent);
      flow.disclosureTask = disclosure.task;
      return disclosure;
    },
    authorizeCodexExec: (root, intent) => {
      flow.authorizationCalls += 1;
      flow.events.push("authorize");
      flow.intents.push(intent);
      const authorization = authorizeCodexExec(root, intent);
      flow.authorizationDigest = authorization.requestSha256;
      return authorization;
    },
    runSerialTask: async (_root, intent) => {
      flow.runCalls += 1;
      flow.events.push("run");
      flow.intents.push(intent);
      return {
        status: "done",
        briefPath: "docs/ai-work/tasks/001-brief.md",
        reportPath: "docs/ai-work/tasks/001-report.md",
      } as unknown as Awaited<ReturnType<typeof runSerialTask>>;
    },
  };
}

test("the CLI accepts one offline demo switch and plain outcome text", () => {
  assert.deepEqual(parseTaskArguments(["task", "--mock", "Create", "a", "welcome page"]), { mock: true, outcome: "Create a welcome page" });
  assert.deepEqual(parseTaskArguments(["task"]), { mock: false, outcome: undefined });
  assert.deepEqual(parseTaskArguments(["task", "--mock", "  exact\nmultiline outcome  "]), {
    mock: true,
    outcome: "  exact\nmultiline outcome  ",
  });
  assert.deepEqual(parseTaskArguments(["task", "Keep", "--literal-owner-word", "exactly"]), {
    mock: false,
    outcome: "Keep --literal-owner-word exactly",
  });
});

test("normal CLI mode has no pretend connection", () => {
  const route = previewSerialRoute(
    directIntent("Create a welcome page"),
    adaptersForMode(false, "C:\\fixture", { installed: true, connected: false }),
  );
  assert.equal(route.status, "connection-required");
  assert.match(routeSummaryLines(route).join("\n"), /No connected adapter/);
  assert.match(routeSummaryLines(route).join("\n"), /reads no credential/i);
});

test("normal CLI mode offers only Codex Exec when readiness is connected", () => {
  const route = previewSerialRoute(
    directIntent("Create a welcome page"),
    adaptersForMode(false, "C:\\fixture", { installed: true, connected: true }),
  );
  assert.equal(route.status, "ready");
  if (route.status !== "ready") return;
  assert.deepEqual(route.candidates.map((candidate) => candidate.id), ["codex-exec"]);
  assert.match(routeSummaryLines(route).join("\n"), /Codex Exec/);
  assert.match(routeSummaryLines(route).join("\n"), /Provider: OpenAI/);
  assert.match(routeSummaryLines(route).join("\n"), new RegExp(`Model: ${CODEX_EXEC_MODEL}`));
  const disclosure = codexExecDisclosure("C:\\fixture", directIntent("Create a welcome page"));
  assert.equal(disclosure.provider, "OpenAI");
  assert.equal(disclosure.model, CODEX_EXEC_MODEL);
  assert.match(disclosure.task, /^## What you asked for/m);
  assert.match(disclosure.task, /\*\*You said so\*\*/);
  assert.match(disclosure.task, /> Create a welcome page/);
  assert.match(disclosure.data, /any file inside the selected project/i);
  assert.match(disclosure.quota, /exactly one ephemeral Codex Exec process/i);
});

test("explicit mock mode names the adapter, provider, and model honestly", () => {
  const route = previewSerialRoute(directIntent("Create a welcome page"), adaptersForMode(true));
  assert.equal(route.status, "ready");
  const text = routeSummaryLines(route).join("\n");
  assert.match(text, /Cairn offline demonstration/);
  assert.match(text, /Provider: none/);
  assert.match(text, /Model: none/);
});

test("the CLI preserves raw whitespace and reuses one frozen direct intent for every real-call seam", async () => {
  const raw = "  Keep this exact first line.\n\tKeep the indented second line too.  ";
  const flow = trace();

  await taskFlow(ROOT, { mock: false, outcome: raw }, fakeDependencies(flow));

  assert.equal(flow.createCalls, 1);
  assert.equal(flow.detectCalls, 1);
  assert.equal(flow.previewCalls, 1);
  assert.equal(flow.disclosureCalls, 1);
  assert.equal(flow.authorizationCalls, 1);
  assert.equal(flow.runCalls, 1);
  assert.equal(flow.cancelCalls, 0);
  assert.deepEqual(flow.events, [
    "new-input-id",
    "create-intent",
    "detect",
    "preview",
    "disclosure",
    "confirm",
    "authorize",
    "run",
  ]);
  assert.equal(flow.intents.length, 4);
  const [intent] = flow.intents;
  assert.ok(intent);
  for (const reused of flow.intents) assert.equal(reused, intent);
  assert.ok(Object.isFrozen(intent));
  assert.ok(Object.isFrozen(intent.outcome));
  assert.ok(Object.isFrozen(intent.requirements));
  assert.ok(Object.isFrozen(intent.context));
  assert.equal(intent.outcome.source, "owner-stated");
  if (intent.outcome.source !== "owner-stated") return;
  assert.ok(Object.isFrozen(intent.outcome.owner));
  assert.equal(intent.outcome.owner.kind, "direct");
  assert.equal(intent.outcome.owner.text, raw);
  assert.equal(intent.outcome.owner.start, 0);
  assert.equal(intent.outcome.owner.end, raw.length);
  const digest = taskRequestSha256(intent);
  assert.match(digest ?? "", /^[0-9a-f]{64}$/);
  assert.equal(flow.authorizationDigest, digest);
  assert.ok(flow.disclosureTask?.includes(">   Keep this exact first line.\n> \tKeep the indented second line too.  "));
  for (const reused of flow.intents) assert.equal(taskRequestSha256(reused), digest);
});

test("declined and cancelled confirmations remain before authorization and execution", async () => {
  for (const confirmation of [false, Symbol("cancelled")]) {
    const flow = trace();
    await taskFlow(
      ROOT,
      { mock: false, outcome: "Keep the owner in control" },
      fakeDependencies(flow, confirmation),
    );

    assert.deepEqual(flow.events, [
      "new-input-id",
      "create-intent",
      "detect",
      "preview",
      "disclosure",
      "confirm",
      "cancel",
    ]);
    assert.equal(flow.cancelCalls, 1);
    assert.equal(flow.authorizationCalls, 0);
    assert.equal(flow.runCalls, 0);
  }
});

test("the CLI accepts 300, 301, and 2,000 raw characters with the fixed long interpretation", async () => {
  for (const length of [300, 301, 2_000]) {
    const raw = "x".repeat(length);
    const flow = trace();
    await taskFlow(ROOT, { mock: false, outcome: raw }, fakeDependencies(flow));

    assert.equal(flow.runCalls, 1, `${length} characters reaches the fake run seam`);
    const intent = flow.intents[0];
    assert.ok(intent);
    assert.equal(intent.outcome.source, "owner-stated");
    if (intent.outcome.source !== "owner-stated") continue;
    assert.equal(intent.outcome.owner.text, raw);
    assert.equal(intent.outcome.text, length === 300 ? raw : LONG_DIRECT_REQUEST_INTERPRETATION);
  }
});

test("a 2,001-character --prefixed owner token cannot evade the pre-detection cap", async () => {
  const raw = `--${"x".repeat(1_999)}`;
  const parsed = parseTaskArguments(["task", raw]);
  assert.equal(raw.length, 2_001);
  assert.deepEqual(parsed, { mock: false, outcome: raw });

  const priorExitCode = process.exitCode;
  try {
    process.exitCode = undefined;
    const flow = trace();
    await taskFlow(ROOT, parsed, fakeDependencies(flow));

    assert.equal(process.exitCode, 1);
    assert.deepEqual(flow.events, ["new-input-id", "create-intent"]);
    assert.equal(flow.detectCalls, 0);
    assert.equal(flow.previewCalls, 0);
    assert.equal(flow.disclosureCalls, 0);
    assert.equal(flow.authorizationCalls, 0);
    assert.equal(flow.runCalls, 0);
  } finally {
    process.exitCode = priorExitCode;
  }
});

test("the CLI refuses fewer than five non-whitespace characters and 2,001 raw characters before detection or work", async () => {
  const priorExitCode = process.exitCode;
  try {
    for (const raw of ["a \n b\t c d", "x".repeat(2_001)]) {
      process.exitCode = undefined;
      const flow = trace();
      await taskFlow(ROOT, { mock: false, outcome: raw }, fakeDependencies(flow));

      assert.equal(process.exitCode, 1);
      assert.equal(flow.createCalls, 1);
      assert.equal(flow.detectCalls, 0);
      assert.equal(flow.previewCalls, 0);
      assert.equal(flow.disclosureCalls, 0);
      assert.equal(flow.authorizationCalls, 0);
      assert.equal(flow.runCalls, 0);
      assert.equal(flow.intents.length, 0);
      assert.equal(flow.errors.length, 1);
    }
  } finally {
    process.exitCode = priorExitCode;
  }
});
