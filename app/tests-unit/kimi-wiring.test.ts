import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  KIMI_EXEC_MODEL,
  KIMI_EXEC_PROVIDER,
  KIMI_EXEC_QUOTA_OAUTH,
  createDirectTaskIntent,
  type CodexStatusProbe,
  type KimiDetectionProbes,
  type TaskIntent,
} from "@cairn/core";
import { CODEX_EXEC_MODEL } from "@cairn/core";
import { connectionRequiredReason, detectedAdapters, type DetectionProbes } from "../src/main/adapters.js";

// Level 3a plan Task 4: the app wiring generalized from "codex" to "every
// connected real adapter". These tests inject every probe — nothing here
// spawns a process, and nothing can reach the real signed-in CLIs on this
// machine (the module under test is pure: it imports @cairn/core, never
// electron).

function dir(): string {
  return mkdtempSync(join(tmpdir(), "cairn-kimi-wiring-"));
}

function directIntent(text = "Improve Cairn safely\n\nUse 74."): TaskIntent {
  const value = createDirectTaskIntent(text, "00000000-0000-4000-8000-000000000001");
  assert.ok(value);
  return value;
}

function codexProbe(installed: boolean, connected: boolean): CodexStatusProbe {
  return {
    async run(args) {
      if (args.includes("--version")) return installed ? "success" : "not-found";
      return connected ? "success" : "failed";
    },
  };
}

function kimiProbes(installed: boolean, connected: boolean, billing: "oauth" | "other" = "oauth"): KimiDetectionProbes {
  return {
    status: { async run() { return installed ? "success" : "not-found"; } },
    acp: { async authenticate() { return connected ? "authenticated" : "auth-required"; } },
    provider: { async billingSource() { return billing; } },
  };
}

test("both connected: both adapters are constructed, codex first, each with its own authorization", async () => {
  const project = dir();
  const probes: DetectionProbes = { codex: codexProbe(true, true), kimi: kimiProbes(true, true) };
  const intent = directIntent();
  const detected = await detectedAdapters(false, project, intent, probes);
  assert.deepEqual(detected.adapters.map((adapter) => adapter.descriptor.id), ["codex-exec", "kimi-exec"]);
  assert.equal(detected.adapters[0].descriptor.priority, 100);
  assert.equal(detected.adapters[1].descriptor.priority, 90);
  assert.equal(detected.adapters.every((adapter) => adapter.descriptor.connected), true);
  // The kimi adapter discloses its own six facts — provider, model, and the
  // oauth membership quota wording — carrying BOTH parts of the request.
  const kimi = detected.adapters[1];
  const card = kimi.disclosure?.(intent);
  assert.equal(card?.provider, KIMI_EXEC_PROVIDER);
  assert.equal(card?.model, KIMI_EXEC_MODEL);
  assert.equal(card?.quota, KIMI_EXEC_QUOTA_OAUTH);
  assert.match(card?.task ?? "", /Improve Cairn safely/);
  assert.match(card?.task ?? "", /Use 74\./);
  const codexCard = detected.adapters[0].disclosure?.(intent);
  assert.equal(codexCard?.provider, "OpenAI");
  assert.equal(codexCard?.model, CODEX_EXEC_MODEL);
  assert.equal(detected.status?.codex?.connected, true);
  assert.equal(detected.status?.kimi?.billing, "oauth");
});

test("kimi-only: one kimi adapter is constructed and codex reports not installed", async () => {
  const project = dir();
  const probes: DetectionProbes = { codex: codexProbe(false, false), kimi: kimiProbes(true, true) };
  const detected = await detectedAdapters(false, project, undefined, probes);
  assert.deepEqual(detected.adapters.map((adapter) => adapter.descriptor.id), ["kimi-exec"]);
  assert.equal(detected.status?.codex?.installed, false);
  assert.equal(detected.status?.kimi?.connected, true);
});

test("codex-only: one codex adapter, and the connection prose stays byte-identical to today", async () => {
  const project = dir();
  const probes: DetectionProbes = { codex: codexProbe(true, true), kimi: kimiProbes(false, false) };
  const detected = await detectedAdapters(false, project, undefined, probes);
  assert.deepEqual(detected.adapters.map((adapter) => adapter.descriptor.id), ["codex-exec"]);
  assert.equal(detected.status?.kimi?.installed, false);
  // The byte-identical pin: a machine with codex but no Kimi CLI reads exactly
  // today's codex-only prose.
  assert.equal(
    connectionRequiredReason({ codex: { installed: true, connected: false }, kimi: { installed: false, connected: false, billing: "unknown" } }),
    "Codex Exec is installed but not connected, so no model route is available.",
  );
});

test("the reason picker names what was probed: kimi-only, both present, and neither", () => {
  const kimiAbsent = { installed: false, connected: false, billing: "unknown" as const };
  // Codex absent, kimi present but not connected → the kimi prose alone.
  assert.equal(
    connectionRequiredReason({ codex: { installed: false, connected: false }, kimi: { installed: true, connected: false, billing: "unknown" } }),
    "Kimi Code CLI is installed but not signed in, so no Kimi model route is available.",
  );
  // Both installed, neither connected → both named.
  assert.equal(
    connectionRequiredReason({ codex: { installed: true, connected: false }, kimi: { installed: true, connected: false, billing: "unknown" } }),
    "Codex Exec is installed but not connected, so no model route is available. Kimi Code CLI is installed but not signed in, so no Kimi model route is available.",
  );
  // Neither installed → both named.
  assert.equal(
    connectionRequiredReason({ codex: { installed: false, connected: false }, kimi: kimiAbsent }),
    "Codex Exec is not installed, so no model route is available. Kimi Code CLI is not installed, so no Kimi model route is available.",
  );
});

test("mock mode returns the offline demo adapter and no status, exactly as today", async () => {
  const detected = await detectedAdapters(true, dir());
  assert.deepEqual(detected.adapters.map((adapter) => adapter.descriptor.id), ["cairn-offline-demo"]);
  assert.equal(detected.status, undefined);
});
