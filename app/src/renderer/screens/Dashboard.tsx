import { useEffect } from "react";
import type { ProjectStatus, UnfinishedTask } from "@cairn/core";
import { Badge, Card, Pill } from "../components/Ui";
import { Scene } from "../components/Scene";
import { ModelEffort } from "../components/ModelEffort";
import { ProjectSwitcher } from "../components/ProjectSwitcher";
import { BoundedTaskDeck } from "../components/TaskDeck";
import { pluck } from "../sound";

export function Dashboard({ dir, status, justAdded, mock, parallelDraft, schedulerFinal, onStartTask, onStartScheduler, onResume, onDirection, onSwitch, onOpenProject, onSettings }: {
  dir: string; status: ProjectStatus; justAdded: boolean; mock: boolean; parallelDraft: boolean; schedulerFinal: boolean;
  onStartTask: () => void; onStartScheduler: () => void; onResume: (task: UnfinishedTask) => void; onDirection: (reason: string) => void;
  onSwitch: () => void; onOpenProject: (dir: string) => void; onSettings: () => void;
}) {
  useEffect(() => { if (justAdded) pluck(); }, [justAdded]);
  const { facts, log, stones, gate, unfinished } = status;
  const recent = log.slice(-6).reverse();
  const unfinishedTasks = status.unfinishedTasks?.length ? status.unfinishedTasks : unfinished ? [unfinished] : [];
  const bounded = status.bounded ?? null;
  const scheduled = status.scheduler ?? null;
  const schedulerActive = Boolean(scheduled?.tasks.some((task) => task.phase !== "Done"));

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
        {!gate.tripped && !bounded && !schedulerActive ? <Pill kind="primary" onClick={onStartTask}>Start a task</Pill> : null}
      </div>

      {bounded ? <BoundedTaskDeck state={bounded} /> : null}

      {schedulerFinal && !gate.tripped && !bounded ? (
        <div className="gate-banner scheduler-banner">
          <div>
            <p><strong>Two-task scheduler — Final candidate, still off by default.</strong></p>
            <p className="small">Plan exact paths first, build disjoint Standard tasks in isolated worktrees, then check and integrate one at a time.</p>
          </div>
          <Pill onClick={onStartScheduler}>{scheduled ? "Open scheduler" : "Schedule one or two tasks"}</Pill>
        </div>
      ) : null}

      {parallelDraft ? (
        <div className="gate-banner">
          <p><strong>Parallel Draft — not active by default.</strong> Strict safe-task admission, terminal refusal, isolated worktrees, and serialized integration stay behind the opt-in flag.</p>
          {justAdded ? <p><strong>Serialized integration completed.</strong> One task entered the queue and integrated; every other task stayed independently open.</p> : null}
        </div>
      ) : null}

      {!gate.tripped && !bounded ? <ModelEffort mock={mock} /> : null}

      {gate.tripped ? (
        <div className="gate-banner">
          <p><strong>Direction Gate.</strong> {gate.reason} No third narrow patch — time to look at the direction instead.</p>
          <Pill onClick={() => onDirection(gate.reason)}>Run a direction check</Pill>
        </div>
      ) : null}

      {!bounded ? unfinishedTasks.map((task) => (
        <Card title={/^PARALLEL_/.test(task.blocker ?? "") ? "retained refusal evidence" : "unfinished task"} key={task.taskNumber}>
          {(() => {
            const coordinatorTask = status.parallel?.tasks.find((item) => item.taskNumber === task.taskNumber);
            if (coordinatorTask?.phase === "refused") {
              return (
                <p className="small">
                  <strong>Refused — not queued:</strong> {coordinatorTask.blocker}. Its task number, brief, branch, and worktree remain as evidence; it cannot be approved or built and uses no safe-task slot.
                </p>
              );
            }
            if (coordinatorTask?.blocker === "DEFINER_ENGINE_FAILED") {
              return <p className="small"><strong>Definition stopped safely.</strong> Cairn kept this task number, branch, worktree, and partial brief for a definition retry.</p>;
            }
            if (coordinatorTask?.blocker === "BUILDER_ENGINE_FAILED") {
              return <p className="small"><strong>Build stopped safely.</strong> Cairn kept this task's approval, branch, worktree, and partial allowed work for a build retry.</p>;
            }
            if (coordinatorTask?.blocker) return <p className="small"><strong>Stopped safely:</strong> {coordinatorTask.blocker}. Its branch and worktree were retained.</p>;
            return coordinatorTask?.waitingReason ? <p className="small"><strong>Waiting:</strong> {coordinatorTask.waitingReason}</p> : null;
          })()}
          <div className="row spread">
            <p>
              {/^PARALLEL_/.test(task.blocker ?? "")
                ? `Task ${String(task.taskNumber).padStart(3, "0")} is retained as terminal refusal evidence.`
                : `Task ${String(task.taskNumber).padStart(3, "0")} is still independent and open. Pick up exactly this task.`}
            </p>
            <Pill onClick={() => onResume(task)}>
              {/^PARALLEL_/.test(task.blocker ?? "")
                ? `View refusal for Task ${String(task.taskNumber).padStart(3, "0")}`
                : task.blocker === "DEFINER_ENGINE_FAILED"
                ? `Open definition recovery for Task ${String(task.taskNumber).padStart(3, "0")}`
                : task.blocker === "BUILDER_ENGINE_FAILED"
                  ? `Open build recovery for Task ${String(task.taskNumber).padStart(3, "0")}`
                  : parallelDraft ? `Continue Task ${String(task.taskNumber).padStart(3, "0")}` : "Continue it"}
            </Pill>
          </div>
          {status.parallel?.tasks.find((item) => item.taskNumber === task.taskNumber) ? (
            <p className="small mono muted">
              {status.parallel.tasks.find((item) => item.taskNumber === task.taskNumber)?.branch} · {status.parallel.tasks.find((item) => item.taskNumber === task.taskNumber)?.worktree}
            </p>
          ) : null}
        </Card>
      )) : null}

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
        <ProjectSwitcher currentDir={dir} onOpenProject={onOpenProject} onAllProjects={onSwitch} />
        <Pill kind="quiet" onClick={onSettings}>Settings</Pill>
      </div>
      <p className="small muted mono" style={{ marginTop: 8 }}>{dir}</p>
    </div>
  );
}
