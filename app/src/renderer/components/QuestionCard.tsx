import { useEffect, useRef, useState } from "react";
import type { OwnerQuestionEvent } from "../../shared/ipc";
import { Card, Pill } from "./Ui";

/**
 * One question from the AI, shown while a brief is being written. Answering is
 * optional: Skip tells the AI to use its best judgment and write the assumption
 * into the brief. The run is paused until one of the two buttons — never the
 * owner's data — releases it.
 *
 * In mock (demo) mode the event carries autoSkipMs: an UNTOUCHED card skips
 * itself after that long, so an unattended demo run always finishes on its own.
 * The first click or keystroke cancels the self-skip — a typing owner is never
 * cut off mid-answer. Real runs carry no autoSkipMs and wait for the owner.
 */
export function QuestionCard({ q, onAnswer }: { q: OwnerQuestionEvent; onAnswer: (answer: string | null) => void }) {
  const [text, setText] = useState("");
  const touched = useRef(false);
  const send = () => onAnswer(text.trim() ? text.trim() : null);

  useEffect(() => {
    if (!q.autoSkipMs) return;
    const t = setTimeout(() => { if (!touched.current) onAnswer(null); }, q.autoSkipMs);
    return () => clearTimeout(t);
    // Keyed by the question itself; the handler only ever resolves this one id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id, q.autoSkipMs]);

  return (
    <div className="question-card" onPointerDown={() => { touched.current = true; }}>
      <Card title={`the AI asks — question ${q.asked} of ${q.limit}`}>
        <p className="question-text">{q.question}</p>
        <input
          type="text"
          value={text}
          autoFocus
          onChange={(e) => { touched.current = true; setText(e.target.value); }}
          onKeyDown={(e) => { touched.current = true; if (e.key === "Enter") send(); }}
          placeholder="Your answer, in plain words"
        />
        <div className="row" style={{ marginTop: 12 }}>
          <Pill kind="primary" onClick={send}>Send answer</Pill>
          <Pill kind="soft" onClick={() => onAnswer(null)}>Skip — let the AI use its judgment</Pill>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          Answering is optional. Cairn never needs a password or key typed here — never type one.
          {q.autoSkipMs ? " Demo mode: an untouched question skips itself after a few seconds; typing or clicking keeps it open." : ""}
        </p>
      </Card>
    </div>
  );
}
