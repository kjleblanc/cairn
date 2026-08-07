import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  ConductorHttpError as ClientHttpError,
  streamChat,
  type ChatTurnMessage,
  type SlotWithKey,
} from "../src/main/conductor/client.js";
import { createOpenAICompatibleTransport } from "../src/main/conductor/transports/openai-compatible.js";
import {
  ConductorHttpError,
  ConductorTransportError,
  INFERENCE_REDIRECT_POLICY,
  streamWithTransport,
  type ConductorTransport,
  type ConductorTransportFactory,
  type ConductorTransportFinish,
  type ConductorTransportRedactedError,
  type ConductorTransportRequest,
  type ConductorTransportRequestIdentity,
  type ConductorTransportStreamEvent,
  type ConductorTransportUsage,
} from "../src/main/conductor/transports/types.js";

const CONNECTION = {
  baseUrl: "https://openrouter.ai/api/v1",
  model: "moonshotai/kimi-k2",
  apiKey: "inert-test-key",
};

const REDIRECT_OWNER_MESSAGE = "The provider redirected Cairn's request. Cairn stopped before sending it anywhere else.";

type RedirectTarget = "same-origin" | "cross-origin";

interface ObservedRequest {
  readonly method: string;
  readonly pathname: string;
  readonly contentType: string;
  readonly authorizationSha256: string;
  readonly bodySha256: string;
  readonly bodyBytes: number;
}

interface RedirectObservation {
  readonly requestCount: number;
  readonly headerBytes: number;
  readonly authorizationBytes: number;
  readonly bodyBytes: number;
  readonly requests: readonly ObservedRequest[];
}

interface RedirectScenario {
  readonly baseUrl: string;
  snapshot(): { readonly source: RedirectObservation; readonly target: RedirectObservation };
}

interface FakeModelProvider {
  readonly sourceOrigin: string;
  readonly targetOrigin: string;
  readonly locationCanary: string;
  readonly responseCanary: string;
  scenario(input: { readonly status: number; readonly target: RedirectTarget }): RedirectScenario;
  close(): Promise<void>;
}

async function startFakeModelProvider(): Promise<FakeModelProvider> {
  const moduleUrl = pathToFileURL(join(
    __dirname,
    "..",
    "tests",
    "fixtures",
    "fake-model-provider.mjs",
  )).href;
  const fixture = await import(moduleUrl) as { start(): Promise<FakeModelProvider> };
  return fixture.start();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), { status: 200 });
}

async function collect(source: AsyncIterable<ConductorTransportStreamEvent>): Promise<ConductorTransportStreamEvent[]> {
  const events: ConductorTransportStreamEvent[] = [];
  for await (const event of source) events.push(event);
  return events;
}

function collectTransport(
  transport: ConductorTransport,
  request: ConductorTransportRequest,
): Promise<ConductorTransportStreamEvent[]> {
  return collect(transport.stream(request));
}

test("the compatible transport preserves the exact request URL, init, and JSON bytes", async () => {
  let seenUrl = "";
  let seenInit: RequestInit | undefined;
  const fake: typeof fetch = async (url, init) => {
    seenUrl = String(url);
    seenInit = init;
    return sseResponse(["data: [DONE]\n\n"]);
  };
  const controller = new AbortController();
  const messages = [
    { role: "system" as const, content: "rules" },
    { role: "user" as const, content: "hello" },
  ];

  const transport = createOpenAICompatibleTransport(CONNECTION, fake);
  const events = await collectTransport(transport, {
    messages,
    signal: controller.signal,
  });

  assert.equal(seenUrl, "https://openrouter.ai/api/v1/chat/completions");
  assert.deepEqual(seenInit, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer inert-test-key",
    },
    body: '{"model":"moonshotai/kimi-k2","messages":[{"role":"system","content":"rules"},{"role":"user","content":"hello"}],"stream":true,"stream_options":{"include_usage":true}}',
    redirect: "manual",
    signal: controller.signal,
  });
  assert.equal(transport.inferenceRedirectPolicy, INFERENCE_REDIRECT_POLICY);
  assert.deepEqual(events, [{ kind: "done" }]);
});

