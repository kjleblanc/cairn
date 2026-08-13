import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

import {
  BUILDER_CAPABILITY_REQUEST_CATEGORIES,
  BUILDER_SELECTOR_PROVENANCE_VERSION,
  BUILDER_TURN_CONTEXT_VERSION,
  BUILDER_TURN_RESPONSE_VERSION,
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  QUALITY_PLAN_VERSION,
  bindInitialEvidencePlan,
  bindTaskIntent,
  bindTaskSpec,
  builderTurnContextSha256,
  builderTurnResponseSha256,
  composeBuilderTurnContext,
  parseBuilderTurnResponse,
  parseQualityPlanCandidate,
  parseTaskIntentCandidate,
  type BuilderCapabilityRequestCategoryV1,
  type BuilderTurnContextV1,
  type BuilderTurnResponseV1,
  type TaskIntentSourceInput,
} from "@cairn/core";

import { composeBuilderProposalReview } from "../src/main/builderproposalreview.js";
import { BuilderProposalReview } from "../src/renderer/components/BuilderProposalReview.js";
import * as builderProposalReviewShared from "../src/shared/builder-proposal-review.js";
import {
  BUILDER_PROPOSAL_LAB_CAPABILITY,
  BUILDER_PROPOSAL_LAB_REPLACEMENT,
} from "../lab/builderproposal-fixtures.js";
import {
  BUILDER_CAPABILITY_REVIEW_LABELS,
  BUILDER_PROPOSAL_REVIEW_BOUNDARY,
  BUILDER_PROPOSAL_REVIEW_VERSION,
  type BuilderProposalReviewV1,
} from "../src/shared/builder-proposal-review.js";

