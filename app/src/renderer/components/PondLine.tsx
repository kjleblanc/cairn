import { useRef } from "react";
import { pondLineLabel, pondLineTone, type TownRuntimePresentation } from "../town/presentation";

/**
 * The honest line (Decision 9, the narrow-window resolution, owner-approved
 * 2026-08-03).
 *
 * A line is honest because it is a line: it never pretends to be a picture, so
 * it cannot read as a shrunken pond. Pressing it opens the pond WHOLE, over
 * the window; the control below brings the conversation back. Above 1260px the
 * whole thing is `display: none` — the approved wide layout is untouched.
 */
export function PondLine({ presentation, needsYou, open, onToggle }: {
  presentation: TownRuntimePresentation;
  needsYou: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const tone = pondLineTone(presentation, needsYou);
  // Closing the pond unmounts `.pond-back`, which would drop focus to <body>
  // and lose the keyboard's place entirely. Focus goes back to the line that
  // opened the pond — the control that now says what the water is doing.
  const lineRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" className={`pond-line pond-line-${tone}`}
        ref={lineRef}
        aria-expanded={open}
        onClick={() => onToggle(!open)}>
        <span className="pond-line-dot" aria-hidden="true" />
        <span className="pond-line-text">{pondLineLabel(presentation, needsYou)}</span>
        <span className="pond-line-peek">
          look at the pond
          <span className="pond-line-chevron" aria-hidden="true">⌃</span>
        </span>
      </button>
      {/* The real live region for every width below 1260px, where the town
          header — which carries `role="status"` on the wide layout — is
          display:none. It sits OUTSIDE the button on purpose: `role="button"`
          has Children Presentational: True, so a live region nested inside one
          has its role dropped and may never fire. */}
      <span className="pond-line-live" role="status" aria-live="polite" aria-atomic="true">
        {pondLineLabel(presentation, needsYou)}
      </span>
      {open ? (
        <button type="button" className="pond-back"
          onClick={() => { onToggle(false); lineRef.current?.focus(); }}>
          Back to the conversation
        </button>
      ) : null}
    </>
  );
}
