import { useCallback, useEffect, useRef, useState } from "react";
import type { RouteResult, SerialActivity, SerialRunResult, TaskRequestView, WorkerDisclosure } from "@cairn/core";
import type {
  CriticCallActionV1,
  CriticCallDisclosureV1,
  RunSessionSnapshot,
  TaskReviewProjectionV1,
  TaskSpecProposalPreviewV1,
} from "../../shared/ipc";
import { cairn } from "../api";
import { ActivityFeed } from "../components/ActivityFeed";
import { DisclosureConfirm } from "../components/DisclosureConfirm";
import { ModelRoute } from "../components/ModelRoute";
import { TaskReviewView, TaskSpecProposalPreviewView, type TaskReviewActionChoice } from "../components/TaskReview";
import { CriticCallCard } from "../components/CriticCall";
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
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [requestView, setRequestView] = useState<TaskRequestView | null>(null);
  const [requestContext, setRequestContext] = useState<readonly string[]>([]);
  const [taskSpecPreview, setTaskSpecPreview] = useState<TaskSpecProposalPreviewV1 | null>(null);
  const [taskReview, setTaskReview] = useState<TaskReviewProjectionV1 | null>(null);
  const [criticCall, setCriticCall] = useState<CriticCallDisclosureV1 | null>(null);
  const [criticCallBusy, setCriticCallBusy] = useState(false);
  const [disclosure, setDisclosure] = useState<WorkerDisclosure | null>(null);
  const [result, setResult] = useState<SerialRunResult | null>(null);
  const [activities, setActivities] = useState<SerialActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [realCallConfirmed, setRealCallConfirmed] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [sessionWorker, setSessionWorker] = useState(false);
  const routeGeneration = useRef(0);
  const pendingReviewAction = useRef<{ generation: number; actionId: string } | null>(null);
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

  const applySession = useCallback((session: RunSessionSnapshot | null) => {
    if (!session) return;
    routeGeneration.current += 1;
    pendingReviewAction.current = null;
    setOutcome(session.outcome);
    setRequestView(session.request ?? null);
    setTaskReview(session.taskReview ?? null);
    setCriticCall(session.criticCall ?? null);
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
      setPreviewId(null);
      setRoute(null);
      setPhase("route");
    }
  }, []);

  const refresh = useCallback(async () => {
    applySession(await cairn.taskCurrent(dir));
  }, [applySession, dir]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => cairn.onTaskActivity((event) => {
    if (event.dir !== dir) return;
    setActivities((current) => [...current, event.activity]);
    if (event.activity.stage === "Result") void refresh();
  }), [dir, refresh]);

  useEffect(() => {
    const onRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ dir?: unknown; session?: unknown }>).detail;
      if (!detail || detail.dir !== dir) return;
      const session = detail.session as RunSessionSnapshot | null;
      if (session !== null && session?.dir !== dir) return;
      applySession(session);
    };
    window.addEventListener("cairn:task-session-refresh", onRefresh);
    return () => window.removeEventListener("cairn:task-session-refresh", onRefresh);
  }, [applySession, dir]);

  async function findRoute() {
    const generation = routeGeneration.current + 1;
    routeGeneration.current = generation;
    pendingReviewAction.current = null;
    setError(null);
    const response = await cairn.taskRoute({ dir, source: { kind: "manual", rawOutcome: outcome } });
    if (routeGeneration.current !== generation) return;
    if (!response.ok) { setError(response.message); return; }
    setPreviewId(response.value.previewId);
    setRequestView(response.value.request);
    setRequestContext(response.value.context);
    setTaskSpecPreview(response.value.taskSpecPreview ?? null);
    setTaskReview(response.value.taskReview ?? null);
    setRoute(response.value.route);
    setDisclosure(response.value.disclosure ?? null);
    setPhase("route");
  }

  async function run() {
    if (!route || route.status !== "ready" || previewId === null) return;
    if (workerRoute && !realCallConfirmed) { setError(`Confirm the displayed real-call boundary before starting ${route.recommended.label}.`); return; }
    routeGeneration.current += 1;
    pendingReviewAction.current = null;
    setError(null); setActivities([]); setPhase("running");
    const response = await cairn.taskRun({
      dir,
      previewId,
      realCallConfirmed: workerRoute && realCallConfirmed,
      disclosure: disclosure ?? undefined,
    });
    if (!response.ok) {
      const accepted = await cairn.taskCurrent(dir);
      if (accepted?.acceptedPreviewId === previewId && accepted.phase === "closed" && accepted.error) applySession(accepted);
      else { setError(response.message); setPhase("route"); }
      return;
    }
    if (response.value.status === "connection-required") {
      setPreviewId(null);
      setRoute(response.value.route);
      setError("Codex Exec readiness changed. No task records or model call were created.");
      setPhase("route");
      return;
    }
    setResult(response.value);
    setPhase("result");
  }

  async function applyTaskReviewChoice(actionId: string, action: TaskReviewActionChoice): Promise<void> {
    const generation = routeGeneration.current;
    if (previewId === null || taskReview === null
      || !taskReview.criteria.some((criterion) => criterion.ownerChecks.some((check) => check.action?.actionId === actionId))
      || pendingReviewAction.current?.generation === generation) return;
    const pending = { generation, actionId };
    pendingReviewAction.current = pending;
    const request = action.kind === "observe"
      ? { dir, actionId, action: { kind: "observe" as const, decision: action.decision } }
      : { dir, actionId, action: { kind: "resolve" as const, decision: action.decision } };
    try {
      const response = await cairn.taskReviewAction(request);
      if (pendingReviewAction.current !== pending || routeGeneration.current !== generation) return;
      pendingReviewAction.current = null;
      if (!response.ok) { setError(response.message); return; }
      setError(null);
      setTaskReview(response.value);
    } catch {
      if (pendingReviewAction.current !== pending || routeGeneration.current !== generation) return;
      pendingReviewAction.current = null;
      setError("Cairn could not apply that owner-check choice. Review the current task again.");
    }
  }

  /**
   * The renderer chooses only a press that the card itself offered, and echoes
   * the card it was shown. Main re-derives that card before it decides, so a
   * stale card here approves nothing.
   */
  async function decideCriticCall(call: CriticCallDisclosureV1, action: CriticCallActionV1): Promise<void> {
    const generation = routeGeneration.current;
    if (criticCallBusy || !call.actions.includes(action)) return;
    setCriticCallBusy(true);
    try {
      const response = await cairn.criticCallDecide({
        dir,
        approvalId: call.approvalId,
        action,
        disclosure: call,
      });
      if (routeGeneration.current !== generation) return;
      // A refusal leaves the approval standing in main — only a decision that
      // succeeded spends it — so the card must stay on screen and pressable.
      // Clearing it here would strand a live approval the owner cannot reach.
      if (!response.ok) { setError(response.message); return; }
      setError(null);
      setCriticCall(null);
    } catch {
      if (routeGeneration.current !== generation) return;
      setError("Cairn could not record that critic-call decision. Review the current task again.");
    } finally {
      // Unconditional: a session refresh bumps the generation while the IPC is
      // in flight, and a guarded reset would leave both controls disabled with
      // no way out — including "Stop this task" on a required critic.
      setCriticCallBusy(false);
    }
  }

  function tryAnother() {
    routeGeneration.current += 1;
    pendingReviewAction.current = null;
    setCriticCall(null);
    setCriticCallBusy(false);
    void cairn.taskPreviewDiscard(dir, previewId ?? undefined);
    void cairn.taskAcknowledge(dir);
    setPhase("entry"); setOutcome(""); setPreviewId(null); setRequestView(null); setRequestContext([]); setTaskSpecPreview(null); setTaskReview(null); setRoute(null); setDisclosure(null); setResult(null); setActivities([]); setError(null); setRealCallConfirmed(false); setSessionWorker(false);
  }

  function leave(): void {
    routeGeneration.current += 1;
    pendingReviewAction.current = null;
    void cairn.taskPreviewDiscard(dir, previewId ?? undefined);
    onBack();
  }

  return (
    <div className="task-run">
      <div className="row spread task-heading">
        <div>
          <p className="eyebrow">one serial task{currentVersion ? ` · Cairn v${currentVersion}` : ""}</p>
          <h1>What should change?</h1>
        </div>
        <Pill kind="quiet" onClick={leave}>← Project home</Pill>
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

      {phase === "route" && taskReview ? (
        <TaskReviewView review={taskReview} heading="Final Task Spec" onAction={(actionId, choice) => void applyTaskReviewChoice(actionId, choice)} />
      ) : phase === "route" && taskSpecPreview ? (
        <TaskSpecProposalPreviewView preview={taskSpecPreview} heading="Final quality plan" />
      ) : null}

      {phase === "route" && route?.status === "connection-required" ? (
        <Card>
          <h2>Connect a model to continue</h2>
          <p>{route.reason}</p>
          <p className="small muted">Install or connect Codex yourself through official Codex controls. Cairn does not open login, read credential files, or choose another provider.</p>
          <div className="row" style={{ marginTop: 12 }}>
            <Pill onClick={tryAnother}>Edit the task</Pill>
            <Pill kind="quiet" onClick={leave}>Return to project</Pill>
          </div>
        </Card>
      ) : null}

      {phase === "route" && route?.status === "ready" ? (
        <>
          {requestView && taskReview === null && taskSpecPreview === null ? (
            <Card title="what you asked for">
              <p className="small muted">Interpretation ({requestView.outcome.source})</p>
              <p>{requestView.outcome.text}</p>
              {requestView.outcome.ownerText !== null ? <p className="task-card-details-text">Your exact words: {requestView.outcome.ownerText}</p> : null}
              {requestView.requirements.map((requirement, index) => (
                <div key={`${requirement.source}-${index}`}>
                  <p className="small muted">Requirement ({requirement.source})</p>
                  <p>{requirement.text}</p>
                  {requirement.ownerText !== null ? <p className="task-card-details-text">Your exact words: {requirement.ownerText}</p> : null}
                </div>
              ))}
              {requestContext.length > 0 ? (
                <div>
                  <p className="small muted">Context</p>
                  {requestContext.map((note, index) => <p key={index}>{note}</p>)}
                </div>
              ) : null}
            </Card>
          ) : null}
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

      {criticCall && (phase === "route" || phase === "running") ? (
        <CriticCallCard
          call={criticCall}
          busy={criticCallBusy}
          onDecide={(action) => void decideCriticCall(criticCall, action)}
        />
      ) : null}
      {phase === "running" && taskReview ? <TaskReviewView review={taskReview} heading="Accepted Task Spec" /> : null}
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
          {taskReview ? <TaskReviewView review={taskReview} heading="Accepted Task Spec" /> : null}
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
            <Pill kind="primary" onClick={() => { void cairn.taskAcknowledge(dir); leave(); }}>Return to project</Pill>
            <Pill onClick={tryAnother}>Try another task</Pill>
          </div>
        </>
      ) : null}
    </div>
  );
}
