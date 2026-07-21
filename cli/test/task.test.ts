import test from "node:test";
import assert from "node:assert/strict";
import { adaptersForMode, parseTaskArguments, routeSummaryLines } from "../src/flows/task.js";
import { previewSerialRoute } from "@cairn/core";

test("the CLI accepts one offline demo switch and plain outcome text", () => {
  assert.deepEqual(parseTaskArguments(["task", "--mock", "Create", "a", "welcome page"]), { mock: true, outcome: "Create a welcome page" });
  assert.deepEqual(parseTaskArguments(["task"]), { mock: false, outcome: undefined });
});

test("normal CLI mode has no pretend connection", () => {
  const route = previewSerialRoute("Create a welcome page", adaptersForMode(false));
  assert.equal(route.status, "connection-required");
  assert.match(routeSummaryLines(route).join("\n"), /No connected model/);
});

test("explicit mock mode names the adapter, provider, and model honestly", () => {
  const route = previewSerialRoute("Create a welcome page", adaptersForMode(true));
  assert.equal(route.status, "ready");
  const text = routeSummaryLines(route).join("\n");
  assert.match(text, /Cairn offline demonstration/);
  assert.match(text, /Provider: none/);
  assert.match(text, /Model: none/);
});