test("all inference redirects stop before same-origin or cross-origin replay", async (t) => {
  const fixture = await startFakeModelProvider();
  t.after(async () => { await fixture.close(); });
  assert.match(fixture.sourceOrigin, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.match(fixture.targetOrigin, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.notEqual(fixture.sourceOrigin, fixture.targetOrigin);

  const statuses = [301, 302, 303, 307, 308] as const;
  const targets = ["same-origin", "cross-origin"] as const;
  for (const status of statuses) {
    for (const target of targets) {
      await t.test(`${status} ${target}`, async () => {
        const scenario = fixture.scenario({ status, target });
        const apiKey = `inert-redirect-key-${status}-${target}`;
        const messages = [{
          role: "user" as const,
          content: `inert-project-body-${status}-${target}`,
        }];
        const expectedBody = JSON.stringify({
          model: CONNECTION.model,
          messages,
          stream: true,
          stream_options: { include_usage: true },
        });
        const authorization = `Bearer ${apiKey}`;
        const seenEvents: ConductorTransportStreamEvent[] = [];
        let caught: unknown;

        try {
          for await (const event of createOpenAICompatibleTransport({
            baseUrl: scenario.baseUrl,
            model: CONNECTION.model,
            apiKey,
          }).stream({ messages })) seenEvents.push(event);
        } catch (error) {
          caught = error;
        }

        const snapshot = scenario.snapshot();
        assert.equal(snapshot.source.requestCount, 1, "the intended provider receives one request with no retry");
        assert.equal(snapshot.source.requests.length, 1);
        assert.equal(snapshot.source.requests[0]?.method, "POST");
        assert.match(snapshot.source.requests[0]?.pathname ?? "", /^\/redirect\/\d+\/v1\/chat\/completions$/);
        assert.equal(snapshot.source.requests[0]?.contentType, "application/json");
        assert.equal(snapshot.source.requests[0]?.authorizationSha256, sha256(authorization));
        assert.equal(snapshot.source.requests[0]?.bodySha256, sha256(expectedBody));
        assert.equal(snapshot.source.requests[0]?.bodyBytes, Buffer.byteLength(expectedBody));
        assert.ok(snapshot.source.headerBytes > 0);
        assert.equal(snapshot.source.authorizationBytes, Buffer.byteLength(authorization));
        assert.equal(snapshot.source.bodyBytes, Buffer.byteLength(expectedBody));
        assert.deepEqual(snapshot.target, {
          requestCount: 0,
          headerBytes: 0,
          authorizationBytes: 0,
          bodyBytes: 0,
          requests: [],
        });
        assert.deepEqual(seenEvents, []);
        assert.ok(caught instanceof ConductorHttpError);
        assert.ok(caught instanceof ConductorTransportError);
        assert.equal(caught.status, status);
        assert.equal(caught.ownerMessage, REDIRECT_OWNER_MESSAGE);
        for (const secret of [
          apiKey,
          messages[0].content,
          fixture.locationCanary,
          fixture.responseCanary,
          fixture.sourceOrigin,
          fixture.targetOrigin,
        ]) assert.equal(caught.ownerMessage.includes(secret), false);
      });
    }
  }
});

test("redirect boundaries, missing body, and cancel failure keep one redacted error", async () => {
  for (const status of [300, 304, 399]) {
    let canceled = false;
    const fake: typeof fetch = async (_url, init) => {
      assert.equal(init?.redirect, "manual");
      if (status === 304) return new Response(null, { status });
      return new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"must-not-stream"}}]}\n\n'));
        },
        cancel() {
          canceled = true;
          if (status === 399) throw new Error("inert redirect cancel failure");
        },
      }), {
        status,
        headers: status === 399
          ? { location: "https://user:password@target.invalid/next?secret=location-canary" }
          : undefined,
      });
    };
    const events: ConductorTransportStreamEvent[] = [];

    await assert.rejects(
      async () => {
        for await (const event of createOpenAICompatibleTransport(CONNECTION, fake).stream({ messages: [] })) {
          events.push(event);
        }
      },
      (error: unknown) => {
        assert.ok(error instanceof ConductorHttpError);
        assert.equal(error.status, status);
        assert.equal(error.ownerMessage, REDIRECT_OWNER_MESSAGE);
        assert.doesNotMatch(error.ownerMessage, /user|password|target\.invalid|location-canary|must-not-stream|cancel failure/);
        return true;
      },
    );
    assert.deepEqual(events, []);
    if (status !== 304) assert.equal(canceled, true);
  }
});

test("the legacy client wrapper keeps its constructor and custom compatible route", async () => {
  assert.equal(ClientHttpError, ConductorHttpError);
  let seenUrl = "";
  const fake: typeof fetch = async (url) => {
    seenUrl = String(url);
    return sseResponse(['data: {"choices":[{"delta":{"content":"same"}}]}\n\ndata: [DONE]\n\n']);
  };
  const custom = { ...CONNECTION, baseUrl: "https://custom.example.invalid/root/v1/" };
  const events = [];

  for await (const event of streamChat(custom, [], fake)) events.push(event);

  assert.equal(seenUrl, "https://custom.example.invalid/root/v1/chat/completions");
  assert.deepEqual(events, [{ kind: "delta", text: "same" }, { kind: "done" }]);
});

test("the legacy wrapper keeps its mutable input types", () => {
  const slot: SlotWithKey = { ...CONNECTION };
  const message: ChatTurnMessage = { role: "user", content: "before" };

  slot.model = "changed-by-compatible-caller";
  message.content = "after";

  assert.equal(slot.model, "changed-by-compatible-caller");
  assert.equal(message.content, "after");
});

