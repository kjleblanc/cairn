import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MockEngine } from "../src/agents.js";
import { paths, parseLog, scaffoldProject } from "../src/files.js";
import type { ProviderConnectionAdapter, ProviderConnectionAdapters, ProviderConnectionStatus, ProviderId } from "../src/provider-connection.js";
import {
  approveBrief, buildTask, closeTask, defineTask, initProject, loadApproval,
  projectStatus, refineBrief, reviewTask, runDirectionCheck,
} from "../src/steps.js";
import { runSerialV2MockStandardTask, runSerialV2ProviderMockStandardTask } from "../src/serial-v2.js";

const engine = new MockEngine();

function freshProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "cairn-steps-"));
  scaffoldProject(dir, { name: "Steps", what: "w", who: "me", milestone: "see it", timebox: "default" });
  return dir;
}

const TASK_019_CANARY = "CAIRN_TASK_019_SYNTHETIC_CANARY_NOT_A_CREDENTIAL";

function fakeAdapter(response: unknown): ProviderConnectionAdapter {
  return { checkConnection: () => response };
}

function fakeAdapters(provider: ProviderId, response: unknown): ProviderConnectionAdapters {
  return { [provider]: fakeAdapter(response) };
}

function providerStatePath(root: string): string {
  return join(root, ".cairn", "provider-connection.json");
}

function allFileText(root: string): string {
  const texts: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const item = join(dir, entry.name);
      if (entry.isDirectory()) walk(item);
      else texts.push(readFileSync(item, "utf8"));
    }
  };
  walk(root);
  return texts.join("\n");
}

function assertNoTaskWrites(root: string, originalLog: string): void {
  assert.deepEqual(readdirSync(paths.tasks(root)), []);
  assert.equal(readFileSync(paths.log(root), "utf8"), originalLog);
  assert.equal(existsSync(providerStatePath(root)), false);
}

function withProviderDraftEnvironment(body: () => void): void {
  const names = ["CAIRN_SERIAL_V2_DRAFT", "CAIRN_PROVIDER_CONNECTION_DRAFT", "CAIRN_MOCK", "CAIRN_PARALLEL_DRAFT", "CAIRN_TASK_019_CANARY"] as const;
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]])) as Record<(typeof names)[number], string | undefined>;
  try {
    process.env.CAIRN_SERIAL_V2_DRAFT = "1";
    process.env.CAIRN_PROVIDER_CONNECTION_DRAFT = "1";
    process.env.CAIRN_MOCK = "1";
    delete process.env.CAIRN_PARALLEL_DRAFT;
    process.env.CAIRN_TASK_019_CANARY = TASK_019_CANARY;
    body();
  } finally {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
}

function captureError(body: () => void): Error {
  let caught: unknown;
  try {
    body();
  } catch (error) {
    caught = error;
  }
  if (!(caught instanceof Error)) assert.fail("Expected the operation to throw an Error.");
  return caught;
}

test("full loop: define, approve, build, review, close — files carry the state", async () => {
  const dir = freshProject();
  const def = await defineTask(dir, "A demo file appears", engine);
  assert.equal(def.taskNumber, 1);
  assert.ok(def.briefText.includes("brief"));

  const approval = approveBrief(dir, 1);
  assert.ok(existsSync(paths.approval(dir, 1)));
  assert.equal(loadApproval(dir, 1)?.briefSha256, approval.briefSha256);

  const build = await buildTask(dir, 1, engine);
  assert.equal(build.disposition, "DONE");
  assert.ok(build.reportText.includes("demo.txt"));

  const review = await reviewTask(dir, 1, engine);
  assert.match(review.finalVerdict, /PASS/);

  const row = closeTask(dir, 1, { decision: "accept", summary: "saw the file", moved: "YES" });
  assert.equal(row.task, "001");
  assert.equal(parseLog(dir).length, 1);
});

