import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDeviceStore, hashToken } from "../src/main/bridge/devices.js";
import { emitBridgeSync } from "../src/main/bridge/hub.js";
import { PHONE_PAGE } from "../src/main/bridge/phonepage.js";
import {
  NOT_PAIRED_ANSWER,
  PAIR_REFUSED_ANSWER,
  startBridge,
  type Bridge,
  type BridgeService,
} from "../src/main/bridge/server.js";
import type { ConductorStatus, ConductorTurn } from "../src/shared/ipc.js";

/**
 * Task 143's bridge coverage: pairing accept/refuse/expiry/single-use,
 * device revocation (including cutting a live stream), listener lifecycle,
 * and the fail-closed rules — one refusal answer, hash-only token storage,
 * and a snapshot that never carries paths or provider URLs to the LAN.
 */

const STATUS: ConductorStatus = {
  connected: true,
  consentRequired: false,
  baseUrl: "https://openrouter.ai/api/v1",
  model: "moonshotai/kimi-k2",
  provider: "openrouter.ai",
  encryptionAvailable: true,
};

const PROJECT_DIR = "C:\\secret\\absolute\\path\\must-not-leak";
const TURNS: ConductorTurn[] = [
  { role: "owner", text: "hello Cairn", ts: "2026-07-31T09:00:00.000Z" },
  { role: "cairn", text: "hello back", ts: "2026-07-31T09:00:05.000Z" },
];

function fakeService(overrides: Partial<BridgeService> = {}): BridgeService {
  return {
    status: () => STATUS,
    conversations: () => [{ id: "001", startedTs: TURNS[0].ts, preview: "hello Cairn" }],
    turns: () => TURNS,
    current: () => null,
    ...overrides,
  };
}

async function boot(opts: {
  service?: BridgeService;
  pairingTtlMs?: number;
  pairingMaxAttempts?: number;
  port?: number;
  portAttempts?: number;
  file?: string;
} = {}): Promise<{ bridge: Bridge; url: string; file: string; store: ReturnType<typeof createDeviceStore> }> {
  const file = opts.file ?? join(mkdtempSync(join(tmpdir(), "cairn-bridge-")), "devices.json");
  const store = createDeviceStore(file);
  const bridge = await startBridge({
    host: "127.0.0.1",
    port: opts.port ?? 0,
    portAttempts: opts.portAttempts,
    devices: store,
    service: opts.service ?? fakeService(),
    currentProject: () => ({ dir: PROJECT_DIR, name: "Cairn" }),
    page: PHONE_PAGE,
    pairingTtlMs: opts.pairingTtlMs,
    pairingMaxAttempts: opts.pairingMaxAttempts,
  });
  return { bridge, url: bridge.url, file, store };
}

async function pair(url: string, code: string, name = "Test phone"): Promise<Response> {
  return fetch(`${url}/api/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, name }),
  });
}

function cookieFrom(res: Response): string {
  const header = res.headers.get("set-cookie") ?? "";
  return header.split(";")[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Collects SSE data frames from the bridge's stream endpoint. */
function sseCollect(url: string, cookie: string): { frames: unknown[]; ended: Promise<void>; close: () => void } {
  const frames: unknown[] = [];
  let endResolve!: () => void;
  const ended = new Promise<void>((resolve) => { endResolve = resolve; });
  const req = http.get(`${url}/api/stream`, { headers: { cookie } }, (res) => {
    let buf = "";
    res.setEncoding("utf8");
    res.on("data", (chunk: string) => {
      buf += chunk;
      let idx = buf.indexOf("\n\n");
      while (idx !== -1) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const line = frame.split("\n").find((l) => l.startsWith("data: "));
        if (line) frames.push(JSON.parse(line.slice("data: ".length)));
        idx = buf.indexOf("\n\n");
      }
    });
    res.on("end", () => endResolve());
    res.on("error", () => endResolve());
  });
  req.on("error", () => endResolve());
  return { frames, ended, close: () => req.destroy() };
}

async function waitFor(check: () => boolean, ms = 3000): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (check()) return;
    await sleep(25);
  }
  assert.fail("timed out waiting for condition");
}

test("the page is served without auth; unknown paths and wrong methods get the fixed answers", async () => {
  const { bridge, url } = await boot();
  const page = await fetch(`${url}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<title>Cairn — phone<\/title>/);
  assert.equal(page.headers.get("cache-control"), "no-store");

  const missing = await fetch(`${url}/nope`);
  assert.equal(missing.status, 404);

  // /api/state is GET-only: a POST never reaches the auth path at all.
  const wrongMethod = await fetch(`${url}/api/state`, { method: "POST" });
  assert.equal(wrongMethod.status, 404);

  const noCookie = await fetch(`${url}/api/state`);
  assert.equal(noCookie.status, 401);
  assert.equal(await noCookie.text(), NOT_PAIRED_ANSWER);
  await bridge.close();
});

