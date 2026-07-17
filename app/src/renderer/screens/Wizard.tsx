import { useEffect, useState } from "react";
import type { CloseInput, UnfinishedTask } from "@cairn/core";
import type { EngineEvent } from "../../shared/ipc";
import { Badge, Card, ErrorCard, Pill } from "../components/Ui";
import { Md } from "../components/Md";
import { ActivityFeed } from "../components/ActivityFeed";
import { StepRail } from "../components/StepRail";
import { cairn } from "../api";

type Phase = "outcome" | "defining" | "approve" | "building" | "report" | "reviewing" | "verdict" | "decide";

const railStep: Record<Phase, number> = {
  outcome: 0, defining: 0, approve: 1, building: 2, report: 2, reviewing: 3, verdict: 3, decide: 4,
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

export function Wizard({ dir, resume, onDone }: {
  dir: string; resume: UnfinishedTask | null; onDone: (stoneAdded: boolean) => void;
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

  useEffect(() => cairn.onEngineEvent((ev) => setEvents((p) => [...p.slice(-199), ev])), []);

  async function define() {
    if (outcome.trim().length < 5) { setError("Say what you want to see, in a sentence."); return; }
    setError(null); setEvents([]); setPhase("defining");
    const r = await cairn.taskDefine(dir, outcome);
    if (r.ok) { setTaskNumber(r.value.taskNumber); setBrief(r.value.briefText); setPhase("approve"); }
    else { setError(r.message); setPhase("outcome"); }
  }

  async function build() {
    setError(null); setEvents([]); setPhase("building");
    const b = await cairn.taskBuild(dir, taskNumber);
    if (b.ok) { setReport(b.value.reportText); setDisposition(b.value.disposition); setPhase("report"); }
    else { setError(b.message); setPhase("approve"); }
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
    const r = await cairn.taskReview(dir, taskNumber);
    if (r.ok) { setReview(r.value); setPhase("verdict"); }
    else { setError(r.message); setPhase("report"); }
  }

  async function close() {
    if (summary.trim().length === 0) { setError("One line for the log: what did you personally see?"); return; }
    setError(null); setClosing(true);
    const r = await cairn.taskClose(dir, taskNumber, { decision, summary, moved });
    setClosing(false);
    if (r.ok) onDone(true);
    else setError(r.message);
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
          <Card title="writing the brief">
            <p className="muted">A fresh agent is turning your outcome into an exact, bounded task…</p>
            <ActivityFeed events={events} />
          </Card>
        );
      case "approve":
        return (
          <>
            <Card title={`task ${String(taskNumber).padStart(3, "0")} — the brief`}>
              <Md text={brief} />
            </Card>
            <div className="row">
              {approved ? (
                <>
                  <span className="badge badge-done">🔒 brief locked</span>
                  <Pill kind="primary" onClick={() => void build()}>Build it</Pill>
                </>
              ) : (
                <Pill kind="primary" onClick={() => void approveAndBuild()}>Approve this exact brief</Pill>
              )}
              <Pill kind="quiet" onClick={() => onDone(false)}>Not yet</Pill>
              <span className="small muted">Nothing is built until you approve. Approving locks the brief.</span>
            </div>
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
    }
  })();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <StepRail current={railStep[phase]} />
      {error ? <ErrorCard message={error} /> : null}
      {body}
    </div>
  );
}