test("serial v2 mock path is off by default and refuses non-mock or parallel execution before writing", () => {
  const dir = freshProject();
  const originalSerial = process.env.CAIRN_SERIAL_V2_DRAFT;
  const originalMock = process.env.CAIRN_MOCK;
  const originalParallel = process.env.CAIRN_PARALLEL_DRAFT;
  const originalLog = readFileSync(paths.log(dir), "utf8");
  try {
    delete process.env.CAIRN_SERIAL_V2_DRAFT;
    delete process.env.CAIRN_MOCK;
    delete process.env.CAIRN_PARALLEL_DRAFT;
    assert.throws(() => runSerialV2MockStandardTask(dir), /SERIAL_V2_DISABLED/);

    process.env.CAIRN_SERIAL_V2_DRAFT = "1";
    assert.throws(() => runSerialV2MockStandardTask(dir), /SERIAL_V2_MOCK_ONLY/);

    process.env.CAIRN_MOCK = "1";
    process.env.CAIRN_PARALLEL_DRAFT = "1";
    assert.throws(() => runSerialV2MockStandardTask(dir), /SERIAL_V2_SERIAL_ONLY/);

    delete process.env.CAIRN_PARALLEL_DRAFT;
    assert.throws(() => runSerialV2MockStandardTask(process.cwd()), /SERIAL_V2_SYNTHETIC_ONLY/);

    assert.deepEqual(readdirSync(paths.tasks(dir)), []);
    assert.equal(readFileSync(paths.log(dir), "utf8"), originalLog);
    assert.equal(existsSync(join(dir, ".git")), false);
  } finally {
    if (originalSerial === undefined) delete process.env.CAIRN_SERIAL_V2_DRAFT;
    else process.env.CAIRN_SERIAL_V2_DRAFT = originalSerial;
    if (originalMock === undefined) delete process.env.CAIRN_MOCK;
    else process.env.CAIRN_MOCK = originalMock;
    if (originalParallel === undefined) delete process.env.CAIRN_PARALLEL_DRAFT;
    else process.env.CAIRN_PARALLEL_DRAFT = originalParallel;
  }
});

test("serial v2 mock path completes one synthetic Standard task without gates or coordinator state", () => {
  const dir = freshProject();
  const originalSerial = process.env.CAIRN_SERIAL_V2_DRAFT;
  const originalMock = process.env.CAIRN_MOCK;
  const originalParallel = process.env.CAIRN_PARALLEL_DRAFT;
  try {
    process.env.CAIRN_SERIAL_V2_DRAFT = "1";
    process.env.CAIRN_MOCK = "1";
    delete process.env.CAIRN_PARALLEL_DRAFT;

    const result = runSerialV2MockStandardTask(dir);
    assert.equal(result.taskNumber, 1);
    assert.equal(result.disposition, "DONE");
    assert.deepEqual(result.checks, [
      "PASS: visible result file exists",
      "PASS: visible result bytes match the fixed mock expectation",
      "PASS: Applied/completed/DONE log row round-trips",
    ]);
    assert.equal(readFileSync(result.builtPath, "utf8"), "hello from the serial v2 mock path\n");
    assert.match(readFileSync(result.briefPath, "utf8"), /Lane: \*\*Standard\*\*/);
    assert.match(readFileSync(result.reportPath, "utf8"), /Disposition: DONE/);

    const rows = parseLog(dir);
    assert.equal(rows.length, 1);
    assert.deepEqual(
      { lane: rows[0].lane, mode: rows[0].mode, outcome: rows[0].outcome, decision: rows[0].decision },
      { lane: "Standard", mode: "Applied", outcome: "DONE", decision: "completed" },
    );
    assert.deepEqual(readdirSync(paths.tasks(dir)).sort(), ["001-brief.md", "001-report.md"]);
    assert.equal(existsSync(paths.approval(dir, 1)), false);
    assert.equal(existsSync(paths.decision(dir, 1)), false);
    assert.equal(existsSync(join(dir, ".git")), false);
    assert.equal(projectStatus(dir).unfinished, null);
  } finally {
    if (originalSerial === undefined) delete process.env.CAIRN_SERIAL_V2_DRAFT;
    else process.env.CAIRN_SERIAL_V2_DRAFT = originalSerial;
    if (originalMock === undefined) delete process.env.CAIRN_MOCK;
    else process.env.CAIRN_MOCK = originalMock;
    if (originalParallel === undefined) delete process.env.CAIRN_PARALLEL_DRAFT;
    else process.env.CAIRN_PARALLEL_DRAFT = originalParallel;
  }
});

