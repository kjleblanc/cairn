import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  bindTaskIntent,
  parseTaskIntentCandidate,
  type TaskIntentSourceInput,
} from "../src/intent.js";
import {
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  QUALITY_PLAN_VERSION,
  bindInitialEvidencePlan,
  bindTaskSpec,
  parseQualityPlanCandidate,
} from "../src/quality.js";
import {
  BUILDER_CAPABILITY_REQUEST_CATEGORIES,
  BUILDER_INTERCOM_LIMITS,
  BUILDER_SELECTOR_PROVENANCE_VERSION,
  BUILDER_TURN_CONTEXT_VERSION,
  BUILDER_TURN_RESPONSE_VERSION,
  builderTurnContextSha256,
  builderTurnResponseMatchesContext,
  builderTurnResponseSha256,
  canonicalBuilderTurnContext,
  canonicalBuilderTurnResponse,
  composeBuilderTurnContext,
  parseBuilderTurnResponse,
  type BuilderTurnContextV1,
} from "../src/builder-intercom.js";

const RUN_ID = "11111111-1111-4111-8111-111111111111";
const TURN_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_HASH = "a".repeat(64);
const GIT_STATE_SHA = "b".repeat(64);
const BASE_HEAD = "c".repeat(40);
const CONTENT = "export const answer = 41;\n";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function qualityAuthorities() {
  const sources: readonly TaskIntentSourceInput[] = Object.freeze([
    Object.freeze({
      kind: "conversation",
      inputId: "33333333-3333-4333-8333-333333333333",
      text: "Correct the answer while preserving the supported path.",
    }),
  ]);
  const candidate = parseTaskIntentCandidate({
    version: "cairn-task-intent/v1",
    outcome: {
      source: "owner-stated",
      text: "Correct the answer.",
      ownerQuote: "Correct the answer",
    },
    requirements: [{
      source: "owner-stated",
      text: "Preserve the supported path.",
      ownerQuote: "preserving the supported path",
    }],
    context: [],
  });
  assert.ok(candidate);
  const intent = bindTaskIntent(candidate, sources);
  assert.ok(intent);
  const qualityCandidate = parseQualityPlanCandidate({
    version: QUALITY_PLAN_VERSION,
    target: { kind: "local-task", basis: [{ kind: "intent-outcome" }] },
    supportedPath: {
      statement: "Preserve the supported path.",
      basis: [{ kind: "intent-requirement", index: 0 }],
    },
    critic: {
      mode: "off",
      basis: [{ kind: "cairn-default", reason: "not-requested" }],
      reason: "The critic is off for this pure protocol fixture.",
    },
    candidateStates: [],
    acceptanceChecks: [{
      id: "c1",
      promise: "The answer is corrected.",
      kind: "acceptance",
      judge: "cairn",
      basis: [{ kind: "intent-outcome" }],
      failureCondition: {
        id: "answer-unchanged",
        statement: "The answer remains incorrect.",
        allowedArtifactIds: ["source-text"],
      },
      evidenceStandard: {
        mode: "artifact-inspection",
        proves: "The selected source text contains the corrected answer.",
        precondition: null,
      },
      comparison: null,
    }, {
      id: "c2",
      promise: "The supported path remains available.",
      kind: "non-regression",
      judge: "owner",
      basis: [{ kind: "intent-requirement", index: 0 }],
      failureCondition: {
        id: "supported-path-broken",
        statement: "The supported path is no longer available.",
        allowedArtifactIds: ["owner-view"],
      },
      evidenceStandard: {
        mode: "owner-observation",
        proves: "The owner can still use the supported path.",
        precondition: "The owner can inspect the result.",
      },
      comparison: null,
    }],
    qualityPreferences: [],
    references: [],
    unknowns: [],
    coverage: {
      outcomeCriterionIds: ["c1"],
      requirementCriteria: [{ requirementIndex: 0, criterionIds: ["c2"] }],
      supportedPathCriterionId: "c2",
    },
  });
  assert.ok(qualityCandidate);
  const taskSpec = bindTaskSpec(intent, qualityCandidate);
  assert.ok(taskSpec);
  const evidencePlan = bindInitialEvidencePlan(taskSpec, {
    version: EVIDENCE_PLAN_CANDIDATE_VERSION,
    procedures: [{
      criterionId: "c1",
      kind: "packet-artifact",
      command: null,
      artifactIds: ["source-text"],
    }, {
      criterionId: "c2",
      kind: "owner-observation",
      command: null,
      artifactIds: ["owner-view"],
    }],
  });
  assert.ok(evidencePlan);
  return { taskSpec, evidencePlan };
}

