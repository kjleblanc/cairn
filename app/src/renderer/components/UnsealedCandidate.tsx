import { useState } from "react";

import type {
  UnsealedCandidateChoice,
  UnsealedCandidateOwnerAnswer,
  UnsealedCandidateProjectionV1,
} from "../../shared/unsealed-candidate";

/**
 * What the owner reads before Cairn is allowed to finish a task.
 *
 * The worker has really changed files and Cairn has really checked them, but
 * nothing terminal exists yet. The one thing this card must make unmistakable
 * is that gap: files changed, and Cairn has NOT said the task is done.
 *
 * Every fact comes from main's projection. This component invents no wording
 * for a fact, adds no default, and offers only the choices the projection
 * itself lists — so a pause that offers no stop could not grow one here.
 *
 * The two evidence sections are deliberately separated by who is speaking.
 * Cairn's list is Git's answer and is labelled for what it really is: every
 * path that changed in the project, which at this moment includes Cairn's own
 * task brief. Calling that list "what the worker changed" would attribute
 * Cairn's own record to the worker, so it does not.
 */

const CHOICE_LABELS: Readonly<Record<UnsealedCandidateChoice, string>> = Object.freeze({
  continue: "Continue to Cairn's current checks",
  stop: "Stop and keep the work for inspection",
});

const CHOICE_STYLES: Readonly<Record<UnsealedCandidateChoice, string>> = Object.freeze({
  continue: "pill pill-primary",
  stop: "pill pill-quiet",
});

/** Cairn's own finding for one row, in plain words. */
function cairnFinding(row: UnsealedCandidateProjectionV1["promises"][number]): string {
  if (row.cairn === null) return "Cairn has no result for this check, so it is not answered.";
  const seconds = Math.round(row.cairn.durationMs / 1000);
  if (row.cairn.status === "unfinished") {
    return `Cairn ran ${row.cairn.command} but it did not finish in time, so this is not answered.`;
  }
  return row.cairn.status === "passed"
    ? `Cairn ran ${row.cairn.command} and it passed (${seconds}s).`
    : `Cairn ran ${row.cairn.command} and it failed.`;
}