test("serial v2 provider connection Draft refuses before writes when any guard is closed", () => {
  const run = (configure: (dir: string) => void, pattern: RegExp) => {
    const dir = freshProject();
    configure(dir);
    const originalLog = readFileSync(paths.log(dir), "utf8");
    assert.throws(
      () => runSerialV2ProviderMockStandardTask(dir, "claude", fakeAdapters("claude", { status: "connected" })),
      pattern,
    );
    assertNoTaskWrites(dir, originalLog);
  };

  withProviderDraftEnvironment(() => {
    run(() => { delete process.env.CAIRN_SERIAL_V2_DRAFT; }, /SERIAL_V2_DISABLED/);
    process.env.CAIRN_SERIAL_V2_DRAFT = "1";
    run(() => { delete process.env.CAIRN_PROVIDER_CONNECTION_DRAFT; }, /PROVIDER_CONNECTION_DISABLED/);
    process.env.CAIRN_PROVIDER_CONNECTION_DRAFT = "1";
    run(() => { delete process.env.CAIRN_MOCK; }, /SERIAL_V2_MOCK_ONLY/);
    process.env.CAIRN_MOCK = "1";
    run(() => { process.env.CAIRN_PARALLEL_DRAFT = "1"; }, /SERIAL_V2_SERIAL_ONLY/);
    delete process.env.CAIRN_PARALLEL_DRAFT;

    const outside = process.cwd();
    assert.throws(
      () => runSerialV2ProviderMockStandardTask(outside, "claude", fakeAdapters("claude", { status: "connected" })),
      /SERIAL_V2_SYNTHETIC_ONLY/,
    );

    run((dir) => {
      const contract = readFileSync(paths.contract(dir), "utf8");
      writeFileSync(paths.contract(dir), contract.replace("STATUS: ACTIVE", "STATUS: PAUSED"));
    }, /SERIAL_V2_INACTIVE/);

    run((dir) => {
      const contract = readFileSync(paths.contract(dir), "utf8");
      writeFileSync(paths.contract(dir), contract.replace(/Contract v2\.0/, "Contract v1.9"));
    }, /SERIAL_V2_CONTRACT_REQUIRED/);

    run((dir) => {
      const rows =
        "| 001 | 2026-07-19 | Standard | Applied | STOPPED | stopped | synthetic | NO |\n" +
        "| 002 | 2026-07-19 | Standard | Applied | STOPPED | stopped | synthetic | NO |\n";
      writeFileSync(paths.log(dir), readFileSync(paths.log(dir), "utf8") + rows);
    }, /SERIAL_V2_DIRECTION_GATE/);
  });
});