function provenance(overrides: Record<string, unknown> = {}) {
  return {
    selectorVersion: BUILDER_SELECTOR_PROVENANCE_VERSION,
    projectHash: PROJECT_HASH,
    connectionConsentVersion: "selected-text-v1",
    gitTracked: true,
    ordinaryText: true,
    regularFile: true,
    symbolicLink: false,
    reparsePoint: false,
    hardLinkCount: 1,
    submodule: false,
    gitIgnored: false,
    dependency: false,
    packageOrDependencyControl: false,
    installScript: false,
    generated: false,
    deploymentOrProductionControl: false,
    credentialLikePath: false,
    credentialLikeContent: false,
    insideProject: true,
    reservedArea: false,
    consented: true,
    ...overrides,
  };
}

function contextInput(overrides: Record<string, unknown> = {}) {
  const { taskSpec, evidencePlan } = qualityAuthorities();
  return {
    version: BUILDER_TURN_CONTEXT_VERSION,
    taskNumber: 224,
    runId: RUN_ID,
    turnId: TURN_ID,
    projectHash: PROJECT_HASH,
    connectionConsentVersion: "selected-text-v1",
    taskSpec,
    evidencePlan,
    baseHead: BASE_HEAD,
    gitStateSha256: GIT_STATE_SHA,
    selectedTrackedText: [{
      id: "selected-source",
      projectRelativePath: "src/answer.ts",
      sha256: sha256(CONTENT),
      content: CONTENT,
      truncated: false,
      provenance: provenance(),
    }],
    ...overrides,
  };
}

function context(overrides: Record<string, unknown> = {}): BuilderTurnContextV1 {
  const result = composeBuilderTurnContext(contextInput(overrides));
  assert.ok(result);
  return result;
}

function replacementRaw(ctx: BuilderTurnContextV1, overrides: Record<string, unknown> = {}) {
  const afterText = "export const answer = 42;\n";
  return {
    version: BUILDER_TURN_RESPONSE_VERSION,
    contextSha256: builderTurnContextSha256(ctx),
    kind: "replacement-proposal",
    summary: "Correct the selected answer constant.",
    replacements: [{
      projectRelativePath: "src/answer.ts",
      beforeSha256: sha256(CONTENT),
      afterText,
      afterSha256: sha256(afterText),
    }],
    ...overrides,
  };
}

function capabilityRaw(ctx: BuilderTurnContextV1, overrides: Record<string, unknown> = {}) {
  return {
    version: BUILDER_TURN_RESPONSE_VERSION,
    contextSha256: builderTurnContextSha256(ctx),
    kind: "capability-request",
    request: {
      category: "external-reference",
      suggestedTarget: "The official format reference named by the task.",
      what: "Inspect one authoritative reference.",
      why: "The selected text does not define the required format.",
      expectedEffect: "Cairn may later obtain bounded reference text.",
      dataExposure: "No project text needs to be sent for discovery.",
      costBasis: "Unknown until Cairn resolves a concrete source.",
      recovery: "Decline or discard the new turn.",
      ...overrides,
    },
  };
}

function selectedRow(index: number, content = `selected-${index}\n`) {
  return {
    id: `selected-${index}`,
    projectRelativePath: `src/selected-${String(index).padStart(2, "0")}.ts`,
    sha256: sha256(content),
    content,
    truncated: false,
    provenance: provenance(),
  };
}