test("SSE framing keeps delta, usage, ignored finish, and done ordering", async () => {
  const fake: typeof fetch = async () => sseResponse([
    ': keepalive\r\ndata:{"choices":[{"delta":{"content":"wrong-prefix"}}]}\r\ndata: not-json\r\ndata: 7\r\ndata: {}\r\ndata: {"choices":[{"delta":{"cont',
    'ent":"Hel"}}],"usage":{"prompt_tokens":99}}\r',
    '\ndata: {"choices":[{"delta":{"content":"lo"}}]}\r\ndata: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":4,"cost":0.0001}}\r\ndata: {"usage":{}}\r\n',
    'data: {"choices":[{"finish_reason":"stop","delta":{}}],"id":"request-ignored-today"}\r\ndata: [DONE]\r\ndata: {"choices":[{"delta":{"content":"too-late"}}]}\r\n',
  ]);

  const events = await collectTransport(createOpenAICompatibleTransport(CONNECTION, fake), { messages: [] });

  assert.deepEqual(events, [
    { kind: "delta", text: "Hel" },
    { kind: "delta", text: "lo" },
    { kind: "usage", promptTokens: 12, completionTokens: 4, costUsd: 0.0001 },
    { kind: "usage", promptTokens: 0, completionTokens: 0, costUsd: undefined },
    { kind: "done" },
  ]);
});

test("EOF keeps one synthetic done and ignores an unterminated tail", async () => {
  const fake: typeof fetch = async () => sseResponse([
    'data: {"choices":[{"delta":{"content":"only"}}]}\n\ndata: {"choices":[{"delta":{"content":"unterminated"}}]}',
  ]);

  assert.deepEqual(
    await collectTransport(createOpenAICompatibleTransport(CONNECTION, fake), { messages: [] }),
    [{ kind: "delta", text: "only" }, { kind: "done" }],
  );
});

test("cancellation passes the same AbortSignal and rejection without a done event", async () => {
  const controller = new AbortController();
  const reason = new DOMException("aborted by inert test", "AbortError");
  let markFetchStarted!: () => void;
  const fetchStarted = new Promise<void>((resolve) => { markFetchStarted = resolve; });
  const fake: typeof fetch = async (_url, init) => {
    const signal = init?.signal;
    markFetchStarted();
    assert.equal(signal, controller.signal);
    if (!signal) throw new Error("transport did not forward the AbortSignal");
    return await new Promise<Response>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  };
  const seenEvents: ConductorTransportStreamEvent[] = [];
  const consuming = (async () => {
    for await (const event of createOpenAICompatibleTransport(CONNECTION, fake).stream({
      messages: [],
      signal: controller.signal,
    })) seenEvents.push(event);
  })();

  await fetchStarted;
  controller.abort(reason);

  await assert.rejects(consuming, (error: unknown) => error === reason);
  assert.deepEqual(seenEvents, []);
});

const HTTP_ERRORS = [
  [401, "The provider did not accept the key. Reconnect with a fresh key."],
  [429, "The provider is asking us to slow down. Wait a moment and try again."],
  [503, "The provider had a problem answering. Trying again in a moment usually works."],
] as const;

for (const [status, expectedMessage] of HTTP_ERRORS) {
  test(`HTTP ${status} keeps its literal redacted message and cancels the body`, async () => {
    let canceled = false;
    const fake: typeof fetch = async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`raw provider detail with ${CONNECTION.apiKey}`));
      },
      cancel() {
        canceled = true;
      },
    }), { status });

    await assert.rejects(
      collectTransport(createOpenAICompatibleTransport(CONNECTION, fake), { messages: [] }),
      (error: unknown) => {
        assert.ok(error instanceof ConductorHttpError);
        assert.ok(error instanceof ConductorTransportError);
        assert.ok(error instanceof ClientHttpError);
        assert.equal(error.status, status);
        assert.equal(error.ownerMessage, expectedMessage);
        assert.doesNotMatch(error.ownerMessage, /inert-test-key|raw provider detail/);
        return true;
      },
    );
    assert.equal(canceled, true);
  });
}

test("a body-cancel failure never masks the bounded HTTP error", async () => {
  const fake: typeof fetch = async () => new Response(new ReadableStream<Uint8Array>({
    cancel() {
      throw new Error("inert cancel failure");
    },
  }), { status: 503 });

  await assert.rejects(
    collectTransport(createOpenAICompatibleTransport(CONNECTION, fake), { messages: [] }),
    (error: unknown) => error instanceof ConductorHttpError && error.status === 503,
  );
});