test("serial v2 provider connection Draft redacts tainted fake adapters and writes nothing", () => {
  withProviderDraftEnvironment(() => {
    const cases: Array<{ provider: unknown; adapters: ProviderConnectionAdapters; pattern: RegExp }> = [
      { provider: "other", adapters: {}, pattern: /PROVIDER_CHOICE_INVALID/ },
      { provider: "claude", adapters: {}, pattern: /PROVIDER_ADAPTER_UNAVAILABLE/ },
      { provider: "claude", adapters: fakeAdapters("claude", null), pattern: /PROVIDER_STATUS_INVALID/ },
      { provider: "claude", adapters: fakeAdapters("claude", {}), pattern: /PROVIDER_STATUS_INVALID/ },
      { provider: "claude", adapters: fakeAdapters("claude", { status: "unexpected" }), pattern: /PROVIDER_STATUS_INVALID/ },
      {
        provider: "claude",
        adapters: fakeAdapters("claude", { status: "connected", rawOutput: TASK_019_CANARY }),
        pattern: /PROVIDER_STATUS_INVALID/,
      },
    ];

    for (const item of cases) {
      const dir = freshProject();
      const originalLog = readFileSync(paths.log(dir), "utf8");
      const error = captureError(() => runSerialV2ProviderMockStandardTask(dir, item.provider, item.adapters));
      assert.match(error.message, item.pattern);
      assert.doesNotMatch(`${error.message}\n${error.stack ?? ""}`, new RegExp(TASK_019_CANARY));
      assertNoTaskWrites(dir, originalLog);
      assert.doesNotMatch(allFileText(dir), new RegExp(TASK_019_CANARY));
    }

    const thrownDir = freshProject();
    const originalLog = readFileSync(paths.log(thrownDir), "utf8");
    const thrownAdapter: ProviderConnectionAdapter = {
      checkConnection: () => { throw new Error(TASK_019_CANARY); },
    };
    const error = captureError(
      () => runSerialV2ProviderMockStandardTask(thrownDir, "openai", { openai: thrownAdapter }),
    );
    assert.match(error.message, /PROVIDER_STATUS_FAILED/);
    assert.doesNotMatch(`${error.message}\n${error.stack ?? ""}`, new RegExp(TASK_019_CANARY));
    assertNoTaskWrites(thrownDir, originalLog);
    assert.doesNotMatch(allFileText(thrownDir), new RegExp(TASK_019_CANARY));
  });
});

test("serial v2 provider connection Draft rejects hidden, symbol, accessor, and Proxy shapes before writes", () => {
  withProviderDraftEnvironment(() => {
    let accessorCalls = 0;
    let extraAccessorCalls = 0;
    let proxyTrapCalls = 0;

    const hiddenExtra: Record<string, unknown> = { status: "connected" };
    Object.defineProperty(hiddenExtra, "rawOutput", {
      value: TASK_019_CANARY,
      enumerable: false,
    });

    const symbolExtra = {
      status: "connected",
      [Symbol("rawOutput")]: TASK_019_CANARY,
    };

    const hiddenStatus: Record<string, unknown> = {};
    Object.defineProperty(hiddenStatus, "status", {
      value: "connected",
      enumerable: false,
    });

    const accessorStatus: Record<string, unknown> = {};
    Object.defineProperty(accessorStatus, "status", {
      enumerable: true,
      get: () => {
        accessorCalls += 1;
        throw new Error(TASK_019_CANARY);
      },
      set: () => {
        accessorCalls += 1;
      },
    });

    const accessorExtra: Record<string, unknown> = { status: "connected" };
    Object.defineProperty(accessorExtra, "rawOutput", {
      enumerable: false,
      get: () => {
        extraAccessorCalls += 1;
        throw new Error(TASK_019_CANARY);
      },
    });

    const proxyResponse = new Proxy(
      { status: "connected" },
      {
        getPrototypeOf: () => {
          proxyTrapCalls += 1;
          throw new Error(TASK_019_CANARY);
        },
        ownKeys: () => {
          proxyTrapCalls += 1;
          throw new Error(TASK_019_CANARY);
        },
        getOwnPropertyDescriptor: () => {
          proxyTrapCalls += 1;
          throw new Error(TASK_019_CANARY);
        },
      },
    );

    const cases: Array<{ response: unknown; calls?: () => number }> = [
      { response: hiddenExtra },
      { response: symbolExtra },
      { response: hiddenStatus },
      { response: accessorStatus, calls: () => accessorCalls },
      { response: accessorExtra, calls: () => extraAccessorCalls },
      { response: proxyResponse, calls: () => proxyTrapCalls },
    ];

    for (const item of cases) {
      const dir = freshProject();
      const originalLog = readFileSync(paths.log(dir), "utf8");
      const error = captureError(
        () => runSerialV2ProviderMockStandardTask(dir, "claude", fakeAdapters("claude", item.response)),
      );
      assert.equal(
        error.message,
        "PROVIDER_STATUS_INVALID: The provider adapter returned an invalid response.",
      );
      assert.doesNotMatch(`${error.message}\n${error.stack ?? ""}`, new RegExp(TASK_019_CANARY));
      assertNoTaskWrites(dir, originalLog);
      assert.doesNotMatch(allFileText(dir), new RegExp(TASK_019_CANARY));
      if (item.calls) assert.equal(item.calls(), 0);
    }
  });
});

