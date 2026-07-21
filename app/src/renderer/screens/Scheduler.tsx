import { useEffect, useMemo, useState } from "react";
import type { SchedulerSummary } from "@cairn/core";
import { cairn } from "../api";
import { SchedulerDeck, type SchedulerHistory } from "../components/SchedulerDeck";
import { Pill } from "../components/Ui";

function historyFrom(summary: SchedulerSummary | null): SchedulerHistory[] {
  return summary?.tasks.map((task) => ({ taskNumber: task.taskNumber, phase: task.phase })) ?? [];
}

export function Scheduler({ dir, initial, onBack }: {
  dir: string;
  initial: SchedulerSummary | null;
  onBack: () => void;
}) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [summary, setSummary] = useState(initial);
  const [history, setHistory] = useState<SchedulerHistory[]>(() => historyFrom(initial));
  const [running, setRunning] = useState(false);
  const [attention, setAttention] = useState("");
  const sessionId = useMemo(() => Date.now(), []);

  useEffect(() => cairn.onSchedulerState((event) => {
    if (event.dir !== dir || event.sessionId !== sessionId) return;
    setSummary(event.summary);
    setHistory((current) => {
      const next = [...current];
      for (const task of event.summary.tasks) {
        if (!next.some((item) => item.taskNumber === task.taskNumber && item.phase === task.phase)) {
          next.push({ taskNumber: task.taskNumber, phase: task.phase });
        }
      }
      return next;
    });
  }), [dir, sessionId]);

  const start = async () => {
    const outcomes = [first.trim(), second.trim()].filter(Boolean);
    setAttention("");
    setHistory([]);
    setRunning(true);
    const result = await cairn.schedulerStart(dir, outcomes, sessionId);
    setRunning(false);
    if (result.ok) {
      setSummary(result.value);
      return;
    }
    setAttention(result.message);
  };

  const recover = async () => {
    setAttention("");
    const result = await cairn.schedulerRecover(dir);
    if (result.ok) setSummary(result.value);
    else setAttention(result.message);
  };

  const active = Boolean(summary?.tasks.some((task) => task.phase !== "Done"));

  return (
    <div>
      <div className="row spread scheduler-heading">
        <div>
          <p className="eyebrow">two-task scheduler</p>
          <h1>Plan paths, then build safely</h1>
        </div>
        <Pill kind="quiet" onClick={onBack}>Back to project</Pill>
      </div>

      {!active ? (
        <section className="card scheduler-form" aria-label="Start scheduler batch">
          <p>Choose one or two independently useful Standard outcomes. Two disjoint tasks normally use four Claude sessions: one Planning and one Building session for each task. Cairn never retries automatically.</p>
          <label htmlFor="scheduler-outcome-one">First outcome</label>
          <textarea id="scheduler-outcome-one" value={first} onChange={(event) => setFirst(event.target.value)} placeholder="What should the first task visibly achieve?" />
          <label htmlFor="scheduler-outcome-two">Second outcome (optional)</label>
          <textarea id="scheduler-outcome-two" value={second} onChange={(event) => setSecond(event.target.value)} placeholder="A separate useful outcome, if you have one" />
          <div className="row spread">
            <p className="small muted">Planning can read the project but cannot change product files. Building happens only after exact paths are known.</p>
            <Pill kind="primary" disabled={running || first.trim().length < 5} onClick={() => void start()}>{running ? "Scheduler is running…" : "Start this batch"}</Pill>
          </div>
        </section>
      ) : (
        <div className="row scheduler-recovery-row">
          <p className="small muted">If the app restarted during this batch, Cairn can reconcile proved state without retrying a model session.</p>
          <Pill kind="quiet" onClick={() => void recover()}>Reconcile after restart</Pill>
        </div>
      )}

      <SchedulerDeck summary={summary} history={history} attentionMessage={attention} />
    </div>
  );
}