export function UnsealedCandidateCard({ candidate, busy = false, onChoose }: {
  candidate: UnsealedCandidateProjectionV1;
  busy?: boolean;
  onChoose?: (
    choice: UnsealedCandidateChoice,
    ownerAnswers: Readonly<Record<string, UnsealedCandidateOwnerAnswer>>,
  ) => void;
}) {
  const claims = candidate.claims;
  const [ownerAnswers, setOwnerAnswers] = useState<Record<string, UnsealedCandidateOwnerAnswer>>({});
  const ownerRows = candidate.promises.filter((row) => row.answeredBy === "owner");
  const unanswered = ownerRows.filter((row) => ownerAnswers[row.id] === undefined);
  return (
    <section className="unsealed-candidate" aria-label="Unsealed candidate">
      <h3 className="unsealed-candidate-title">Unsealed candidate</h3>

      {/* The whole point of the pause, in one sentence, before any detail. */}
      <p className="unsealed-candidate-sentence">
        The worker changed files in your project. <strong>Cairn has not declared this task
        complete.</strong> Nothing is saved or recorded yet.
      </p>

      <section className="unsealed-candidate-request" aria-label="What you asked for">
        <h4 className="unsealed-candidate-section-title">What you asked for</h4>
        <p className="unsealed-candidate-outcome">{candidate.acceptedRequest.outcome.text}</p>
        {candidate.acceptedRequest.requirements.length === 0 ? null : (
          <ul className="unsealed-candidate-requirements">
            {candidate.acceptedRequest.requirements.map((requirement, index) => (
              <li key={`${index}-${requirement.text}`}>{requirement.text}</li>
            ))}
          </ul>
        )}
      </section>

      {candidate.promises.length === 0 ? null : (
        <section className="unsealed-candidate-promises" aria-label="What this task promised">
          <h4 className="unsealed-candidate-section-title">What this task promised</h4>
          <ol className="unsealed-candidate-promise-list">
            {candidate.promises.map((row) => (
              <li key={row.id} className="unsealed-candidate-promise" data-row={row.id}>
                <p className="unsealed-candidate-promise-text">
                  <span className="unsealed-candidate-promise-id mono">{row.id}</span> {row.text}
                </p>

                {/* Voice one: Cairn's own check. */}
                {row.answeredBy === "cairn" ? (
                  <p className="unsealed-candidate-promise-cairn" data-status={row.cairn?.status ?? "none"}>
                    <span className="unsealed-candidate-provenance">Cairn checked this</span>
                    {" "}{cairnFinding(row)}
                  </p>
                ) : null}

                {/* Voice two: the worker, always attributed to the worker. */}
                <p className="unsealed-candidate-promise-worker">
                  <span className="unsealed-candidate-provenance">reported, not checked</span>
                  {" "}{row.worker === null
                    ? `${candidate.adapterLabel} did not answer this.`
                    : `${candidate.adapterLabel} says: ${row.worker}`}
                </p>

                {/* Voice three: the owner's own eyes, still owed. */}
                {row.answeredBy === "owner" ? (
                  <div className="unsealed-candidate-promise-owner">
                    <span className="unsealed-candidate-provenance">needs your judgment</span>
                    {ownerAnswers[row.id] === undefined ? (
                      <span className="unsealed-candidate-promise-pending"> You have not judged this yet.</span>
                    ) : null}
                    <div className="unsealed-candidate-promise-actions">
                      <button
                        type="button"
                        className={ownerAnswers[row.id] === "met" ? "pill pill-primary" : "pill pill-quiet"}
                        aria-pressed={ownerAnswers[row.id] === "met"}
                        disabled={busy}
                        onClick={() => setOwnerAnswers((current) => ({ ...current, [row.id]: "met" }))}
                      >
                        I checked this — it&apos;s done
                      </button>
                      <button
                        type="button"
                        className={ownerAnswers[row.id] === "not-met" ? "pill pill-primary" : "pill pill-quiet"}
                        aria-pressed={ownerAnswers[row.id] === "not-met"}
                        disabled={busy}
                        onClick={() => setOwnerAnswers((current) => ({ ...current, [row.id]: "not-met" }))}
                      >
                        Not done
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="unsealed-candidate-changes" aria-label="Files changed in your project">
        <h4 className="unsealed-candidate-section-title">
          Files changed in your project
          <span className="unsealed-candidate-provenance">checked by Cairn</span>
        </h4>
        {candidate.changedPaths.length === 0 ? (
          <p className="unsealed-candidate-empty">No file in your project has changed.</p>
        ) : (
          <ul className="unsealed-candidate-paths">
            {candidate.changedPaths.map((path) => (
              <li key={path} className="mono">{path}</li>
            ))}
          </ul>
        )}
        {candidate.evidenceSummary
          ? <p className="unsealed-candidate-evidence">{candidate.evidenceSummary}</p>
          : null}
      </section>

      <section className="unsealed-candidate-claims" aria-label="What the worker says it did">
        <h4 className="unsealed-candidate-section-title">
          What {candidate.adapterLabel} says it did
          <span className="unsealed-candidate-provenance">reported, not checked</span>
        </h4>
        {claims === null ? (
          <p className="unsealed-candidate-empty">
            The worker didn&apos;t leave a readable summary of what it did.
          </p>
        ) : (
          <>
            <p className="unsealed-candidate-claims-said">
              {candidate.adapterLabel} says: <strong>{claims.disposition}</strong> — this is the
              worker&apos;s own verdict, not Cairn&apos;s.
            </p>
            <p className="unsealed-candidate-claims-text">{claims.summary}</p>
            {claims.changes.length === 0 ? null : (
              <ul className="unsealed-candidate-claims-list">
                {claims.changes.map((change, index) => <li key={`${index}-${change}`}>{change}</li>)}
              </ul>
            )}
            {claims.checks.length === 0 ? null : (
              <ul className="unsealed-candidate-claims-list">
                {claims.checks.map((check, index) => (
                  <li key={`${index}-${check.name}`}>{check.name}: {check.result}</li>
                ))}
              </ul>
            )}
            <p className="unsealed-candidate-claims-text">
              Remaining limitations: {claims.limitations || "the worker reported none."}
            </p>
          </>
        )}
      </section>

      <section className="unsealed-candidate-pending" aria-label="What has not happened yet">
        <h4 className="unsealed-candidate-section-title">What has not happened yet</h4>
        <ul className="unsealed-candidate-pending-list">
          <li>No task report is written.</li>
          <li>No row is added to the work log.</li>
          <li>Nothing is committed.</li>
          <li>Cairn has not said DONE or STOPPED.</li>
        </ul>
      </section>

      {onChoose ? (
        <div className="unsealed-candidate-actions">
          {candidate.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={CHOICE_STYLES[choice]}
              // Continue waits on the rows only the owner can answer. Cairn
              // refuses to seal them unanswered anyway; disabling here says so
              // before the press rather than after it.
              disabled={busy || (choice === "continue" && unanswered.length > 0)}
              onClick={() => onChoose(choice, ownerAnswers)}
            >
              {CHOICE_LABELS[choice]}
            </button>
          ))}
        </div>
      ) : null}
      {unanswered.length > 0 ? (
        <p className="unsealed-candidate-owed" role="status">
          {unanswered.length === 1
            ? `Answer ${unanswered[0]?.id} above before Cairn can finish this task.`
            : `Answer ${unanswered.map((row) => row.id).join(", ")} above before Cairn can finish this task.`}
        </p>
      ) : null}
    </section>
  );
}
