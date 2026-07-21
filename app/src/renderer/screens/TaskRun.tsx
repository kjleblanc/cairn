import { useEffect, useRef, useState } from "react";
import type { RouteResult, SerialActivity, SerialRunResult } from "@cairn/core";
import { cairn } from "../api";
import { ActivityFeed } from "../components/ActivityFeed";
import { ModelRoute } from "../components/ModelRoute";
import { Card, ErrorCard, Pill } from "../components/Ui";

type Phase = "entry" | "route" | "running" | "result";

export function TaskRun({ dir, demoAvailable, onBack }: { dir: string; demoAvailable: boolean; onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("entry");
  const [outcome, setOutcome] = useState("");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [result, setResult] = useState<SerialRunResult | null>(null);
  const [activities, setActivities] = useState<SerialActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef(Date.now()).current;
  const codexRoute = route?.status === "ready" && route.recommended.id === "codex-exec";
  const realCallStopped = result?.status === "stopped" && result.reason === "REAL_MODEL_CALL_NOT_AUTHORIZED";

  useEffect(() => cairn.onTaskActivity((event) => {
    if (event.dir === dir && event.sessionId === sessionId) {
      setActivities((current) => [...current, event.activity]);
    }
  }), [dir, sessionId]);

  async function findRoute() {
    if (outcome.trim().length < 5) { setError("Describe one visible outcome in a sentence."); return; }
    setError(null);
    const response = await cairn.taskRoute(dir, outcome.trim());
    if (!response.ok) { setError(response.message); return; }
    setRoute(response.value);
    setPhase("route");
  }

  async function run() {
    if (!route || route.status !== "ready") return;
    setError(null); setActivities([]); setPhase("running");
    const response = await cairn.taskRun(dir, outcome.trim(), sessionId, route.recommended.id);
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
    setPhase("entry"); setOutcome(""); setRoute(null); setResult(null); setActivities([]); setError(null);
  }

  return (
    <div className="task-run">
      <div className="row spread task-heading">
        <div>
          <p className="eyebrow">one serial task</p>
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
          <div className="row">
            <Pill kind="primary" onClick={() => void run()}>{codexRoute ? "Prepare Codex Exec run" : "Run offline demonstration"}</Pill>
            <Pill kind="quiet" onClick={tryAnother}>Edit the task</Pill>
          </div>
        </>
      ) : null}

      {phase === "running" ? (
        <Card title="route → run → check → result">
          <p>{codexRoute
            ? "Cairn is preparing one ephemeral workspace-scoped request and will stop before the real Codex Exec process starts."
            : "The deterministic adapter is exercising the same core serial coordinator used by the CLI."}</p>
          <ActivityFeed activities={activities} />
        </Card>
      ) : null}

      {phase === "result" && result && result.status !== "connection-required" ? (
        <>
          <Card title={result.status === "done" ? "verified" : "stopped safely"}>
            <h2>{result.status === "done"
              ? "Verified offline result"
              : realCallStopped
                ? "Stopped before the real model call"
                : "Adapter stopped safely"}</h2>
            <p><strong>{realCallStopped
              ? "Real Codex Exec process: not started"
              : `Routing demonstration: ${result.status === "done" ? "verified" : "stopped"}`}</strong></p>
            <p><strong>Requested product change: not attempted</strong></p>
            <p><strong>Milestone movement: NO</strong></p>
            <p className="small muted">Task {String(result.taskNumber).padStart(3, "0")} wrote one brief, one report, and one append-only log row. No model was called.</p>
            <p className="small mono">{result.reportPath}</p>
          </Card>
          <ActivityFeed activities={activities} />
          <div className="row" style={{ marginTop: 12 }}>
            <Pill kind="primary" onClick={onBack}>Return to project</Pill>
            <Pill onClick={tryAnother}>Try another task</Pill>
          </div>
        </>
      ) : null}
    </div>
  );
}
