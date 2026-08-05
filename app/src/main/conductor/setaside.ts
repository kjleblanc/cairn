import {
  taskRequestView,
  validateTaskIntent,
  type TaskIntent,
  type TaskRequestView,
} from "@cairn/core";

export const SET_ASIDE_CONTEXT_PREFIX = "Set aside by the owner: ";

export type SetAsideSource = Readonly<{
  intent: TaskIntent;
  risks: readonly Readonly<{ riskId: string; text: string }>[];
}>;

export type SetAsideReplacement = Readonly<{
  intent: TaskIntent;
  request: TaskRequestView;
  context: readonly string[];
  remainingRisks: readonly Readonly<{ text: string }>[];
}>;

export type SetAsideTaskCandidate = Readonly<{
  request: TaskRequestView;
  context: readonly string[];
  risks: readonly Readonly<{ text: string }>[];
}>;

function sameRequest(left: TaskRequestView, right: TaskRequestView): boolean {
  const sameRow = (a: TaskRequestView["outcome"], b: TaskRequestView["outcome"]): boolean =>
    a.source === b.source && a.text === b.text && a.ownerText === b.ownerText;
  return sameRow(left.outcome, right.outcome)
    && left.requirements.length === right.requirements.length
    && left.requirements.every((row, index) => sameRow(row, right.requirements[index]));
}

/** A model replacement may add visible context, but cannot change the task,
 * omit main's required context prefix, or silently clear another risk. */
export function preservesSetAsideReplacement(
  candidate: SetAsideTaskCandidate,
  replacement: SetAsideReplacement,
): boolean {
  try {
    if (!sameRequest(candidate.request, replacement.request)) return false;
    if (candidate.context.length < replacement.context.length
        || replacement.context.some((note, index) => candidate.context[index] !== note)) return false;
    const remaining = replacement.remainingRisks.map((risk) => risk.text);
    return candidate.risks.length === remaining.length
      && candidate.risks.every((risk, index) => risk.text === remaining[index]);
  } catch {
    return false;
  }
}

/**
 * Build main's safe fallback before the accepted owner append retires the old
 * action. The selected risk becomes plain task context; every other risk stays
 * unresolved. Revalidation preserves the original authenticated owner spans
 * and enforces Core's existing context/count/total limits. A null result means
 * send must fail closed while the old action is still current.
 */
export function buildSetAsideReplacement(
  current: SetAsideSource,
  selectedRiskId: string,
  authenticatedSources: unknown,
): SetAsideReplacement | null {
  try {
    const selected = current.risks.filter((risk) => risk.riskId === selectedRiskId);
    if (selected.length !== 1) return null;

    const contextNote = `${SET_ASIDE_CONTEXT_PREFIX}${selected[0].text}`;
    const context = current.intent.context.includes(contextNote)
      ? [...current.intent.context]
      : [...current.intent.context, contextNote];
    const intent = validateTaskIntent({
      version: current.intent.version,
      outcome: current.intent.outcome,
      requirements: current.intent.requirements,
      context,
    }, authenticatedSources);
    const request = intent === null ? null : taskRequestView(intent);
    if (intent === null || request === null) return null;

    return Object.freeze({
      intent,
      request,
      context: intent.context,
      remainingRisks: Object.freeze(current.risks
        .filter((risk) => risk.riskId !== selectedRiskId)
        .map((risk) => Object.freeze({ text: risk.text }))),
    });
  } catch {
    return null;
  }
}
