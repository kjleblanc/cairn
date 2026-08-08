import test from "node:test";
import assert from "node:assert/strict";
import { createDirectTaskIntent } from "@cairn/core";
import { composeDirectTaskSpecProposal } from "../src/main/conductor/qualityproposal.js";
import { composePendingTaskReviewAuthority, taskReviewProjection } from "../src/main/ownercheck.js";
import {
  parseTaskReviewActionRequest,
  parseTaskReviewProjection,
  type TaskReviewProjectionV1,
} from "../src/shared/task-review.js";

const ACTION_ID = "11111111-1111-4111-8111-111111111111";

function pendingReview(): TaskReviewProjectionV1 {
  const intent = createDirectTaskIntent("Show a visible status badge.", "22222222-2222-4222-8222-222222222222");
  assert.ok(intent);
  const proposal = composeDirectTaskSpecProposal(intent);
  assert.ok(proposal);
  const authority = composePendingTaskReviewAuthority(process.cwd(), proposal.taskSpec);
  assert.ok(authority);
  const projection = taskReviewProjection(authority);
  assert.ok(projection);
  return projection;
}

test("task review parser detaches and freezes the bounded plan-only projection", () => {
  const raw: any = structuredClone(pendingReview());
  const parsed = parseTaskReviewProjection(raw);
  assert.ok(parsed);
  assert.notEqual(parsed, raw);
  assert.equal(Object.isFrozen(parsed), true);
  assert.equal(Object.isFrozen(parsed.plan), true);
  assert.equal(Object.isFrozen(parsed.criteria), true);
  assert.equal(Object.isFrozen(parsed.criteria[0]), true);
  assert.equal(parsed.preSealEvidence, true);
  assert.deepEqual(parsed.criteria.map((row) => [row.id, row.state, row.source]), [["c1", "pending", null]]);
  assert.equal(JSON.stringify(parsed).includes("taskSpecSha256"), false);
  assert.equal(JSON.stringify(parsed).includes("candidateSha256"), false);
  assert.equal(JSON.stringify(parsed).includes("verdict"), false);

  raw.plan.criteria[0].promise = "Mutated renderer copy.";
  assert.equal(parsed.plan.criteria[0].promise, "Show a visible status badge.");
});

test("task review parser rejects authority fields, judge confusion, hidden data, accessors, and Proxies", () => {
  const mutations: Array<(value: any) => void> = [
    (value) => { value.taskSpecSha256 = "a".repeat(64); },
    (value) => { value.plan.criteria[0].failureConditionId = "failure-c1"; },
    (value) => { value.plan.criteria[0].id = "c2"; },
    (value) => { value.criteria[0].id = "c2"; },
    (value) => { value.criteria[0].source = "critic-inspection"; },
    (value) => { value.criteria[0].ownerChecks = [{
      kind: "owner-observation", status: "waiting-owner", supportingEvidence: [{ label: "shown" }],
      counterEvidence: [], action: { kind: "observe", actionId: ACTION_ID },
    }]; },
  ];
  for (const mutate of mutations) {
    const raw: any = structuredClone(pendingReview());
    mutate(raw);
    assert.equal(parseTaskReviewProjection(raw), null);
  }

  const hidden = structuredClone(pendingReview()) as any;
  Object.defineProperty(hidden, "seal", { value: true, enumerable: false });
  assert.equal(parseTaskReviewProjection(hidden), null);

  const accessor = structuredClone(pendingReview()) as any;
  Object.defineProperty(accessor.criteria[0], "state", { enumerable: true, get() { throw new Error("must not run"); } });
  assert.doesNotThrow(() => assert.equal(parseTaskReviewProjection(accessor), null));
  assert.doesNotThrow(() => assert.equal(parseTaskReviewProjection(new Proxy(structuredClone(pendingReview()), {})), null));
});

test("task review accepts the frozen v1 source and reference dimension caps but rejects gapped pN order", () => {
  const atCap: any = structuredClone(pendingReview());
  atCap.plan.supportedPath.sources = Array.from({ length: 12 }, (_, index) => `owner basis ${index + 1}`);
  atCap.plan.criteria[0].sources = Array.from({ length: 12 }, (_, index) => `criterion basis ${index + 1}`);
  atCap.plan.references = [{
    title: "Frozen comparison",
    source: "Owner supplied",
    dimensions: Array.from({ length: 12 }, (_, index) => `dimension ${index + 1}`),
    antiCopyBoundary: "Compare only the named dimensions.",
  }];
  assert.ok(parseTaskReviewProjection(atCap));

  const gapped: any = structuredClone(pendingReview());
  gapped.plan.preferences = [{ id: "p2", dimension: "clarity", desiredDirection: "Prefer clear copy.", sources: ["owner outcome"] }];
  assert.equal(parseTaskReviewProjection(gapped), null);
});

test("owner action parser accepts only the opaque id, project, kind, and closed decision", () => {
  const observe = parseTaskReviewActionRequest({
    dir: process.cwd(), actionId: ACTION_ID, action: { kind: "observe", decision: "met" },
  });
  const resolve = parseTaskReviewActionRequest({
    dir: process.cwd(), actionId: ACTION_ID, action: { kind: "resolve", decision: "dismissed" },
  });
  assert.ok(observe);
  assert.ok(resolve);
  assert.equal(Object.isFrozen(observe), true);
  assert.equal(Object.isFrozen(observe.action), true);

  const forbidden = [
    { dir: process.cwd(), actionId: ACTION_ID, action: { kind: "observe", decision: "confirmed" } },
    { dir: process.cwd(), actionId: ACTION_ID, action: { kind: "resolve", decision: "not-met" } },
    { dir: process.cwd(), actionId: ACTION_ID, action: { kind: "observe", decision: "met", criterionId: "c1" } },
    { dir: process.cwd(), actionId: ACTION_ID, action: { kind: "observe", decision: "met" }, taskSpec: {} },
    { dir: process.cwd(), actionId: "not-a-uuid", action: { kind: "observe", decision: "met" } },
  ];
  for (const value of forbidden) assert.equal(parseTaskReviewActionRequest(value), null);

  const accessor: any = { dir: process.cwd(), actionId: ACTION_ID, action: { kind: "observe", decision: "met" } };
  Object.defineProperty(accessor, "actionId", { enumerable: true, get() { throw new Error("must not run"); } });
  assert.doesNotThrow(() => assert.equal(parseTaskReviewActionRequest(accessor), null));
});
