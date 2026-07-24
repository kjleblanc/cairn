import test from "node:test";
import assert from "node:assert/strict";
import { buildRequestBody, ownerMessageFor, streamChat, ConductorHttpError } from "../src/main/conductor/client.js";

const SLOT = { baseUrl: "https://openrouter.ai/api/v1", model: "moonshotai/kimi-k2", apiKey: "test-key" };

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

test("request body pins model, stream, and usage accounting", () => {
  const body = buildRequestBody("m", [{ role: "user", content: "hi" }]);
  assert.deepEqual(body, { model: "m", messages: [{ role: "user", content: "hi" }], stream: true, stream_options: { include_usage: true } });
});

test("streaming yields deltas, usage, and done — and the url and key are used", async () => {
  let seenUrl = "";
  let seenAuth = "";
  const fake: typeof fetch = async (url, init) => {
    seenUrl = String(url);
    seenAuth = String((init?.headers as Record<string, string>).authorization);
    return sseResponse([
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":4,"cost":0.0001}}\n\n',
      "data: [DONE]\n\n",
    ]);
  };
  const events = [];
  for await (const event of streamChat(SLOT, [{ role: "user", content: "hi" }], fake)) events.push(event);
  assert.equal(seenUrl, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(seenAuth, "Bearer test-key");
  assert.deepEqual(events[0], { kind: "delta", text: "Hel" });
  assert.deepEqual(events[1], { kind: "delta", text: "lo" });
  assert.equal(events[2].kind, "usage");
  assert.equal(events[2].promptTokens, 12);
  assert.equal(events[2].costUsd, 0.0001);
  assert.equal(events.at(-1)?.kind, "done");
});

test("an http error surfaces a plain-words owner message and no key", async () => {
  const fake: typeof fetch = async () => new Response("raw provider secret detail", { status: 401 });
  await assert.rejects(
    async () => { for await (const _ of streamChat(SLOT, [], fake)) void _; },
    (error: unknown) => {
      assert.ok(error instanceof ConductorHttpError);
      assert.equal(error.status, 401);
      assert.doesNotMatch(error.ownerMessage, /test-key|raw provider/);
      return true;
    },
  );
});

test("owner messages exist for the failure statuses", () => {
  for (const status of [401, 402, 404, 429, 500]) {
    assert.ok(ownerMessageFor(status).length > 10);
    assert.doesNotMatch(ownerMessageFor(status), /\d{3}/);
  }
});

test("http errors release the response body to avoid socket pool exhaustion", async () => {
  let canceled = false;
  const fake: typeof fetch = async () => {
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        canceled = true;
      },
    });
    return new Response(stream, { status: 401 });
  };
  await assert.rejects(
    async () => { for await (const _ of streamChat(SLOT, [], fake)) void _; },
    (error: unknown) => {
      assert.ok(error instanceof ConductorHttpError);
      return true;
    },
  );
  assert.ok(canceled, "response body must be canceled");
});
