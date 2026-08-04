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
  return (
    <section className="card task-card">
      <h2 className="task-card-heading" ref={headingRef} tabIndex={-1}>Review this task</h2>
      <TaskIntentList request={action.request} context={action.context} heading="What Cairn proposes" />
      {action.risks.length > 0 ? (
        <section className="task-card-risks" aria-labelledby={`task-risks-${action.actionId}`}>
          <h3 id={`task-risks-${action.actionId}`}>Risks to decide first</h3>
          <ul>
            {action.risks.map((risk) => (
              <li className="task-risk" key={risk.riskId}>
                <p>{risk.text}</p>
                <Pill kind="quiet" disabled={busy || !current}
                  onClick={() => void onSetAside(risk)}>Set aside</Pill>
              </li>
            ))}
          </ul>
          <p className="small muted">Any response retires this proposal. Cairn will show a fresh review before anything can start.</p>
        </section>
      ) : null}
      <div className="row task-card-actions">
        <Pill kind="primary" disabled={busy || !current || action.risks.length > 0} onClick={onSend}>
          Review dispatch
        </Pill>
      </div>
    </section>
  );
}
