import type { CriticCallActionV1, CriticCallDisclosureV1 } from "../../shared/critic-call";
import { CRITIC_CALL_CREDENTIAL_TEXT } from "../../shared/critic-call";

/**
 * What the owner reads before one Independent-critic call.
 *
 * Every claim about what would be sent comes from main's card. This component
 * chooses no wording of its own for that, adds no default, and offers only the
 * presses the card itself lists — so a mode that offers no stop cannot grow
 * one here.
 */

const ACTION_LABELS: Readonly<Record<CriticCallActionV1, string>> = Object.freeze({
  "approve": "Approve this critic call",
  "stop-task": "Stop this task",
  "continue-without-critic": "Continue without critic",
});

/** The one destructive press gets the destructive style. */
const ACTION_STYLES: Readonly<Record<CriticCallActionV1, string>> = Object.freeze({
  "approve": "pill pill-primary",
  "stop-task": "pill pill-danger",
  "continue-without-critic": "pill pill-quiet",
});

/** Fixed locale. A disclosure that reads "32.000 characters" to one owner and
 * "32,000" to another is a disclosure that misstates what would be sent. */
function count(value: number): string {
  return value.toLocaleString("en-US");
}

/** Exact, never rounded: a stated limit the call could not run under, or one
 * larger than the real ceiling, is a false limit. */
function duration(ms: number): string {
  if (ms % 60_000 === 0) return `${count(ms / 60_000)} min`;
  if (ms % 1_000 === 0) return `${count(ms / 1_000)} s`;
  return `${count(ms)} ms`;
}

export function CriticCallCard({ call, busy = false, onDecide }: {
  call: CriticCallDisclosureV1;
  busy?: boolean;
  onDecide?: (action: CriticCallActionV1) => void;
}) {
  const metadata = call.planMetadata;
  return (
    <section className="critic-call" aria-label="Independent critic call">
      <h3 className="critic-call-title">
        Independent critic — paid call {count(call.attempt)} of at most {count(call.attemptCap)}
      </h3>

      <dl className="critic-call-route">
        <div><dt>Provider</dt><dd>{call.provider}</dd></div>
        <div><dt>Endpoint</dt><dd className="mono">{call.baseUrl}</dd></div>
        <div>
          <dt>Model</dt>
          <dd className="mono">
            {call.configuredModel === call.resolvedModel
              ? call.resolvedModel
              : `${call.configuredModel} → ${call.resolvedModel}`}
            {" "}({call.resolvedModelRevision})
          </dd>
        </div>
        <div><dt>Consent</dt><dd className="mono">{call.connectionConsentVersion}</dd></div>
        <div><dt>Call fingerprint</dt><dd className="mono critic-call-fingerprint">{call.routeRequestFingerprintSha256}</dd></div>
      </dl>

      <p className="critic-call-sends">
        <strong>Sends {count(call.selectedFiles)} of at most {count(call.fileCap)} tracked text files</strong>
        {" — "}{count(call.selectedCharacters)} of at most {count(call.totalCharacterCap)} characters,
        and no more than {count(call.perFileCharacterCap)} from any one file.
      </p>
      {call.selectedFiles === 0 ? (
        <p className="critic-call-empty">No file contents are included in this call.</p>
      ) : (
        <ul className="critic-call-files">
          {call.selection.map((file) => (
            <li key={file.path}>
              <span className="mono critic-call-file">{file.path}</span>
              <span className="critic-call-count">{count(file.characters)} characters</span>
              <span className="mono critic-call-hash">{file.sha256}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="critic-call-plan">
        <strong>Also sends this task&apos;s plan and check metadata</strong>, with no paths in it:
        {" "}{count(metadata.checks)} checks, {count(metadata.preferences)} preferences,
        {" "}{count(metadata.references)} references, {count(metadata.evidenceItems)} evidence items,
        {" "}{count(metadata.priorFindings)} earlier findings, {count(metadata.comparisonTrials)} comparison trials.
      </p>
      <p className="critic-call-total">
        <strong>Whole request:</strong> {count(call.totalRequestCharacters)} characters, file contents included.
      </p>

      <p className="critic-call-notsent">
        <strong>Not sent:</strong> {call.notSent.join(", ")}.
      </p>
      <p className="critic-call-key">{CRITIC_CALL_CREDENTIAL_TEXT}</p>
      <p className="critic-call-purpose">{call.purpose}</p>
      <p className="critic-call-limit">
        <strong>Limit:</strong> one request, {duration(call.timeoutMs)},
        {" "}{count(call.maxOutputCharacters)} characters of captured answer.
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
              onClick={() => onDecide(action)}
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