test("serial v2 provider connection Draft handles every allowed non-secret status", () => {
  withProviderDraftEnvironment(() => {
    for (const status of ["unknown", "disconnected"] as const satisfies readonly ProviderConnectionStatus[]) {
      const dir = freshProject();
      const originalLog = readFileSync(paths.log(dir), "utf8");
      assert.throws(
        () => runSerialV2ProviderMockStandardTask(dir, "claude", fakeAdapters("claude", { status })),
        /PROVIDER_NOT_CONNECTED/,
      );
      assert.equal(readFileSync(providerStatePath(dir), "utf8"), `{"provider":"claude","status":"${status}"}\n`);
      assert.deepEqual(Object.keys(JSON.parse(readFileSync(providerStatePath(dir), "utf8"))).sort(), ["provider", "status"]);
      assert.deepEqual(readdirSync(paths.tasks(dir)), []);
      assert.equal(readFileSync(paths.log(dir), "utf8"), originalLog);
      assert.doesNotMatch(allFileText(dir), new RegExp(TASK_019_CANARY));
    }
  });
});

test("serial v2 provider connection Draft completes the supported path for both fake providers", () => {
  withProviderDraftEnvironment(() => {
    for (const provider of ["claude", "openai"] as const) {
      const dir = freshProject();
      const result = runSerialV2ProviderMockStandardTask(
        dir,
        provider,
        fakeAdapters(provider, { status: "connected" }),
      );

      assert.equal(result.disposition, "DONE");
      assert.deepEqual(result.connection, { provider, status: "connected" });
      assert.equal(readFileSync(providerStatePath(dir), "utf8"), `{"provider":"${provider}","status":"connected"}\n`);
      assert.deepEqual(Object.keys(JSON.parse(readFileSync(providerStatePath(dir), "utf8"))).sort(), ["provider", "status"]);
      assert.deepEqual(readdirSync(paths.tasks(dir)).sort(), ["001-brief.md", "001-report.md"]);
      assert.equal(readFileSync(result.builtPath, "utf8"), "hello from the serial v2 mock path\n");
      assert.match(readFileSync(result.reportPath, "utf8"), /Disposition: DONE/);
      assert.equal(existsSync(paths.approval(dir, 1)), false);
      assert.equal(existsSync(paths.decision(dir, 1)), false);
      assert.equal(existsSync(join(dir, ".git")), false);
      assert.equal(existsSync(join(dir, ".git", "cairn")), false);
      assert.doesNotMatch(JSON.stringify(result), new RegExp(TASK_019_CANARY));
      assert.doesNotMatch(allFileText(dir), new RegExp(TASK_019_CANARY));
    }
  });
});

test("build refuses without a persisted approval, and after tampering", async () => {
  const dir = freshProject();
  await defineTask(dir, "A demo file appears", engine);
  await assert.rejects(() => buildTask(dir, 1, engine), /No approval on file/);
  approveBrief(dir, 1);
  writeFileSync(paths.brief(dir, 1), "silently widened scope");
  await assert.rejects(() => buildTask(dir, 1, engine), /GATE: the brief changed/);
});