function replacementRow(
  selected: Readonly<{ projectRelativePath: string; sha256: string; content: string }>,
  afterText: string,
) {
  return {
    projectRelativePath: selected.projectRelativePath,
    beforeSha256: selected.sha256,
    afterText,
    afterSha256: sha256(afterText),
  };
}

test("builder intercom: exact turn and replacement are detached, frozen, canonical, and inert", () => {
  const ctx = context();
  const ctxCanonical = canonicalBuilderTurnContext(ctx);
  assert.ok(ctxCanonical);
  assert.match(builderTurnContextSha256(ctx) ?? "", /^[a-f0-9]{64}$/u);
  assert.deepEqual(ctx.criterionIds, ["c1", "c2"]);
  assert.equal(ctx.taskSpec.quality.acceptanceChecks[0]?.promise, "The answer is corrected.");
  assert.equal(ctx.evidencePlan.procedures[0]?.kind, "packet-artifact");
  assert.match(ctxCanonical, /Correct the answer\./u);
  assert.match(ctxCanonical, /packet-artifact/u);
  assert.ok(Object.isFrozen(ctx));
  assert.ok(Object.isFrozen(ctx.selectedTrackedText));
  assert.ok(Object.isFrozen(ctx.selectedTrackedText[0]?.provenance));
  assert.equal(canonicalBuilderTurnContext(clone(ctx)), null);
  assert.equal(builderTurnContextSha256(clone(ctx)), null);

  const raw = replacementRaw(ctx);
  const parsed = parseBuilderTurnResponse(ctx, raw);
  assert.ok(parsed && parsed.kind === "replacement-proposal");
  assert.notEqual(parsed, raw);
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.replacements));
  assert.equal(parsed.replacements[0]?.afterSha256, sha256("export const answer = 42;\n"));
  assert.match(builderTurnResponseSha256(parsed) ?? "", /^[a-f0-9]{64}$/u);
  assert.ok(canonicalBuilderTurnResponse(parsed));
  assert.equal(canonicalBuilderTurnResponse(clone(parsed)), null);
  assert.equal(builderTurnResponseSha256(clone(parsed)), null);
  assert.deepEqual(raw, replacementRaw(ctx), "parsing performed no mutation of caller data");
});

test("builder intercom: a response matches only the exact live context that parsed it", () => {
  const first = context();
  const second = context();
  assert.equal(builderTurnContextSha256(first), builderTurnContextSha256(second),
    "the fixture must exercise two distinct live contexts with identical canonical bytes");
  assert.notEqual(first, second);

  const firstRaw = replacementRaw(first);
  const secondRaw = replacementRaw(second);
  const firstResponse = parseBuilderTurnResponse(first, firstRaw);
  const secondResponse = parseBuilderTurnResponse(second, secondRaw);
  assert.ok(firstResponse);
  assert.ok(secondResponse);
  assert.equal(builderTurnResponseMatchesContext(first, firstResponse), true);
  assert.equal(builderTurnResponseMatchesContext(second, secondResponse), true);
  assert.equal(builderTurnResponseMatchesContext(first, secondResponse), false);
  assert.equal(builderTurnResponseMatchesContext(second, firstResponse), false);

  assert.equal(builderTurnResponseMatchesContext(first, firstRaw), false);
  assert.equal(builderTurnResponseMatchesContext(clone(first), firstResponse), false);
  assert.equal(builderTurnResponseMatchesContext(first, clone(firstResponse)), false);
  assert.equal(builderTurnResponseMatchesContext(new Proxy(first, {}), firstResponse), false);
  assert.equal(builderTurnResponseMatchesContext(first, new Proxy(firstResponse, {})), false);

  let getterRead = false;
  const getterOwned = {};
  Object.defineProperty(getterOwned, "contextSha256", {
    enumerable: true,
    get() {
      getterRead = true;
      return builderTurnContextSha256(first);
    },
  });
  assert.equal(builderTurnResponseMatchesContext(first, getterOwned), false);
  assert.equal(builderTurnResponseMatchesContext(getterOwned, firstResponse), false);
  assert.equal(getterRead, false, "identity checking must not inspect attacker-owned properties");
});

