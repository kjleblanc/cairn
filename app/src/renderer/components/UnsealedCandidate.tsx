import type { UnsealedCandidateChoice, UnsealedCandidateProjectionV1 } from "../../shared/unsealed-candidate";

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

export function UnsealedCandidateCard({ candidate, busy = false, onChoose }: {
  candidate: UnsealedCandidateProjectionV1;
  busy?: boolean;
  onChoose?: (choice: UnsealedCandidateChoice) => void;
}) {
  const claims = candidate.claims;
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
              disabled={busy}
              onClick={() => onChoose(choice)}
            >
              {CHOICE_LABELS[choice]}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
