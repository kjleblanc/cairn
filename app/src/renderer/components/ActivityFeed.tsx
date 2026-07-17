import { useEffect, useRef } from "react";
import type { EngineEvent } from "../../shared/ipc";

export function ActivityFeed({ events }: { events: EngineEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [events.length]);
  if (events.length === 0) return null;
  return (
    <div className="feed" ref={ref} aria-live="polite">
      {events.map((e, i) =>
        e.kind === "denied"
          ? <div key={i}><span className="chip-denied">⊘ blocked · {e.text}</span></div>
          : <div key={i}>▸ {e.text}</div>,
      )}
    </div>
  );
}
