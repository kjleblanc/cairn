import { useEffect, useRef } from "react";
import type { EngineEvent } from "../../shared/ipc";

/** One tidy line per model chunk: markdown litter stripped, extra lines folded. */
function tidy(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[#>\s]+/, "").replace(/^(?:[-*]|\d+[.)])\s+/, "").replace(/\*\*/g, "").replace(/`/g, "").trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return "";
  return lines.length === 1 ? lines[0] : `${lines[0]} …`;
}

export function ActivityFeed({ events }: { events: EngineEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [events.length]);
  const rows = events
    .map((e) => ({ kind: e.kind, text: e.kind === "text" ? tidy(e.text) : e.text.replace(/\s+/g, " ").trim() }))
    .filter((e) => e.text.length > 0);
  if (rows.length === 0) return null;
  return (
    <div className="feed" ref={ref} aria-live="polite">
      {rows.map((e, i) =>
        e.kind === "denied"
          ? <div key={i}><span className="chip-denied">⊘ blocked · {e.text}</span></div>
          : e.kind === "tool"
            ? <div key={i} className="feed-tool">· {e.text}</div>
            : <div key={i}>▸ {e.text}</div>,
      )}
    </div>
  );
}
