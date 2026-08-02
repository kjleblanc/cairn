import type { TownEntity, TownRelationship } from "../town/model";

export function TownDetail({
  selection,
  onOpenRun,
}: {
  selection: TownEntity | TownRelationship;
  onOpenRun: () => void;
}) {
  if (selection.kind === "worker") {
    return (
      <aside className="town-detail" aria-label={`${selection.name} details`} onClick={(event) => event.stopPropagation()}>
        <div className="town-detail-heading">
          <div>
            <span className="town-detail-kicker">{selection.state === "returned" ? "Worker handoff" : "Live worker"}</span>
            <h3>{selection.name}</h3>
          </div>
          <span className={`town-state-shape town-state-${selection.state}`}>{selection.state === "returned" ? "result sent" : "working"}</span>
        </div>
        <dl>
          <div><dt>Role</dt><dd>{selection.role}</dd></div>
          <div><dt>Current task</dt><dd>{selection.currentTask}</dd></div>
          <div><dt>Latest activity</dt><dd>{selection.latestActivity}</dd></div>
        </dl>
        <button type="button" className="town-detail-action" onClick={onOpenRun}>View run activity</button>
      </aside>
    );
  }

  if (selection.kind === "task") {
    return (
      <aside className="town-detail" aria-label="Task thread details" onClick={(event) => event.stopPropagation()}>
        <div className="town-detail-heading">
          <div>
            <span className="town-detail-kicker">Live relationship</span>
            <h3>Task thread</h3>
          </div>
          <span className="town-thread-key" aria-hidden="true">↝</span>
        </div>
        <dl>
          <div><dt>Task</dt><dd>{selection.task}</dd></div>
          <div><dt>Connection</dt><dd>{selection.summary}</dd></div>
        </dl>
        <button type="button" className="town-detail-action" onClick={onOpenRun}>View run activity</button>
      </aside>
    );
  }

  if (selection.kind === "overflow") {
    return (
      <aside className="town-detail" aria-label="Additional workers" onClick={(event) => event.stopPropagation()}>
        <div className="town-detail-heading">
          <div>
            <span className="town-detail-kicker">Beyond the visible ring</span>
            <h3>{selection.name}</h3>
          </div>
          <span className="town-state-shape town-state-more">{selection.count}</span>
        </div>
        <ul className="town-overflow-list">
          {selection.workers.map((worker) => <li key={worker.id}><strong>{worker.name}</strong><span>{worker.currentTask}</span></li>)}
        </ul>
      </aside>
    );
  }

  return (
    <aside className="town-detail" aria-label="Cairn details" onClick={(event) => event.stopPropagation()}>
      <div className="town-detail-heading">
        <div>
          <span className="town-detail-kicker">Project conductor</span>
          <h3>Cairn</h3>
        </div>
        <span className={`town-state-shape town-state-${selection.state}`}>{selection.state}</span>
      </div>
      <p>Cairn holds the active project context. Selecting Cairn returns focus to the conversation.</p>
    </aside>
  );
}
