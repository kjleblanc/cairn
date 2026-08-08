import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
  CODEX_EXEC_DATA_SCOPE,
  CODEX_EXEC_QUOTA,
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  KIMI_EXEC_MODEL,
  KIMI_EXEC_DATA_SCOPE,
  KIMI_EXEC_PROVIDER,
  KIMI_EXEC_QUOTA_OAUTH,
  OPAQUE_PROVIDER_COMMAND_EVENT_REPRESENTATION,
  bindInitialEvidencePlan,
  createDirectTaskIntent,
  evidencePlanSha256,
  routeTask,
  taskSpecReviewView,
  taskSpecSha256,
  type AdapterTaskQualityBinding,
  type CodexStatusProbe,
  type KimiDetectionProbes,
  type TaskIntent,
} from "@cairn/core";
import { CODEX_EXEC_MODEL } from "@cairn/core";
import { connectionRequiredReason, detectedAdapters, type DetectionProbes } from "../src/main/adapters.js";
import { composeDirectTaskSpecProposal } from "../src/main/conductor/qualityproposal.js";

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

function qualityBinding(intent: TaskIntent): AdapterTaskQualityBinding {
  const proposal = composeDirectTaskSpecProposal(intent);
  assert.ok(proposal);
  const criterion = proposal.taskSpec.quality.acceptanceChecks[0];
  assert.ok(criterion);
  const evidencePlan = bindInitialEvidencePlan(proposal.taskSpec, {
    version: EVIDENCE_PLAN_CANDIDATE_VERSION,
    procedures: [{
      criterionId: criterion.id,
      kind: "adapter-command-attestation",
      command: {
        executablePath: "node",
        executableSha256: "e".repeat(64),
        arguments: [{ kind: "literal", value: "--test" }],
        fixtureBindings: [],
        cwdRelative: "app",
        expectedExitCodes: [0],
        timeoutMs: 60_000,
        resultParserMode: "exit-code",
        assertion: { id: "app-unit-passes", expectedResult: "the selected unit test exits zero" },
      },
      artifactIds: [criterion.failureCondition.allowedArtifactIds[0]],
    }],
  });
  assert.ok(evidencePlan);
  const taskSha = taskSpecSha256(proposal.taskSpec);
  const planSha = evidencePlanSha256(evidencePlan);
  const review = taskSpecReviewView(proposal.taskSpec);
  assert.ok(taskSha && planSha && review);
  return Object.freeze({
    taskSpec: proposal.taskSpec,
    taskSpecSha256: taskSha,
    taskSpecReview: review,
    evidencePlan,
    evidencePlanSha256: planSha,
  });
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

test("legacy descriptors, disclosures, and routing stay exact while canonical-event routing excludes Codex and Kimi", async () => {
  const project = dir();
  const probes: DetectionProbes = { codex: codexProbe(true, true), kimi: kimiProbes(true, true) };
  const intent = directIntent();
  const detected = await detectedAdapters(false, project, intent, probes);
  assert.deepEqual(detected.adapters.map((adapter) => adapter.descriptor), [
    {
      id: "codex-exec",
      label: "Codex Exec",
      provider: "OpenAI",
      model: CODEX_EXEC_MODEL,
      connected: true,
      capabilities: ["serial-task"],
      priority: 100,
    },
    {
      id: "kimi-exec",
      label: "Kimi Code CLI",
      provider: KIMI_EXEC_PROVIDER,
      model: KIMI_EXEC_MODEL,
      connected: true,
      capabilities: ["serial-task"],
      priority: 90,
    },
  ]);
  const codexCard = detected.adapters[0].disclosure?.(intent);
  const kimiCard = detected.adapters[1].disclosure?.(intent);
  const task = codexCard?.task;
  assert.equal(typeof task, "string");
  assert.equal(kimiCard?.task, task);
  assert.deepEqual(codexCard, {
    provider: "OpenAI",
    model: CODEX_EXEC_MODEL,
    project,
    task,
    data: CODEX_EXEC_DATA_SCOPE,
    quota: CODEX_EXEC_QUOTA,
  });
  assert.deepEqual(kimiCard, {
    provider: KIMI_EXEC_PROVIDER,
    model: KIMI_EXEC_MODEL,
    project,
    task,
    data: KIMI_EXEC_DATA_SCOPE,
    quota: KIMI_EXEC_QUOTA_OAUTH,
  });

  const legacy = routeTask({ outcome: intent.outcome.text, capability: "serial-task" }, detected.adapters);
  assert.equal(legacy.status, "ready");
  if (legacy.status === "ready") {
    assert.equal(legacy.recommended.id, "codex-exec");
    assert.deepEqual(legacy.candidates.map((candidate) => candidate.id), ["codex-exec", "kimi-exec"]);
    assert.equal(legacy.reason, "Codex Exec is connected and supports serial tasks.");
  }
  assert.equal(
    detected.adapters[0].qualitySupport?.commandEventRepresentation,
    OPAQUE_PROVIDER_COMMAND_EVENT_REPRESENTATION,
  );
  assert.equal(detected.adapters[1].qualitySupport, undefined);
  assert.equal(Object.hasOwn(detected.adapters[0].descriptor, "qualitySupport"), false);
  assert.equal(Object.hasOwn(detected.adapters[1].descriptor, "qualitySupport"), false);

  assert.deepEqual(routeTask({
    outcome: intent.outcome.text,
    capability: "serial-task",
    requiredCommandEventRepresentation: CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
  }, detected.adapters), {
    status: "connection-required",
    candidates: [],
    reason: "No connected adapter can run this serial task.",
  });
});

test("the dark Task-Spec binding reaches Codex authorization/disclosure but never upgrades Kimi capability", async () => {
  const project = dir();
  const probes: DetectionProbes = { codex: codexProbe(true, true), kimi: kimiProbes(true, true) };
  const intent = directIntent("Add a visible Save button.");
  const quality = qualityBinding(intent);
  assert.equal(quality.taskSpec.intent, intent);
  const detected = await detectedAdapters(false, project, intent, probes, quality);
  const codexCard = detected.adapters[0].disclosure?.(intent, quality);
  assert.equal(codexCard?.taskSpecSha256, quality.taskSpecSha256);
  assert.equal(codexCard?.evidencePlanSha256, quality.evidencePlanSha256);
  const kimiCard = detected.adapters[1].disclosure?.(intent, quality);
  assert.equal(Object.hasOwn(kimiCard ?? {}, "taskSpecSha256"), false);
  assert.equal(Object.hasOwn(kimiCard ?? {}, "evidencePlanSha256"), false);
  assert.equal(detected.adapters[1].qualitySupport, undefined);

  const wrong = { ...quality, evidencePlanSha256: "d".repeat(64) };
  await assert.rejects(
    detectedAdapters(false, project, intent, probes, wrong),
    /INVALID_TASK_SPEC_BINDING/,
    "the App must not silently fall back to a legacy Codex authorization",
  );
  await assert.rejects(
    detectedAdapters(false, project, intent, probes, {
      ...quality,
      taskSpec: structuredClone(quality.taskSpec),
    }),
    /INVALID_TASK_SPEC_BINDING/,
    "a structural Task Spec copy cannot replace Core's branded authority",
  );
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
