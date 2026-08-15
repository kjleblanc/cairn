import { useState } from "react";

import {
  CANDIDATE_CRITIQUE_AUTHORITY_TEXT,
  type CandidateCritiqueAction,
  type CandidateCritiqueJudgment,
  type CandidateCritiqueProjectionV1,
} from "../../shared/critique";

/**
 * The second opinion, offered while the candidate above is still waiting.
 *
 * Two things this card must make unmistakable. First, before the press: exactly
 * what would leave the machine, to whom, and that it happens once. Second,
 * after it: that what came back is an opinion Cairn has not acted on. A reader
 * who mistakes a finding for a result would think the work had been judged,
 * when the owner's own two choices are still sitting untouched below.
 *
 * Every fact comes from main's projection. This component invents no wording
 * for a fact and offers no press the projection does not support, so a state
 * that offers nothing cannot grow a button here.
 *
 * Findings and notes are rendered as two separate sections with different
 * headings, because they carry different authority: a finding names a row the
 * owner froze, and a note names nothing at all.
 */

/**
 * Task 245. What a finding IS to the owner right now — decided once, and used
 * for both the words and the colour.
 *
 * The reviewer's own judgment word was never the whole story. An allegation
 * against a row Cairn ran and watched pass is already disproved by evidence
 * Cairn holds, and rendering it amber — the colour of a live failure —
 * directly above Cairn's own line disproving it told a reader scanning colour
 * the opposite of what Cairn had found. So amber now follows what is still
 * OWED rather than what was alleged, and every state says in words what it is
 * and what the owner may do about it, including the two that used to say
 * nothing at all.
 */
type CandidateFindingState =
  | CandidateCritiqueJudgment
  /** Cairn's own check passed this row, so the allegation is already answered. */
  | "settled-by-cairn"
  /** The owner looked and said it is fine. */
  | "settled-by-you"
  /** The owner agreed, and one repair is on offer. */
  | "you-confirmed"
  /** Only the owner can settle this, and they have not yet. */
  | "yours"
  /** Unsettled, but this task's one repair is already spent. */
  | "no-repair-left"
  /** Unsettled, but another row is holding the one repair. */
  | "one-at-a-time";

const STATE_WORDS: Readonly<Record<CandidateFindingState, string>> = Object.freeze({
  met: "met",
  not_met: "not met",
  unclear: "not sure",
  "settled-by-cairn": "settled by Cairn",
  "settled-by-you": "settled by you",
  "you-confirmed": "not met",
  yours: "not met",
  "no-repair-left": "not met",
  "one-at-a-time": "not met",
});

/** The states where the row is genuinely unsettled, and so genuinely amber. */
const OWED_STATES: ReadonlySet<string> = new Set([
  "yours", "you-confirmed", "no-repair-left", "one-at-a-time",
]);

function findingStateFor(
  finding: CandidateCritiqueProjectionV1["findings"][number],
  openRowIds: readonly string[],
  answered: Readonly<Record<string, "confirmed" | "dismissed">>,
  repairAvailable: boolean,
  canRepair: boolean,
  confirmedElsewhere: boolean,
): CandidateFindingState {
  // Cairn's own passing check settles the row before anything else is asked.
  if (finding.judgment === "not_met" && !openRowIds.includes(finding.checkId)) {
    return "settled-by-cairn";
  }
  // Anything the reviewer did not allege has exactly one state: its own word.
  if (finding.judgment !== "not_met") return finding.judgment;
  if (answered[finding.checkId] === "dismissed") return "settled-by-you";
  if (answered[finding.checkId] === "confirmed") return "you-confirmed";
  if (!repairAvailable || !canRepair) return "no-repair-left";
  if (confirmedElsewhere) return "one-at-a-time";
  return "yours";
}

/**
 * Everything the owner does not need in order to decide, kept one click away.
 *
 * The card's first screen has to answer four questions and no more: who is
 * being asked, what they see, what it costs, and whether it can change
 * anything. The exact byte counts, the base URL and the full not-sent list are
 * evidence for someone who wants to audit the call - real, and worth keeping,
 * but not what a beginner reads before pressing a button.
 */
