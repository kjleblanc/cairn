import type { TaskCallBudgetV1, TaskRequestView } from "@cairn/core";

/**
 * Main's inert, output-only projection of a privately branded TaskSpecV1.
 *
 * This is deliberately narrower than Core's review projection: it carries the
 * owner-readable plan but omits the Task Spec hash, source ids/offsets,
 * reference locators and hashes, state ids, and failure/artifact ids. Nothing
 * in this value is accepted back as task or dispatch authority.
 */
export type TaskSpecProposalPreviewV1 = Readonly<{
  version: "cairn-task-spec-proposal-preview/v1";
  request: TaskRequestView;
  supportedPath: Readonly<{
    statement: string;
    sources: readonly string[];
  }>;
  critic: Readonly<{
    mode: "required" | "optional" | "off";
    reason: string;
    sources: readonly string[];
  }>;
  criteria: readonly Readonly<{
    id: `c${number}`;
    promise: string;
    kind: "acceptance" | "non-regression" | "comparison";
    judge: "cairn" | "critic" | "owner";
    sources: readonly string[];
    failure: string;
    evidence: Readonly<{
      mode: "adapter-attestation" | "artifact-inspection" | "comparison" | "owner-observation";
      proves: string;
      precondition: string | null;
    }>;
  }>[];
  preferences: readonly Readonly<{
    id: `p${number}`;
    dimension: string;
    desiredDirection: string;
    sources: readonly string[];
  }>[];
  references: readonly Readonly<{
    title: string;
    source: string;
    dimensions: readonly string[];
    antiCopyBoundary: string;
  }>[];
  unknowns: readonly Readonly<{
    text: string;
    sources: readonly string[];
  }>[];
  callBudget: TaskCallBudgetV1;
}>;