test("network failures retain identity for the service's generic redaction branch", async () => {
  const networkError = new Error("inert local network failure with raw detail");
  const fake: typeof fetch = async () => { throw networkError; };

  await assert.rejects(
    collectTransport(createOpenAICompatibleTransport(CONNECTION, fake), { messages: [] }),
    (error: unknown) => error === networkError,
  );
});

test("provider-neutral metadata and redacted-error shapes remain available", () => {
  const usage = { promptTokens: 3, completionTokens: 2, costUsd: 0.1 } satisfies ConductorTransportUsage;
  const finish = { finishReason: "stop" } satisfies ConductorTransportFinish;
  const identity = { requestId: "inert-request-id" } satisfies ConductorTransportRequestIdentity;
  const error = {
    ownerMessage: "A bounded owner-safe message.",
    status: 503,
    requestId: identity.requestId,
  } satisfies ConductorTransportRedactedError;

  assert.deepEqual({ usage, finish, identity, error }, {
    usage: { promptTokens: 3, completionTokens: 2, costUsd: 0.1 },
    finish: { finishReason: "stop" },
    identity: { requestId: "inert-request-id" },
    error: {
      ownerMessage: "A bounded owner-safe message.",
      status: 503,
      requestId: "inert-request-id",
    },
  });
});

test("a fake factory receives any compatible connection once and preserves event order", async () => {
  const arbitraryConnection = {
    baseUrl: "https://not-openrouter.invalid/v7",
    model: "inert-model",
    apiKey: "inert-factory-key",
  };
  const controller = new AbortController();
  const messages = [{ role: "user" as const, content: "inert message" }];
  let factoryCalls = 0;
  let seenConnection: typeof arbitraryConnection | undefined;
  let seenRequest: ConductorTransportRequest | undefined;
  const factory: ConductorTransportFactory = (connection) => {
    factoryCalls += 1;
    seenConnection = connection;
    return {
      inferenceRedirectPolicy: INFERENCE_REDIRECT_POLICY,
      async *stream(request) {
        seenRequest = request;
        yield { kind: "delta", text: "first" };
        yield { kind: "usage", promptTokens: 5, completionTokens: 1 };
        yield { kind: "done", finishReason: "stop", requestId: "inert-id" };
      },
    };
  };

  const events = await collect(streamWithTransport(factory, arbitraryConnection, {
    messages,
    signal: controller.signal,
  }));

  assert.equal(factoryCalls, 1);
  assert.equal(seenConnection, arbitraryConnection);
  assert.equal(seenRequest?.messages, messages);
  assert.equal(seenRequest?.signal, controller.signal);
  assert.deepEqual(events, [
    { kind: "delta", text: "first" },
    { kind: "usage", promptTokens: 5, completionTokens: 1 },
    { kind: "done", finishReason: "stop", requestId: "inert-id" },
  ]);
});

test("streamTurn uses the injected transport seam, not compatible HTTP selection", () => {
  const source = readFileSync(join(
    __dirname,
    "..",
    "..",
    "src",
    "main",
    "conductor",
    "service.ts",
  ), "utf8");
  const start = source.indexOf("async function streamTurn(");
  assert.notEqual(start, -1, "streamTurn must remain the one service streaming body");
  const streamTurn = source.slice(start);

  assert.match(streamTurn, /transportFactory: ConductorTransportFactory = createOpenAICompatibleTransport/);
  const promptLimitIndex = streamTurn.indexOf("if (promptTooLarge(messages))");
  const keyIndex = streamTurn.indexOf("apiKey: keystore.decryptedKey(conn)");
  const streamIndex = streamTurn.indexOf("streamWithTransport(");
  assert.ok(promptLimitIndex >= 0 && promptLimitIndex < keyIndex, "the prompt cap must precede key decryption");
  assert.ok(keyIndex < streamIndex, "key decryption must remain at the transport boundary");
  assert.equal(streamTurn.match(/streamWithTransport\(/g)?.length, 1);
  const streamCall = streamTurn.slice(streamIndex, streamIndex + 220);
  assert.match(streamCall, /transportFactory/);
  assert.match(streamCall, /connection/);
  assert.match(streamCall, /messages/);
  assert.match(streamCall, /controller\.signal/);
  assert.match(streamTurn, /err instanceof ConductorTransportError/);
  assert.match(
    streamTurn,
    /logError\("conductor:send", err\);\s*onDelta\(\{ dir, conversationId: id, kind: "error", message: "Cairn had a problem answering\. Trying again in a moment usually works\.", turnKind: kind \}\);/,
  );
  assert.ok(
    streamTurn.indexOf("controller.signal.aborted") < streamTurn.indexOf("err instanceof ConductorTransportError"),
    "an owner abort must remain distinct from transport error normalization",
  );
  assert.doesNotMatch(
    streamTurn,
    /streamChat\(|chat\/completions|new URL|\.host(?:name)?|OPENROUTER_BASE_URL|ConductorHttpError/,
  );
});
