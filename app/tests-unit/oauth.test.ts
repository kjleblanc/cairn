import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  buildAuthUrl,
  createPkce,
  beginOpenRouterOAuth,
  OAUTH_CANCELLED,
  OAUTH_EXCHANGE_FAILED,
  OAUTH_LISTEN_FAILED,
  OAUTH_TIMEOUT,
  type CallbackRequest,
  type FetchLike,
  type Listener,
  type RequestHandler,
} from "../src/main/conductor/oauth.js";

// Task 131: "Sign in with OpenRouter" — the whole dance runs in the main
// process so the minted key never enters the renderer. These pins cover the
// pure seams: PKCE shape, the exact auth URL, loopback-callback handling, the
// exact exchange request, and every fixed refusal. No ports, no network —
// listener and fetch are injected fakes; the real loopback and the real
// PKCE binding are proven end-to-end in conductor.spec.ts's fixture.

function fakeListener(): {
  listen: (handler: RequestHandler) => Promise<Listener>;
  fire: (req: CallbackRequest) => { status: number; body: string };
  closed: () => boolean;
} {
  let handler: RequestHandler | null = null;
  let isClosed = false;
  return {
    listen: async (h) => {
      handler = h;
      return { port: 4321, close: () => { isClosed = true; } };
    },
    fire: (req) => {
      assert.ok(handler !== null, "no request handler registered");
      let status = 0;
      let body = "";
      handler(req, (s, b) => { status = s; body = b; });
      return { status, body };
    },
    closed: () => isClosed,
  };
}

function fakeFetch(impl: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => { ok: boolean; status: number; payload: unknown }): {
  fetchImpl: FetchLike;
  calls: () => { url: string; init: { method: string; headers: Record<string, string>; body: string } }[];
} {
  const calls: { url: string; init: { method: string; headers: Record<string, string>; body: string } }[] = [];
  return {
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      const res = impl(url, init);
      return { ok: res.ok, status: res.status, json: async () => res.payload };
    },
    calls: () => calls,
  };
}

function callbackReq(pathname: string, params: Record<string, string>): CallbackRequest {
  return { pathname, query: new URLSearchParams(params) };
}

function stateFromAuthUrl(authUrl: string): string {
  const state = new URL(authUrl).searchParams.get("state");
  assert.ok(state !== null);
  return state;
}

