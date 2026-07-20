import test from "node:test";
import assert from "node:assert/strict";
import { connect } from "node:net";
import { createBoundedNetworkGuard } from "../src/bounded-network-guard.js";
import { parseBrokerRequest, parseBrokerResponse } from "../src/bounded-broker-protocol.js";

test("the Final exposes a strict child-broker protocol", async () => {
  const moduleName = "../src/bounded-broker-protocol.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  assert.equal(typeof candidate.parseBrokerRequest, "function");
  assert.equal(typeof candidate.parseBrokerResponse, "function");
  assert.equal(typeof candidate.brokerChildEntry, "string");
});

test("broker protocol rejects unknown fields and malformed responses", () => {
  assert.throws(() => parseBrokerRequest('{"schemaVersion":1,"taskNumber":1,"proxyUrl":"http://127.0.0.1:1234","extra":true}'), /BROKER_PROTOCOL_INVALID/);
  assert.throws(() => parseBrokerResponse('{"schemaVersion":1,"ok":true}'), /BROKER_PROTOCOL_INVALID/);
});

test("destination guard rejects every destination except the fixed Anthropic endpoint", async () => {
  const guard = await createBoundedNetworkGuard();
  const port = Number(new URL(guard.proxyUrl).port);
  await new Promise<void>((resolve) => {
    const socket = connect(port, "127.0.0.1", () => socket.end("CONNECT example.com:443 HTTP/1.1\r\n\r\n"));
    socket.on("data", () => undefined);
    socket.on("close", () => resolve());
  });
  assert.deepEqual(guard.snapshot(), { connectCount: 0, destinations: [], rejected: 1 });
  await guard.close();
});

test("the Final exposes a credentialless destination guard", async () => {
  const moduleName = "../src/bounded-network-guard.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  assert.equal(typeof candidate.createBoundedNetworkGuard, "function");
});
