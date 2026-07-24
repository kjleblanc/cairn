import { useState } from "react";
import type { TaskBlock, TaskBlockConcern } from "../../shared/ipc";
import { Pill } from "./Ui";

type Resolution = "answered" | "set-aside";

/** The proposed-task card: the outcome sentence plus one chip per concern.
 * A question chip's one-line answer and a risk chip's "Set aside" both go
 * back to `Chat` as callbacks — `Chat` turns them into ordinary owner
 * messages, so the conversation log stays the single record of what was
 * asked and decided. "Send to dispatch" stays disabled until every chip
 * here is resolved one way or the other. */
export function TaskCard({ block, onAnswer, onSetAside, onSend }: {
  block: TaskBlock;
  onAnswer: (concern: TaskBlockConcern, answer: string) => void;
  onSetAside: (concern: TaskBlockConcern) => void;
  onSend: (outcome: string) => void;
}) {
  const [resolved, setResolved] = useState<Record<number, Resolution>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  function submitAnswer(index: number, concern: TaskBlockConcern) {
    const answer = (drafts[index] ?? "").trim();
    if (!answer) return;
    setResolved((r) => ({ ...r, [index]: "answered" }));
    onAnswer(concern, answer);
  }

  function setAside(index: number, concern: TaskBlockConcern) {
    setResolved((r) => ({ ...r, [index]: "set-aside" }));
    onSetAside(concern);
  }

  const allResolved = block.concerns.every((_, i) => resolved[i] !== undefined);

  return (
    <div className="card task-card">
      <p className="task-card-outcome">{block.outcome}</p>
      {block.concerns.length ? (
        <div className="task-card-chips">
          {block.concerns.map((concern, i) => {
            const state = resolved[i];
            return (
              <div className={`task-chip task-chip-${concern.kind}${state ? " task-chip-resolved" : ""}`} key={i}>
                <p className="task-chip-text">
                  <span className="task-chip-kind">{concern.kind === "question" ? "Question" : "Risk"}</span>
                  <span className={state ? "task-chip-strike" : undefined}>{concern.text}</span>
                </p>
                {state ? (
                  <p className="small muted task-chip-status">{state === "answered" ? "Answered" : "Set aside"}</p>
                ) : concern.kind === "question" ? (
                  <div className="row task-chip-answer">
                    <input
                      type="text"
                      value={drafts[i] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [i]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitAnswer(i, concern); } }}
                      placeholder="Your answer"
                    />
                    <Pill onClick={() => submitAnswer(i, concern)} disabled={!(drafts[i] ?? "").trim()}>Answer</Pill>
                  </div>
                ) : (
                  <div className="row task-chip-answer">
                    <Pill onClick={() => setAside(i, concern)}>Set aside</Pill>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="row" style={{ marginTop: 12 }}>
        <Pill kind="primary" disabled={!allResolved} onClick={() => onSend(block.outcome)}>Send to dispatch</Pill>
      </div>
    </div>
  );
}
