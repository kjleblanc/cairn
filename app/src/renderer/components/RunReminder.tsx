import type { WizardStatus } from "../screens/Wizard";

const pad = (n: number) => String(n).padStart(3, "0");

/**
 * Task 009: while a task walk is open behind other screens, one plain sentence
 * says what it is doing — and one click returns to it, exactly where it stands.
 * The running agent lives in the app's engine room; this banner only reports.
 */
function describe(s: WizardStatus): { tone: "waiting" | "working" | "ready"; text: string } {
  const task = s.taskNumber > 0 ? `Task ${pad(s.taskNumber)}` : "Your task";
  if (s.waiting) {
    const it = s.taskNumber > 0 ? `task ${pad(s.taskNumber)}` : "the run";
    return { tone: "waiting", text: `The AI is waiting on a question for you — ${it} is paused until you answer or skip.` };
  }
  switch (s.phase) {
    case "defining":
      return { tone: "working", text: "The brief is still being written — the AI keeps working while you look around." };
    case "building":
      return { tone: "working", text: `${task} is still building — the AI keeps working while you look around.` };
    case "reviewing":
      return { tone: "working", text: `${task} is still being reviewed — fresh eyes are on it.` };
    case "approve":
      return { tone: "ready", text: `${task} has a brief ready for you to read.` };
    case "report":
      return { tone: "ready", text: `${task} has finished building — the result is ready.` };
    case "verdict":
      return { tone: "ready", text: `${task} has a reviewer's verdict ready.` };
    case "decide":
      return { tone: "ready", text: `${task} is waiting for your decision.` };
    case "outcome":
      return { tone: "ready", text: `${task} is still open.` };
  }
}

export function RunReminder({ status, projectNote, onReturn }: {
  status: WizardStatus; projectNote: string | null; onReturn: () => void;
}) {
  const { tone, text } = describe(status);
  return (
    <button type="button" className={`run-reminder run-reminder-${tone}`} onClick={onReturn}>
      <span>{text}{projectNote ? ` (project: ${projectNote})` : ""}</span>
      <span className="run-reminder-go">Return to the task →</span>
    </button>
  );
}