const APP_ROOT = resolve(__dirname, "..", "..");
const REPOSITORY_ROOT = resolve(APP_ROOT, "..");
const RUN_ID = "11111111-1111-4111-8111-111111111111";
const TURN_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_HASH = "a".repeat(64);
const GIT_STATE_SHA = "b".repeat(64);
const BASE_HEAD = "c".repeat(40);
const BEFORE_ALPHA = "export const alpha = '<script>beforeAlpha()</script>';\n";
const BEFORE_BETA = "export const beta = '<img src=x onerror=beforeBeta()>';\n";
const AFTER_ALPHA = "export const alpha = '<svg onload=afterAlpha()></svg>';\n";
const AFTER_BETA = "export const beta = '<style>body{display:none}</style>';\n";
const LAB_BEFORE = "export const greeting = \"Hello from the synthetic lab.\";\n";
const LAB_AFTER = "export const greeting = \"Hello from the proposal-only lab.\";\n";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function qualityAuthorities() {
  const sources: readonly TaskIntentSourceInput[] = Object.freeze([Object.freeze({
    kind: "conversation",
    inputId: "33333333-3333-4333-8333-333333333333",
    text: "Correct both examples while preserving the supported path.",
  })]);
  const candidate = parseTaskIntentCandidate({
    version: "cairn-task-intent/v1",
    outcome: {
      source: "owner-stated",
      text: "Correct both examples.",
      ownerQuote: "Correct both examples",
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
      reason: "The critic is off for this pure review fixture.",
    },
    candidateStates: [],
    acceptanceChecks: [{
      id: "c1",
      promise: "Both examples are corrected.",
      kind: "acceptance",
      judge: "cairn",
      basis: [{ kind: "intent-outcome" }],
      failureCondition: {
        id: "examples-unchanged",
        statement: "The examples remain unchanged.",
        allowedArtifactIds: ["source-text"],
      },
      evidenceStandard: {
        mode: "artifact-inspection",
        proves: "The selected source text contains the proposed examples.",
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
        proves: "The owner can still inspect the supported path.",
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

function provenance() {
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
  };
}

function selected(id: string, projectRelativePath: string, content: string) {
  return {
    id,
    projectRelativePath,
    sha256: sha256(content),
    content,
    truncated: false,
    provenance: provenance(),
  };
}

function contextInput(overrides: Record<string, unknown> = {}) {
  const { taskSpec, evidencePlan } = qualityAuthorities();
  return {
    version: BUILDER_TURN_CONTEXT_VERSION,
    taskNumber: 229,
    runId: RUN_ID,
    turnId: TURN_ID,
    projectHash: PROJECT_HASH,
    connectionConsentVersion: "selected-text-v1",
    taskSpec,
    evidencePlan,
    baseHead: BASE_HEAD,
    gitStateSha256: GIT_STATE_SHA,
    selectedTrackedText: [
      selected("alpha", "src/alpha.ts", BEFORE_ALPHA),
      selected("beta", "src/beta.ts", BEFORE_BETA),
    ],
    ...overrides,
  };
}

function context(overrides: Record<string, unknown> = {}): BuilderTurnContextV1 {
  const result = composeBuilderTurnContext(contextInput(overrides));
  assert.ok(result);
  return result;
}

function replacementRaw(ctx: BuilderTurnContextV1, summary = "Builder <script>summary()</script> **markdown**") {
  return {
    version: BUILDER_TURN_RESPONSE_VERSION,
    contextSha256: builderTurnContextSha256(ctx),
    kind: "replacement-proposal",
    summary,
    replacements: [{
      projectRelativePath: "src/alpha.ts",
      beforeSha256: sha256(BEFORE_ALPHA),
      afterText: AFTER_ALPHA,
      afterSha256: sha256(AFTER_ALPHA),
    }, {
      projectRelativePath: "src/beta.ts",
      beforeSha256: sha256(BEFORE_BETA),
      afterText: AFTER_BETA,
      afterSha256: sha256(AFTER_BETA),
    }],
  };
}

const HOSTILE_FIELDS = Object.freeze({
  suggestedTarget: "https://evil.invalid/<script>target()</script>",
  what: "<img src=x onerror=what()>",
  why: "<svg onload=why()></svg>",
  expectedEffect: "<style>body{display:none}</style>",
  dataExposure: "[send](https://evil.invalid/?secret=data)",
  costBasis: "<form><input name=cost></form>",
  recovery: "<button onclick=recover()>Recover</button>",
});

function capabilityRaw(
  ctx: BuilderTurnContextV1,
  category: BuilderCapabilityRequestCategoryV1,
) {
  return {
    version: BUILDER_TURN_RESPONSE_VERSION,
    contextSha256: builderTurnContextSha256(ctx),
    kind: "capability-request",
    request: { category, ...HOSTILE_FIELDS },
  };
}

function parsed(ctx: BuilderTurnContextV1, raw: unknown): BuilderTurnResponseV1 {
  const result = parseBuilderTurnResponse(ctx, raw);
  assert.ok(result);
  return result;
}

function genuineLabReviews(): readonly [BuilderProposalReviewV1, BuilderProposalReviewV1] {
  const replacementContext = context({
    taskNumber: 900001,
    runId: "11111111-1111-4111-8111-111111111111",
    turnId: "22222222-2222-4222-8222-222222222222",
    selectedTrackedText: [selected("greeting", "examples/synthetic/greeting.ts", LAB_BEFORE)],
  });
  const replacementResponse = parsed(replacementContext, {
    version: BUILDER_TURN_RESPONSE_VERSION,
    contextSha256: builderTurnContextSha256(replacementContext),
    kind: "replacement-proposal",
    summary: "Replace the greeting in the one synthetic tracked-text row.",
    replacements: [{
      projectRelativePath: "examples/synthetic/greeting.ts",
      beforeSha256: sha256(LAB_BEFORE),
      afterText: LAB_AFTER,
      afterSha256: sha256(LAB_AFTER),
    }],
  });
  const replacement = composeBuilderProposalReview(replacementContext, replacementResponse);
  assert.ok(replacement);

  const capabilityContext = context({
    taskNumber: 900002,
    runId: "33333333-3333-4333-8333-333333333333",
    turnId: "44444444-4444-4444-8444-444444444444",
    selectedTrackedText: [selected("greeting", "examples/synthetic/greeting.ts", LAB_BEFORE)],
  });
  const capabilityResponse = parsed(capabilityContext, {
    version: BUILDER_TURN_RESPONSE_VERSION,
    contextSha256: builderTurnContextSha256(capabilityContext),
    kind: "capability-request",
    request: {
      category: "external-reference",
      suggestedTarget: "The synthetic reference named Garden greeting format; nothing will open it.",
      what: "Inspect one synthetic format note supplied only for this visual example.",
      why: "The selected synthetic text does not define its imaginary format.",
      expectedEffect: "A later, separately authorized turn could receive bounded reference text.",
      dataExposure: "No project text would be sent in this example.",
      costBasis: "Synthetic example; no provider or paid call exists.",
      recovery: "Discard this proposal-only example. Nothing needs undoing.",
    },
  });
  const capability = composeBuilderProposalReview(capabilityContext, capabilityResponse);
  assert.ok(capability);
  return [replacement, capability];
}

function assertDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const nested of Object.values(value as Record<string, unknown>)) assertDeepFrozen(nested, seen);
}

function source(path: string): string {
  return readFileSync(resolve(APP_ROOT, path), "utf8");
}

function moduleSurface(value: string, scriptKind: ts.ScriptKind): string[] {
  const file = ts.createSourceFile("task229-source.tsx", value, ts.ScriptTarget.ES2022, true, scriptKind);
  const parseDiagnostics = (file as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  assert.equal(parseDiagnostics.length, 0, "source must parse before its module surface is trusted");
  const output: string[] = [];
  const hasModifier = (node: ts.Node, kind: ts.SyntaxKind): boolean =>
    Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === kind));

  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement)) {
      assert.equal(ts.isStringLiteral(statement.moduleSpecifier), true, "imports must use literal module specifiers");
      const moduleName = (statement.moduleSpecifier as ts.StringLiteral).text;
      const clause = statement.importClause;
      if (!clause) {
        output.push(`import:${moduleName}:side-effect`);
        continue;
      }
      const names: string[] = [];
      if (clause.name) names.push(`default ${clause.name.text}`);
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        names.push(`namespace ${clause.namedBindings.name.text}`);
      } else if (clause.namedBindings) {
        for (const element of clause.namedBindings.elements) {
          const imported = element.propertyName?.text ?? element.name.text;
          const alias = element.propertyName ? ` as ${element.name.text}` : "";
          names.push(`${clause.isTypeOnly || element.isTypeOnly ? "type " : ""}${imported}${alias}`);
        }
      }
      output.push(`import:${moduleName}:${names.join(",")}`);
      continue;
    }
    if (ts.isImportEqualsDeclaration(statement)) {
      output.push(`import-equals:${statement.name.text}`);
      continue;
    }
    if (ts.isExportAssignment(statement)) {
      output.push(statement.isExportEquals ? "export:assignment" : "export:default-assignment");
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      const moduleName = statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : "local";
      if (!statement.exportClause) output.push(`export:${moduleName}:star`);
      else if (ts.isNamespaceExport(statement.exportClause)) {
        output.push(`export:${moduleName}:namespace ${statement.exportClause.name.text}`);
      } else {
        const names = statement.exportClause.elements.map((element) => {
          const local = element.propertyName?.text ?? element.name.text;
          const alias = element.propertyName ? ` as ${element.name.text}` : "";
          return `${statement.isTypeOnly || element.isTypeOnly ? "type " : ""}${local}${alias}`;
        });
        output.push(`export:${moduleName}:${names.join(",")}`);
      }
      continue;
    }
    if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
    const defaultPrefix = hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? "default " : "";
    if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)) {
      output.push(`export:${defaultPrefix}${ts.SyntaxKind[statement.kind]}:${statement.name?.text ?? "<anonymous>"}`);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        output.push(`export:${defaultPrefix}Variable:${declaration.name.getText(file)}`);
      }
    } else {
      output.push(`export:${defaultPrefix}${ts.SyntaxKind[statement.kind]}:<unknown>`);
    }
  }
  return output;
}