test("builder intercom: context refuses stale, ambiguous, unsafe, widened, and accessor-owned inputs", () => {
  const valid = contextInput();
  assert.equal(composeBuilderTurnContext({ ...valid, taskSpec: clone(valid.taskSpec) }), null);
  assert.equal(composeBuilderTurnContext({ ...valid, evidencePlan: clone(valid.evidencePlan) }), null);
  assert.equal(composeBuilderTurnContext({ ...valid, taskNumber: 0 }), null);
  assert.equal(composeBuilderTurnContext({ ...valid, runId: TURN_ID }), null);
  assert.equal(composeBuilderTurnContext({ ...valid, baseHead: "A".repeat(40) }), null);
  assert.equal(composeBuilderTurnContext({ ...valid, gitStateSha256: "b".repeat(63) }), null);
  assert.equal(composeBuilderTurnContext({ ...valid, connectionConsentVersion: "not consent" }), null);
  assert.equal(composeBuilderTurnContext({ ...valid, extra: true }), null);
  assert.equal(composeBuilderTurnContext(Object.create({ ...valid })), null);
  assert.equal(composeBuilderTurnContext(new Proxy(valid, {})), null);
  const getter = { ...valid } as Record<string, unknown>;
  Object.defineProperty(getter, "baseHead", { enumerable: true, get: () => BASE_HEAD });
  assert.equal(composeBuilderTurnContext(getter), null);

  const selected = valid.selectedTrackedText as Array<Record<string, unknown>>;
  const row = selected[0]!;
  const unsafePaths = [
    "/src/answer.ts", "../answer.ts", "src\\answer.ts", "src//answer.ts", "src/./answer.ts",
    "src/.git/config", ".g\u0131t/config", "node_modules/pkg/index.js", "dist/answer.js", ".env", "secrets/token.txt",
    "config/client-secret.json", "auth/private_key.txt", "config/api-token.txt",
    "package.json", ".npmrc", "pnpm-workspace.yaml", ".github/workflows/release.yml",
    ".gitattributes", ".gitignore", ".gitmodules", "build.gradle", "requirements-dev.txt", "app.csproj",
    "vercel.json", "scripts/install.ps1", "src/CON.txt", "src/CONIN$", "src/COM\u00b9.txt",
    "src/a?.ts", "src/a*.ts", "src/a|b.ts", "src/<x>.ts", "src/\"x\".ts",
    `src/cafe\u0301.ts`, `config/api\u2028token.txt`, `config/api\u2029token.txt`, `src/\ud800.ts`,
    "src/Σ.ts", "src/ς.ts", "src/ΐ.ts", "src/Ϊ́.ts", "src/ß.ts", "src/ẞ.ts",
  ];
  for (const projectRelativePath of unsafePaths) {
    assert.equal(composeBuilderTurnContext({ ...valid, selectedTrackedText: [{ ...row, projectRelativePath }] }), null, projectRelativePath);
  }
  assert.equal(composeBuilderTurnContext({
    ...valid,
    selectedTrackedText: [{ ...row, truncated: true }],
  }), null);
  assert.equal(composeBuilderTurnContext({
    ...valid,
    selectedTrackedText: [{ ...row, content: `${CONTENT}changed` }],
  }), null);
  assert.equal(composeBuilderTurnContext({
    ...valid,
    selectedTrackedText: [{ ...row, provenance: provenance({ projectHash: "d".repeat(64) }) }],
  }), null);
  assert.equal(composeBuilderTurnContext({
    ...valid,
    selectedTrackedText: [{ ...row, provenance: provenance({ connectionConsentVersion: "older-consent-v1" }) }],
  }), null);
  for (const unsafeTopology of [
    { symbolicLink: true }, { reparsePoint: true }, { hardLinkCount: 2 }, { submodule: true },
    { packageOrDependencyControl: true }, { installScript: true }, { deploymentOrProductionControl: true },
  ]) {
    assert.equal(composeBuilderTurnContext({
      ...valid,
      selectedTrackedText: [{ ...row, provenance: provenance(unsafeTopology) }],
    }), null);
  }
  assert.equal(composeBuilderTurnContext({
    ...valid,
    selectedTrackedText: [{ ...row }, { ...row, id: "other", projectRelativePath: "SRC/ANSWER.TS" }],
  }), null);
  assert.equal(composeBuilderTurnContext({
    ...valid,
    selectedTrackedText: [
      { ...row, id: "sigma-one", projectRelativePath: "src/Σ.ts" },
      { ...row, id: "sigma-two", projectRelativePath: "src/ς.ts" },
    ],
  }), null);
  assert.equal(composeBuilderTurnContext({
    ...valid,
    selectedTrackedText: [
      { ...row, id: "compose-one", projectRelativePath: "src/ΐ.ts" },
      { ...row, id: "compose-two", projectRelativePath: "src/Ϊ́.ts" },
    ],
  }), null);
  assert.equal(composeBuilderTurnContext({
    ...valid,
    selectedTrackedText: [{
      ...row,
      content: "x".repeat(BUILDER_INTERCOM_LIMITS.textCharactersPerRow + 1),
      sha256: sha256("x".repeat(BUILDER_INTERCOM_LIMITS.textCharactersPerRow + 1)),
    }],
  }), null);
});

