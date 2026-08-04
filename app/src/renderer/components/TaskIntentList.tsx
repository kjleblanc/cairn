import { useId } from "react";
import type { TaskRequestRow, TaskRequestView } from "@cairn/core";

const SOURCE_LABELS: Readonly<Record<TaskRequestRow["source"], string>> = {
  "owner-stated": "You said so",
  "owner-unsure": "You weren’t sure",
  "cairn-chosen": "Cairn chose",
};

function IntentRow({ row, role }: { row: TaskRequestRow; role: "Outcome" | "Requirement" }) {
  return (
    <li className={`task-intent-row task-intent-${row.source}`}>
      <p className="small muted task-intent-role">{role}</p>
      <p className="task-intent-source">{SOURCE_LABELS[row.source]}</p>
      <p className="task-intent-interpretation">{row.text}</p>
      {row.ownerText !== null ? (
        <div className="task-intent-owner-quote">
          <p className="small muted">Your exact words</p>
          <blockquote>{row.ownerText}</blockquote>
        </div>
      ) : null}
    </li>
  );
}

/** The output-only request view shared by proposals, final confirmation, and
 * result cards. Source labels are fixed here so every surface says the same
 * thing without asking color to carry provenance. Context is deliberately a
 * separate, untagged list: it travels with a task but is not a requirement. */
export function TaskIntentList({ request, context, heading = "What you asked for" }: {
  request: TaskRequestView;
  context?: readonly string[];
  heading?: string;
}) {
  const headingId = useId();

  return (
    <section className="task-intent" aria-labelledby={headingId}>
      <h2 className="task-intent-heading" id={headingId}>{heading}</h2>
      <ul className="task-intent-list">
        <IntentRow row={request.outcome} role="Outcome" />
        {request.requirements.map((requirement, index) => (
          <IntentRow key={`${requirement.source}-${index}`} row={requirement} role="Requirement" />
        ))}
      </ul>
      {context && context.length > 0 ? (
        <section className="task-intent-context">
          <h3>Context kept with the task — not a requirement</h3>
          <ul>
            {context.map((note, index) => <li key={index}>{note}</li>)}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
