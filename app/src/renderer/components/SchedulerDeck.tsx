import type { SchedulerPhase, SchedulerSummary } from "@cairn/core";

const PHASES: SchedulerPhase[] = ["Planning", "Building", "Waiting", "Checking", "Done", "Needs attention"];

export type SchedulerHistory = { taskNumber: number; phase: SchedulerPhase };

export function SchedulerDeck({ summary, history = [], attentionMessage = "" }: {
  summary: SchedulerSummary | null;
  history?: SchedulerHistory[];
  attentionMessage?: string;
}) {
  return (
    <section className="scheduler-deck" aria-label="Two-task scheduler">
      <div className="scheduler-legend" aria-label="Scheduler states">
        {PHASES.map((phase) => <span className={`scheduler-phase scheduler-phase-${phase.toLowerCase().replace(/\s/g, "-")}`} key={phase}>{phase}</span>)}
      </div>

      {attentionMessage ? (
        <article className="scheduler-card scheduler-card-attention" data-testid="scheduler-needs-attention">
          <div className="scheduler-card-head"><strong>Batch</strong><span>Needs attention</span></div>
          <p>{attentionMessage}</p>
        </article>
      ) : null}

      {summary ? (
        <div className="scheduler-grid">
          {summary.tasks.map((task) => {
            const seen = history.filter((item) => item.taskNumber === task.taskNumber).map((item) => item.phase);
            return (
              <article className={`scheduler-card scheduler-card-${task.phase.toLowerCase().replace(/\s/g, "-")}`} data-testid={`scheduler-task-${String(task.taskNumber).padStart(3, "0")}`} key={task.taskNumber}>
                <div className="scheduler-card-head">
                  <strong>Task {String(task.taskNumber).padStart(3, "0")}</strong>
                  <span data-testid={`scheduler-phase-${String(task.taskNumber).padStart(3, "0")}`}>{task.phase}</span>
                </div>
                <p>{task.outcome}</p>
                {task.waitingReason ? <p className="small scheduler-reason"><strong>Why it is waiting:</strong> {task.waitingReason}</p> : null}
                {task.attention ? <p className="small scheduler-reason"><strong>What needs attention:</strong> {task.attention}</p> : null}
                {task.implementationPaths.length || task.testPaths.length ? (
                  <p className="small mono scheduler-paths">{[...task.implementationPaths, ...task.testPaths].join(" · ")}</p>
                ) : null}
                {seen.length ? <p className="small muted" data-testid={`scheduler-history-${String(task.taskNumber).padStart(3, "0")}`}>Seen: {seen.join(" → ")}</p> : null}
              </article>
            );
          })}
        </div>
      ) : attentionMessage ? null : <p className="muted">No scheduler batch has started.</p>}

      {summary ? (
        <p className="small muted scheduler-metrics">
          Sessions: {summary.sessionCount} · most active engines: {summary.maximumActiveEngines} · Checking lease: {summary.integrationActive === null ? "free" : `Task ${String(summary.integrationActive).padStart(3, "0")}`}
        </p>
      ) : null}
    </section>
  );
}
