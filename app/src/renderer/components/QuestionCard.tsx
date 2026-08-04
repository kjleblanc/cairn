import { useId, useState } from "react";
import type { KeyboardEvent, Ref } from "react";
import { Pill } from "./Ui";

/** One current, main-owned conductor question. The component owns only the
 * unsent draft: Chat binds each callback to main's opaque action identity and
 * removes the whole card after main accepts either response.
 *
 * The draft is checked with `trim()` only to decide whether Answer is usable.
 * The original string is passed through unchanged, including leading,
 * trailing, and multiline-significant whitespace. */
export function QuestionCard({ question, busy, onAnswer, onDefer, headingRef }: {
  question: string;
  busy: boolean;
  onAnswer: (answer: string) => boolean | Promise<boolean>;
  onDefer: () => boolean | Promise<boolean>;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const answerId = useId();
  const disabled = busy || submitting;
  const answerDisabled = disabled || !draft.trim();

  async function submitAnswer(): Promise<void> {
    if (answerDisabled) return;
    const rawAnswer = draft;
    setSubmitting(true);
    try {
      if (await onAnswer(rawAnswer)) setDraft("");
    } finally {
      setSubmitting(false);
    }
  }

  async function deferAnswer(): Promise<void> {
    if (disabled) return;
    setSubmitting(true);
    try {
      await onDefer();
    } finally {
      setSubmitting(false);
    }
  }

  function onAnswerKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submitAnswer();
  }

  return (
    <section className="card question-card">
      <h2 className="question-card-heading" ref={headingRef} tabIndex={-1}>{question}</h2>
      <div className="question-card-answer">
        <label htmlFor={answerId}>Your answer</label>
        <div className="row question-card-controls">
          <input
            id={answerId}
            type="text"
            value={draft}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onAnswerKeyDown}
          />
          <Pill disabled={answerDisabled} onClick={() => void submitAnswer()}>Answer</Pill>
        </div>
      </div>
      <div className="row question-card-defer">
        <Pill kind="quiet" disabled={disabled} onClick={() => void deferAnswer()}>
          I'm not sure — you decide
        </Pill>
      </div>
    </section>
  );
}
