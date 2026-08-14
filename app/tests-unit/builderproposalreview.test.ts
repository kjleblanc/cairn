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
  assert.doesNotMatch(value, /aria-label=\{`[^`]*\$\{(?:row|review)\./u,
    "untrusted Builder text must stay in React text children, never an attribute");
  assert.doesNotMatch(value, /key=\{(?:row|review|label|value)\./u,
    "untrusted Builder strings must not drive reconciliation identity");
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
    "main/builderproposalreviewfixture.ts",
    "main/builderlivereviewroutefixture.ts",
    "main/builderreviewroutefixture.ts",
    "main/conductor/builderreviewauth.ts",
    "main/conductor/store.ts",
    "main/main.ts",
    "renderer/components/BuilderProposalReview.tsx",
    "renderer/screens/Chat.tsx",
    "shared/builder-proposal-review.ts",
    "shared/ipc.ts",
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

function unexpectedBuilderRoleConsumers(extra: readonly { relativePath: string; text: string }[] = []): string[] {
  const srcRoot = resolve(APP_ROOT, "src");
  const allowed = new Set([
    "main/conductor/builderreviewauth.ts",
    "main/conductor/service.ts",
    "main/conductor/store.ts",
    "main/conductor/turnauth.ts",
    "renderer/screens/Chat.tsx",
    "renderer/screens/Workspace.tsx",
    "shared/ipc.ts",
  ]);
  return [
    ...treeFiles(srcRoot).map((path) => ({
      relativePath: relative(srcRoot, path).replaceAll("\\", "/"),
      text: readFileSync(path, "utf8"),
    })),
    ...extra,
  ].filter((item) => !allowed.has(item.relativePath))
    .filter((item) => /["']builder-review["']|cairn-builder-review-(?:turn|marker)/u.test(item.text))
    .map((item) => item.relativePath)
    .sort();
}

function authoritySymbolConsumers(
  symbol: string,
  definitionPath: string,
  extra: readonly { relativePath: string; text: string }[] = [],
): string[] {
  const srcRoot = resolve(APP_ROOT, "src");
  const pattern = new RegExp(`\\b${symbol}\\b`, "u");
  return [
    ...treeFiles(srcRoot).map((path) => ({
      relativePath: relative(srcRoot, path).replaceAll("\\", "/"),
      text: readFileSync(path, "utf8"),
    })),
    ...extra,
  ]
    .filter((item) => item.relativePath !== definitionPath && pattern.test(item.text))
    .map((item) => item.relativePath)
    .sort();
}

function assertBuilderStoreCustodySafe(value: string): void {
  assert.match(value, /if \(turn\.role === "builder-review"\) \{\s*throw new Error\("BUILDER_REVIEW_APPEND_FORBIDDEN/u);
  assert.equal((value.match(/composeBuilderProposalReview\(context, response\)/gu) ?? []).length, 1);
  assert.match(value, /captureBuilderReviewProject\(root\)/u);
  assert.match(value, /context\.projectHash !== project\.projectHash/u);
  assert.match(value, /builderReviewProjectStillExact\(root, project\)/u);
  assert.match(value, /consumedBuilderResponses\.has\(response as object\)/u);
  const marker = value.indexOf("recordBuilderReviewMarker(project.snapshot.canonicalRoot, id, turn, project)");
  const order = value.indexOf("recordStrictTranscriptEventMarker(", marker);
  const transcript = value.indexOf("appendJsonLine(project.snapshot.canonicalRoot, id, turn, project)", marker);
  assert.ok(marker >= 0 && order > marker && transcript > order,
    "external Builder custody and strict ordering must precede project JSONL");
  assert.match(value, /recordStrictTranscriptEventMarker\(\s*project\.snapshot\.canonicalRoot,\s*"builder-review",\s*digest,\s*project\.snapshot\.canonicalRoot\.replace\(\/\\\\\/g, "\/"\),\s*\);/u,
    "the strict event ledger destination must use the captured canonical project key");
  assert.match(value, /appendJsonLine\(project\.snapshot\.canonicalRoot, id, turn, project\);\s*if \(!builderReviewProjectStillExact\(root, project\)\)/u,
    "the specialized append must pin and recheck the exact captured project identity");
  assert.match(value, /throw new ConversationAppendUncertainError\(\s*new Error\("BUILDER_REVIEW_PROJECT_CHANGED:[^\n]+after persistence/u,
    "a post-fsync identity failure must retain may-have-persisted semantics");
  assert.match(value, /const rechecked = lstatSync\(path, \{ bigint: true \}\);[\s\S]*?!sameIdentity\(opened, rechecked\)/u,
    "the descriptor must match a path identity observed after the project recheck");
  assert.match(value, /recordBuilderReviewMarker\(project\.snapshot\.canonicalRoot, id, turn, project\)/u,
    "marker custody must use the already captured project binding");
  assert.match(value, /builderMarkerCounts\.get\(digest\) === 1/u);
  assert.match(value, /physicalBuilderCounts\.get\(digest\) === 1/u);
  assert.match(value, /physicalBuilderIdCounts\.get\(turn\?\.displayTurnId \?\? ""\) === 1/u);
  assert.match(value, /strictTranscriptCounts\.get\(event\) === 1/u);
}

function assertBuilderAuthCustodySafe(value: string): void {
  const start = value.indexOf("export function recordBuilderReviewMarker(");
  const end = value.indexOf("export function builderReviewMarkerSequence", start);
  assert.ok(start >= 0 && end > start);
  const body = value.slice(start, end);
  assert.match(body, /project: BuilderReviewProjectBinding/u);
  assert.match(body, /projectBindings\.has\(project as object\)/u);
  assert.match(body, /builderReviewTurnDigestForProject\(project\.snapshot, conversationId, turnValue\)/u);
  assert.match(body, /const stableCanonicalProjectKey = project\.snapshot\.canonicalRoot\.replace\(\/\\\\\/g, "\/"\);/u);
  assert.match(body, /markerFile\(dir, true, stableCanonicalProjectKey\)/u,
    "marker custody must not route its ledger through a transient project alias");
  assert.doesNotMatch(body, /builderReviewTurnDigest\(dir/u,
    "marker creation must not recompute identity from a transient project root");
}

function assertProviderOmissionSafe(value: string): void {
  assert.match(value, /export function providerHistoryMessages\(historySnapshot: ConductorHistorySnapshot\)/u);
  assert.equal((value.match(/if \(turn\.role === "builder-review"\) return \[\];/gu) ?? []).length, 1);
  assert.equal((value.match(/\.\.\.providerHistoryMessages\(historySnapshot\)/gu) ?? []).length, 1);
}

function assertBridgeAllowlistSafe(value: string): void {
  assert.match(value, /type BridgeVisibleTurn = Extract<ConductorTurn, \{ role: "owner" \| "cairn" \| "envelope" \}>;/u);
  assert.match(value, /return turns\.filter\(\(turn\): turn is BridgeVisibleTurn =>\s*turn\.role === "owner" \|\| turn\.role === "cairn" \|\| turn\.role === "envelope"\);/u);
  assert.equal((value.match(/turns: bridgeVisibleTurns\(opts\.service\.turns\(project\.dir, id\)\)/gu) ?? []).length, 1);
}

function assertChatNeutralTurnSafe(value: string): void {
  assert.match(value, /import \{ BuilderProposalReview \} from "\.\.\/components\/BuilderProposalReview";/u);
  assert.match(value, /function conductorDeltaRoleIsSafe\(event: ConductorDelta\): boolean/u);
  assert.match(value, /if \(!conductorDeltaRoleIsSafe\(event\)\) return;/u);
  assert.match(value, /if \(event\.kind === "done"\) return turn\?\.role === "cairn";/u);
  assert.match(value, /if \(event\.kind === "error"\) return turn === undefined \|\| turn\.role === "cairn";/u);
  assert.match(value, /if \(event\.kind === "delta" \|\| event\.kind === "replace"\) return turn === undefined;\s*return false;/u);
  const start = value.indexOf('if (event.kind === "turn") {');
  const end = value.indexOf('if (event.kind === "envelope") {', start);
  assert.ok(start >= 0 && end > start, "the neutral turn branch must precede envelope/stream handling");
  const branch = value.slice(start, end);
  assert.match(branch, /event\.turn\?\.role !== "builder-review"/u);
  assert.doesNotMatch(branch, /\b(?:applyAction|reconcileAction|setAction|setDispatch|setSession|setStreaming|setCommentary|setPushFlow|setRetryRequest|refreshStatus)\s*\(/u);
  assert.doesNotMatch(branch, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|open|navigate|assign|replace)\b|\bcairn\s*\./u);
  assert.doesNotMatch(branch, /conversationVersionRef/u);
  assert.match(branch, /builderTurnVersionRef\.current \+= 1;/u);
  assert.match(value, /if \(builderTurnVersionRef\.current !== restoreBuilderTurnVersion\) \{\s*setTurns\(\(current\) => mergeSavedTurns\(saved, current\)\);\s*\} else \{\s*setTurns\(saved\);/u);
  assert.match(value, /if \(status === null\) \{ setRestoringConversation\(true\); return; \}/u,
    "the visual ready marker must remain pending until a real restore branch completes");
  assert.match(value, /const latestNonBuilderTurnIndex = turns\.reduce\([\s\S]*?turn\.role === "builder-review" \? found : i/u);
  assert.match(value, /turn\.role === "cairn" && i === latestNonBuilderTurnIndex && turn\.followups/u);
  assert.match(value, /turn\.role === "builder-review" \? \(\s*<BuilderProposalReview key=\{turn\.displayTurnId\} review=\{turn\.review\} \/>/u);
}

function assertIpcBuilderRoleSafe(value: string): void {
  assert.match(value, /export interface ConductorBuilderReviewTurn \{\s*role: "builder-review";\s*version: "cairn-builder-review-turn\/v1";/u);
  assert.match(value, /export type ConductorDelta =/u);
  assert.match(value, /kind: "turn";\s*turn: ConductorBuilderReviewTurn;/u);
  assert.match(value, /kind: "envelope";\s*turn: ConductorEnvelopeTurn;/u);
  assert.match(value, /kind: "done";\s*turn: ConductorChatTurn & \{ role: "cairn" \};/u);
  assert.match(value, /kind: "error";\s*turn\?: ConductorChatTurn & \{ role: "cairn" \};/u);
  const start = value.indexOf("export interface ConductorBuilderReviewTurn");
  const end = value.indexOf("\n}", start);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(value.slice(start, end), /card:|disposition:|actionId:|callback:|grant:|reservation:/u);
}

function assertFixtureGuardSafe(value: string): void {
  assert.match(value, /function task232OwnedDisposableDirectory\(\s*value: unknown,\s*kind: "project" \| "profile"/u);
  assert.match(value, /process\.env\.CAIRN_TEST_BUILDER_REVIEW !== undefined/u);
  assert.match(value, /const builderReviewE2eRequested = process\.env\.CAIRN_TEST_BUILDER_TRACKED_TEXT === "task232-fixed-v1";/u);
  assert.match(value, /process\.env\.CAIRN_TEST_BUILDER_TRACKED_TEXT !== undefined && !builderReviewE2eRequested/u);
  assert.match(value, /builderReviewE2eRequested && \(process\.env\.CAIRN_E2E !== "1" \|\| process\.env\.CAIRN_MOCK !== "1"\s*\|\| task232E2eProjectRoot === null \|\| task232E2eProfileRoot === null\)/u);
  assert.match(value, /const builderLiveE2eRequested =\s*process\.env\.CAIRN_TEST_BUILDER_LIVE === "task233-openrouter-kimi-k2-novita-v1";/u);
  assert.match(value, /builderLiveE2eRequested && task233LivePhase !== "call" && task233LivePhase !== "restore"/u);
  assert.match(value, /builderLiveE2eRequested && \(process\.env\.CAIRN_E2E !== "1" \|\| process\.env\.CAIRN_MOCK !== "0"\s*\|\| task233E2eProjectRoot === null \|\| task233E2eProfileRoot === null\)/u);
  assert.match(value, /\(builderReviewE2eRequested \|\| builderLiveE2eRequested\)\s*&& \(q9E2eRequested \|\| calibrationE2eRequested\)/u);
  assert.match(value, /builderReviewE2eRequested && builderLiveE2eRequested/u);
  assert.match(value, /suppressExternalUpdateCheck: q9E2eRequested \|\| builderReviewE2eRequested \|\| builderLiveE2eRequested/u);
  assert.match(value, /suppressExternalOpen: builderLiveE2eRequested/u);
  assert.match(value, /registerConductorIpc\(\{ suppressOAuth: builderLiveE2eRequested \}\)/u);
  assert.match(value, /if \(!q9E2eRequested && !builderReviewE2eRequested && !builderLiveE2eRequested\) \{\s*void startPhoneBridge\(\);\s*\}/u);
  const guarded = value.indexOf("if (builderReviewE2eRequested) {");
  const hook = value.indexOf("__CAIRN_TASK232_APPEND_BUILDER_REVIEW__", guarded);
  const createWindow = value.indexOf("createWindow();", guarded);
  assert.ok(guarded >= 0 && hook > guarded && createWindow > hook);
  const liveGuarded = value.indexOf('if (builderLiveE2eRequested && task233LivePhase === "call") {');
  const liveHook = value.indexOf("__CAIRN_TASK233_RUN_APPROVED_LIVE_BUILDER__", liveGuarded);
  const liveSpent = value.indexOf("used = true;", liveHook);
  const livePrepare = value.indexOf("prepareTask233LiveBuilderReview(projectRoot)", liveSpent);
  const liveSend = value.indexOf("sendTask233ApprovedLiveBuilderTurn(", livePrepare);
  const liveAppend = value.indexOf("appendTask233LiveBuilderReview(", liveSend);
  assert.ok(liveGuarded >= 0 && liveHook > liveGuarded && liveSpent > liveHook
    && livePrepare > liveSpent && liveSend > livePrepare && liveAppend > liveSend);
  assert.equal((value.match(/mainWindow\.webContents\.send\("conductor:delta", \{/gu) ?? []).length, 2,
    "the fake and approved-live routes must each emit exactly one neutral turn delta");
  assert.match(value, /mainWindow\.webContents\.send\("conductor:delta", \{\s*dir: projectRoot,[\s\S]*?kind: "turn",\s*turn: appended\.turn,/u);
}

function assertFixtureModuleSafe(value: string): void {
  const file = parsedSource(value, ts.ScriptKind.TS);
  const modules = file.statements
    .filter(ts.isImportDeclaration)
    .map((statement) => ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : "<dynamic>");
  assert.deepEqual(modules, [
    "node:crypto",
    "@cairn/core",
    "../shared/ipc.js",
    "./conductor/builderreviewauth.js",
    "./conductor/store.js",
  ]);
  const surface = moduleSurface(value, ts.ScriptKind.TS);
  assert.deepEqual(surface.filter((entry) => entry.startsWith("import:")), [
    "import:node:crypto:createHash",
    "import:@cairn/core:BUILDER_SELECTOR_PROVENANCE_VERSION,BUILDER_TURN_CONTEXT_VERSION,BUILDER_TURN_RESPONSE_VERSION,EVIDENCE_PLAN_CANDIDATE_VERSION,QUALITY_PLAN_VERSION,bindInitialEvidencePlan,bindTaskIntent,bindTaskSpec,builderTurnContextSha256,composeBuilderTurnContext,parseBuilderTurnResponse,parseQualityPlanCandidate,parseTaskIntentCandidate,type TaskIntentSourceInput",
    "import:../shared/ipc.js:type ConductorBuilderReviewTurn",
    "import:./conductor/builderreviewauth.js:captureBuilderReviewProject",
    "import:./conductor/store.js:appendBuilderReviewTurn,newConversationId",
  ], "the fixed fixture may import only its exact pure composition and append symbols");
  assert.deepEqual(surface.filter((entry) => entry.startsWith("export:")), [
    "export:FunctionDeclaration:task232FixedTrackedTextRequestForTests",
    "export:FunctionDeclaration:task233FixedTrackedTextRequestForTests",
    "export:FunctionDeclaration:task231FixedBuilderPairForTests",
    "export:FunctionDeclaration:appendTask231SyntheticBuilderReview",
  ]);
  assertNoHiddenModuleAuthority(value, ts.ScriptKind.TS);
  assert.doesNotMatch(value, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|navigator|ipcMain|ipcRenderer|BrowserWindow|shell|console)\b/u);
  assert.doesNotMatch(value, /node:(?:http|https|http2|net|dns|tls|dgram|child_process|worker_threads)|\b(?:spawn|exec|fork|openExternal)\w*\s*\(|\bprocess\.env\b/u);
  assert.doesNotMatch(value, /conductor\/transports|provider|apiKey|Bearer /iu);
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

test("component, composer and production integration expose only the closed display route", () => {
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
  assert.match(source("src/renderer/app.css"), /\.builder-proposal-review\s*\{/u,
    "the real Chat bundle must style the existing review component");
  assert.match(source("src/renderer/app.css"), /@media \(max-width: 820px\)[\s\S]*?\.builder-proposal-comparison/u,
    "the production card must collapse safely at compact width");
  assert.match(source("lab/builderproposal.css"), /\.builder-proposal-review\s*\{/u,
    "the dedicated visual lab remains a positive component harness");

  assert.deepEqual(unexpectedProductConsumers(), [],
    "only the exact Task 232 production display/custody allowlist may name the review projection under app/src");
  assert.deepEqual(unexpectedBuilderRoleConsumers(), [],
    "the role literal may appear only at the exact custody, omission, type and desktop render boundaries");
  assert.deepEqual(authoritySymbolConsumers("recordBuilderReviewMarker", "main/conductor/builderreviewauth.ts"), ["main/conductor/store.ts"]);
  assert.deepEqual(authoritySymbolConsumers("appendBuilderReviewTurn", "main/conductor/store.ts"), [
    "main/builderlivereviewroutefixture.ts",
    "main/builderproposalreviewfixture.ts",
    "main/builderreviewroutefixture.ts",
  ]);
  assert.deepEqual(authoritySymbolConsumers("appendTask231SyntheticBuilderReview", "main/builderproposalreviewfixture.ts"), []);
  assert.deepEqual(authoritySymbolConsumers("composeBuilderProposalReview", "main/builderproposalreview.ts"), ["main/conductor/store.ts"]);
  assertBuilderStoreCustodySafe(source("src/main/conductor/store.ts"));
  assertBuilderAuthCustodySafe(source("src/main/conductor/builderreviewauth.ts"));
  assertProviderOmissionSafe(source("src/main/conductor/service.ts"));
  assertBridgeAllowlistSafe(source("src/main/bridge/server.ts"));
  assertChatNeutralTurnSafe(source("src/renderer/screens/Chat.tsx"));
  assertIpcBuilderRoleSafe(source("src/shared/ipc.ts"));
  assertFixtureGuardSafe(source("src/main/main.ts"));
  assertFixtureModuleSafe(source("src/main/builderproposalreviewfixture.ts"));
  assert.match(source("src/renderer/screens/Workspace.tsx"), /if \(event\.kind === "turn" \|\| payloadTurn\?\.role === "builder-review"\) return;\s*refresh\(\);/u,
    "the append-only turn must not fan out into project/task/runtime/status reads");
  assert.doesNotMatch(source("src/preload.ts"), /BuilderProposalReview|builder-review|builderproposalreview|builder-proposal-review/u,
    "generic conversation IPC needs no Builder-only preload surface");
  const coreIndex = readFileSync(resolve(REPOSITORY_ROOT, "core", "src", "index.ts"), "utf8");
  assert.doesNotMatch(coreIndex, /BuilderProposalReview|composeBuilderProposalReview|builder-proposal-review/u);
  for (const entry of [
    "src/preload.ts", "src/main/tasks.ts", "src/main/pendingrun.ts",
    "src/main/builderreservation.ts", "src/main/criticactivation.ts",
    "src/main/workeridentity.ts", "src/main/conductor/relay.ts",
    "src/main/conductor/transports/types.ts", "src/main/conductor/transports/openai-compatible.ts",
  ]) {
    assert.doesNotMatch(source(entry), /BuilderProposalReview|composeBuilderProposalReview|builderproposalreview|builder-proposal-review/u, entry);
  }
});

test("causal source mutants prove custody, literal rendering, no-action and integration guards are load-bearing", () => {
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

  const builderTextAttribute = component.replace(
    'aria-label="Before selected text"',
    'aria-label={`Before text for ${row.projectRelativePath}`}',
  );
  assert.notEqual(builderTextAttribute, component);
  assert.throws(() => assertComponentSourceSafe(builderTextAttribute));

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

  const store = source("src/main/conductor/store.ts");
  const noExternalMarkerCheck = store.replace(
    "&& builderMarkerCounts.get(digest) === 1",
    "&& true /* mutant: project JSONL authenticates itself */",
  );
  assert.notEqual(noExternalMarkerCheck, store);
  assert.throws(() => assertBuilderStoreCustodySafe(noExternalMarkerCheck));

  const unpinnedProjectAppend = store.replace(
    "appendJsonLine(project.snapshot.canonicalRoot, id, turn, project);",
    "appendJsonLine(project.snapshot.canonicalRoot, id, turn); // mutant: destination identity unpinned",
  );
  assert.notEqual(unpinnedProjectAppend, store);
  assert.throws(() => assertBuilderStoreCustodySafe(unpinnedProjectAppend));

  const staleConversationPath = store.replace(
    "|| !sameIdentity(opened, current) || !sameIdentity(opened, rechecked)",
    "|| !sameIdentity(opened, current) /* mutant: no post-project path identity */",
  );
  assert.notEqual(staleConversationPath, store);
  assert.throws(() => assertBuilderStoreCustodySafe(staleConversationPath));

  const auth = source("src/main/conductor/builderreviewauth.ts");
  const mutableMarkerIdentity = auth.replace(
    "builderReviewTurnDigestForProject(project.snapshot, conversationId, turnValue)",
    "builderReviewTurnDigest(dir, conversationId, turnValue) /* mutant: transient root wins */",
  );
  assert.notEqual(mutableMarkerIdentity, auth);
  assert.throws(() => assertBuilderAuthCustodySafe(mutableMarkerIdentity));
  const mutableMarkerDestination = auth.replace(
    "markerFile(dir, true, stableCanonicalProjectKey)",
    "markerFile(dir, true) /* mutant: transient alias chooses marker ledger */",
  );
  assert.notEqual(mutableMarkerDestination, auth);
  assert.throws(() => assertBuilderAuthCustodySafe(mutableMarkerDestination));

  const mutableEventDestination = store.replace(
    '    project.snapshot.canonicalRoot.replace(/\\\\/g, "/"),',
    "    undefined, // mutant: transient alias chooses event ledger",
  );
  assert.notEqual(mutableEventDestination, store);
  assert.throws(() => assertBuilderStoreCustodySafe(mutableEventDestination));

  const ipc = source("src/shared/ipc.ts");
  const terminalRole = ipc.replace('role: "builder-review";', 'role: "envelope"; // mutant: terminal role');
  assert.notEqual(terminalRole, ipc);
  assert.throws(() => assertIpcBuilderRoleSafe(terminalRole));

  const chat = source("src/renderer/screens/Chat.tsx");
  const routedThroughDone = chat.replace('if (event.kind === "turn") {', 'if (event.kind === "done") { // mutant');
  assert.notEqual(routedThroughDone, chat);
  assert.throws(() => assertChatNeutralTurnSafe(routedThroughDone));
  const actionEffect = chat.replace(
    "builderTurnVersionRef.current += 1;\n      setTurns",
    "builderTurnVersionRef.current += 1;\n      void reconcileAction(event.conversationId); // mutant\n      setTurns",
  );
  assert.notEqual(actionEffect, chat);
  assert.throws(() => assertChatNeutralTurnSafe(actionEffect));
  const storageEffect = chat.replace(
    "builderTurnVersionRef.current += 1;\n      setTurns",
    'builderTurnVersionRef.current += 1;\n      localStorage.setItem("builder-review", event.conversationId); // mutant\n      setTurns',
  );
  assert.notEqual(storageEffect, chat);
  assert.throws(() => assertChatNeutralTurnSafe(storageEffect));
  const unknownAsError = chat.replace(
    'if (event.kind === "delta" || event.kind === "replace") return turn === undefined;\n  return false;',
    'if (event.kind === "delta" || event.kind === "replace") return turn === undefined;\n  return turn === undefined; // mutant: unknown falls into error settlement',
  );
  assert.notEqual(unknownAsError, chat);
  assert.throws(() => assertChatNeutralTurnSafe(unknownAsError));
  const prematureRestoreReady = chat.replace(
    "if (status === null) { setRestoringConversation(true); return; }",
    "if (status === null) { setRestoringConversation(false); return; } // mutant: ready before restore",
  );
  assert.notEqual(prematureRestoreReady, chat);
  assert.throws(() => assertChatNeutralTurnSafe(prematureRestoreReady));

  const followupsRetired = chat.replace(
    'turn.role === "cairn" && i === latestNonBuilderTurnIndex && turn.followups',
    'turn.role === "cairn" && i === turns.length - 1 && turn.followups',
  );
  assert.notEqual(followupsRetired, chat);
  assert.throws(() => assertChatNeutralTurnSafe(followupsRetired));

  assert.deepEqual(authoritySymbolConsumers(
    "appendBuilderReviewTurn",
    "main/conductor/store.ts",
    [{
      relativePath: "main/rogue-builder-consumer.ts",
      text: 'import * as store from "./conductor/store.js"; void store.appendBuilderReviewTurn;',
    }],
  ), ["main/builderlivereviewroutefixture.ts", "main/builderproposalreviewfixture.ts", "main/builderreviewroutefixture.ts", "main/rogue-builder-consumer.ts"]);

  const service = source("src/main/conductor/service.ts");
  const providerLeak = service.replace('if (turn.role === "builder-review") return [];',
    'if (turn.role === "builder-review") return [{ role: "user", content: JSON.stringify(turn.review) }];');
  assert.notEqual(providerLeak, service);
  assert.throws(() => assertProviderOmissionSafe(providerLeak));

  const bridge = source("src/main/bridge/server.ts");
  const phoneLeak = bridge.replace(
    'turn.role === "owner" || turn.role === "cairn" || turn.role === "envelope"',
    'turn.role === "owner" || turn.role === "cairn" || turn.role === "envelope" || turn.role === "builder-review"',
  );
  assert.notEqual(phoneLeak, bridge);
  assert.throws(() => assertBridgeAllowlistSafe(phoneLeak));

  const main = source("src/main/main.ts");
  const ambientNetwork = main.replace(
    "suppressExternalUpdateCheck: q9E2eRequested || builderReviewE2eRequested || builderLiveE2eRequested",
    "suppressExternalUpdateCheck: q9E2eRequested || builderReviewE2eRequested /* mutant */",
  );
  assert.notEqual(ambientNetwork, main);
  assert.throws(() => assertFixtureGuardSafe(ambientNetwork));
  const lanListener = main.replace(
    "if (!q9E2eRequested && !builderReviewE2eRequested && !builderLiveE2eRequested) {",
    "if (!q9E2eRequested && !builderReviewE2eRequested) { // mutant",
  );
  assert.notEqual(lanListener, main);
  assert.throws(() => assertFixtureGuardSafe(lanListener));
  const removedLiveDelta = main.replace('mainWindow.webContents.send("conductor:delta", {',
    'mainWindow.webContents.send("conductor:removed", { // mutant: no live conversation delta');
  assert.notEqual(removedLiveDelta, main);
  assert.throws(() => assertFixtureGuardSafe(removedLiveDelta));

  const fixture = source("src/main/builderproposalreviewfixture.ts");
  const mainNetwork = `import "node:http";\n${fixture}\nvoid fetch("https://invalid.example");`;
  assert.throws(() => assertFixtureModuleSafe(mainNetwork));
  const sameModuleEffect = fixture.replace(
    "import { appendBuilderReviewTurn, newConversationId } from \"./conductor/store.js\";",
    "import { appendBuilderReviewTurn, ensureCairnExcluded, newConversationId } from \"./conductor/store.js\";\nvoid ensureCairnExcluded;",
  );
  assert.notEqual(sameModuleEffect, fixture);
  assert.throws(() => assertFixtureModuleSafe(sameModuleEffect),
    "an effectful symbol from an otherwise allowed module must fail the exact fixture surface");

  assert.deepEqual(unexpectedProductConsumers([{
    relativePath: "renderer/main.tsx",
    text: 'import { BuilderProposalReview } from "./components/BuilderProposalReview.js";',
  }]), ["renderer/main.tsx"]);
  assert.deepEqual(unexpectedProductConsumers([{
    relativePath: "renderer/main.tsx",
    text: 'void import.meta.glob("./components/*.tsx", { eager: true });',
  }]), ["renderer/main.tsx"], "a broad eager production import cannot smuggle the dark component into the bundle");
  assert.deepEqual(unexpectedBuilderRoleConsumers([{
    relativePath: "main/criticactivation.ts",
    text: 'import type { ConductorTurn } from "../shared/ipc.js";\nexport const leak = (turn: ConductorTurn) => turn.role === "builder-review" ? turn.review : null;',
  }]), ["main/criticactivation.ts"], "a union-only role consumer cannot bypass the exact import graph");
});
