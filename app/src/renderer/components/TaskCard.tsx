import type { Ref } from "react";
import type { ConductorAction } from "../../shared/ipc";
import { Pill } from "./Ui";
import { TaskIntentList } from "./TaskIntentList";

type TaskAction = Extract<ConductorAction, { kind: "task" }>;
type TaskRisk = TaskAction["risks"][number];

/** A pure view of main's one current proposed task. The renderer keeps no
 * resolved-risk or accepted-request copy: responding retires this whole
 * action, and only main's replacement action can make another card appear. */
export function TaskCard({ action, busy, current, onSetAside, onSend, headingRef }: {
  action: TaskAction;
  busy: boolean;
  current: boolean;
  onSetAside: (risk: TaskRisk) => boolean | Promise<boolean>;
  onSend: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const heading = action.risks.length === 0
    ? "Ready to review"
    : action.risks.length === 1
      ? "One thing needs your call"
      : `${action.risks.length} things need your call`;

  return (
    <section className="card task-card">
      <h2 className="task-card-heading" ref={headingRef} tabIndex={-1}>{heading}</h2>
      <p className="task-card-outcome">{action.request.outcome.text}</p>
      {action.risks.length > 0 ? (
        <ul className="task-card-risks" aria-label="Concerns to decide">
          {action.risks.map((risk) => (
            <li className="task-risk" key={risk.riskId}>
              <p>{risk.text}</p>
              <Pill kind="quiet" disabled={busy || !current}
                onClick={() => void onSetAside(risk)}>Set aside</Pill>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="row task-card-actions">
        <button type="button" className="pill pill-primary"
          disabled={busy || !current || action.risks.length > 0} onClick={onSend}>Review</button>
      </div>
      <details className="task-card-details">
        <summary>Details</summary>
        <TaskIntentList request={action.request} context={action.context} heading="Task details" />
      </details>
    </section>
  );
}
