import type { ConductorBuilderReviewTurn } from "../shared/ipc.js";
import {
  consumeTask233LiveBuilderAnswer,
  createTask233LiveBuilderTransport,
  task233LiveBuilderAnswerMatches,
  type Task233LiveBuilderAnswerV1,
  type Task233LiveBuilderTransportV1,
} from "./builderlivetransport.js";
import { task233FixedTrackedTextRequestForTests } from "./builderproposalreviewfixture.js";
import {
  builderTrackedTextSelectionMatchesContext,
  builderTrackedTextSelectionStillExact,
  captureBuilderTrackedTextSelection,
  type BuilderTrackedTextSelectionV1,
} from "./buildertrackedtext.js";
import { appendBuilderReviewTurn, newConversationId } from "./conductor/store.js";

export type Task233PreparedLiveBuilderReviewV1 = Readonly<{
  selection: BuilderTrackedTextSelectionV1;
  transport: Task233LiveBuilderTransportV1;
}>;

/** Select the fixed synthetic path and bind the request body while every
 * project, Git, and file fact is still exact. No network or credential exists
 * at this seam. */
export function prepareTask233LiveBuilderReview(
  projectRoot: string,
): Task233PreparedLiveBuilderReviewV1 {
  const selection = captureBuilderTrackedTextSelection(
    projectRoot,
    task233FixedTrackedTextRequestForTests(),
  );
  if (selection === null || !builderTrackedTextSelectionStillExact(projectRoot, selection)) {
    throw new Error("TASK233_SELECTION_REFUSED");
  }
  const transport = createTask233LiveBuilderTransport(selection.context);
  if (transport === null || !builderTrackedTextSelectionStillExact(projectRoot, selection)) {
    throw new Error("TASK233_TRANSPORT_REFUSED");
  }
  return Object.freeze({ selection, transport });
}

/** Consume the one exact provider answer only after rechecking selection
 * custody, then enter Task 231's existing proposal-only append boundary. */
export function appendTask233LiveBuilderReview(
  projectRoot: string,
  prepared: Task233PreparedLiveBuilderReviewV1,
  answer: Task233LiveBuilderAnswerV1,
): Readonly<{ conversationId: string; turn: ConductorBuilderReviewTurn }> {
  const { selection, transport } = prepared;
  if (!builderTrackedTextSelectionMatchesContext(selection, selection.context)
    || !builderTrackedTextSelectionStillExact(projectRoot, selection)
    || !task233LiveBuilderAnswerMatches(transport, selection.context, answer)) {
    throw new Error("TASK233_LIVE_ROUTE_REFUSED");
  }
  const response = consumeTask233LiveBuilderAnswer(transport, selection.context, answer);
  if (response === null || !builderTrackedTextSelectionStillExact(projectRoot, selection)) {
    throw new Error("TASK233_LIVE_ROUTE_REFUSED");
  }
  const conversationId = newConversationId(projectRoot);
  if (!builderTrackedTextSelectionStillExact(projectRoot, selection)) {
    throw new Error("TASK233_LIVE_ROUTE_REFUSED");
  }
  const turn = appendBuilderReviewTurn(projectRoot, conversationId, selection.context, response);
  if (turn === null) throw new Error("TASK233_LIVE_ROUTE_REFUSED");
  return Object.freeze({ conversationId, turn });
}
