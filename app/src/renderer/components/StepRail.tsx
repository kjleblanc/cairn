const LABELS = ["define", "approve", "build", "verify", "decide"] as const;

/** The five steps as stones on a trace — the user always knows where they are. */
export function StepRail({ current }: { current: number }) {
  return (
    <div className="rail" aria-label={`Step ${current + 1} of 5: ${LABELS[current]}`}>
      {LABELS.map((l, i) => (
        <span key={l} className={"rail-step" + (i === current ? " rail-now" : i < current ? " rail-done" : "")}>
          <span className="rail-dot" />{l}
        </span>
      ))}
    </div>
  );
}
