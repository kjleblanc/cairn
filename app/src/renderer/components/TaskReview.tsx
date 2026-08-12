import type { TaskReviewActionRequest, TaskReviewEvidenceViewV1, TaskReviewProjectionV1 } from "../../shared/task-review";
import type { TaskSpecProposalPreviewV1 } from "../../shared/quality-preview";
import { TaskIntentList } from "./TaskIntentList";
import { Pill } from "./Ui";

function previewSourceLabel(source: string): string {
  if (source === "owner outcome") return "what you asked for";
  if (source === "Cairn default: not-requested") return "Cairn's default because you did not request this setting";
  const requirement = /^requirement (\d+): (owner-stated|owner-unsure|cairn-chosen)$/u.exec(source);
  if (!requirement) return source;
  if (requirement[2] === "owner-stated") return `your requirement ${requirement[1]}`;
  if (requirement[2] === "owner-unsure") return `something you were unsure about in requirement ${requirement[1]}`;
  return `a Cairn choice in requirement ${requirement[1]}`;
}

function PreviewSources({ sources }: { sources: readonly string[] }) {
  if (sources.length === 0) return null;
  return <p className="small muted task-spec-preview-source">Source: {sources.map(previewSourceLabel).join("; ")}</p>;
}

function previewMinutes(milliseconds: number): string {
  return milliseconds % 60_000 === 0
    ? `${milliseconds / 60_000} minutes`
    : `${milliseconds.toLocaleString("en-US")} milliseconds`;
}

function previewBytes(bytes: number): string {
  return `${bytes.toLocaleString("en-US")} captured output bytes`;
}

function previewJudge(judge: TaskSpecProposalPreviewV1["criteria"][number]["judge"]): string {
  if (judge === "cairn") return "Checked by Cairn";
  if (judge === "critic") return "Inspected by the independent critic";
  return "Judged by you";
}

function previewEvidenceMode(mode: TaskSpecProposalPreviewV1["criteria"][number]["evidence"]["mode"]): string {
  if (mode === "adapter-attestation") return "the worker's recorded check";
  if (mode === "artifact-inspection") return "inspection of a captured artifact";
  if (mode === "owner-observation") return "your observation";
  return "a frozen comparison";
}

