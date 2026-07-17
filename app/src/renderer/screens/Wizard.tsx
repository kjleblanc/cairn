import { useEffect, useState } from "react";
import type { UnfinishedTask } from "@cairn/core";
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

function initialPhase(resume: UnfinishedTask | null): Phase {
  if (!resume) return "outcome";
  if (resume.hasReport) return "report";
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
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

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
              <Pill kind="quiet" onClick={() => onDone(false)}>Back to the project</Pill>
              <span className="small muted">Deciding comes in the next part of the loop.</span>
            </div>
          </>
        );
      default:
        return <p className="muted">This part of the loop arrives in the next task.</p>;
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
