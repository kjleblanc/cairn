import type { WizardStatus } from "../screens/Wizard";

export interface TaskDeckItem {
  sessionId: number;
  status: WizardStatus;
  project: string;
}

const pad = (n: number) => String(n).padStart(3, "0");

function phaseText(status: WizardStatus): string {
  if (/^PARALLEL_/.test(status.blocker ?? "")) return `refused — not queued · ${status.blocker}`;
  if (status.waitingReason) return status.waitingReason;
  if (status.waiting) return "Waiting for the owner";
  if (status.phase === "integrating") return "Serialized integration in progress";
  if (["defining", "building", "reviewing"].includes(status.phase)) return `${status.phase} — active now`;
  return `${status.phase} — ready for the owner`;
}

export function TaskDeck({ items, activeSessionId, onReturn }: {
  items: TaskDeckItem[];
  activeSessionId: number | null;
  onReturn: (sessionId: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="task-deck" aria-label="Parallel Draft tasks">
      <div className="task-deck-title">
        <strong>Parallel Draft — not active by default</strong>
        <span>up to two isolated Standard/Draft tasks</span>
      </div>
      <div className="task-deck-grid">
        {items.map(({ sessionId, status, project }) => (
          <button
            type="button"
            className={`task-deck-card${activeSessionId === sessionId ? " task-deck-card-active" : ""}`}
            key={sessionId}
            onClick={() => onReturn(sessionId)}
          >
            <span className="task-deck-card-head">
              <strong>{status.taskNumber > 0 ? `Task ${pad(status.taskNumber)}` : "New task"}</strong>
              <span>{project}</span>
            </span>
            <span>{phaseText(status)}</span>
            {status.branch ? <span className="mono small">{status.branch}</span> : null}
            {status.worktree ? <span className="mono small task-deck-path">{status.worktree}</span> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