test("defineTask refuses while the Direction Gate is tripped", async () => {
  const dir = freshProject();
  const row = "| 001 | 2026-07-17 | Standard | Draft | STOPPED | revise | s | NO |\n" +
              "| 002 | 2026-07-17 | Standard | Draft | STOPPED | revise | s | NO |\n";
  writeFileSync(paths.log(dir), readFileSync(paths.log(dir), "utf8") + row);
  await assert.rejects(() => defineTask(dir, "another patch", engine), /DIRECTION GATE/);
  const check = await runDirectionCheck(dir, "two STOPPED in a row", engine);
  assert.ok(check.text.length > 0);
});

test("projectStatus reports stones, gate, and an unfinished task", async () => {
  const dir = freshProject();
  const s0 = projectStatus(dir);
  assert.equal(s0.stones, 0);
  assert.equal(s0.unfinished, null);

  await defineTask(dir, "A demo file appears", engine);
  const s1 = projectStatus(dir);
  assert.equal(s1.unfinished?.taskNumber, 1);
  assert.equal(s1.unfinished?.hasBrief, true);
  assert.equal(s1.unfinished?.hasApproval, false);
  assert.ok(s1.unfinished?.briefText.includes("brief"));

  approveBrief(dir, 1);
  await buildTask(dir, 1, engine);
  closeTask(dir, 1, { decision: "accept", summary: "s", moved: "YES" });
  const s2 = projectStatus(dir);
  assert.equal(s2.stones, 1);
  assert.equal(s2.unfinished, null);
});

test("defineTask carries the owner's answer through to the brief when a channel is wired", async () => {
  const dir = freshProject();
  const def = await defineTask(dir, "A demo file appears", engine, {
    onAsk: async () => "keep it tiny please",
  });
  assert.ok(def.briefText.includes("The owner answered: keep it tiny please"));
});

test("refineBrief revises the brief before approval and reports the change", async () => {
  const dir = freshProject();
  await defineTask(dir, "A demo file appears", engine);
  const r = await refineBrief(dir, 1, "Please also mention the demo note", engine);
  assert.equal(r.briefChanged, true);
  assert.ok(r.briefText.includes("Revision (mock)"), "the revised text is returned");
  assert.ok(readFileSync(paths.brief(dir, 1), "utf8").includes("Please also mention the demo note"));
  assert.ok(r.reply.length > 0);
});

test("refineBrief answers a question in plain words without touching the brief", async () => {
  const dir = freshProject();
  const def = await defineTask(dir, "A demo file appears", engine);
  const r = await refineBrief(dir, 1, "Does this touch anything else?", engine);
  assert.equal(r.briefChanged, false);
  assert.equal(r.briefText, def.briefText, "the brief file is byte-identical");
  assert.match(r.reply, /Answer \(mock\)/);
});

test("refineBrief refuses once the brief is approved — the hash lock keeps its meaning", async () => {
  const dir = freshProject();
  await defineTask(dir, "A demo file appears", engine);
  approveBrief(dir, 1);
  await assert.rejects(() => refineBrief(dir, 1, "one more thing", engine), /already approved|locked/);
});

test("refineBrief refuses when there is no brief to refine", async () => {
  const dir = freshProject();
  await assert.rejects(() => refineBrief(dir, 1, "hello", engine), /No brief to refine/);
});

test("steps refuse a folder that is not a Cairn project", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-not-"));
  await assert.rejects(() => defineTask(dir, "x", engine), /No Cairn contract/);
  assert.throws(() => projectStatus(dir), /No Cairn contract/);
});

test("initProject scaffolds and commits when git identity exists", () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-init-"));
  const res = initProject(dir, { name: "Init", what: "w", who: "me", milestone: "m", timebox: "default" });
  assert.ok(res.created.length >= 4);
  if (res.gitReady) {
    const log = execFileSync("git", ["log", "--oneline"], { cwd: dir, encoding: "utf8" });
    assert.match(log, /Cairn setup/);
  }
});
