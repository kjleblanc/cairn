import test from "node:test";
import assert from "node:assert/strict";
import { ANTHROPIC_MESSAGES_URL, BoundedMessagesFetchError, createOneRequestMessagesFetch } from "../src/bounded-messages-fetch.js";

const signal = () => new AbortController().signal;
const ok = async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } });

test("one-request Messages fetch delegates one exact POST and forces redirect denial", async () => {
  let calls = 0;
  let redirect: RequestRedirect | undefined;
  const boundary = createOneRequestMessagesFetch(async (_input, init) => {
    calls += 1;
    redirect = init?.redirect;
    return ok();
  });
  const response = await boundary.fetch(ANTHROPIC_MESSAGES_URL, { method: "POST", signal: signal(), headers: { "x-test-canary": "never-record-this" } });
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(redirect, "error");
  assert.deepEqual(boundary.snapshot(), {
    invocationCount: 1, delegatedCount: 1, destination: ANTHROPIC_MESSAGES_URL, status: "delegated",
  });
  assert.equal(JSON.stringify(boundary.snapshot()).includes("never-record-this"), false);
});

for (const [label, url, init] of [
  ["http", "http://api.anthropic.com/v1/messages", { method: "POST", signal: signal() }],
  ["host", "https://example.com/v1/messages", { method: "POST", signal: signal() }],
  ["port", "https://api.anthropic.com:444/v1/messages", { method: "POST", signal: signal() }],
  ["userinfo", "https://user@api.anthropic.com/v1/messages", { method: "POST", signal: signal() }],
  ["path", "https://api.anthropic.com/v1/complete", { method: "POST", signal: signal() }],
  ["credential refresh", "https://console.anthropic.com/v1/oauth/token", { method: "POST", signal: signal() }],
  ["telemetry", "https://api.anthropic.com/v1/telemetry", { method: "POST", signal: signal() }],
  ["upload", "https://api.anthropic.com/v1/files", { method: "POST", signal: signal() }],
  ["query", "https://api.anthropic.com/v1/messages?beta=1", { method: "POST", signal: signal() }],
  ["fragment", "https://api.anthropic.com/v1/messages#x", { method: "POST", signal: signal() }],
  ["method", ANTHROPIC_MESSAGES_URL, { method: "GET", signal: signal() }],
  ["signal", ANTHROPIC_MESSAGES_URL, { method: "POST" }],
] as const) {
  test(`one-request Messages fetch rejects ${label} before delegation`, async () => {
    let calls = 0;
    const boundary = createOneRequestMessagesFetch(async () => { calls += 1; return ok(); });
    await assert.rejects(() => boundary.fetch(url, init), (error: unknown) =>
      error instanceof BoundedMessagesFetchError && error.code === "MESSAGES_FETCH_REFUSED");
    assert.equal(calls, 0);
    assert.deepEqual(boundary.snapshot(), { invocationCount: 1, delegatedCount: 0, destination: null, status: "rejected" });
  });
}

test("the allocation is claimed synchronously and a second invocation never delegates", async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let calls = 0;
  const boundary = createOneRequestMessagesFetch(async () => { calls += 1; await held; return ok(); });
  const first = boundary.fetch(ANTHROPIC_MESSAGES_URL, { method: "POST", signal: signal() });
  const second = boundary.fetch(ANTHROPIC_MESSAGES_URL, { method: "POST", signal: signal() });
  await assert.rejects(() => second, /MESSAGES_FETCH_REFUSED/);
  assert.equal(calls, 1);
  release();
  await first;
  assert.equal(calls, 1);
});

test("delegate failures become fixed unknown outcomes without raw error text", async () => {
  const boundary = createOneRequestMessagesFetch(async () => { throw new Error("RAW_CANARY_DO_NOT_LEAK"); });
  await assert.rejects(() => boundary.fetch(ANTHROPIC_MESSAGES_URL, { method: "POST", signal: signal() }),
    (error: unknown) => error instanceof BoundedMessagesFetchError && error.message === "MESSAGES_REQUEST_FAILED" &&
      !error.message.includes("RAW_CANARY"));
  assert.equal(boundary.snapshot().status, "unknown");
});
