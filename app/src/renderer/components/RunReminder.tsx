export interface SerialRunStatus { outcome: string; phase: "route" | "run" | "check" | "result" }

export function RunReminder({ status, onReturn }: { status: SerialRunStatus; onReturn: () => void }) {
  return (
    <button type="button" className="run-reminder" onClick={onReturn}>
      <span>One serial task is at {status.phase}: {status.outcome}</span>
      <span className="run-reminder-go">Return to the task →</span>
    </button>
  );
}
