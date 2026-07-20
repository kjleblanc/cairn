import type { WizardStatus } from "../screens/Wizard";
import type { ConcurrentRunState } from "@cairn/core";

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

/** Read-only: a bounded run is started and recovered only by the exact CLI commands. */
export function BoundedTaskDeck({ state }: { state: ConcurrentRunState }) {
  return (
    <section className="task-deck" aria-label="Bounded Final tasks">
      <div className="task-deck-title">
        <strong>Bounded Final · read-only observation</strong>
        <span>closed batch · integration order {state.integrationOrder.map((task) => pad(task)).join(" → ") || "pending"}</span>
      </div>
      <div className="task-deck-grid">
        {state.tasks.map((taskState) => {
          const manifest = state.manifest.tasks.find((task) => task.taskNumber === taskState.taskNumber);
          return (
            <div className="task-deck-card" key={taskState.taskNumber} data-testid={`bounded-task-${pad(taskState.taskNumber)}`}>
              <span className="task-deck-card-head"><strong>Task {pad(taskState.taskNumber)}</strong><span>{taskState.phase}</span></span>
              <span>call {taskState.callConsumed ? "consumed" : "unused"} · checks {taskState.checksPassed ? "passed" : "pending"}</span>
              {taskState.blocker ? <span>STOPPED · {taskState.blocker}</span> : null}
              <span className="mono small">write: {manifest?.writablePaths.join(", ")}</span>
              <span className="mono small">test: {manifest?.testPaths.join(", ")}</span>
            </div>
          );
        })}
      </div>
      <p className="small mono">Recovery only: cairn concurrent recover --run {state.runId}</p>
      <p className="small muted">Desktop cannot build, retry, integrate, call a provider, or change this run.</p>
    </section>
  );
}
