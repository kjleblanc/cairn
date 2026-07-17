import { useEffect, useState } from "react";
import type { EngineEvent } from "../../shared/ipc";
import { Card, ErrorCard, Pill } from "../components/Ui";
import { Md } from "../components/Md";
import { ActivityFeed } from "../components/ActivityFeed";
import { cairn } from "../api";

export function Direction({ dir, reason, onBack }: { dir: string; reason: string; onBack: () => void }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [text, setText] = useState("");
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => cairn.onEngineEvent((ev) => setEvents((p) => [...p.slice(-199), ev])), []);

  async function run() {
    setError(null); setEvents([]); setPhase("running");
    const r = await cairn.taskDirection(dir, reason);
    if (r.ok) { setText(r.value.text); setPhase("done"); }
    else { setError(r.message); setPhase("idle"); }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1>A direction check</h1>
      {error ? <ErrorCard message={error} /> : null}
      <div className="gate-banner">
        <p>{reason} Two tries without visible progress means the next patch probably isn't the answer — a step back is.</p>
      </div>
      {phase === "idle" ? (
        <div className="row">
          <Pill kind="primary" onClick={() => void run()}>Run a direction check</Pill>
          <Pill kind="quiet" onClick={onBack}>Back to your project</Pill>
        </div>
      ) : null}
      {phase === "running" ? (
        <Card title="thinking about genuinely different options">
          <p className="muted">Nothing will be changed — this agent can only read and think.</p>
          <ActivityFeed events={events} />
        </Card>
      ) : null}
      {phase === "done" ? (
        <>
          <Card title="your options"><Md text={text} /></Card>
          <Pill kind="primary" onClick={onBack}>Back to your project</Pill>
        </>
      ) : null}
    </div>
  );
}
