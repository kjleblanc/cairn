import { useEffect } from "react";
import type { ProjectStatus } from "@cairn/core";
import { Badge, Card, Pill } from "../components/Ui";
import { Scene } from "../components/Scene";
import { ModelEffort } from "../components/ModelEffort";
import { pluck } from "../sound";

export function Dashboard({ dir, status, justAdded, onStartTask, onResume, onDirection, onSwitch, onSettings }: {
  dir: string; status: ProjectStatus; justAdded: boolean;
  onStartTask: () => void; onResume: () => void; onDirection: (reason: string) => void;
  onSwitch: () => void; onSettings: () => void;
}) {
  useEffect(() => { if (justAdded) pluck(); }, [justAdded]);
  const { facts, log, stones, gate, unfinished } = status;
  const recent = log.slice(-6).reverse();

  return (
    <div>
      <div className="scene-wrap">
        <div className="scene-head">
          <h1>{facts.name || "Your project"}</h1>
          <p className="small muted">milestone · {facts.milestone || "not set"}</p>
        </div>
        <Scene stones={stones} justAdded={justAdded} />
      </div>

      <div className="row spread" style={{ marginBottom: 12 }}>
        <span className="status-pill">▸ idle · {stones} {stones === 1 ? "stone" : "stones"} · gate {gate.tripped ? "tripped" : "quiet"}</span>
        {!gate.tripped ? <Pill kind="primary" onClick={onStartTask}>Start a task</Pill> : null}
      </div>

      {!gate.tripped ? <ModelEffort /> : null}

      {gate.tripped ? (
        <div className="gate-banner">
          <p><strong>Direction Gate.</strong> {gate.reason} No third narrow patch — time to look at the direction instead.</p>
          <Pill onClick={() => onDirection(gate.reason)}>Run a direction check</Pill>
        </div>
      ) : null}

      {unfinished ? (
        <Card title="unfinished task">
          <div className="row spread">
            <p>Task {String(unfinished.taskNumber).padStart(3, "0")} was started but never closed. Pick up where you left off.</p>
            <Pill onClick={onResume}>Continue it</Pill>
          </div>
        </Card>
      ) : null}

      <Card title="recent stones">
        {recent.length === 0 ? <p className="muted">No tasks closed yet — start the first one.</p> : null}
        {recent.map((r) => (
          <div className="log-row" key={r.task}>
            <span><span className="mono muted" style={{ marginRight: 10 }}>{r.task}</span>{r.summary || r.decision}</span>
            <span className="row" style={{ gap: 8 }}>
              <Badge kind={/DONE/i.test(r.outcome) ? "DONE" : "STOPPED"} />
              <span className="small muted">{r.date}</span>
            </span>
          </div>
        ))}
      </Card>

      <div className="row">
        <Pill kind="quiet" onClick={onSwitch}>Switch project</Pill>
        <Pill kind="quiet" onClick={onSettings}>Settings</Pill>
      </div>
      <p className="small muted mono" style={{ marginTop: 8 }}>{dir}</p>
    </div>
  );
}