function parsedSource(value: string, scriptKind: ts.ScriptKind): ts.SourceFile {
  const file = ts.createSourceFile("task229-source.tsx", value, ts.ScriptTarget.ES2022, true, scriptKind);
  const parseDiagnostics = (file as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  assert.equal(parseDiagnostics.length, 0, "source must parse before its syntax is trusted");
  return file;
}

function assertNoHiddenModuleAuthority(value: string, scriptKind: ts.ScriptKind): void {
  const file = parsedSource(value, scriptKind);
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      assert.notEqual(node.expression.kind, ts.SyntaxKind.ImportKeyword, "dynamic import is forbidden");
      if (ts.isIdentifier(node.expression)) {
        assert.notEqual(node.expression.text, "require", "CommonJS require is forbidden");
      }
    }
    if (ts.isPropertyAccessExpression(node)) {
      assert.notEqual(node.name.text, "getBuiltinModule", "runtime builtin-module lookup is forbidden");
    }
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
      assert.notEqual(node.argumentExpression.text, "getBuiltinModule", "runtime builtin-module lookup is forbidden");
    }
    if (ts.isIdentifier(node)) {
      assert.equal(["module", "exports", "require", "getBuiltinModule"].includes(node.text), false,
        `runtime module authority is forbidden: ${node.text}`);
    }
    if (ts.isMetaProperty(node)) assert.fail("import.meta is forbidden in the dark Task229 modules");
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function assertComponentBodyPure(value: string): void {
  const file = parsedSource(value, ts.ScriptKind.TSX);
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const allowedMap = ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "map" &&
        (node.expression.expression.getText(file) === "review.replacements" ||
          node.expression.expression.getText(file) === "fields");
      assert.equal(allowedMap, true, `unexpected component call: ${node.getText(file)}`);
    }
    assert.equal(ts.isNewExpression(node), false, `constructors are forbidden: ${node.getText(file)}`);
    assert.equal(ts.isAwaitExpression(node), false, `await is forbidden: ${node.getText(file)}`);
    assert.equal(ts.isYieldExpression(node), false, `yield is forbidden: ${node.getText(file)}`);
    assert.equal(ts.isDeleteExpression(node), false, `delete is forbidden: ${node.getText(file)}`);
    assert.equal(ts.isTaggedTemplateExpression(node), false, `tagged templates are forbidden: ${node.getText(file)}`);
    assert.equal(ts.isPostfixUnaryExpression(node), false, `updates are forbidden: ${node.getText(file)}`);
    if (ts.isPrefixUnaryExpression(node)) {
      assert.equal([ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator), false,
        `updates are forbidden: ${node.getText(file)}`);
    }
    if (ts.isBinaryExpression(node)) {
      assert.equal(
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          node.operatorToken.kind <= ts.SyntaxKind.LastAssignment,
        false,
        `assignments are forbidden: ${node.getText(file)}`,
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function assertComposerSourceSafe(value: string): void {
  assert.equal((value.match(/builderTurnResponseMatchesContext\(contextValue, responseValue\)/gu) ?? []).length, 1);
  assert.deepEqual(moduleSurface(value, ts.ScriptKind.TS), [
    "import:@cairn/core:builderTurnContextSha256,builderTurnResponseMatchesContext,builderTurnResponseSha256,type BuilderTurnContextV1,type BuilderTurnResponseV1",
    "import:../shared/builder-proposal-review.js:BUILDER_CAPABILITY_REVIEW_LABELS,BUILDER_PROPOSAL_REVIEW_VERSION,type BuilderCapabilityReviewCategoryV1,type BuilderProposalReviewV1",
    "export:FunctionDeclaration:composeBuilderProposalReview",
  ]);
  assertNoHiddenModuleAuthority(value, ts.ScriptKind.TS);
  assert.doesNotMatch(value, /\b(?:import\s*\(|require\s*\(|process\.getBuiltinModule\s*\(|import\.meta\.glob(?:Eager)?\s*\()/u);
  assert.doesNotMatch(value, /\beval\s*\(|\b(?:new\s+)?Function\s*\(/u);
  assert.doesNotMatch(value, /\b(?:fetch|XMLHttpRequest|WebSocket|ipcMain|ipcRenderer|BrowserWindow)\b|\bprocess\.env\b/u);
  assert.doesNotMatch(value, /\b(?:writeFile|appendFile|rename|unlink|rm|spawn|exec|fork|openExternal)\w*\s*\(/u);
  assert.doesNotMatch(value, /\b(?:action|approval|authorize|callback|command|grant|reservation|url)\s*:/iu);
}

function assertComponentSourceSafe(value: string): void {
  assert.match(value, /export function BuilderProposalReview\(\{ review \}: \{ review: BuilderProposalReviewV1 \}\)/u);
  assert.doesNotMatch(value, /dangerouslySetInnerHTML|\b(?:marked|markdown|remark|rehype)\b|React\.createElement/u);
  assert.doesNotMatch(value, /<(?:a|button|form|input|textarea|select|option|label|details|summary|iframe|object|embed|audio|video|canvas|img|svg|style|script)\b/iu);
  assert.doesNotMatch(value, /\bon[A-Z][A-Za-z0-9]*\s*=|\bref\s*=|\{\.\.\.|\b(?:tabIndex|contentEditable|htmlFor|href|src|action|formAction|target|download|role)\s*=/u);
  assert.doesNotMatch(value, /\b(?:window|document|location|navigator|globalThis)\b|\b(?:open|navigate|assign|replace)\s*\(/u);
  assert.doesNotMatch(value, /\b(?:addEventListener|removeEventListener|dispatchEvent|setAttribute|createElement|getElementById|querySelector|ownerDocument|defaultView)\b|\[\s*["']on[A-Za-z0-9]+["']\s*\]/u);
  assert.doesNotMatch(value, /\b(?:import\s*\(|require\s*\(|process\.getBuiltinModule\s*\(|import\.meta\.glob(?:Eager)?\s*\()/u);
  assert.doesNotMatch(value, /\beval\s*\(|\b(?:new\s+)?Function\s*\(/u);
  assert.doesNotMatch(
    value,
    /\b(?:callback|onAction|onApply|onApprove|onRun|onOpen|onSend|onPublish|onContinue)\s*[?:=]/u,
  );
  assert.deepEqual(moduleSurface(value, ts.ScriptKind.TSX), [
    "import:../../shared/builder-proposal-review.js:BUILDER_PROPOSAL_REVIEW_BOUNDARY,type BuilderProposalReviewV1",
    "export:FunctionDeclaration:BuilderProposalReview",
  ]);
  assertNoHiddenModuleAuthority(value, ts.ScriptKind.TSX);
  assertComponentBodyPure(value);
}

function assertSharedSourceSafe(value: string): void {
  assert.deepEqual(moduleSurface(value, ts.ScriptKind.TS), [
    "export:Variable:BUILDER_PROPOSAL_REVIEW_VERSION",
    "export:Variable:BUILDER_PROPOSAL_REVIEW_BOUNDARY",
    "export:Variable:BUILDER_CAPABILITY_REVIEW_LABELS",
    "export:TypeAliasDeclaration:BuilderCapabilityReviewCategoryV1",
    "export:TypeAliasDeclaration:BuilderReplacementReviewRowV1",
    "export:TypeAliasDeclaration:BuilderReplacementProposalReviewV1",
    "export:TypeAliasDeclaration:BuilderCapabilityProposalReviewV1",
    "export:TypeAliasDeclaration:BuilderProposalReviewV1",
  ]);
  assertNoHiddenModuleAuthority(value, ts.ScriptKind.TS);
  assert.doesNotMatch(value, /\b(?:import\s*\(|require\s*\(|process\.getBuiltinModule\s*\(|import\.meta\.glob(?:Eager)?\s*\()/u);
  assert.doesNotMatch(value, /\beval\s*\(|\b(?:new\s+)?Function\s*\(/u);
  assert.doesNotMatch(value, /\b(?:callback|actionId|approvalId|command|argv|url|href|grant|reservation)\s*:/iu);
}

function treeFiles(root: string): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...treeFiles(path));
    else if (entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name)) output.push(path);
  }
  return output;
}

function unexpectedProductConsumers(extra: readonly { relativePath: string; text: string }[] = []): string[] {
  const srcRoot = resolve(APP_ROOT, "src");
  const allowed = new Set([
    "main/builderproposalreview.ts",
    "renderer/components/BuilderProposalReview.tsx",
    "shared/builder-proposal-review.ts",
  ]);
  const candidates = [
    ...treeFiles(srcRoot).map((path) => ({
      relativePath: relative(srcRoot, path).replaceAll("\\", "/"),
      text: readFileSync(path, "utf8"),
    })),
    ...extra,
  ];
  return candidates
    .filter((item) => !allowed.has(item.relativePath))
    .filter((item) => /BuilderProposalReview|composeBuilderProposalReview|builderproposalreview|builder-proposal-review|import\.meta\.glob|require\.context/u.test(item.text))
    .map((item) => item.relativePath)
    .sort();
}

test("proposal composer accepts only one exact live Task 224 context/response binding", () => {
  const first = context();
  const byteIdenticalOther = context();
  assert.notEqual(first, byteIdenticalOther);
  assert.equal(builderTurnContextSha256(first), builderTurnContextSha256(byteIdenticalOther));
  const raw = replacementRaw(first);
  const response = parsed(first, raw);
  assert.ok(composeBuilderProposalReview(first, response));
  assert.equal(composeBuilderProposalReview(byteIdenticalOther, response), null,
    "equal bytes cannot substitute for exact Task 224 object custody");
  assert.equal(composeBuilderProposalReview(first, raw), null);
  assert.equal(composeBuilderProposalReview(clone(first), response), null);
  assert.equal(composeBuilderProposalReview(first, clone(response)), null);
  assert.equal(composeBuilderProposalReview(new Proxy(first, {}), response), null);
  assert.equal(composeBuilderProposalReview(first, new Proxy(response, {})), null);

  const wrongTurn = context({ turnId: "44444444-4444-4444-8444-444444444444" });
  const wrongRun = context({ runId: "55555555-5555-4555-8555-555555555555" });
  assert.equal(composeBuilderProposalReview(wrongTurn, response), null);
  assert.equal(composeBuilderProposalReview(wrongRun, response), null);

  let accessorRead = false;
  const accessor: Record<string, unknown> = {};
  Object.defineProperty(accessor, "kind", { enumerable: true, get() { accessorRead = true; return "replacement-proposal"; } });
  assert.equal(composeBuilderProposalReview(first, accessor), null);
  assert.equal(accessorRead, false);
  assert.equal(composeBuilderProposalReview(first, { ...raw, hiddenAuthority: true }), null);
});

test("visual lab fixtures exactly mirror genuine fixed synthetic Task 224 projections", () => {
  const [replacement, capability] = genuineLabReviews();
  assert.deepEqual(BUILDER_PROPOSAL_LAB_REPLACEMENT, replacement);
  assert.deepEqual(BUILDER_PROPOSAL_LAB_CAPABILITY, capability);
  assertDeepFrozen(BUILDER_PROPOSAL_LAB_REPLACEMENT);
  assertDeepFrozen(BUILDER_PROPOSAL_LAB_CAPABILITY);
});

test("replacement projection exact-joins every selected before row and is exact-key deeply frozen output only", () => {
  const ctx = context();
  const response = parsed(ctx, replacementRaw(ctx));
  const review = composeBuilderProposalReview(ctx, response);
  assert.ok(review && review.kind === "replacement-proposal");
  assert.deepEqual(Object.keys(review), [
    "version", "taskNumber", "runId", "turnId", "contextSha256", "responseSha256",
    "kind", "summary", "replacements",
  ]);
  assert.equal(review.version, BUILDER_PROPOSAL_REVIEW_VERSION);
  assert.equal(review.taskNumber, 229);
  assert.equal(review.runId, RUN_ID);
  assert.equal(review.turnId, TURN_ID);
  assert.equal(review.contextSha256, builderTurnContextSha256(ctx));
  assert.equal(review.responseSha256, builderTurnResponseSha256(response));
  assert.deepEqual(review.replacements, [{
    projectRelativePath: "src/alpha.ts",
    beforeSha256: sha256(BEFORE_ALPHA),
    beforeText: BEFORE_ALPHA,
    afterSha256: sha256(AFTER_ALPHA),
    afterText: AFTER_ALPHA,
  }, {
    projectRelativePath: "src/beta.ts",
    beforeSha256: sha256(BEFORE_BETA),
    beforeText: BEFORE_BETA,
    afterSha256: sha256(AFTER_BETA),
    afterText: AFTER_BETA,
  }]);
  for (const row of review.replacements) {
    assert.deepEqual(Object.keys(row), [
      "projectRelativePath", "beforeSha256", "beforeText", "afterSha256", "afterText",
    ]);
  }
  assertDeepFrozen(review);
  const keys = JSON.stringify(review);
  assert.doesNotMatch(keys, /authority|protocolBrand|callback|actionId|approval|grant|reservation|command|url/iu);

  const displayClone = clone(review);
  assert.deepEqual(displayClone, review);
  assert.equal(Object.isFrozen(displayClone), false);
  assert.equal(composeBuilderProposalReview(ctx, displayClone), null,
    "a display clone cannot re-enter the Task 224 authority seam");
});

test("all five closed capability categories map to complete exact-key labels and inert data", () => {
  const expectedLabels = {
    "additional-tracked-text": "More tracked project text",
    "external-reference": "External reference",
    "dependency-change": "Dependency change",
    "external-service-action": "External service action",
    "owner-clarification": "Owner clarification",
  } as const;
  assert.deepEqual(BUILDER_CAPABILITY_REVIEW_LABELS, expectedLabels);
  assert.deepEqual(BUILDER_CAPABILITY_REQUEST_CATEGORIES, Object.keys(expectedLabels));
  for (const category of BUILDER_CAPABILITY_REQUEST_CATEGORIES) {
    const ctx = context();
    const response = parsed(ctx, capabilityRaw(ctx, category));
    const review = composeBuilderProposalReview(ctx, response);
    assert.ok(review && review.kind === "capability-request");
    assert.deepEqual(Object.keys(review), [
      "version", "taskNumber", "runId", "turnId", "contextSha256", "responseSha256",
      "kind", "category", "categoryLabel", "suggestedTargetLabel", "suggestedTarget",
      "what", "why", "expectedEffect", "dataExposure", "costBasis", "recovery",
    ]);
    assert.equal(review.category, category);
    assert.equal(review.categoryLabel, expectedLabels[category]);
    assert.equal(review.suggestedTargetLabel, "Untrusted suggestion");
    for (const [key, value] of Object.entries(HOSTILE_FIELDS)) {
      assert.equal(review[key as keyof typeof HOSTILE_FIELDS], value, `${category}: ${key}`);
    }
    assertDeepFrozen(review);
  }
});

test("hostile Builder text is literal escaped SSR with no markup, navigation, form, image, style or action node", () => {
  assert.deepEqual(BUILDER_PROPOSAL_REVIEW_BOUNDARY, {
    eyebrow: "Proposal only",
    title: "Builder proposal — not applied",
    primary: "Proposal only — Cairn has not applied, executed, published, or verified this suggestion.",
    secondary: "Nothing changed. No command ran. Cairn has not checked whether the selected text is still current, whether the proposal is correct, or whether it can be applied safely.",
  });
  const ctx = context();
  const replacement = composeBuilderProposalReview(ctx, parsed(ctx, replacementRaw(ctx)));
  assert.ok(replacement);
  const capabilityContext = context();
  const capability = composeBuilderProposalReview(
    capabilityContext,
    parsed(capabilityContext, capabilityRaw(capabilityContext, "external-reference")),
  );
  assert.ok(capability);

  for (const review of [replacement, capability]) {
    const html = renderToStaticMarkup(createElement(BuilderProposalReview, { review }));
    assert.match(html, /Proposal only/u);
    assert.match(html, /Nothing changed\. No command ran\./u);
    assert.doesNotMatch(html, /<(?:script|img|svg|style|a|form|input|button)\b/iu);
    const actualTagSource = (html.match(/<[^>]+>/gu) ?? []).join("\n");
    assert.doesNotMatch(actualTagSource, /\s(?:href|src|style|on\w+)=/iu);
    assert.doesNotMatch(html, /\b(?:Apply|Approve|Run|Open|Send|Publish|Continue)\b(?=<\/)/u);
    assert.match(html, /&lt;/u, "hostile angle brackets must remain escaped text");
    assert.equal(renderToStaticMarkup(createElement(BuilderProposalReview, { review: clone(review) })), html,
      "a structural projection clone renders identically and gains no authority");
  }
});

test("component and composer sources expose one display prop, exact imports and no effect seam", () => {
  const composer = source("src/main/builderproposalreview.ts");
  const component = source("src/renderer/components/BuilderProposalReview.tsx");
  const shared = source("src/shared/builder-proposal-review.ts");
  assertComposerSourceSafe(composer);
  assertComponentSourceSafe(component);
  assertSharedSourceSafe(shared);
  assert.deepEqual(Object.keys(builderProposalReviewShared).sort(), [
    "BUILDER_CAPABILITY_REVIEW_LABELS",
    "BUILDER_PROPOSAL_REVIEW_BOUNDARY",
    "BUILDER_PROPOSAL_REVIEW_VERSION",
  ], "the shared runtime namespace must contain only the three inert constants");
  assert.doesNotMatch(source("src/renderer/app.css"), /builder-proposal-/u,
    "lab-only proposal styling must not enter the production renderer stylesheet");
  assert.match(source("lab/builderproposal.css"), /\.builder-proposal-review\s*\{/u,
    "the dedicated visual lab owns the proposal card styling");

  assert.deepEqual(unexpectedProductConsumers(), [],
    "only the dark composer/type/component definitions may name the review projection under app/src");
  const coreIndex = readFileSync(resolve(REPOSITORY_ROOT, "core", "src", "index.ts"), "utf8");
  assert.doesNotMatch(coreIndex, /BuilderProposalReview|composeBuilderProposalReview|builder-proposal-review/u);
  for (const entry of [
    "src/main/main.ts", "src/preload.ts", "src/shared/ipc.ts", "src/renderer/main.tsx",
    "src/renderer/screens/Chat.tsx", "src/main/conductor/store.ts",
  ]) {
    assert.doesNotMatch(source(entry), /BuilderProposalReview|composeBuilderProposalReview|builderproposalreview|builder-proposal-review/u, entry);
  }
});

test("causal source mutants prove custody, literal rendering, no-action and product-dark guards are load-bearing", () => {
  const composer = source("src/main/builderproposalreview.ts");
  const component = source("src/renderer/components/BuilderProposalReview.tsx");
  const shared = source("src/shared/builder-proposal-review.ts");

  const noBinding = composer.replace(
    "if (!builderTurnResponseMatchesContext(contextValue, responseValue)) return null;",
    "if (false) return null; // mutant: exact binding removed",
  );
  assert.notEqual(noBinding, composer);
  assert.throws(() => assertComposerSourceSafe(noBinding), /Expected values to be strictly equal/u);

  const dangerousHtml = component.replace(
    "<p>{review.summary}</p>",
    "<div dangerouslySetInnerHTML={{ __html: review.summary }} />",
  );
  assert.notEqual(dangerousHtml, component);
  assert.throws(() => assertComponentSourceSafe(dangerousHtml), /match the regular expression/u);

  const action = component.replace(
    "<Identity review={review} />",
    "<button onClick={() => void 0}>Apply</button><Identity review={review} />",
  );
  assert.notEqual(action, component);
  assert.throws(() => assertComponentSourceSafe(action), /match the regular expression/u);

  const doubleClickNavigation = component.replace(
    "<h3>{review.categoryLabel}</h3>",
    '<div role="link" tabIndex={0} onDoubleClick={() => window.open(review.suggestedTarget)}>Details</div><h3>{review.categoryLabel}</h3>',
  );
  assert.notEqual(doubleClickNavigation, component);
  assert.throws(() => assertComponentSourceSafe(doubleClickNavigation), /match the regular expression/u);

  const hiddenRefNavigation = component.replace(
    "<section className={`builder-proposal-review builder-proposal-review-${review.kind}`}",
    '<section ref={(node) => { if (node) node["ondblclick"] = () => node["ownerDocument"]["defaultView"]?.["open"](review.kind === "capability-request" ? review.suggestedTarget : "about:blank"); }} className={`builder-proposal-review builder-proposal-review-${review.kind}`}',
  );
  assert.notEqual(hiddenRefNavigation, component);
  assert.throws(() => assertComponentSourceSafe(hiddenRefNavigation));

  const associatedLabel = component.replace(
    "<Identity review={review} />",
    '<label htmlFor="outside-action">Open target</label><Identity review={review} />',
  );
  assert.notEqual(associatedLabel, component);
  assert.throws(() => assertComponentSourceSafe(associatedLabel));

  const sideEffectImport = `import "node:fs";\n${component}`;
  assert.throws(() => assertComponentSourceSafe(sideEffectImport), /Expected values to be strictly deep-equal/u);
  const semicolonlessSideEffectImport = `import "node:fs"\n${component}`;
  assert.throws(() => assertComponentSourceSafe(semicolonlessSideEffectImport));
  const dynamicImport = `${component}\nvoid import("node:fs");`;
  assert.throws(() => assertComponentSourceSafe(dynamicImport));
  const commentedDynamicImport = `${component}\nvoid import/*mutant*/("node:fs");`;
  assert.throws(() => assertComponentSourceSafe(commentedDynamicImport), /dynamic import is forbidden/u);
  const optionalRequire = `${component}\nvoid require?.("node:fs");`;
  assert.throws(() => assertComponentSourceSafe(optionalRequire), /CommonJS require is forbidden/u);
  const computedBuiltinLookup = `${shared}\nvoid process["getBuiltinModule"]?.("node:fs");`;
  assert.throws(() => assertSharedSourceSafe(computedBuiltinLookup), /runtime builtin-module lookup is forbidden/u);
  const destructuredBuiltinLookup = `${shared}\nconst { getBuiltinModule: hiddenBuiltin } = process; void hiddenBuiltin("node:fs");`;
  assert.throws(() => assertSharedSourceSafe(destructuredBuiltinLookup), /runtime module authority is forbidden/u);
  const defaultImport = `import fs from "node:fs";\n${component}`;
  assert.throws(() => assertComponentSourceSafe(defaultImport));
  const evaluatedAction = component.replace(
    "<Identity review={review} />",
    '<span>{eval("0")}</span><Identity review={review} />',
  );
  assert.notEqual(evaluatedAction, component);
  assert.throws(() => assertComponentSourceSafe(evaluatedAction));
  const renderFetch = component.replace(
    "export function BuilderProposalReview({ review }: { review: BuilderProposalReviewV1 }) {",
    'export function BuilderProposalReview({ review }: { review: BuilderProposalReviewV1 }) { void fetch("http://127.0.0.1:7398/task229-hidden").catch(() => undefined);',
  );
  assert.notEqual(renderFetch, component);
  assert.throws(() => assertComponentSourceSafe(renderFetch), /unexpected component call/u);
  const renderStorage = component.replace(
    "export function BuilderProposalReview({ review }: { review: BuilderProposalReviewV1 }) {",
    'export function BuilderProposalReview({ review }: { review: BuilderProposalReviewV1 }) { if (typeof localStorage !== "undefined") localStorage.setItem("task229", review.kind);',
  );
  assert.notEqual(renderStorage, component);
  assert.throws(() => assertComponentSourceSafe(renderStorage), /unexpected component call/u);
  const widenedCoreAuthority = composer.replace(
    "  builderTurnContextSha256,",
    "  builderTurnContextSha256,\n  composeBuilderTurnContext,",
  );
  assert.notEqual(widenedCoreAuthority, composer);
  assert.throws(() => assertComposerSourceSafe(widenedCoreAuthority), /Expected values to be strictly deep-equal/u);
  const extraExport = `${composer}\nexport const proposalAction = () => undefined;`;
  assert.throws(() => assertComposerSourceSafe(extraExport), /Expected values to be strictly deep-equal/u);
  const exportList = `${composer}\nconst proposalAction = () => undefined; export { proposalAction };`;
  assert.throws(() => assertComposerSourceSafe(exportList));
  const sharedDefaultExport = `${shared}\nexport default function proposalAction() { return undefined; }`;
  assert.throws(() => assertSharedSourceSafe(sharedDefaultExport));
  const commonJsExport = `${shared}\n(module.exports as Record<string, unknown>).proposalAction = () => undefined;`;
  assert.throws(() => assertSharedSourceSafe(commonJsExport), /runtime module authority is forbidden/u);

  assert.deepEqual(unexpectedProductConsumers([{
    relativePath: "renderer/main.tsx",
    text: 'import { BuilderProposalReview } from "./components/BuilderProposalReview.js";',
  }]), ["renderer/main.tsx"]);
  assert.deepEqual(unexpectedProductConsumers([{
    relativePath: "renderer/main.tsx",
    text: 'void import.meta.glob("./components/*.tsx", { eager: true });',
  }]), ["renderer/main.tsx"], "a broad eager production import cannot smuggle the dark component into the bundle");
});
