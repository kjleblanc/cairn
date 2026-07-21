import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeBrokerRequest } from "../src/bounded-broker-child.js";
import { ANTHROPIC_MESSAGES_URL } from "../src/bounded-messages-fetch.js";
import { brokerChildEntry, parseBrokerRequest, parseBrokerResponse, type BrokerRequest } from "../src/bounded-broker-protocol.js";

const request: BrokerRequest = {
  schemaVersion: 2, taskNumber: 1,
  pricing: { inputUsdPerMillion: 1, outputUsdPerMillion: 10, maxInputTokens: 200_000 },
};

function message(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "discarded-id", type: "message", role: "assistant", model: "claude-haiku-4-5",
    content: [{ type: "text", text: '{"replacement":"Welcome to your simple reading list, where every new book belongs."}' }],
    stop_reason: "end_turn", stop_sequence: null, stop_details: null, container: null,
    usage: { input_tokens: 20, output_tokens: 12, cache_creation_input_tokens: null, cache_read_input_tokens: null,
      cache_creation: null, server_tool_use: null, service_tier: "standard", inference_geo: null },
    ...overrides,
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "request-id": "discarded-request-id" } });
}

test("the strict child-broker protocol accepts only schema 2 pricing and redacted results", () => {
  assert.deepEqual(parseBrokerRequest(JSON.stringify(request)), request);
  assert.throws(() => parseBrokerRequest('{"schemaVersion":2,"taskNumber":1,"pricing":{"inputUsdPerMillion":1,"outputUsdPerMillion":10,"maxInputTokens":200000},"extra":true}'), /BROKER_PROTOCOL_INVALID/);
  assert.throws(() => parseBrokerResponse('{"schemaVersion":2,"ok":true}'), /BROKER_PROTOCOL_INVALID/);
});

test("the official SDK performs one fake Messages request and returns only bounded IPC", async () => {
  let calls = 0;
  const response = await executeBrokerRequest(request, {
    testApiKey: "offline-test-key",
    delegate: async () => { calls += 1; return jsonResponse(message()); },
  });
  assert.equal(response.ok, true);
  assert.equal(calls, 1);
  assert.equal(response.requestCount, 1);
  assert.equal(response.destination, ANTHROPIC_MESSAGES_URL);
  if (response.ok) {
    assert.equal(response.inputTokens, 20);
    assert.equal(response.outputTokens, 12);
    assert.equal(response.costUsd, 0.00014);
    const raw = JSON.stringify(response);
    for (const forbidden of ["discarded-id", "discarded-request-id", "offline-test-key", "headers", "raw"]) {
      assert.equal(raw.includes(forbidden), false);
    }
  }
});

for (const [label, delegate, expectedCode] of [
  ["retryable status", async () => jsonResponse({ type: "error", error: { type: "overloaded_error", message: "RAW_503" } }, 503), "CALL_OUTCOME_UNKNOWN"],
  ["401", async () => jsonResponse({ type: "error", error: { type: "authentication_error", message: "RAW_401" } }, 401), "CALL_OUTCOME_UNKNOWN"],
  ["redirect response", async () => new Response("", { status: 302, headers: { location: "https://example.com/escape" } }), "CALL_OUTCOME_UNKNOWN"],
  ["transport error", async () => { throw new Error("RAW_TRANSPORT"); }, "CALL_OUTCOME_UNKNOWN"],
] as const) {
  test(`the broker never retries a ${label}`, async () => {
    let calls = 0;
    const invoke = delegate as () => Promise<Response>;
    const result = await executeBrokerRequest(request, { testApiKey: "offline-test-key", delegate: async () => {
      calls += 1;
      return invoke();
    } });
    assert.equal(result.ok, false);
    assert.equal(calls, 1);
    if (!result.ok) {
      assert.equal(result.code, expectedCode);
      assert.equal(JSON.stringify(result).includes("RAW_"), false);
    }
  });
}

test("the isolated broker process exits after one fixed malformed envelope", async () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-task-027-broker-exit-"));
  let child: ReturnType<typeof spawn> | undefined;
  try {
    child = spawn(process.execPath, [brokerChildEntry()], { cwd: root, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
    let stdout = "";
    child.stdout!.setEncoding("utf8");
    child.stdout!.on("data", (chunk: string) => { stdout += chunk; });
    child.stdin!.end("{}\n");
    const code = await new Promise<number | null>((resolveClose, rejectClose) => {
      const timer = setTimeout(() => rejectClose(new Error("BROKER_EXIT_TIMEOUT")), 10_000);
      child!.once("close", (status) => { clearTimeout(timer); resolveClose(status); });
      child!.once("error", rejectClose);
    });
    assert.equal(code, 1);
    const response = parseBrokerResponse(stdout.trim());
    assert.equal(response.ok, false);
    if (!response.ok) assert.equal(response.code, "BROKER_PROTOCOL_INVALID");
  } finally {
    if (child?.pid) { try { process.kill(child.pid); } catch { /* already exited */ } }
    rmSync(root, { recursive: true, force: true });
  }
});

for (const [label, override] of [
  ["extra content block", { content: [...message().content as unknown[], { type: "text", text: "extra" }] }],
  ["tool use", { content: [{ type: "tool_use", id: "x", name: "x", input: {} }], stop_reason: "tool_use" }],
  ["cache use", { usage: { ...(message().usage as object), cache_read_input_tokens: 1 } }],
  ["priority tier", { usage: { ...(message().usage as object), service_tier: "priority" } }],
  ["max token stop", { stop_reason: "max_tokens" }],
] as const) {
  test(`the broker rejects ${label} after one request`, async () => {
    let calls = 0;
    const result = await executeBrokerRequest(request, { testApiKey: "offline-test-key", delegate: async () => {
      calls += 1;
      return jsonResponse(message(override));
    } });
    assert.equal(calls, 1);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "PROVIDER_RESPONSE_INVALID");
  });
}
