import { useEffect, useState } from "react";
import type { CloseInput, CoordinatorTaskView, UnfinishedTask } from "@cairn/core";
import type { EngineEvent, OwnerQuestionEvent } from "../../shared/ipc";
import { Badge, Card, ErrorCard, Pill } from "../components/Ui";
import { Md } from "../components/Md";
import { ActivityFeed } from "../components/ActivityFeed";
import { StepRail } from "../components/StepRail";
import { QuestionCard } from "../components/QuestionCard";
import { cairn } from "../api";

type Phase = "outcome" | "defining" | "approve" | "building" | "report" | "reviewing" | "verdict" | "decide" | "integrating";

/**
 * Task 009: what the rest of the window needs to know about the open task, so
 * stepping away shows a truthful live reminder. Purely display information.
 */
export type WizardStatus = {
  taskNumber: number;
  phase: Phase;
  waiting: boolean;
  branch?: string;
  worktree?: string;
  waitingReason?: string;
  blocker?: string;
};

const railStep: Record<Phase, number> = {
  outcome: 0, defining: 0, approve: 1, building: 2, report: 2, reviewing: 3, verdict: 3, decide: 4, integrating: 4,
};

const DECISIONS: { value: CloseInput["decision"]; label: string }[] = [
  { value: "accept", label: "Accept — it does what I wanted" },
  { value: "revise", label: "Revise — not quite; a new task will follow" },
  { value: "rollback", label: "Rollback — undo this in a new task" },
  { value: "defer", label: "Defer — park it for now" },
  { value: "escalate", label: "Escalate — this needs experienced help" },
];

function initialPhase(resume: UnfinishedTask | null): Phase {
  if (!resume) return "outcome";
  if (resume.hasReport) return "decide";
  return "approve";
}