function SentDetail({ disclosure, summary }: {
  disclosure: NonNullable<CandidateCritiqueProjectionV1["disclosure"]>;
  summary: string;
}) {
  return (
    <details className="candidate-critique-detail">
      <summary>{summary}</summary>
      <dl className="candidate-critique-route-list">
        <div><dt>Provider</dt><dd className="mono">{disclosure.provider}</dd></div>
        <div><dt>Address</dt><dd className="mono">{disclosure.baseUrl}</dd></div>
        <div><dt>Model</dt><dd className="mono">{disclosure.model}</dd></div>
      </dl>
      <ul className="candidate-critique-artifacts">
        {disclosure.artifacts.map((artifact) => (
          <li key={artifact.id}>
            <span className="mono">{artifact.id}</span> {artifact.label}
            <span className="candidate-critique-count"> ({artifact.characters} characters)</span>
          </li>
        ))}
      </ul>
      <p className="candidate-critique-total">
        {disclosure.totalCharacters} characters in total, asking about{" "}
        {disclosure.rowIds.join(", ")}.
      </p>
      <p className="candidate-critique-notsent">
        Not sent: {disclosure.notSent.join("; ")}.
      </p>
      <p className="candidate-critique-credential">{disclosure.credentialText}</p>
      <p className="candidate-critique-limit">{disclosure.limitText}</p>
      {disclosure.cost?.known === true ? (
        <p className="candidate-critique-arithmetic">
          Worked out from {disclosure.cost.currency} {disclosure.cost.inputPerMillion} per
          million in and {disclosure.cost.currency} {disclosure.cost.outputPerMillion} per
          million out, applied to {disclosure.cost.inputCharacters} characters
          (at most {disclosure.cost.inputTokensAtMost} tokens) in and at most{" "}
          {disclosure.cost.outputTokensAtMost} tokens back, rounded up.
        </p>
      ) : null}
    </details>
  );
}