test("builder intercom: selected context counts, paths, text totals, UTF-16, and arrays are bounded", () => {
  const exactEight = Array.from(
    { length: BUILDER_INTERCOM_LIMITS.selectedTrackedText },
    (_, index) => selectedRow(index),
  );
  assert.ok(composeBuilderTurnContext(contextInput({ selectedTrackedText: exactEight })));
  assert.equal(composeBuilderTurnContext(contextInput({
    selectedTrackedText: [...exactEight, selectedRow(exactEight.length)],
  })), null);

  const exactTotal = Array.from(
    { length: 4 },
    (_, index) => selectedRow(index, String(index).repeat(8_000)),
  );
  assert.equal(
    exactTotal.reduce((total, row) => total + row.content.length, 0),
    BUILDER_INTERCOM_LIMITS.totalTextCharacters,
  );
  assert.ok(composeBuilderTurnContext(contextInput({ selectedTrackedText: exactTotal })));
  assert.equal(composeBuilderTurnContext(contextInput({
    selectedTrackedText: [...exactTotal, selectedRow(4, "x")],
  })), null);

  const exactPath = `${"a/".repeat(511)}aa`;
  assert.equal(exactPath.length, BUILDER_INTERCOM_LIMITS.projectRelativePathCharacters);
  assert.ok(composeBuilderTurnContext(contextInput({
    selectedTrackedText: [{ ...selectedRow(0), projectRelativePath: exactPath }],
  })));
  assert.equal(composeBuilderTurnContext(contextInput({
    selectedTrackedText: [{ ...selectedRow(0), projectRelativePath: `${exactPath}a` }],
  })), null);

  assert.equal(composeBuilderTurnContext(contextInput({
    selectedTrackedText: [selectedRow(0, "bad\ud800text")],
  })), null);

  const sparse = new Array(1);
  assert.equal(composeBuilderTurnContext(contextInput({ selectedTrackedText: sparse })), null);
  const symbolOwned = [selectedRow(0)] as unknown[] & { [key: symbol]: boolean };
  symbolOwned[Symbol("extra")] = true;
  assert.equal(composeBuilderTurnContext(contextInput({ selectedTrackedText: symbolOwned })), null);
  let getterRead = false;
  const getterOwned = [selectedRow(0)];
  Object.defineProperty(getterOwned, "0", {
    enumerable: true,
    get() {
      getterRead = true;
      return selectedRow(0);
    },
  });
  assert.equal(composeBuilderTurnContext(contextInput({ selectedTrackedText: getterOwned })), null);
  assert.equal(getterRead, false);
});

