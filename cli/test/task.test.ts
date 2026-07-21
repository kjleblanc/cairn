import test from "node:test";
import assert from "node:assert/strict";
import { adaptersForMode, parseTaskArguments, routeSummaryLines } from "../src/flows/task.js";
import { CODEX_EXEC_MODEL, codexExecDisclosure, previewSerialRoute } from "@cairn/core";

test("the CLI accepts one offline demo switch and plain outcome text", () => {
  assert.deepEqual(parseTaskArguments(["task", "--mock", "Create", "a", "welcome page"]), { mock: true, outcome: "Create a welcome page" });
  assert.deepEqual(parseTaskArguments(["task"]), { mock: false, outcome: undefined });
});

test("normal CLI mode has no pretend connection", () => {
  const route = previewSerialRoute(
    "Create a welcome page",
    adaptersForMode(false, "C:\\fixture", { installed: true, connected: false }),
  );
  assert.equal(route.status, "connection-required");
  assert.match(routeSummaryLines(route).join("\n"), /No connected adapter/);
  assert.match(routeSummaryLines(route).join("\n"), /reads no credential/i);
});

test("normal CLI mode offers only Codex Exec when readiness is connected", () => {
  const route = previewSerialRoute(
    "Create a welcome page",
    adaptersForMode(false, "C:\\fixture", { installed: true, connected: true }),
  );
  assert.equal(route.status, "ready");
  if (route.status !== "ready") return;
  assert.deepEqual(route.candidates.map((candidate) => candidate.id), ["codex-exec"]);
  assert.match(routeSummaryLines(route).join("\n"), /Codex Exec/);
  assert.match(routeSummaryLines(route).join("\n"), /Provider: OpenAI/);
  assert.match(routeSummaryLines(route).join("\n"), new RegExp(`Model: ${CODEX_EXEC_MODEL}`));
  const disclosure = codexExecDisclosure("C:\\fixture", "Create a welcome page");
  assert.equal(disclosure.provider, "OpenAI");
  assert.equal(disclosure.model, CODEX_EXEC_MODEL);
  assert.equal(disclosure.task, "Create a welcome page");
  assert.match(disclosure.data, /any file inside the selected project/i);
  assert.match(disclosure.quota, /exactly one ephemeral Codex Exec process/i);
});

test("explicit mock mode names the adapter, provider, and model honestly", () => {
  const route = previewSerialRoute("Create a welcome page", adaptersForMode(true));
  assert.equal(route.status, "ready");
  const text = routeSummaryLines(route).join("\n");
  assert.match(text, /Cairn offline demonstration/);
  assert.match(text, /Provider: none/);
  assert.match(text, /Model: none/);
});