export function CandidateCritiqueCard({
  critique,
  busy = false,
  onDecide,
  openRowIds = [],
  repairAvailable = false,
  adapterLabel = "the worker",
  onRepair,
}: {
  critique: CandidateCritiqueProjectionV1;
  busy?: boolean;
  onDecide?: (action: CandidateCritiqueAction) => void;
  /**
   * Task 244. Rows an allegation may still be confirmed against. A row Cairn
   * ran and watched pass is disproved by evidence Cairn holds, so the owner is
   * never asked about it — the same rule Core enforces, said here so the screen
   * agrees with the runner rather than offering a press that would be refused.
   */
  openRowIds?: readonly string[];
  repairAvailable?: boolean;
  adapterLabel?: string;
  onRepair?: (checkId: string, correction: string) => void;
}) {
  const disclosure = critique.disclosure;
  // Whose allegation the owner has answered, and how. This lives here and only
  // here: dismissing changes no file, calls nobody and spends nothing, so it
  // needs no channel — and confirming grants nothing either, because Main and
  // Core both re-check the row and the correction before any dispatch.
  const [answered, setAnswered] = useState<Record<string, "confirmed" | "dismissed">>({});
  const confirmed = Object.keys(answered).find((id) => answered[id] === "confirmed") ?? null;

  const findingStates = new Map<string, CandidateFindingState>(critique.findings.map((finding) => [
    finding.checkId,
    findingStateFor(finding, openRowIds, answered, repairAvailable, onRepair !== undefined,
      confirmed !== null && confirmed !== finding.checkId),
  ]));
  // What Cairn has already answered is folded away from what the owner still
  // has to read, so the first screen of a review carries only the live ones.
  // The summary line says how many there are and that Cairn settled them, so
  // nothing is hidden — it is one click away, the way the record on the card
  // above already is.
  const settled = critique.findings.filter((f) => findingStates.get(f.checkId) === "settled-by-cairn");
  const live = critique.findings.filter((f) => findingStates.get(f.checkId) !== "settled-by-cairn");

  const renderFinding = (
    finding: CandidateCritiqueProjectionV1["findings"][number],
    state: CandidateFindingState,
  ) => (
    <li
      key={finding.checkId}
      className="candidate-critique-finding"
      data-critique-row={finding.checkId}
      data-judgment={finding.judgment}
      data-finding-state={state}
      data-owed={OWED_STATES.has(state) ? "yes" : "no"}
    >
      <p className="candidate-critique-finding-text">
        <span className="candidate-critique-finding-id mono">{finding.checkId}</span>
        <span className="candidate-critique-judgment">{STATE_WORDS[state]}</span>
      </p>

      {/* Cairn answers first on a row it proved, so the allegation and its
          answer read as one settled thing rather than two contradictory ones. */}
      {state === "settled-by-cairn" ? (
        <p className="candidate-critique-dismissed" data-dismissed-by="cairn">
          The reviewer said this one was not done. Cairn checked this one itself
          and it passed, so there is nothing here for you to answer.
        </p>
      ) : null}

      <p className="candidate-critique-finding-observation">
        {state === "settled-by-cairn" ? (
          <span className="candidate-critique-provenance">the reviewer&apos;s own words: </span>
        ) : null}
        {finding.observation}
      </p>

      {state === "yours" && onDecide !== undefined ? (
        <p className="candidate-critique-ask">
          Cairn cannot check this one itself — is the reviewer right?
        </p>
      ) : null}

      {state === "yours" ? (
        <div className="candidate-critique-actions candidate-critique-allege">
          <button
            type="button"
            className="pill"
            disabled={busy}
            onClick={() => setAnswered((prior) => ({ ...prior, [finding.checkId]: "confirmed" }))}
          >
            Yes, that is not done
          </button>
          <button
            type="button"
            className="pill pill-quiet"
            disabled={busy}
            onClick={() => setAnswered((prior) => ({ ...prior, [finding.checkId]: "dismissed" }))}
          >
            No, that is fine
          </button>
        </div>
      ) : null}

      {state === "settled-by-you" ? (
        <p className="candidate-critique-dismissed" data-dismissed-by="owner">
          You decided this is fine. Nothing was changed.
        </p>
      ) : null}

      {state === "you-confirmed" && onRepair ? (
        <div className="candidate-critique-repair" data-repair-row={finding.checkId}>
          <p className="candidate-critique-repair-text">
            Cairn can ask <strong>{adapterLabel}</strong> to make this one
            correction, and nothing else.
          </p>
          <p className="candidate-critique-repair-limit">
            <strong>This is the only repair for this task.</strong>{" "}
            Afterwards Cairn runs every check again and asks you once more
            before it finishes anything.
          </p>
          <div className="candidate-critique-actions">
            <button
              type="button"
              className="pill pill-primary"
              disabled={busy}
              onClick={() => onRepair(finding.checkId, finding.observation)}
            >
              Ask for this one correction
            </button>
            <button
              type="button"
              className="pill pill-quiet"
              disabled={busy}
              onClick={() => setAnswered((prior) => {
                const next = { ...prior };
                delete next[finding.checkId];
                return next;
              })}
            >
              Never mind
            </button>
          </div>
        </div>
      ) : null}

      {/* Two states that used to render nothing at all, leaving an amber
          accusation on screen with no answer and no way to act on it. */}
      {state === "no-repair-left" ? (
        <p className="candidate-critique-dismissed" data-dismissed-by="spent">
          This task&apos;s one correction has already been used, so Cairn cannot
          ask for another. Nothing here is waiting on you — but it is worth
          reading before you choose below.
        </p>
      ) : null}

      {state === "one-at-a-time" ? (
        <p className="candidate-critique-dismissed" data-dismissed-by="other">
          Cairn&apos;s one correction is already being decided on another row.
        </p>
      ) : null}
    </li>
  );

  return (
    <section className="candidate-critique" aria-label="Independent inspection" data-state={critique.state}>
      <h3 className="candidate-critique-title">A second opinion</h3>

      {/* Four facts, in the order a beginner needs them: who is asked, what
          they see, whether it can change anything, and what it costs. Every
          exact number behind them stays one click away. */}
      {critique.state === "offered" && disclosure ? (
        <p className="candidate-critique-sentence">
          Cairn can ask <strong>{disclosure.model}</strong> whether the promises
          above were kept. It sees a short summary of this task, never your
          files, and it cannot change anything.{" "}
          <strong>One request - if it fails, Cairn will not try again.</strong>
        </p>
      ) : null}

      {/* The money, in the owner's own currency, worked out from the prices
          the provider publishes - or an honest statement that Cairn could not
          find them out. There is no third option: an estimate Cairn invented
          would be worse than no number, because it would be believed. */}
      {critique.state === "offered" && disclosure ? (
        <p className="candidate-critique-cost" data-cost={disclosure.cost?.known === true ? "known" : disclosure.cost === null ? "pending" : "unknown"}>
          {disclosure.cost === null
            ? "Checking what this would cost..."
            : disclosure.cost.known
              ? `At most about ${disclosure.cost.currency} ${disclosure.cost.atMost}, at the prices ${disclosure.cost.source} publishes today.`
              : "Cairn could not find out what this would cost, so it is not guessing. The sizes are in the details below."}
        </p>
      ) : null}

      {critique.state === "offered" && onDecide ? (
        <div className="candidate-critique-actions">
          <button
            type="button"
            className="pill pill-primary"
            disabled={busy}
            onClick={() => onDecide("approve")}
          >
            Ask for one review
          </button>
          <button
            type="button"
            className="pill pill-quiet"
            disabled={busy}
            onClick={() => onDecide("skip")}
          >
            Skip this
          </button>
        </div>
      ) : null}

      {critique.state === "offered" && disclosure ? (
        <SentDetail disclosure={disclosure} summary="Exactly what would be sent" />
      ) : null}

      {critique.state === "declined" ? (
        <p className="candidate-critique-sentence">
          You skipped the review. Nothing was sent, and nothing was charged.
        </p>
      ) : null}

      {critique.state === "unavailable" ? (
        <p className="candidate-critique-sentence">
          Cairn could not get a review. Nothing about your task changed, and no
          answer is being guessed at.
          {critique.unavailableReason === "CRITIQUE_NO_CONNECTION"
            ? " No reviewer is connected."
            : null}
        </p>
      ) : null}

      {critique.state === "answered" ? (
        <>
          <p className="candidate-critique-sentence">
            {CANDIDATE_CRITIQUE_AUTHORITY_TEXT}
          </p>

          {live.length === 0 ? (
            <p className="candidate-critique-ask">
              Nothing the reviewer raised needs an answer from you.
            </p>
          ) : (
            <ol className="candidate-critique-finding-list" aria-label="What the reviewer said">
              {live.map((finding) => renderFinding(finding, findingStates.get(finding.checkId)!))}
            </ol>
          )}

          {/* What Cairn's own checks already settled, folded rather than
              deleted. The summary line says how many there are and who settled
              them, so nothing is concealed — the reviewer's exact words are one
              click away, the same deal the record on the card above offers. */}
          {settled.length === 0 ? null : (
            <details className="candidate-critique-settled-fold">
              <summary>
                {settled.length === 1
                  ? "1 more thing the reviewer raised, which Cairn checked itself and settled"
                  : `${settled.length} more things the reviewer raised, which Cairn checked itself and settled`}
              </summary>
              <ol className="candidate-critique-finding-list" aria-label="What Cairn settled itself">
                {settled.map((finding) => renderFinding(finding, "settled-by-cairn"))}
              </ol>
            </details>
          )}

          {/* Still its own block with its own words: a suggestion that names
              no promise must never read like one that does. */}
          {critique.notes.length === 0 ? null : (
            <section className="candidate-critique-notes" aria-label="Other suggestions">
              <h4 className="candidate-critique-section-title">
                Also suggested
                <span className="candidate-critique-provenance">advice only, nothing is waiting on these</span>
              </h4>
              <ul className="candidate-critique-note-list">
                {critique.notes.map((note, index) => (
                  <li key={`${index}-${note}`}>{note}</li>
                ))}
              </ul>
            </section>
          )}

          {disclosure ? (
            <SentDetail disclosure={disclosure} summary="What was sent, and where it went" />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