test("pairing accepts the right code exactly once and stores only the token's hash", async () => {
  const { bridge, url, file } = await boot();
  const { code } = bridge.beginPairing();

  const res = await pair(url, code, "Ken's phone");
  assert.equal(res.status, 200);
  const setCookie = res.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /cairn_device=/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.match(setCookie, /Path=\//);
  assert.equal((await res.json() as { name: string }).name, "Ken's phone");

  // The raw token appears NOWHERE in the profile file — only its hash.
  const token = cookieFrom(res).split("=")[1];
  const onDisk = readFileSync(file, "utf8");
  assert.ok(!onDisk.includes(token), "devices.json must never contain a raw token");
  assert.ok(onDisk.includes(hashToken(token)));

  // Single-use: the same code a second time gets the one refusal.
  const again = await pair(url, code);
  assert.equal(again.status, 403);
  assert.equal(await again.text(), PAIR_REFUSED_ANSWER);
  await bridge.close();
});

test("a paired phone reads the state snapshot — content only, no paths, no provider URL", async () => {
  const { bridge, url } = await boot();
  const { code } = bridge.beginPairing();
  const cookie = cookieFrom(await pair(url, code));

  const res = await fetch(`${url}/api/state`, { headers: { cookie } });
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.ok(!body.includes(PROJECT_DIR), "the snapshot never carries the project's path");
  assert.ok(!body.includes(STATUS.baseUrl), "the snapshot never carries the provider URL");
  const snapshot = JSON.parse(body) as {
    status: { connected: boolean; consentRequired: boolean; provider: string; model: string };
    project: { name: string };
    conversation: { id: string; turns: ConductorTurn[]; streaming: null };
    device: { name: string };
  };
  assert.deepEqual(snapshot.status, {
    connected: true,
    consentRequired: false,
    provider: "openrouter.ai",
    model: "moonshotai/kimi-k2",
  });
  assert.equal(snapshot.project.name, "Cairn");
  assert.equal(snapshot.conversation.id, "001");
  assert.equal(snapshot.conversation.turns.length, 2);
  assert.equal(snapshot.conversation.streaming, null);
  assert.equal(snapshot.device.name, "Test phone");
  await bridge.close();
});

test("the phone names the updated-sharing pause and sends the owner to the computer", () => {
  assert.match(
    PHONE_PAGE,
    /Cairn is paused until you review the updated project-file sharing permission on the computer\./,
  );
});

test("a paired phone receives the saved-connection consent pause", async () => {
  const paused = { ...STATUS, connected: false, consentRequired: true };
  const { bridge, url } = await boot({ service: fakeService({ status: () => paused }) });
  const { code } = bridge.beginPairing();
  const cookie = cookieFrom(await pair(url, code));

  const res = await fetch(`${url}/api/state`, { headers: { cookie } });
  assert.equal(res.status, 200);
  const snapshot = await res.json() as {
    status: { connected: boolean; consentRequired: boolean; provider: string; model: string };
  };
  assert.deepEqual(snapshot.status, {
    connected: false,
    consentRequired: true,
    provider: STATUS.provider,
    model: STATUS.model,
  });
  await bridge.close();
});

test("pairing refuses a wrong code but stays alive under the attempt limit", async () => {
  const { bridge, url } = await boot();
  const { code } = bridge.beginPairing();
  const wrong = code === "000000" ? "000001" : "000000";

  const res = await pair(url, wrong);
  assert.equal(res.status, 403);
  assert.equal(await res.text(), PAIR_REFUSED_ANSWER);

  const right = await pair(url, code);
  assert.equal(right.status, 200);
  await bridge.close();
});

test("a code burns after the attempt limit — even the right code is then refused", async () => {
  const { bridge, url } = await boot({ pairingMaxAttempts: 3 });
  const { code } = bridge.beginPairing();
  const wrong = code === "000000" ? "000001" : "000000";
  for (let i = 0; i < 3; i += 1) {
    assert.equal((await pair(url, wrong)).status, 403);
  }
  assert.equal((await pair(url, code)).status, 403);
  await bridge.close();
});

test("pairing codes expire", async () => {
  const { bridge, url } = await boot({ pairingTtlMs: 30 });
  const { code } = bridge.beginPairing();
  await sleep(60);
  const res = await pair(url, code);
  assert.equal(res.status, 403);
  assert.equal(await res.text(), PAIR_REFUSED_ANSWER);
  await bridge.close();
});

test("a new code supersedes the one before it", async () => {
  const { bridge, url } = await boot();
  const first = bridge.beginPairing().code;
  const second = bridge.beginPairing().code;
  assert.equal((await pair(url, first)).status, 403);
  assert.equal((await pair(url, second)).status, 200);
  await bridge.close();
});

test("an unknown token gets exactly the one refusal answer", async () => {
  const { bridge, url } = await boot();
  const res = await fetch(`${url}/api/state`, { headers: { cookie: "cairn_device=forged" } });
  assert.equal(res.status, 401);
  assert.equal(await res.text(), NOT_PAIRED_ANSWER);
  const stream = await fetch(`${url}/api/stream`, { headers: { cookie: "cairn_device=forged" } });
  assert.equal(stream.status, 401);
  assert.equal(await stream.text(), NOT_PAIRED_ANSWER);
  await bridge.close();
});

test("revocation ends the device's session immediately and its next request gets the one refusal", async () => {
  const { bridge, url, store } = await boot();
  const { code } = bridge.beginPairing();
  const cookie = cookieFrom(await pair(url, code));
  const { frames, ended } = sseCollect(url, cookie);
  await waitFor(() => frames.length === 1); // the hello snapshot

  const deviceId = store.list()[0].id;
  assert.equal(bridge.revokeDevice(deviceId), true);
  await ended; // the live stream was cut, not left hanging

  const after = await fetch(`${url}/api/state`, { headers: { cookie } });
  assert.equal(after.status, 401);
  assert.equal(await after.text(), NOT_PAIRED_ANSWER);
  assert.equal(bridge.revokeDevice(deviceId), false); // already gone
  await bridge.close();
});

test("the stream pushes a fresh snapshot when the hub signals a visible change", async () => {
  let streamText = "";
  const service = fakeService({
    current: () => streamText === "" ? null : {
      dir: PROJECT_DIR,
      conversationId: "001",
      kind: "reply",
      startedAt: "2026-07-31T09:01:00.000Z",
      text: streamText,
    },
  });
  const { bridge, url } = await boot({ service });
  const { code } = bridge.beginPairing();
  const cookie = cookieFrom(await pair(url, code));
  const { frames, close } = sseCollect(url, cookie);
  await waitFor(() => frames.length === 1);

  streamText = "thinking out loud";
  emitBridgeSync();
  await waitFor(() => frames.length === 2);
  const pushed = frames[1] as { conversation: { streaming: { text: string } } };
  assert.equal(pushed.conversation.streaming.text, "thinking out loud");
  close();
  await bridge.close();
});

test("the snapshot follows the desktop's rule: the live stream's conversation wins", async () => {
  const service = fakeService({
    conversations: () => [
      { id: "001", startedTs: TURNS[0].ts, preview: "old" },
      { id: "002", startedTs: TURNS[0].ts, preview: "newer" },
    ],
    current: () => ({
      dir: PROJECT_DIR,
      conversationId: "001",
      kind: "reply",
      startedAt: "2026-07-31T09:01:00.000Z",
      text: "in flight",
    }),
  });
  const { bridge, url } = await boot({ service });
  const { code } = bridge.beginPairing();
  const cookie = cookieFrom(await pair(url, code));
  const res = await fetch(`${url}/api/state`, { headers: { cookie } });
  const snapshot = JSON.parse(await res.text()) as { conversation: { id: string; streaming: { text: string } } };
  assert.equal(snapshot.conversation.id, "001"); // the stream's conversation, not the newest saved
  assert.equal(snapshot.conversation.streaming.text, "in flight");
  await bridge.close();
});

test("the listener walks to a free port when the preferred one is taken", async () => {
  const blocker = http.createServer((_req, res) => res.end("held"));
  await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  const taken = (blocker.address() as { port: number }).port;

  const { bridge } = await boot({ port: taken, portAttempts: 3 });
  assert.equal(bridge.port, taken + 1);
  await bridge.close();
  await new Promise<void>((resolve) => blocker.close(() => resolve()));
});

test("the listener refuses honestly when every candidate port is taken", async () => {
  const blockers = await Promise.all([0, 1].map(async () => {
    const server = http.createServer((_req, res) => res.end("held"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    return server;
  }));
  const first = (blockers[0].address() as { port: number }).port;
  const second = (blockers[1].address() as { port: number }).port;
  // Only meaningful when the two blockers landed adjacent — otherwise the
  // walk legitimately finds the gap between them and this test proves nothing.
  if (second === first + 1) {
    await assert.rejects(() => boot({ port: first, portAttempts: 2 }), (err: NodeJS.ErrnoException) => err.code === "EADDRINUSE");
  }
  await Promise.all(blockers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

test("closing the bridge stops answers", async () => {
  const { bridge, url } = await boot();
  assert.equal((await fetch(`${url}/`)).status, 200);
  await bridge.close();
  await assert.rejects(() => fetch(`${url}/`));
});

test("the device store survives a reload and never stores a raw token", async () => {
  const file = join(mkdtempSync(join(tmpdir(), "cairn-devices-")), "devices.json");
  const first = createDeviceStore(file);
  const { device, token } = first.add("  My phone  ", "2026-07-31T09:00:00.000Z");
  assert.equal(device.name, "My phone"); // trimmed

  const reloaded = createDeviceStore(file);
  assert.equal(reloaded.list().length, 1);
  assert.equal(reloaded.list()[0].name, "My phone");
  assert.equal(reloaded.authenticate(token)?.id, device.id);
  assert.equal(reloaded.authenticate(`${token}x`), null);

  const onDisk = readFileSync(file, "utf8");
  assert.ok(!onDisk.includes(token));
  assert.ok(onDisk.includes(hashToken(token)));

  assert.equal(reloaded.revoke(device.id), true);
  assert.equal(reloaded.authenticate(token), null);
  assert.equal(reloaded.revoke(device.id), false);
});

test("lastSeen refreshes at most once a minute", async () => {
  const file = join(mkdtempSync(join(tmpdir(), "cairn-devices-")), "devices.json");
  const store = createDeviceStore(file);
  const { device, token } = store.add("Phone", "2026-07-31T09:00:00.000Z");

  const soon = store.authenticate(token, "2026-07-31T09:00:30.000Z");
  assert.equal(soon?.lastSeen, "2026-07-31T09:00:00.000Z"); // throttled

  const later = store.authenticate(token, "2026-07-31T09:02:00.000Z");
  assert.equal(later?.lastSeen, "2026-07-31T09:02:00.000Z");
  assert.equal(createDeviceStore(file).list().find((d) => d.id === device.id)?.lastSeen, "2026-07-31T09:02:00.000Z");
});

test("a corrupt devices file reads as no devices — fail closed", async () => {
  const file = join(mkdtempSync(join(tmpdir(), "cairn-devices-")), "devices.json");
  const store = createDeviceStore(file);
  const { token } = store.add("Phone");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(file, "{not json", "utf8");
  assert.equal(store.authenticate(token), null);
  assert.deepEqual(store.list(), []);
});
