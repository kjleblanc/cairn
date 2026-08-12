import type {
  Q9HarnessRevisionActionV1,
  Q9HarnessRevisionDecisionRequest,
  Q9HarnessRevisionDisclosureV1,
} from "../../shared/harness-revision";

const LABELS: Readonly<Record<Q9HarnessRevisionActionV1, string>> = Object.freeze({
  "approve-revision": "Use this narrow harness correction",
  "stop-task": "Keep the original plan and stop",
});

const STYLES: Readonly<Record<Q9HarnessRevisionActionV1, string>> = Object.freeze({
  "approve-revision": "pill pill-primary",
  "stop-task": "pill pill-danger",
});

/** Owner-facing output for the one guarded pre-assertion harness correction.
 * It echoes only Main's disclosure and a closed action; no command, plan, or
 * revision authority is constructed in the renderer. */
export function HarnessRevisionCard({ dir, revision, busy = false, onDecide }: {
  dir: string;
  revision: Q9HarnessRevisionDisclosureV1;
  busy?: boolean;
  onDecide?: (request: Q9HarnessRevisionDecisionRequest) => void;
}) {
  const decide = (action: Q9HarnessRevisionActionV1) => onDecide?.(Object.freeze({
    dir,
    approvalId: revision.approvalId,
    action,
    disclosure: revision,
  }));

  return (
    <section className="critic-call harness-revision" aria-label="Evidence harness correction">
      <h3 className="critic-call-title">Evidence harness stopped before its assertion</h3>
      <p>{revision.purpose}</p>
      <dl className="critic-call-route">
        <div><dt>Task</dt><dd>{revision.taskNumber}</dd></div>
        <div><dt>Original check</dt><dd className="mono">{revision.criterionId}</dd></div>
        <div><dt>Failure</dt><dd>{revision.failureCode} (exit {revision.exitCode})</dd></div>
        <div><dt>Mechanical change</dt><dd>{revision.changeKind}: {revision.originalTimeoutMs / 1000}s â†’ {revision.revisedTimeoutMs / 1000}s</dd></div>
      </dl>
      <p><strong>Captured failed output:</strong></p>
      <pre>{revision.boundedOutput}</pre>
      <dl className="critic-call-route" aria-label="Exact harness identities">
        <div><dt>Output SHA-256</dt><dd className="mono">{revision.outputSha256}</dd></div>
        <div><dt>Failure SHA-256</dt><dd className="mono">{revision.failureSha256}</dd></div>
        <div><dt>Evidence reference</dt><dd className="mono">{revision.evidenceRef}</dd></div>
        <div><dt>Task Spec SHA-256</dt><dd className="mono">{revision.taskSpecSha256}</dd></div>
        <div><dt>Evidence Plan revision 0</dt><dd className="mono">{revision.fromEvidencePlanSha256}</dd></div>
        <div><dt>Evidence Plan revision 1</dt><dd className="mono">{revision.toEvidencePlanSha256}</dd></div>
      </dl>
      <p><strong>Data:</strong> {revision.dataScope}</p>
      <p><strong>Billing:</strong> {revision.billingBasis}</p>
      {onDecide ? (
        <div className="critic-call-actions">
          {revision.actions.map((action) => (
            <button key={action} type="button" className={STYLES[action]} disabled={busy} onClick={() => decide(action)}>
              {LABELS[action]}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
