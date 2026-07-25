import { useCallback, useEffect, useState } from "react";
import type { RouteResult, SerialActivity, SerialRunResult, WorkerDisclosure } from "@cairn/core";
import { cairn } from "../api";
import { ActivityFeed } from "../components/ActivityFeed";
import { DisclosureConfirm } from "../components/DisclosureConfirm";
import { ModelRoute } from "../components/ModelRoute";
import { Card, ErrorCard, Pill } from "../components/Ui";

type Phase = "entry" | "route" | "running" | "result";

/** The typed-by-hand lane. A task proposed in chat no longer arrives here as
 * a prefilled sentence — chat dispatches it inline, with its details — so
 * this screen owns only what the owner types, and always sends `details: ""`.
 * It still reattaches to whatever run is live for this project, wherever that
 * run was started from. */
export function TaskRun({ dir, demoAvailable, onBack }: {
  dir: string; demoAvailable: boolean; onBack: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("entry");
  const [outcome, setOutcome] = useState("");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [disclosure, setDisclosure] = useState<WorkerDisclosure | null>(null);
  const [result, setResult] = useState<SerialRunResult | null>(null);
  const [activities, setActivities] = useState<SerialActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [realCallConfirmed, setRealCallConfirmed] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [sessionWorker, setSessionWorker] = useState(false);
  // The lane is a real worker whenever the routed adapter is not the offline
  // demo — a capability check, never an adapter-id check, so a third adapter
  // needs no renderer change.
  const workerRoute = route?.status === "ready" && !route.recommended.capabilities.includes("offline-demo");
  const resultWorker = result && result.status !== "connection-required" && !result.route.recommended.capabilities.includes("offline-demo");
  const workerish = workerRoute || Boolean(resultWorker) || sessionWorker;
  const realCallStopped = result?.status === "stopped" && result.reason === "REAL_MODEL_CALL_NOT_AUTHORIZED";

  useEffect(() => {
    void cairn.updateCheck().then((update) => setCurrentVersion(update.current));
  }, []);

  const refresh = useCallback(async () => {
    const session = await cairn.taskCurrent(dir);
    if (!session) return;
    setOutcome(session.outcome);
    setSessionWorker(session.worker);
    setActivities(session.activities);
    if (session.phase === "running") setPhase("running");
    else if (session.result && session.result.status !== "connection-required") {
      setResult(session.result);
      setPhase("result");
    } else if (session.error) {
      // A run that ended in a thrown error (e.g. RECORD_VERIFICATION_FAILED)
      // must surface on reattach, not vanish into a blank entry form.
      setError(session.error);
    }
  }, [dir]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => cairn.onTaskActivity((event) => {
    if (event.dir !== dir) return;
    setActivities((current) => [...current, event.activity]);
    if (event.activity.stage === "Result") void refresh();
  }), [dir, refresh]);

  async function findRoute() {
    if (outcome.trim().length < 5) { setError("Describe one visible outcome in a sentence."); return; }
    setError(null);
    const response = await cairn.taskRoute(dir, outcome.trim(), "");
    if (!response.ok) { setError(response.message); return; }
    setRoute(response.value.route);
    setDisclosure(response.value.disclosure ?? null);
    setPhase("route");
  }

  async function run() {
    if (!route || route.status !== "ready") return;
    if (workerRoute && !realCallConfirmed) { setError(`Confirm the displayed real-call boundary before starting ${route.recommended.label}.`); return; }
    setError(null); setActivities([]); setPhase("running");
    const response = await cairn.taskRun({
      dir,
      outcome: outcome.trim(),
      details: "",
      adapterId: route.recommended.id,
      realCallConfirmed: workerRoute && realCallConfirmed,
      disclosure: disclosure ?? undefined,
      conversationId: null,
    });
    if (!response.ok) { setError(response.message); setPhase("route"); return; }
    if (response.value.status === "connection-required") {
      setRoute(response.value.route);
      setError("Codex Exec readiness changed. No task records or model call were created.");
      setPhase("route");
      return;
    }
    setResult(response.value);
    setPhase("result");
  }

  function tryAnother() {
    void cairn.taskAcknowledge(dir);
    setPhase("entry"); setOutcome(""); setRoute(null); setDisclosure(null); setResult(null); setActivities([]); setError(null); setRealCallConfirmed(false); setSessionWorker(false);
  }

  return (
    <div className="task-run">
      <div className="row spread task-heading">
        <div>
          <p className="eyebrow">one serial task{currentVersion ? ` · Cairn v${currentVersion}` : ""}</p>
          <h1>What should change?</h1>
        </div>
        <Pill kind="quiet" onClick={onBack}>← Project home</Pill>
      </div>
      {error ? <ErrorCard message={error} /> : null}

      {phase === "entry" ? (
        <Card title="task outcome">
          <p>Describe one result you want to see. Cairn will recommend from connected compatible routes.</p>
          <textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="Describe one visible outcome" rows={4} />
          <div className="row" style={{ marginTop: 12 }}>
            <Pill kind="primary" onClick={() => void findRoute()}>Find a route</Pill>
          </div>
          {!demoAvailable ? <p className="small muted" style={{ marginTop: 10 }}>Cairn checks whether the official Codex CLI is installed and connected. It never reads or displays credential values or login output.</p> : null}
        </Card>
      ) : null}

      {phase === "route" && route?.status === "connection-required" ? (
        <Card>
          <h2>Connect a model to continue</h2>
          <p>{route.reason}</p>
          <p className="small muted">Install or connect Codex yourself through official Codex controls. Cairn does not open login, read credential files, or choose another provider.</p>
          <div className="row" style={{ marginTop: 12 }}>
            <Pill onClick={tryAnother}>Edit the task</Pill>
            <Pill kind="quiet" onClick={onBack}>Return to project</Pill>
          </div>
        </Card>
      ) : null}

      {phase === "route" && route?.status === "ready" ? (
        <>
          <ModelRoute route={route.recommended} reason={route.reason} />
          {disclosure ? (
            <Card title="confirm one real model call">
              <DisclosureConfirm
                disclosure={disclosure}
                label={route.recommended.label}
                confirmed={realCallConfirmed}
                onConfirmedChange={setRealCallConfirmed}
              />
            </Card>
          ) : null}
          <div className="row">
            <Pill kind="primary" disabled={workerRoute && !realCallConfirmed} onClick={() => void run()}>{workerRoute ? `Start one real ${route.recommended.label} call` : "Run offline demonstration"}</Pill>
            <Pill kind="quiet" onClick={tryAnother}>Edit the task</Pill>
          </div>
        </>
      ) : null}

      {phase === "running" ? (
        <Card title="route → run → check → result">
          <p>{workerish
            ? "Cairn is running one confirmed ephemeral workspace-scoped Codex Exec request. There is no retry, continuation, or parallel run."
            : "The deterministic adapter is exercising the same core serial coordinator used by the CLI."}</p>
          <ActivityFeed activities={activities} />
          <div className="row" style={{ marginTop: 12 }}>
            <Pill kind="quiet" onClick={() => void cairn.taskCancel(dir)}>Stop this task</Pill>
          </div>
        </Card>
      ) : null}

      {phase === "result" && result && result.status !== "connection-required" ? (
        <>
          <Card title={result.status === "done" ? "verified" : "stopped safely"}>
            <h2>{result.status === "done"
              ? workerish ? "Verified real Codex Exec result" : "Verified offline result"
              : realCallStopped
                ? "Stopped before the real model call"
                : "Adapter stopped safely"}</h2>
            <p><strong>{realCallStopped
              ? "Real Codex Exec process: not started"
              : workerish
                ? `Codex Exec task: ${result.status === "done" ? "verified" : "stopped"}`
                : `Routing demonstration: ${result.status === "done" ? "verified" : "stopped"}`}</strong></p>
            <p><strong>Requested product change: {workerish ? result.status === "done" ? "completed and verified" : "not verified" : "not attempted"}</strong></p>
            <p><strong>Milestone movement: {result.row.moved}</strong></p>
            <p className="small muted">Task {String(result.taskNumber).padStart(3, "0")} has one brief, one report, and one append-only log row. {workerish
              ? result.status === "done"
                ? "Cairn verified the worker's changes and authored the task records itself."
                : "Cairn stopped this task safely and authored honest STOPPED records. Retained evidence needs inspection before another task."
              : "No model was called."}</p>
            <p className="small mono">{result.reportPath}</p>
          </Card>
          <ActivityFeed activities={activities} />
          <div className="row" style={{ marginTop: 12 }}>
            <Pill kind="primary" onClick={() => { void cairn.taskAcknowledge(dir); onBack(); }}>Return to project</Pill>
            <Pill onClick={tryAnother}>Try another task</Pill>
          </div>
        </>
      ) : null}
    </div>
  );
}
