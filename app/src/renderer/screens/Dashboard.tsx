import { useEffect } from "react";
import type { ProjectStatus } from "@cairn/core";
import { Badge, Card, Pill } from "../components/Ui";
import { Scene } from "../components/Scene";
import { ProjectSwitcher } from "../components/ProjectSwitcher";
import { pluck } from "../sound";

export function Dashboard({ dir, status, onStartTask, onDirection, onSwitch, onOpenProject, onSettings }: {
  dir: string; status: ProjectStatus;
  onStartTask: () => void; onDirection: (reason: string) => void; onSwitch: () => void;
  onOpenProject: (dir: string) => void; onSettings: () => void;
}) {
  useEffect(() => { /* Stones land only for DONE + milestone YES records. */ if (status.stones > 0) pluck(); }, [status.stones]);
  const { facts, log, stones, gate, unfinished, legacyState } = status;
  const recent = log.slice(-6).reverse();
  const canStart = !gate.tripped && !legacyState && !unfinished;

  return (
    <div>
      <div className="scene-wrap">
        <div className="scene-head"><h1>{facts.name || "Your project"}</h1><p className="small muted">milestone · {facts.milestone || "not set"}</p></div>
        <Scene stones={stones} justAdded={false} />
      </div>
      <div className="row spread" style={{ marginBottom: 12 }}>
        <span className="status-pill">▸ idle · {stones} {stones === 1 ? "stone" : "stones"} · gate {gate.tripped ? "tripped" : "quiet"}</span>
        {canStart ? <Pill kind="primary" onClick={onStartTask}>Start a task</Pill> : null}
      </div>

      {legacyState ? (
        <div className="gate-banner"><p><strong>Legacy task state is preserved.</strong> Cairn will not parse, migrate, or delete it. Starting a new task needs a separately reviewed migration.</p></div>
      ) : null}
      {gate.tripped ? (
        <div className="gate-banner"><p><strong>Direction Gate.</strong> {gate.reason}</p><Pill onClick={() => onDirection(gate.reason)}>Review different directions</Pill></div>
      ) : null}
      {unfinished ? (
        <Card title="retained task evidence">
          <p>Task {String(unfinished.taskNumber).padStart(3, "0")} has records but no closing log row. The new serial path will not resume, rewrite, or hide it.</p>
          <p className="small muted">Inspect the brief and report before deciding on a separate recovery task.</p>
        </Card>
      ) : null}

      <Card title="how the serial path works">
        <div className="serial-map"><span>Project</span><span>Task</span><span>Route</span><span>Run</span><span>Check</span><span>Result</span></div>
        <p className="small muted">One task at a time. Cairn recommends only connected compatible routes and records exactly what happened.</p>
      </Card>

      <Card title="recent records">
        {recent.length === 0 ? <p className="muted">No tasks closed yet — start the first one.</p> : null}
        {recent.map((row) => (
          <div className="log-row" key={`${row.task}-${row.date}`}>
            <span><span className="mono muted" style={{ marginRight: 10 }}>{row.task}</span>{row.summary || row.decision}</span>
            <span className="row" style={{ gap: 8 }}><Badge kind={/^DONE$/i.test(row.outcome) ? "DONE" : "STOPPED"} /><span className="small muted">moved {row.moved}</span></span>
          </div>
        ))}
      </Card>

      <div className="row"><ProjectSwitcher currentDir={dir} onOpenProject={onOpenProject} onAllProjects={onSwitch} /><Pill kind="quiet" onClick={onSettings}>Settings</Pill></div>
      <p className="small muted mono" style={{ marginTop: 8 }}>{dir}</p>
    </div>
  );
}
