import {
  type RepairCallActionV1,
  type RepairCallDecisionRequest,
  type RepairCallDisclosureV1,
} from "../../shared/repair-call";

const ACTION_LABELS: Readonly<Record<RepairCallActionV1, string>> = Object.freeze({
  approve: "Approve this repair call",
  "stop-task": "Stop this task",
});

const ACTION_STYLES: Readonly<Record<RepairCallActionV1, string>> = Object.freeze({
  approve: "pill pill-primary",
  "stop-task": "pill pill-danger",
});

function count(value: number): string {
  return value.toLocaleString("en-US");
}

function duration(ms: number): string {
  if (ms % 60_000 === 0) return `${count(ms / 60_000)} min`;
  if (ms % 1_000 === 0) return `${count(ms / 1_000)} s`;
  return `${count(ms)} ms`;
}

/** The exact owner-facing gate for one bounded Builder repair. The callback
 * receives only the opaque id, a closed action, and this output-only echo. */
export function RepairCallCard({ dir, call, busy = false, onDecide }: {
  dir: string;
  call: RepairCallDisclosureV1;
  busy?: boolean;
  onDecide?: (request: RepairCallDecisionRequest) => void;
}) {
  const decide = (action: RepairCallActionV1) => onDecide?.(Object.freeze({
    dir,
    approvalId: call.approvalId,
    action,
    disclosure: call,
  }));

  return (
    <section className="critic-call repair-call" aria-label="Builder repair call">
      <h3 className="critic-call-title">
        Builder repair — call {count(call.attempt)} of {count(call.attemptCap)}
      </h3>

      <dl className="critic-call-route">
        <div><dt>Provider</dt><dd>{call.provider}</dd></div>
        <div><dt>Model</dt><dd className="mono">{call.model}</dd></div>
        <div><dt>Task</dt><dd>{count(call.taskNumber)}</dd></div>
        <div><dt>Candidate round</dt><dd>{count(call.round)}</dd></div>
      </dl>

      <p className="critic-call-purpose">{call.purpose}</p>
      <p><strong>Data:</strong> {call.dataScope}</p>
      <p><strong>Quota:</strong> {call.quota}</p>

      <section aria-label="Frozen repair authority">
        <h4>Confirmed blockers</h4>
        {call.blockers.map((blocker) => (
          <article key={blocker.criterionId}>
            <h4 className="mono">{blocker.criterionId}</h4>
            <p><strong>Frozen promise:</strong> {blocker.promise}</p>
            <p>
              <strong>Frozen failure condition ({blocker.failureConditionId}):</strong>
              {" "}{blocker.failureCondition}
            </p>
            <p>
              <strong>Confirmed by:</strong> {blocker.source}{" "}
              (<span className="mono">{blocker.sourceSha256}</span>)
            </p>
            <p>
              <strong>Permitted typed evidence artifact IDs:</strong>{" "}
              {blocker.artifacts.map((artifact) => `${artifact.kind}:${artifact.id}`).join(", ")}
            </p>
          </article>
        ))}
      </section>

      <dl className="critic-call-route" aria-label="Exact repair identities">
        <div><dt>Task Spec SHA-256</dt><dd className="mono">{call.taskSpecSha256}</dd></div>
        <div><dt>Evidence Plan SHA-256</dt><dd className="mono">{call.evidencePlanSha256}</dd></div>
        <div><dt>Candidate SHA-256</dt><dd className="mono">{call.candidateSha256}</dd></div>
        <div><dt>Repair instruction SHA-256</dt><dd className="mono">{call.repairInstructionSha256}</dd></div>
        <div><dt>Repair preview SHA-256</dt><dd className="mono">{call.repairPreviewSha256}</dd></div>
        <div><dt>Blocker authority SHA-256</dt><dd className="mono">{call.blockerAuthoritySha256}</dd></div>
        <div><dt>Route receipt SHA-256</dt><dd className="mono">{call.routeReceiptSha256}</dd></div>
        <div><dt>Route fingerprint SHA-256</dt><dd className="mono">{call.routeRequestFingerprintSha256}</dd></div>
      </dl>

      <p className="critic-call-limit">
        <strong>Limit:</strong> one request, {duration(call.timeoutMs)},
        {" "}{count(call.maxCapturedOutputBytes)} bytes of captured output.
      </p>
      <p className="critic-call-billing"><strong>Billing:</strong> {call.billingBasis}</p>

      {onDecide ? (
        <div className="critic-call-actions">
          {call.actions.map((action) => (
            <button
              key={action}
              type="button"
              className={ACTION_STYLES[action]}
              disabled={busy}
              onClick={() => decide(action)}
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