test("builder intercom: replacement proposal cannot widen, alias, replay, trust hashes, or become a no-op", () => {
  const ctx = context();
  const valid = replacementRaw(ctx);
  assert.ok(parseBuilderTurnResponse(ctx, valid));
  assert.equal(parseBuilderTurnResponse(clone(ctx), valid), null);
  assert.equal(parseBuilderTurnResponse(ctx, { ...valid, contextSha256: "d".repeat(64) }), null);
  assert.equal(parseBuilderTurnResponse(ctx, { ...valid, extra: true }), null);
  assert.equal(parseBuilderTurnResponse(ctx, new Proxy(valid, {})), null);
  const getter = { ...valid } as Record<string, unknown>;
  Object.defineProperty(getter, "summary", { enumerable: true, get: () => "hidden" });
  assert.equal(parseBuilderTurnResponse(ctx, getter), null);

  const rows = valid.replacements as Array<Record<string, unknown>>;
  const row = rows[0]!;
  const invalidRows = [
    [{ ...row, projectRelativePath: "src/other.ts" }],
    [{ ...row, projectRelativePath: "SRC/ANSWER.TS" }],
    [{ ...row, projectRelativePath: "src/\udfff.ts" }],
    [{ ...row, projectRelativePath: "../answer.ts" }],
    [{ ...row, beforeSha256: "d".repeat(64) }],
    [{ ...row, afterSha256: "e".repeat(64) }],
    [{ ...row, afterText: CONTENT, afterSha256: sha256(CONTENT) }],
    [row, row],
    [],
  ];
  for (const replacements of invalidRows) {
    assert.equal(parseBuilderTurnResponse(ctx, { ...valid, replacements }), null);
  }
  const tooLarge = "x".repeat(BUILDER_INTERCOM_LIMITS.textCharactersPerRow + 1);
  assert.equal(parseBuilderTurnResponse(ctx, {
    ...valid,
    replacements: [{ ...row, afterText: tooLarge, afterSha256: sha256(tooLarge) }],
  }), null);

  const twoContext = context({
    selectedTrackedText: [
      ...(contextInput().selectedTrackedText as Array<Record<string, unknown>>),
      {
        ...(contextInput().selectedTrackedText as Array<Record<string, unknown>>)[0],
        id: "selected-zed",
        projectRelativePath: "src/zed.ts",
      },
    ],
  });
  const firstAfter = "export const first = 1;\n";
  const secondAfter = "export const second = 2;\n";
  const firstSelected = twoContext.selectedTrackedText[0]!;
  const secondSelected = twoContext.selectedTrackedText[1]!;
  assert.equal(parseBuilderTurnResponse(twoContext, {
    version: BUILDER_TURN_RESPONSE_VERSION,
    contextSha256: builderTurnContextSha256(twoContext),
    kind: "replacement-proposal",
    summary: "Return rows in a non-canonical order.",
    replacements: [{
      projectRelativePath: secondSelected.projectRelativePath,
      beforeSha256: secondSelected.sha256,
      afterText: secondAfter,
      afterSha256: sha256(secondAfter),
    }, {
      projectRelativePath: firstSelected.projectRelativePath,
      beforeSha256: firstSelected.sha256,
      afterText: firstAfter,
      afterSha256: sha256(firstAfter),
    }],
  }), null);
});