function tryItOf(report: string): string | null {
  const m = report.match(/how[^\n]*try[^\n]*:?\s*([\s\S]{0,300}?)(\n\n|\n[A-Z#])/i);
  return m ? m[1].trim() : null;
}

function refusalReason(blocker?: string): string {
  if (blocker === "PARALLEL_SCOPE_OVERLAP") return "Its declared path overlaps an earlier admitted task.";
  if (blocker === "PARALLEL_EXTERNAL_ACTION_REFUSED") return "It declares an external action, so it cannot use parallel mode.";
  if (blocker === "PARALLEL_EXCLUSIVE_REFUSED") return "Its lane, mode, or dependency requires the ordinary serial path.";
  return "Its classification is incomplete or malformed.";
}

export function Wizard({ dir, resume, sessionId, parallelDraft, onDone, onHome, onStatus }: {
  dir: string; resume: UnfinishedTask | null; onDone: (stoneAdded: boolean) => void;
  sessionId: number; parallelDraft: boolean;
  /** Show the project's home screen while this task stays alive behind it (task 009). */
  onHome: () => void;
  onStatus: (s: WizardStatus) => void;
}) {
  const [phase, setPhase] = useState<Phase>(initialPhase(resume));
  const [taskNumber, setTaskNumber] = useState<number>(resume?.taskNumber ?? 0);
  const [outcome, setOutcome] = useState("");
  const [brief, setBrief] = useState(resume?.briefText ?? "");
  const [approved, setApproved] = useState(resume?.hasApproval ?? false);
  const [report, setReport] = useState(resume?.reportText ?? "");
  const [disposition, setDisposition] = useState<"DONE" | "STOPPED" | "UNKNOWN">(resume?.disposition ?? "UNKNOWN");
  const [review, setReview] = useState<{ text: string; finalVerdict: string } | null>(null);
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<CloseInput["decision"]>("accept");
  const [summary, setSummary] = useState("");
  const [moved, setMoved] = useState<CloseInput["moved"]>("YES");
  const [closing, setClosing] = useState(false);
  const [blocker, setBlocker] = useState(resume?.blocker);
  // Two-way talk (task 008): a pending question from the AI while it writes the
  // brief, and the owner's pre-approval ask-or-change round on the drafted brief.
  const [pendingQ, setPendingQ] = useState<OwnerQuestionEvent | null>(null);
  const [refineMsg, setRefineMsg] = useState("");
  const [refineReply, setRefineReply] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [coordinatorTask, setCoordinatorTask] = useState<Pick<CoordinatorTaskView, "branch" | "worktree" | "waitingReason" | "phase" | "blocker"> | null>(
    resume?.branch && resume.worktree
      ? {
          branch: resume.branch,
          worktree: resume.worktree,
          waitingReason: resume.waitingReason ?? "",
          phase: /^PARALLEL_/.test(resume.blocker ?? "") ? "refused" : "defined",
          blocker: resume.blocker,
        }
      : null,
  );

  useEffect(() => cairn.onEngineEvent((ev) => {
    if (ev.sessionId === sessionId) setEvents((p) => [...p.slice(-199), ev]);
  }), [sessionId]);
  useEffect(() => cairn.onOwnerQuestion((q) => {
    if (q.sessionId === sessionId) setPendingQ(q);
  }), [sessionId]);
  // Task 009: keep the rest of the window informed, so the home and project
  // screens can show a truthful reminder while this task is open behind them.
  useEffect(() => {
    onStatus({
      taskNumber,
      phase,
      waiting: pendingQ !== null || Boolean(coordinatorTask?.waitingReason),
      branch: coordinatorTask?.branch,
      worktree: coordinatorTask?.worktree,
      waitingReason: coordinatorTask?.waitingReason,
      blocker: coordinatorTask?.blocker ?? blocker,
    });
  }, [onStatus, taskNumber, phase, pendingQ, coordinatorTask, blocker]);

  /** Deliver the answer (or a skip) and drop the card. The run resumes either way. */
  function answerQuestion(answer: string | null) {
    const q = pendingQ;
    setPendingQ(null);
    if (q) void cairn.taskAnswer(q.id, answer);
  }

  async function define() {
    if (outcome.trim().length < 5) { setError("Say what you want to see, in a sentence."); return; }
    setError(null); setEvents([]); setPhase("defining");
    const r = await cairn.taskDefine(dir, outcome, sessionId);
    setPendingQ(null); // the run is over — no question can still be waiting
    if (r.ok) {
      setTaskNumber(r.value.taskNumber);
      setBrief(r.value.briefText);
      setCoordinatorTask(r.value.coordinatorTask ?? null);
      setBlocker(r.value.coordinatorTask?.blocker);
      setPhase("approve");
    }
    else { setError(r.message); setPhase("outcome"); }
  }

  async function retryDefinition() {
    setError(null); setEvents([]); setPhase("defining");
    const r = await cairn.taskDefine(dir, `Retry the retained definition for Task ${String(taskNumber).padStart(3, "0")}`, sessionId);
    setPendingQ(null);
    if (r.ok) {
      setTaskNumber(r.value.taskNumber);
      setBrief(r.value.briefText);
      setCoordinatorTask(r.value.coordinatorTask ?? null);
      setBlocker(r.value.coordinatorTask?.blocker);
      setPhase("approve");
    } else {
      setError(r.message);
      setBlocker("DEFINER_ENGINE_FAILED");
      setPhase("approve");
    }
  }

  /** One pre-approval round: a question gets a plain answer; a change request revises the brief file. */
  async function refine() {
    const message = refineMsg.trim();
    if (message.length < 2) { setError("Say it in a sentence."); return; }
    setError(null); setRefining(true); setRefineReply(null);
    const r = await cairn.taskRefine(dir, taskNumber, message, sessionId);
    setRefining(false);
    if (!r.ok) { setError(r.message); return; }
    setRefineMsg("");
    setBrief(r.value.briefText); // what is shown is always the current file — approval hashes exactly this
    setRefineReply(
      r.value.briefChanged
        ? "The brief was revised — read it again before approving. Approving locks exactly the text shown above."
        : r.value.reply.trim() || "Answered — the brief is unchanged.",
    );
  }

  async function build() {
    setError(null); setEvents([]); setPhase("building");
    const b = await cairn.taskBuild(dir, taskNumber, sessionId);
    if (b.ok) {
      setReport(b.value.reportText);
      setDisposition(b.value.disposition);
      setCoordinatorTask((current) => current ? { ...current, waitingReason: "" } : current);
      setBlocker(undefined);
      setPhase("report");
    }
    else {
      setError(b.message);
      if (/BUILDER_ENGINE_FAILED/.test(b.message)) setBlocker("BUILDER_ENGINE_FAILED");
      setPhase("approve");
    }
  }

  async function approveAndBuild() {
    setError(null);
    const a = await cairn.taskApprove(dir, taskNumber);
    if (!a.ok) { setError(a.message); return; }
    setApproved(true);
    await build();
  }

  async function runReview() {
    setError(null); setEvents([]); setPhase("reviewing");
    const r = await cairn.taskReview(dir, taskNumber, sessionId);
    if (r.ok) { setReview(r.value); setPhase("verdict"); }
    else { setError(r.message); setPhase("report"); }
  }

  async function close() {
    if (summary.trim().length === 0) { setError("One line for the log: what did you personally see?"); return; }
    setError(null); setClosing(true);
    if (parallelDraft) setPhase("integrating");
    const r = await cairn.taskClose(dir, taskNumber, { decision, summary, moved }, sessionId);
    setClosing(false);
    if (r.ok) onDone(true);
    else { setError(r.message); setPhase("decide"); }
  }

  const body = (() => {
    switch (phase) {
      case "outcome":
        return (
          <Card title="what do you want to see?">
            <p className="muted">One visible outcome, in plain language. Small is good.</p>
            <input type="text" value={outcome} onChange={(e) => setOutcome(e.target.value)}
              placeholder="The home page shows my list of books" />
            <div className="row" style={{ marginTop: 12 }}>
              <Pill kind="primary" onClick={() => void define()}>Write the brief</Pill>
              <Pill kind="quiet" onClick={() => onDone(false)}>Back to the project</Pill>
            </div>
          </Card>
        );
      case "defining":
        return (
          <>
            {pendingQ ? <QuestionCard q={pendingQ} onAnswer={answerQuestion} /> : null}
            <Card title="writing the brief">
              <p className="muted">
                {pendingQ
                  ? "Paused — the AI is waiting for your answer above. Skipping is always fine."
                  : "A fresh agent is turning your outcome into an exact, bounded task…"}
              </p>
              <ActivityFeed events={events} />
            </Card>
          </>
        );
      case "approve":
        if (/^PARALLEL_/.test(blocker ?? coordinatorTask?.blocker ?? "")) {
          return (
            <>
              <Card title="refused — not queued">
                <p><strong>{blocker ?? coordinatorTask?.blocker}</strong></p>
                <p>{refusalReason(blocker ?? coordinatorTask?.blocker)}</p>
                <p className="small muted">Cairn retained this task number, brief, branch, worktree, and refusal evidence. It cannot be approved or built and does not consume one of the two safe-task slots.</p>
              </Card>
              <Card title={`task ${String(taskNumber).padStart(3, "0")} — retained brief`}>
                <Md text={brief} />
              </Card>
            </>
          );
        }
        if (blocker === "DEFINER_ENGINE_FAILED") {
          return (
            <>
              <Card title="definition stopped safely">
                <p>Cairn kept Task {String(taskNumber).padStart(3, "0")}, its branch, worktree, and partial brief. Retry continues this same task instead of reserving another number.</p>
                <Pill kind="primary" onClick={() => void retryDefinition()}>Retry definition for Task {String(taskNumber).padStart(3, "0")}</Pill>
              </Card>
              <Card title="retained partial brief"><Md text={brief || "No partial brief text was written before the engine stopped."} /></Card>
            </>
          );
        }
        return (
          <>
            {blocker === "BUILDER_ENGINE_FAILED" ? (
              <Card title="build stopped safely">
                <p>Cairn kept this exact approval, task branch, worktree, and partial allowed work. Retry inspects those retained files before the builder runs again.</p>
              </Card>
            ) : null}
            <Card title={`task ${String(taskNumber).padStart(3, "0")} — the brief`}>
              <Md text={brief} />
            </Card>
            <div className="row">
              {approved ? (
                <>
                  <span className="badge badge-done">🔒 brief locked</span>
                  <Pill kind="primary" onClick={() => void build()}>
                    {blocker === "BUILDER_ENGINE_FAILED" ? `Retry build for Task ${String(taskNumber).padStart(3, "0")}` : "Build it"}
                  </Pill>
                </>
              ) : (
                <Pill kind="primary" onClick={() => void approveAndBuild()} disabled={refining}>Approve this exact brief</Pill>
              )}
              <Pill kind="quiet" onClick={() => onDone(false)}>Not yet</Pill>
              <span className="small muted">Nothing is built until you approve. Approving locks the brief.</span>
            </div>
            {approved ? null : (
              <Card title="ask a question or request a change">
                <p className="muted small">
                  Nothing is locked yet. A question gets a plain answer; a change request revises the
                  brief — and you read the new version here before approving anything.
                </p>
                <input
                  type="text"
                  value={refineMsg}
                  onChange={(e) => setRefineMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !refining) void refine(); }}
                  placeholder="e.g. Why is that file excluded? / Please keep it to one screen"
                />
                <div className="row" style={{ marginTop: 12 }}>
                  <Pill kind="soft" onClick={() => void refine()} disabled={refining}>
                    {refining ? "Thinking it over…" : "Send to the AI"}
                  </Pill>
                </div>
                {refineReply ? <p className="small refine-reply">{refineReply}</p> : null}
              </Card>
            )}
          </>
        );
      case "building":
        return (
          <Card title="building">
            <p className="muted">Only what the brief allows. Blocked actions show up here in amber.</p>
            <ActivityFeed events={events} />
          </Card>
        );
      case "report":
        return (
          <>
            <div className="row" style={{ marginBottom: 10 }}>
              <Badge kind={disposition} />
            </div>
            {tryItOf(report) ? (
              <Card title="try it yourself before deciding"><Md text={tryItOf(report)!} /></Card>
            ) : null}
            <Card title={`task ${String(taskNumber).padStart(3, "0")} — the report`}>
              <Md text={report || "The builder wrote no report."} />
            </Card>
            <div className="row">
              <Pill kind={disposition === "DONE" ? "soft" : "primary"} onClick={() => void runReview()}>Run a fresh review</Pill>
              <Pill kind={disposition === "DONE" ? "primary" : "soft"} onClick={() => setPhase("decide")}>Skip to the decision</Pill>
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>A fresh review is recommended after any stopped task and every third task.</p>
          </>
        );
      case "reviewing":
        return (
          <Card title="fresh eyes at work">
            <p className="muted">A reviewer that didn't build this is checking the work. The builder's report stays locked until the reviewer forms its own view.</p>
            <ActivityFeed events={events} />
          </Card>
        );
      case "verdict":
        return (
          <>
            <Card title={`the reviewer's verdict — ${review?.finalVerdict ?? ""}`}>
              <Md text={review?.text ?? ""} />
            </Card>
            <Pill kind="primary" onClick={() => setPhase("decide")}>On to your decision</Pill>
          </>
        );
      case "decide":
        return (
          <>
            <Card title="your decision closes the task">
              <p className="muted">What happened when you tried it?</p>
              <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                {DECISIONS.map((d) => (
                  <Pill key={d.value} kind={decision === d.value ? "primary" : "soft"} onClick={() => setDecision(d.value)}>
                    {d.label}
                  </Pill>
                ))}
              </div>
            </Card>
            <Card title="one line for the log">
              <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)}
                placeholder="What did you personally see?" />
              <p style={{ marginTop: 12 }}>Did this visibly move the milestone?</p>
              <div className="row">
                {(["YES", "NO", "UNCLEAR"] as const).map((m) => (
                  <Pill key={m} kind={moved === m ? "primary" : "soft"} onClick={() => setMoved(m)}>
                    {m === "YES" ? "Yes" : m === "NO" ? "No" : "Unclear"}
                  </Pill>
                ))}
              </div>
            </Card>
            <Pill kind="primary" onClick={() => void close()} disabled={closing}>
              {closing ? "Closing…" : "Close the task — a stone on your cairn"}
            </Pill>
          </>
        );
      case "integrating":
        return (
          <Card title="serialized integration">
            <p className="muted">This accepted task is updating against latest main, rerunning its approved checks, and waiting for the one-at-a-time integration gate.</p>
            <p className="small mono">The other task remains open and independently navigable.</p>
          </Card>
        );
    }
  })();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="row spread wizard-top">
        <Pill kind="quiet" onClick={onHome}>← Project home</Pill>
        {phase === "defining" || phase === "building" || phase === "reviewing"
          ? <span className="small muted">the AI keeps working if you step away</span>
          : null}
      </div>
      <StepRail current={railStep[phase]} />
      {error ? <ErrorCard message={error} /> : null}
      {body}
    </div>
  );
}
