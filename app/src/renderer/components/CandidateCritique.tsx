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

const JUDGMENT_WORDS: Readonly<Record<CandidateCritiqueJudgment, string>> = Object.freeze({
  met: "met",
  not_met: "not met",
  unclear: "not sure",
});

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

export function CandidateCritiqueCard({ critique, busy = false, onDecide }: {
  critique: CandidateCritiqueProjectionV1;
  busy?: boolean;
  onDecide?: (action: CandidateCritiqueAction) => void;
}) {
  const disclosure = critique.disclosure;
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

          <ol className="candidate-critique-finding-list" aria-label="What the reviewer said">
            {critique.findings.map((finding) => (
              <li
                key={finding.checkId}
                className="candidate-critique-finding"
                data-critique-row={finding.checkId}
                data-judgment={finding.judgment}
              >
                <p className="candidate-critique-finding-text">
                  <span className="candidate-critique-finding-id mono">{finding.checkId}</span>
                  <span className="candidate-critique-judgment">{JUDGMENT_WORDS[finding.judgment]}</span>
                </p>
                <p className="candidate-critique-finding-observation">{finding.observation}</p>
              </li>
            ))}
          </ol>

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
