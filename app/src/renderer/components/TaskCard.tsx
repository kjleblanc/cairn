import { useState } from "react";
import type { TaskBlock, TaskBlockConcern } from "../../shared/ipc";
import { Pill } from "./Ui";

type Resolution = "answered" | "set-aside";

/** The proposed-task card: the outcome sentence plus one chip per concern.
 * A question chip's one-line answer and a risk chip's "Set aside" both go
 * back to `Chat` as callbacks — `Chat` turns them into ordinary owner
 * messages, so the conversation log stays the single record of what was
 * asked and decided. "Send to dispatch" stays disabled until every chip
 * here is resolved one way or the other.
 *
 * `onAnswer`/`onSetAside` report back whether the message actually
 * dispatched (`Chat.send()` refuses outright while a reply is already
 * streaming). A chip marks itself resolved only when that comes back
 * `true` — never optimistically — so a concern can't look settled when its
 * message never reached the conductor. `busy` (the screen's own streaming
 * state) also disables both controls up front, so the common case never
 * even attempts a call that would be refused. */
export function TaskCard({ block, onAnswer, onSetAside, onSend, busy }: {
  block: TaskBlock;
  onAnswer: (concern: TaskBlockConcern, answer: string) => boolean | Promise<boolean>;
  onSetAside: (concern: TaskBlockConcern) => boolean | Promise<boolean>;
  onSend: (outcome: string) => void;
  busy: boolean;
}) {
  const [resolved, setResolved] = useState<Record<number, Resolution>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  async function submitAnswer(index: number, concern: TaskBlockConcern) {
    const answer = (drafts[index] ?? "").trim();
    if (!answer || busy) return;
    const dispatched = await onAnswer(concern, answer);
    if (dispatched) setResolved((r) => ({ ...r, [index]: "answered" }));
  }

  async function setAside(index: number, concern: TaskBlockConcern) {
    if (busy) return;
    const dispatched = await onSetAside(concern);
    if (dispatched) setResolved((r) => ({ ...r, [index]: "set-aside" }));
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
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submitAnswer(i, concern); } }}
                      placeholder="Your answer"
                    />
                    <Pill onClick={() => void submitAnswer(i, concern)} disabled={busy || !(drafts[i] ?? "").trim()}>Answer</Pill>
                  </div>
                ) : (
                  <div className="row task-chip-answer">
                    <Pill onClick={() => void setAside(i, concern)} disabled={busy}>Set aside</Pill>
                  </div>
                )}
                {!state && busy ? <p className="small muted task-chip-hint">Wait for Cairn to finish answering.</p> : null}
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
