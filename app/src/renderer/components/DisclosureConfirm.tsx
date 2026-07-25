import type { WorkerDisclosure } from "@cairn/core";

/** The six facts the owner reads before one real, paid model call, plus the
 * confirm box that unlocks it. Both places a run can start — the task screen
 * and the inline dispatch panel in chat — render THIS component, so the bytes
 * the owner confirms are the same bytes in both, and neither can drift.
 *
 * Every field comes verbatim from the routed adapter's own disclosure seam.
 * `task` carries the outcome and the owner's details concatenated by core, so
 * it can be several lines; `.disclosure-task` keeps those line breaks visible
 * instead of collapsing what was confirmed into one run-on line. */
export function DisclosureConfirm({ disclosure, label, confirmed, onConfirmedChange }: {
  disclosure: WorkerDisclosure;
  label: string;
  confirmed: boolean;
  onConfirmedChange: (next: boolean) => void;
}) {
  return (
    <>
      <p>This confirmation applies only to this task.</p>
      <div className="route-facts">
        <p><span>Provider</span><strong>{disclosure.provider}</strong></p>
        <p><span>Model</span><strong>{disclosure.model}</strong></p>
        <p><span>Target project</span><strong className="mono">{disclosure.project}</strong></p>
        <p><span>Task</span><strong className="disclosure-task">{disclosure.task}</strong></p>
      </div>
      <p><strong>Data sent or readable:</strong> {disclosure.data}</p>
      <p><strong>Cost/quota boundary:</strong> {disclosure.quota}</p>
      <label className="row" style={{ marginTop: 12 }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirmedChange(event.target.checked)}
        />
        <span>{`I confirm this one real ${label} call.`}</span>
      </label>
    </>
  );
}
