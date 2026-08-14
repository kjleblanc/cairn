import type { ConductorBuilderReviewTurn } from "../shared/ipc.js";
import {
  consumeTask232FakeBuilderAnswer,
  task232FakeBuilderAnswerMatches,
  type Task232FakeBuilderAnswerV1,
  type Task232FakeBuilderTransportV1,
} from "./builderfaketransport.js";
import { task232FixedTrackedTextRequestForTests } from "./builderproposalreviewfixture.js";
import {
  builderTrackedTextSelectionMatchesContext,
  builderTrackedTextSelectionStillExact,
  captureBuilderTrackedTextSelection,
  type BuilderTrackedTextSelectionV1,
} from "./buildertrackedtext.js";
import { appendBuilderReviewTurn, newConversationId } from "./conductor/store.js";

/** Select the one fixed path, but derive all bytes and Git/project custody from
 * the live disposable repository. This constructor has no transport. */
export function prepareTask232SyntheticBuilderReview(projectRoot: string): BuilderTrackedTextSelectionV1 {
  const selection = captureBuilderTrackedTextSelection(projectRoot, task232FixedTrackedTextRequestForTests());
  if (selection === null || !builderTrackedTextSelectionStillExact(projectRoot, selection)) {
    throw new Error("TASK232_SELECTION_REFUSED");
  }
  return selection;
}

/** Complete the route only with the externally injected closed fake token and
 * its exact answer. All three process-local identities are checked again
 * immediately before Task 231's existing append boundary. */
export function appendTask232SyntheticBuilderReview(
  projectRoot: string,
  selection: BuilderTrackedTextSelectionV1,
  transport: Task232FakeBuilderTransportV1,
  answer: Task232FakeBuilderAnswerV1,
): Readonly<{ conversationId: string; turn: ConductorBuilderReviewTurn }> {
  if (!builderTrackedTextSelectionMatchesContext(selection, selection.context)
    || !builderTrackedTextSelectionStillExact(projectRoot, selection)
    || !task232FakeBuilderAnswerMatches(transport, selection.context, answer)) {
    throw new Error("TASK232_FAKE_ROUTE_REFUSED");
  }
  const response = consumeTask232FakeBuilderAnswer(transport, selection.context, answer);
  if (response === null || !builderTrackedTextSelectionStillExact(projectRoot, selection)) {
    throw new Error("TASK232_FAKE_ROUTE_REFUSED");
  }
  const conversationId = newConversationId(projectRoot);
  if (!builderTrackedTextSelectionStillExact(projectRoot, selection)) {
    throw new Error("TASK232_FAKE_ROUTE_REFUSED");
  }
  const turn = appendBuilderReviewTurn(projectRoot, conversationId, selection.context, response);
  if (turn === null) throw new Error("TASK232_FAKE_ROUTE_REFUSED");
  return Object.freeze({ conversationId, turn });
}