test("builder intercom: replacement counts, summaries, text totals, UTF-16, and arrays are bounded", () => {
  const selected = Array.from(
    { length: BUILDER_INTERCOM_LIMITS.replacements },
    (_, index) => selectedRow(index),
  );
  const ctx = context({ selectedTrackedText: selected });
  const exactRows = ctx.selectedTrackedText.map(
    (row, index) => replacementRow(row, `after-${index}\n`),
  );
  const exactRaw = {
    version: BUILDER_TURN_RESPONSE_VERSION,
    contextSha256: builderTurnContextSha256(ctx),
    kind: "replacement-proposal",
    summary: "x".repeat(BUILDER_INTERCOM_LIMITS.plainLanguageCharacters),
    replacements: exactRows,
  };
  assert.ok(parseBuilderTurnResponse(ctx, exactRaw));
  assert.equal(parseBuilderTurnResponse(ctx, {
    ...exactRaw,
    summary: "x".repeat(BUILDER_INTERCOM_LIMITS.plainLanguageCharacters + 1),
  }), null);
  assert.equal(parseBuilderTurnResponse(ctx, {
    ...exactRaw,
    replacements: [...exactRows, replacementRow(ctx.selectedTrackedText[0]!, "ninth\n")],
  }), null);

  const totalRows = ctx.selectedTrackedText.slice(0, 4).map(
    (row, index) => replacementRow(row, String(index).repeat(8_000)),
  );
  assert.equal(
    totalRows.reduce((total, row) => total + row.afterText.length, 0),
    BUILDER_INTERCOM_LIMITS.totalTextCharacters,
  );
  assert.ok(parseBuilderTurnResponse(ctx, { ...exactRaw, replacements: totalRows }));
  assert.equal(parseBuilderTurnResponse(ctx, {
    ...exactRaw,
    replacements: [...totalRows, replacementRow(ctx.selectedTrackedText[4]!, "x")],
  }), null);
  assert.equal(parseBuilderTurnResponse(ctx, {
    ...exactRaw,
    replacements: [replacementRow(ctx.selectedTrackedText[0]!, "bad\udffftext")],
  }), null);

  const sparse = new Array(1);
  assert.equal(parseBuilderTurnResponse(ctx, { ...exactRaw, replacements: sparse }), null);
  const symbolOwned = [exactRows[0]] as unknown[] & { [key: symbol]: boolean };
  symbolOwned[Symbol("extra")] = true;
  assert.equal(parseBuilderTurnResponse(ctx, { ...exactRaw, replacements: symbolOwned }), null);
  let getterRead = false;
  const getterOwned = [exactRows[0]];
  Object.defineProperty(getterOwned, "0", {
    enumerable: true,
    get() {
      getterRead = true;
      return exactRows[0];
    },
  });
  assert.equal(parseBuilderTurnResponse(ctx, { ...exactRaw, replacements: getterOwned }), null);
  assert.equal(getterRead, false);
});

test("builder intercom: capability requests use one closed inert vocabulary and strict bounded prose", () => {
  const ctx = context({ selectedTrackedText: [] });
  assert.deepEqual(BUILDER_CAPABILITY_REQUEST_CATEGORIES, [
    "additional-tracked-text", "external-reference", "dependency-change",
    "external-service-action", "owner-clarification",
  ]);
  for (const category of BUILDER_CAPABILITY_REQUEST_CATEGORIES) {
    const parsed = parseBuilderTurnResponse(ctx, capabilityRaw(ctx, { category }));
    assert.ok(parsed && parsed.kind === "capability-request");
    assert.equal(parsed.request.category, category);
    assert.ok(Object.isFrozen(parsed.request));
    assert.ok(canonicalBuilderTurnResponse(parsed));
    const reparsed = parseBuilderTurnResponse(ctx, JSON.parse(JSON.stringify(parsed)));
    assert.ok(reparsed, "serialized proposal may be validated again but remains inert data");
    assert.notEqual(reparsed, parsed);
  }
  assert.equal(parseBuilderTurnResponse(ctx, capabilityRaw(ctx, { category: "run-command" })), null);
  assert.equal(parseBuilderTurnResponse(ctx, capabilityRaw(ctx, { why: "" })), null);
  assert.equal(parseBuilderTurnResponse(ctx, capabilityRaw(ctx, { why: "Safe\u202Etxt" })), null);
  assert.equal(parseBuilderTurnResponse(ctx, capabilityRaw(ctx, { why: "Safe\u2028txt" })), null);
  assert.equal(parseBuilderTurnResponse(ctx, capabilityRaw(ctx, {
    what: "x".repeat(BUILDER_INTERCOM_LIMITS.plainLanguageCharacters + 1),
  })), null);
  assert.equal(parseBuilderTurnResponse(ctx, {
    ...capabilityRaw(ctx),
    request: { ...(capabilityRaw(ctx).request as object), url: "https://example.invalid" },
  }), null);
});

