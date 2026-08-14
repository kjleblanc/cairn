import { createHash } from "node:crypto";
import {
  BUILDER_SELECTOR_PROVENANCE_VERSION,
  BUILDER_TURN_CONTEXT_VERSION,
  BUILDER_TURN_RESPONSE_VERSION,
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  QUALITY_PLAN_VERSION,
  bindInitialEvidencePlan,
  bindTaskIntent,
  bindTaskSpec,
  builderTurnContextSha256,
  composeBuilderTurnContext,
  parseBuilderTurnResponse,
  parseQualityPlanCandidate,
  parseTaskIntentCandidate,
  type TaskIntentSourceInput,
} from "@cairn/core";
import type { ConductorBuilderReviewTurn } from "../shared/ipc.js";
import { captureBuilderReviewProject } from "./conductor/builderreviewauth.js";
import { appendBuilderReviewTurn, newConversationId } from "./conductor/store.js";

const RUN_ID = "23123123-1231-4231-8231-231231231231";
const TURN_ID = "31231231-2312-4312-8312-312312312312";
const GIT_STATE_SHA256 = "b".repeat(64);
const BASE_HEAD = "c".repeat(40);
const SYNTHETIC_PATH = "examples/synthetic/greeting.ts";
const SYNTHETIC_BEFORE = "export const greeting = '<script>syntheticBefore()</script>';\n";
const SYNTHETIC_AFTER = "export const greeting = '<img src=x onerror=syntheticAfter()>';\n";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function authorities() {
  const sources: readonly TaskIntentSourceInput[] = Object.freeze([Object.freeze({
    kind: "conversation",
    inputId: "23100000-0000-4000-8000-000000000231",
    text: "Replace the one fixed synthetic greeting and preserve literal review text.",
  })]);
  const candidate = parseTaskIntentCandidate({
    version: "cairn-task-intent/v1",
    outcome: {
      source: "owner-stated",
      text: "Replace the fixed synthetic greeting.",
      ownerQuote: "Replace the one fixed synthetic greeting",
    },
    requirements: [{
      source: "owner-stated",
      text: "Preserve literal review text.",
      ownerQuote: "preserve literal review text",
    }],
    context: [],
  });
  if (candidate === null) throw new Error("TASK231_FIXTURE_INVALID");
  const intent = bindTaskIntent(candidate, sources);
  if (intent === null) throw new Error("TASK231_FIXTURE_INVALID");
  const qualityCandidate = parseQualityPlanCandidate({
    version: QUALITY_PLAN_VERSION,
    target: { kind: "local-task", basis: [{ kind: "intent-outcome" }] },
    supportedPath: {
      statement: "Preserve literal review text.",
      basis: [{ kind: "intent-requirement", index: 0 }],
    },
    critic: {
      mode: "off",
      basis: [{ kind: "cairn-default", reason: "not-requested" }],
      reason: "This fixed synthetic fixture has no model or critic call.",
    },
    candidateStates: [],
    acceptanceChecks: [{
      id: "c1",
      promise: "The synthetic greeting has a complete replacement proposal.",
      kind: "acceptance",
      judge: "cairn",
      basis: [{ kind: "intent-outcome" }],
      failureCondition: {
        id: "synthetic-proposal-missing",
        statement: "The fixed proposal is missing.",
        allowedArtifactIds: ["synthetic-review"],
      },
      evidenceStandard: {
        mode: "artifact-inspection",
        proves: "The fixed review contains the selected and proposed text.",
        precondition: null,
      },
      comparison: null,
    }, {
      id: "c2",
      promise: "The review text remains literal.",
      kind: "non-regression",
      judge: "cairn",
      basis: [{ kind: "intent-requirement", index: 0 }],
      failureCondition: {
        id: "synthetic-text-interpreted",
        statement: "Synthetic text became an action or markup.",
        allowedArtifactIds: ["synthetic-review"],
      },
      evidenceStandard: {
        mode: "artifact-inspection",
        proves: "The review renders inert literal text.",
        precondition: null,
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
  if (qualityCandidate === null) throw new Error("TASK231_FIXTURE_INVALID");
  const taskSpec = bindTaskSpec(intent, qualityCandidate);
  if (taskSpec === null) throw new Error("TASK231_FIXTURE_INVALID");
  const evidencePlan = bindInitialEvidencePlan(taskSpec, {
    version: EVIDENCE_PLAN_CANDIDATE_VERSION,
    procedures: [{ criterionId: "c1", kind: "packet-artifact", command: null, artifactIds: ["synthetic-review"] },
      { criterionId: "c2", kind: "packet-artifact", command: null, artifactIds: ["synthetic-review"] }],
  });
  if (evidencePlan === null) throw new Error("TASK231_FIXTURE_INVALID");
  return { taskSpec, evidencePlan };
}

/** Test-only constructor for the exact fixed pair used by this positively
 * guarded fixture. It accepts no caller data and exposes no product control. */
export function task231FixedBuilderPairForTests(projectRoot: string) {
  const project = captureBuilderReviewProject(projectRoot);
  if (project === null) throw new Error("TASK231_FIXTURE_INVALID");
  const projectHash = project.projectHash;
  const { taskSpec, evidencePlan } = authorities();
  const context = composeBuilderTurnContext({
    version: BUILDER_TURN_CONTEXT_VERSION,
    taskNumber: 900_231,
    runId: RUN_ID,
    turnId: TURN_ID,
    projectHash,
    connectionConsentVersion: "selected-text-v1",
    taskSpec,
    evidencePlan,
    baseHead: BASE_HEAD,
    gitStateSha256: GIT_STATE_SHA256,
    selectedTrackedText: [{
      id: "synthetic-greeting",
      projectRelativePath: SYNTHETIC_PATH,
      sha256: sha256(SYNTHETIC_BEFORE),
      content: SYNTHETIC_BEFORE,
      truncated: false,
      provenance: {
        selectorVersion: BUILDER_SELECTOR_PROVENANCE_VERSION,
        projectHash,
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
      },
    }],
  });
  if (context === null) throw new Error("TASK231_FIXTURE_INVALID");
  const response = parseBuilderTurnResponse(context, {
    version: BUILDER_TURN_RESPONSE_VERSION,
    contextSha256: builderTurnContextSha256(context),
    kind: "replacement-proposal",
    summary: "Builder **suggests** one fixed synthetic replacement; [nothing opens](https://invalid.example).",
    replacements: [{
      projectRelativePath: SYNTHETIC_PATH,
      beforeSha256: sha256(SYNTHETIC_BEFORE),
      afterText: SYNTHETIC_AFTER,
      afterSha256: sha256(SYNTHETIC_AFTER),
    }],
  });
  if (response === null) throw new Error("TASK231_FIXTURE_INVALID");
  return { context, response };
}

/** Complete fixed fixture: no caller text, path, projection, timestamp or id
 * can influence the genuine Task 224 pair or the Main append. */
export function appendTask231SyntheticBuilderReview(projectRoot: string): Readonly<{
  conversationId: string;
  turn: ConductorBuilderReviewTurn;
}> {
  const conversationId = newConversationId(projectRoot);
  const { context, response } = task231FixedBuilderPairForTests(projectRoot);
  const turn = appendBuilderReviewTurn(projectRoot, conversationId, context, response);
  if (turn === null) throw new Error("TASK231_FIXTURE_INVALID");
  return Object.freeze({ conversationId, turn });
}
