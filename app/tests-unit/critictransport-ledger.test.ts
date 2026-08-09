import test from "node:test";
import assert from "node:assert/strict";
import {
  SPENT_CALL_LEDGER_LIMIT,
  sendCriticCall,
  spentCriticCallCount,
} from "../src/main/critictransport.js";
import {
  API_KEY,
  approved,
  bundle,
  criticOutputJson,
  jsonResponse,
  providerEnvelope,
} from "./critic-call-fixture.js";

/**
 * The spent-call ledger is module-global on purpose — a ledger a caller could
 * supply is a ledger a caller could empty — so exhausting it poisons every
 * later case in the same process. This file exists to give that one case its
 * own process. `node --test` runs each test file separately.
 */

const NOW = () => new Date("2026-08-09T12:00:00.000Z");

test("c2: a full spent-call ledger refuses rather than forgetting an earlier call", async () => {
  const { request } = bundle();
  let calls = 0;
  const impl: typeof fetch = async () => {
    calls += 1;
    return jsonResponse(providerEnvelope(criticOutputJson(request)));
  };

  assert.equal(spentCriticCallCount(), 0, "this process starts with an empty ledger");
  for (let index = 0; index < SPENT_CALL_LEDGER_LIMIT; index += 1) {
    const result = await sendCriticCall({
      request,
      authorization: approved(request),
      apiKey: API_KEY,
      fetchImpl: impl,
      now: NOW,
    });
    assert.equal(result.kind, "answered", `call ${index + 1} must succeed`);
  }
  assert.equal(spentCriticCallCount(), SPENT_CALL_LEDGER_LIMIT);
  assert.equal(calls, SPENT_CALL_LEDGER_LIMIT);

  // Full means refuse, not evict. Evicting the oldest entry is exactly how a
  // replay of an already-paid call would get through.
  const overflow = await sendCriticCall({
    request,
    authorization: approved(request),
    apiKey: API_KEY,
    fetchImpl: impl,
    now: NOW,
  });
  assert.equal(overflow.kind, "refused");
  assert.equal(overflow.code, "CRITIC_CALL_LEDGER_FULL");
  assert.equal(overflow.sent, false);
  assert.equal(calls, SPENT_CALL_LEDGER_LIMIT, "the refusal never reached the provider");
  assert.equal(spentCriticCallCount(), SPENT_CALL_LEDGER_LIMIT, "and it consumed no slot");
});