test("createPkce mints a base64url verifier, its S256 challenge, and a state", () => {
  const pkce = createPkce();
  assert.match(pkce.verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.match(pkce.state, /^[A-Za-z0-9_-]{22}$/);
  const expected = createHash("sha256").update(pkce.verifier).digest("base64url");
  assert.equal(pkce.challenge, expected);
  const again = createPkce();
  assert.notEqual(again.verifier, pkce.verifier);
  assert.notEqual(again.state, pkce.state);
});

test("buildAuthUrl lays out OpenRouter's authorization query exactly", () => {
  const url = buildAuthUrl("https://openrouter.ai", "http://127.0.0.1:4321/callback", {
    verifier: "v",
    challenge: "CH",
    state: "ST",
  });
  assert.equal(
    url,
    "https://openrouter.ai/auth?callback_url=http%3A%2F%2F127.0.0.1%3A4321%2Fcallback&code_challenge=CH&code_challenge_method=S256&state=ST",
  );
  // A trailing slash on the base never doubles a path segment.
  assert.ok(buildAuthUrl("https://openrouter.ai/", "http://127.0.0.1:1/callback", { verifier: "v", challenge: "c", state: "s" }).startsWith("https://openrouter.ai/auth?"));
});

test("happy path: the callback's code is exchanged for the key, which resolves the attempt", async () => {
  const listener = fakeListener();
  const exchange = fakeFetch(() => ({ ok: true, status: 200, payload: { key: "sk-or-test-key" } }));
  const attempt = await beginOpenRouterOAuth({
    authBase: "https://openrouter.ai",
    listen: listener.listen,
    fetchImpl: exchange.fetchImpl,
    timeoutMs: 60_000,
  });
  assert.ok(new URL(attempt.authUrl).searchParams.get("code_challenge") !== null);

  let settled: { kind: "key"; value: string } | { kind: "error"; message: string } | null = null;
  const waiting = attempt
    .waitForKey()
    .then((value) => { settled = { kind: "key", value }; })
    .catch((err: Error) => { settled = { kind: "error", message: err.message }; });

  const res = listener.fire(callbackReq("/callback", { code: "auth-code-1", state: stateFromAuthUrl(attempt.authUrl) }));
  assert.equal(res.status, 200);
  assert.match(res.body, /return to Cairn/);
  assert.equal(listener.closed(), true);

  await waiting;
  assert.deepEqual(settled, { kind: "key", value: "sk-or-test-key" });

  assert.equal(exchange.calls().length, 1);
  const call = exchange.calls()[0];
  assert.equal(call.url, "https://openrouter.ai/api/v1/auth/keys");
  assert.equal(call.init.method, "POST");
  assert.match(call.init.headers["content-type"], /application\/json/);
  const body = JSON.parse(call.init.body) as Record<string, string>;
  assert.equal(body.code, "auth-code-1");
  assert.equal(body.code_challenge_method, "S256");
  // The verifier must be the one whose S256 hash rode in the auth URL.
  const challenge = new URL(attempt.authUrl).searchParams.get("code_challenge");
  assert.equal(createHash("sha256").update(body.code_verifier).digest("base64url"), challenge);
});

test("a callback without a state parameter still resolves — PKCE binds the code to this attempt", async () => {
  const listener = fakeListener();
  const exchange = fakeFetch(() => ({ ok: true, status: 200, payload: { key: "sk-or-no-state" } }));
  const attempt = await beginOpenRouterOAuth({
    authBase: "https://openrouter.ai",
    listen: listener.listen,
    fetchImpl: exchange.fetchImpl,
    timeoutMs: 60_000,
  });
  const res = listener.fire(callbackReq("/callback", { code: "auth-code-2" }));
  assert.equal(res.status, 200);
  assert.equal(await attempt.waitForKey(), "sk-or-no-state");
});

test("a wrong state is refused with 400 and the attempt keeps waiting", async () => {
  const listener = fakeListener();
  const exchange = fakeFetch(() => ({ ok: true, status: 200, payload: { key: "sk-or-late" } }));
  const attempt = await beginOpenRouterOAuth({
    authBase: "https://openrouter.ai",
    listen: listener.listen,
    fetchImpl: exchange.fetchImpl,
    timeoutMs: 60_000,
  });
  const bad = listener.fire(callbackReq("/callback", { code: "wrong", state: "not-our-state" }));
  assert.equal(bad.status, 400);
  assert.equal(exchange.calls().length, 0);
  assert.equal(listener.closed(), false);

  const good = listener.fire(callbackReq("/callback", { code: "right", state: stateFromAuthUrl(attempt.authUrl) }));
  assert.equal(good.status, 200);
  assert.equal(await attempt.waitForKey(), "sk-or-late");
});

test("a callback missing its code gets a 400 and the attempt keeps waiting", async () => {
  const listener = fakeListener();
  const exchange = fakeFetch(() => ({ ok: true, status: 200, payload: { key: "sk-or-x" } }));
  const attempt = await beginOpenRouterOAuth({
    authBase: "https://openrouter.ai",
    listen: listener.listen,
    fetchImpl: exchange.fetchImpl,
    timeoutMs: 60_000,
  });
  const res = listener.fire(callbackReq("/callback", { state: stateFromAuthUrl(attempt.authUrl) }));
  assert.equal(res.status, 400);
  assert.match(res.body, /finish the approval/);
  assert.equal(exchange.calls().length, 0);
  attempt.cancel();
  await assert.rejects(attempt.waitForKey(), (err: Error) => err.message === OAUTH_CANCELLED);
});

test("any other path on the listener is a plain 404", async () => {
  const listener = fakeListener();
  const exchange = fakeFetch(() => ({ ok: true, status: 200, payload: { key: "sk-or-x" } }));
  const attempt = await beginOpenRouterOAuth({
    authBase: "https://openrouter.ai",
    listen: listener.listen,
    fetchImpl: exchange.fetchImpl,
    timeoutMs: 60_000,
  });
  const res = listener.fire(callbackReq("/favicon.ico", {}));
  assert.equal(res.status, 404);
  assert.equal(exchange.calls().length, 0);
  attempt.cancel();
  await assert.rejects(attempt.waitForKey(), (err: Error) => err.message === OAUTH_CANCELLED);
});

test("cancel closes the listener and refuses with the fixed message; a late callback is inert", async () => {
  const listener = fakeListener();
  const exchange = fakeFetch(() => ({ ok: true, status: 200, payload: { key: "sk-or-x" } }));
  const attempt = await beginOpenRouterOAuth({
    authBase: "https://openrouter.ai",
    listen: listener.listen,
    fetchImpl: exchange.fetchImpl,
    timeoutMs: 60_000,
  });
  attempt.cancel();
  assert.equal(listener.closed(), true);
  await assert.rejects(attempt.waitForKey(), (err: Error) => err.message === OAUTH_CANCELLED);

  const late = listener.fire(callbackReq("/callback", { code: "too-late", state: stateFromAuthUrl(attempt.authUrl) }));
  assert.equal(late.status, 410);
  assert.equal(exchange.calls().length, 0);
});

test("the wait times out with the fixed message and closes the listener", async () => {
  const listener = fakeListener();
  const exchange = fakeFetch(() => ({ ok: true, status: 200, payload: { key: "sk-or-x" } }));
  const attempt = await beginOpenRouterOAuth({
    authBase: "https://openrouter.ai",
    listen: listener.listen,
    fetchImpl: exchange.fetchImpl,
    timeoutMs: 10,
  });
  await assert.rejects(attempt.waitForKey(), (err: Error) => err.message === OAUTH_TIMEOUT);
  assert.equal(listener.closed(), true);
});

test("a failed exchange refuses with the fixed message", async () => {
  const listener = fakeListener();
  const exchange = fakeFetch(() => ({ ok: false, status: 403, payload: {} }));
  const attempt = await beginOpenRouterOAuth({
    authBase: "https://openrouter.ai",
    listen: listener.listen,
    fetchImpl: exchange.fetchImpl,
    timeoutMs: 60_000,
  });
  listener.fire(callbackReq("/callback", { code: "c", state: stateFromAuthUrl(attempt.authUrl) }));
  await assert.rejects(attempt.waitForKey(), (err: Error) => err.message === OAUTH_EXCHANGE_FAILED);
});

test("an exchange answer without a key refuses with the fixed message", async () => {
  const listener = fakeListener();
  const exchange = fakeFetch(() => ({ ok: true, status: 200, payload: { unexpected: true } }));
  const attempt = await beginOpenRouterOAuth({
    authBase: "https://openrouter.ai",
    listen: listener.listen,
    fetchImpl: exchange.fetchImpl,
    timeoutMs: 60_000,
  });
  listener.fire(callbackReq("/callback", { code: "c", state: stateFromAuthUrl(attempt.authUrl) }));
  await assert.rejects(attempt.waitForKey(), (err: Error) => err.message === OAUTH_EXCHANGE_FAILED);
});

test("a listener that cannot start refuses the whole attempt with the fixed message", async () => {
  const exchange = fakeFetch(() => ({ ok: true, status: 200, payload: { key: "sk-or-x" } }));
  await assert.rejects(
    beginOpenRouterOAuth({
      authBase: "https://openrouter.ai",
      listen: async () => { throw new Error("EADDRINUSE"); },
      fetchImpl: exchange.fetchImpl,
      timeoutMs: 60_000,
    }),
    (err: Error) => err.message === OAUTH_LISTEN_FAILED,
  );
});