/** Pure display of Main's output-only Task Spec projection. */
export function TaskSpecProposalPreviewView({ preview, heading = "Quality plan preview" }: {
  preview: TaskSpecProposalPreviewV1;
  heading?: string;
}) {
  const criticMode = preview.critic.mode === "required"
    ? "Required"
    : preview.critic.mode === "optional"
      ? "Optional"
      : "Off";
  const budget = preview.callBudget;

  return (
    <section className="card task-spec-preview" aria-label={heading}>
      <h2 className="card-title task-spec-preview-heading">{heading}</h2>
      <TaskIntentList request={preview.request} heading="Request and source" />

      <section className="task-spec-preview-section">
        <h3>Supported path to protect</h3>
        <p>{preview.supportedPath.statement}</p>
        <PreviewSources sources={preview.supportedPath.sources} />
      </section>

      <section className="task-spec-preview-section">
        <h3>Required promises</h3>
        <ul className="task-spec-preview-list">
          {preview.criteria.map((criterion) => (
            <li key={criterion.id}>
              <p><strong>{criterion.id} — required promise</strong></p>
              <p>{criterion.promise}</p>
              <p className="small muted">{previewJudge(criterion.judge)}. If this promise fails: {criterion.failure}</p>
              <p className="small muted">Evidence must show: {criterion.evidence.proves}</p>
              <p className="small muted">Evidence comes from {previewEvidenceMode(criterion.evidence.mode)}.</p>
              {criterion.evidence.precondition !== null ? (
                <p className="small muted">Needed first: {criterion.evidence.precondition}</p>
              ) : null}
              <PreviewSources sources={criterion.sources} />
            </li>
          ))}
        </ul>
      </section>

      <section className="task-spec-preview-section">
        <h3>Preferences</h3>
        {preview.preferences.length === 0 ? (
          <p className="small muted">No advisory preferences were added.</p>
        ) : (
          <ul className="task-spec-preview-list">
            {preview.preferences.map((preference) => (
              <li key={preference.id}>
                <p><strong>{preference.id} — advisory preference, not a DONE gate</strong></p>
                <p>{preference.dimension}: {preference.desiredDirection}</p>
                <PreviewSources sources={preference.sources} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="task-spec-preview-section">
        <h3>References</h3>
        {preview.references.length === 0 ? (
          <p className="small muted">No frozen reference is part of this plan.</p>
        ) : (
          <ul className="task-spec-preview-list">
            {preview.references.map((reference, index) => (
              <li key={index}>
                <p><strong>{reference.title}</strong></p>
                <p className="small muted">Source: {reference.source}</p>
                <p>Compare only: {reference.dimensions.join("; ")}</p>
                <p className="small muted">Keep original: {reference.antiCopyBoundary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="task-spec-preview-section">
        <h3>Questions still unresolved</h3>
        {preview.unknowns.length === 0 ? (
          <p className="small muted">None.</p>
        ) : (
          <ul className="task-spec-preview-list">
            {preview.unknowns.map((unknown, index) => (
              <li key={index}>
                <p>{unknown.text}</p>
                <PreviewSources sources={unknown.sources} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="task-spec-preview-section">
        <h3>Independent critic</h3>
        <p><strong>{criticMode}</strong> — {preview.critic.reason}</p>
        <PreviewSources sources={preview.critic.sources} />
      </section>

      <section className="task-spec-preview-section">
        <h3>Whole-run limits</h3>
        <ul className="task-spec-preview-list">
          <li>{budget.initialBuilderCalls} initial builder call; at most {budget.maxRepairCalls} repair call.</li>
          <li>At most {budget.maxCriticAttempts} independent critic attempts and {budget.maxExternalEvidenceCalls} external evidence calls.</li>
          <li>Each builder or repair call: at most {previewMinutes(budget.maxBuilderElapsedMs)} and {previewBytes(budget.maxBuilderCapturedOutputBytes)}.</li>
          <li>Each critic attempt: at most {previewMinutes(budget.maxCriticElapsedMs)} and {previewBytes(budget.maxCriticCapturedOutputBytes)}.</li>
          <li>{budget.enforceableDollarLimitCents === null
            ? "No enforceable dollar cap is available; each paid call still needs its own approval."
            : `Enforceable dollar cap: ${budget.enforceableDollarLimitCents} cents.`}</li>
        </ul>
      </section>
    </section>
  );
}

function evidenceList(title: string, rows: readonly TaskReviewEvidenceViewV1[]) {
  if (rows.length === 0) return null;
  return (
    <div className="task-review-evidence">
      <p className="small muted">{title}</p>
      <ul>{rows.map((row, index) => <li key={`${index}-${row.label}`}>{row.label}</li>)}</ul>
    </div>
  );
}

function stateLabel(state: TaskReviewProjectionV1["criteria"][number]["state"]): string {
  if (state === "pending") return "Evidence has not answered this promise yet";
  if (state === "waiting-owner") return "Waiting for your decision";
  if (state === "met") return "Evidence says this promise is met";
  if (state === "not-met") return "Evidence says this promise is not met";
  return "The evidence cannot tell";
}

export type TaskReviewActionChoice = TaskReviewActionRequest["action"];

/**
 * Shared by Chat and manual Task Run. A callback receives only the opaque
 * action id plus the closed choice; it never receives cN/finding/evidence or
 * any Main-owned authority object.
 */
export function TaskReviewView({ review, heading = "Accepted Task Spec and evidence", onAction }: {
  review: TaskReviewProjectionV1;
  heading?: string;
  onAction?: (actionId: string, action: TaskReviewActionChoice) => void;
}) {
  return (
    <>
      <TaskSpecProposalPreviewView preview={review.plan} heading={heading} />
      <section className="card task-review-state" aria-label="Criterion evidence and owner checks">
        <h2 className="card-title">Criterion evidence and owner checks</h2>
        <p className="small muted">These are pre-seal evidence records, not Cairn&apos;s DONE/STOPPED result and not your final verdict.</p>
        <ul className="task-spec-preview-list">
          {review.criteria.map((criterion) => (
            <li key={criterion.id}>
              <p><strong>{criterion.id}: {stateLabel(criterion.state)}</strong></p>
              <p className="small muted">Source: {criterion.source ?? "none yet"}</p>
              {evidenceList("Supporting evidence shown", criterion.supportingEvidence)}
              {evidenceList("Counterevidence shown", criterion.counterEvidence)}
              {criterion.ownerChecks.map((check, index) => check.kind === "owner-observation" ? (
                <div key={`owner-${index}`} className="task-review-owner-check">
                  <p><strong>Your observation: {check.status === "not-ready" ? "not ready until an exact candidate and evidence exist" : check.status}</strong></p>
                  {evidenceList("Evidence this choice covers", check.supportingEvidence)}
                  {evidenceList("Counterevidence this choice covers", check.counterEvidence)}
                  {check.action && onAction ? (
                    <div className="row">
                      <Pill onClick={() => onAction(check.action!.actionId, { kind: "observe", decision: "met" })}>I see it working</Pill>
                      <Pill onClick={() => onAction(check.action!.actionId, { kind: "observe", decision: "not-met" })}>I see it failing</Pill>
                      <Pill kind="quiet" onClick={() => onAction(check.action!.actionId, { kind: "observe", decision: "cant-tell" })}>I can&apos;t tell</Pill>
                    </div>
                  ) : null}
                </div>
              ) : check.kind === "cairn-failure" ? (
                <div key={`cairn-${index}`} className="task-review-owner-check">
                  <p><strong>Cairn check failure — {check.status === "not-ready"
                    ? "finish the other owner checks first"
                    : check.status === "awaiting-confirmation" ? "waiting for your review" : check.status}</strong></p>
                  <p className="small muted">Cairn cannot request a repair unless you confirm this exact failed check. Confirming it does not approve a repair; Cairn will show a separate exact repair approval next.</p>
                  {evidenceList("Failed-check evidence shown", check.supportingEvidence)}
                  {evidenceList("Counterevidence shown", check.counterEvidence)}
                  {check.action && onAction ? (
                    <div className="row">
                      <Pill onClick={() => onAction(check.action!.actionId, {
                        kind: "review-cairn-failure", decision: "confirmed",
                      })}>{"Confirm Cairn's failed check"}</Pill>
                      <Pill onClick={() => onAction(check.action!.actionId, {
                        kind: "review-cairn-failure", decision: "dismissed",
                      })}>Dismiss and stop</Pill>
                      <Pill kind="quiet" onClick={() => onAction(check.action!.actionId, {
                        kind: "review-cairn-failure", decision: "cant-tell",
                      })}>I can&apos;t tell — stop</Pill>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div key={`critic-${index}`} className="task-review-owner-check">
                  <p><strong>Critic allegation — {check.status}</strong></p>
                  <p>{check.allegation}</p>
                  <p className="small muted">{check.smallestRepair === null
                    ? "No smallest repair was supplied."
                    : `Smallest suggested repair: ${check.smallestRepair}`}</p>
                  <p className="small muted">This is an allegation only; it cannot block the task unless you confirm this exact evidence.</p>
                  {evidenceList("Supporting evidence shown", check.supportingEvidence)}
                  {evidenceList("Counterevidence shown", check.counterEvidence)}
                  {check.action && onAction ? (
                    <div className="row">
                      <Pill onClick={() => onAction(check.action!.actionId, { kind: "resolve", decision: "confirmed" })}>Confirm this failure</Pill>
                      <Pill onClick={() => onAction(check.action!.actionId, { kind: "resolve", decision: "dismissed" })}>Dismiss this allegation</Pill>
                      <Pill kind="quiet" onClick={() => onAction(check.action!.actionId, { kind: "resolve", decision: "cant-tell" })}>I can&apos;t tell</Pill>
                    </div>
                  ) : null}
                </div>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