test("builder intercom: package surface exposes pure data operations and no Builder executor", async () => {
  const moduleSurface = await import("../src/builder-intercom.js") as Record<string, unknown>;
  const packageSurface = await import("../src/index.js") as Record<string, unknown>;
  const intendedRuntimeNames = [
    "BUILDER_CAPABILITY_REQUEST_CATEGORIES",
    "BUILDER_INTERCOM_LIMITS",
    "BUILDER_SELECTOR_PROVENANCE_VERSION",
    "BUILDER_TURN_CONTEXT_VERSION",
    "BUILDER_TURN_RESPONSE_VERSION",
    "builderTurnContextSha256",
    "builderTurnResponseMatchesContext",
    "builderTurnResponseSha256",
    "canonicalBuilderTurnContext",
    "canonicalBuilderTurnResponse",
    "composeBuilderTurnContext",
    "parseBuilderTurnResponse",
  ].sort();
  assert.deepEqual(Object.keys(moduleSurface).sort(), intendedRuntimeNames);
  const builderNames = Object.keys(packageSurface).filter((name) => /builder/i.test(name)).sort();
  assert.deepEqual(builderNames, intendedRuntimeNames);
  assert.equal(builderNames.some((name) => /apply|approve|authorize|execute|fetch|grant|run|send|spawn|transport|write/iu.test(name)), false);

  const compiledSource = readFileSync(new URL("../src/builder-intercom.js", import.meta.url), "utf8");
  const importedModules = Array.from(
    compiledSource.matchAll(/\bfrom\s+["']([^"']+)["']/gu),
    (match) => match[1],
  ).sort();
  assert.deepEqual(importedModules, ["./quality.js", "node:crypto", "node:util"]);
  assert.doesNotMatch(
    compiledSource,
    /\bimport\s*\(|\brequire\s*\(|\bprocess\.env\b|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\beval\s*\(|\bnew\s+Function\b/u,
  );
});

test("builder intercom: inherited toJSON poisoning cannot collapse canonical identities", () => {
  const originalObjectToJson = (Object.prototype as { toJSON?: unknown }).toJSON;
  const originalArrayToJson = (Array.prototype as { toJSON?: unknown }).toJSON;
  try {
    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      value: () => "poisoned-object",
    });
    Object.defineProperty(Array.prototype, "toJSON", {
      configurable: true,
      value: () => ["poisoned-array"],
    });
    const first = context();
    const second = context({ turnId: "44444444-4444-4444-8444-444444444444" });
    assert.notEqual(builderTurnContextSha256(first), builderTurnContextSha256(second));
    const firstResponse = parseBuilderTurnResponse(first, replacementRaw(first));
    const secondResponse = parseBuilderTurnResponse(second, replacementRaw(second));
    assert.ok(firstResponse);
    assert.ok(secondResponse);
    assert.notEqual(builderTurnResponseSha256(firstResponse), builderTurnResponseSha256(secondResponse));
    assert.equal(parseBuilderTurnResponse(second, replacementRaw(first)), null);
  } finally {
    if (originalObjectToJson === undefined) delete (Object.prototype as { toJSON?: unknown }).toJSON;
    else Object.defineProperty(Object.prototype, "toJSON", { configurable: true, value: originalObjectToJson });
    if (originalArrayToJson === undefined) delete (Array.prototype as { toJSON?: unknown }).toJSON;
    else Object.defineProperty(Array.prototype, "toJSON", { configurable: true, value: originalArrayToJson });
  }
});

test("builder intercom: oversized dense arrays refuse before full descriptor enumeration", () => {
  const ctx = context();
  const huge = new Array(100_000);
  let touched = false;
  Object.defineProperty(huge, "99999", {
    configurable: true,
    enumerable: true,
    get() {
      touched = true;
      throw new Error("must not inspect an oversized row");
    },
  });
  assert.equal(parseBuilderTurnResponse(ctx, {
    ...replacementRaw(ctx),
    replacements: huge,
  }), null);
  assert.equal(touched, false);
});
