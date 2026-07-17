import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  approveBrief, buildTask, checkDirectionGate, closeTask, defineTask, isCairnProject,
  pad, parseFacts, parseLog, pickEngine, reviewTask, runDirectionCheck,
  type RunEvents,
} from "@cairn/core";
import { banner, label, spinnerLine } from "../ui.js";

function events(spin: { message: (m: string) => void }): RunEvents {
  // spinnerLine bounds the status to the terminal width so a long agent line can never
  // wrap and flood the console (see ui.ts). It reads process.stdout.columns each call,
  // so it follows the window even if it is resized mid-run.
  const status = (raw: string) => spin.message(pc.dim(spinnerLine(raw, process.stdout.columns)));
  return {
    onText: (t) => { if (t.trim()) status(t); },
    onTool: (name, detail) => status(`${name}: ${detail}`),
    onDenied: (name, why) => p.log.warn(`${label.denied} ${name} — ${why}`),
  };
}

const cost = (usd?: number) => (usd ? pc.dim(`  ($${usd.toFixed(2)})`) : "");

export async function taskFlow(root: string, opts: { mock: boolean }): Promise<void> {
  console.log(banner());

  if (!isCairnProject(root)) {
    p.log.error("No Cairn contract here. Run `cairn init` in an empty folder, or use Project Conversion for existing work.");
    process.exitCode = 1;
    return;
  }
  const facts = parseFacts(root);
  if (facts.status && facts.status !== "ACTIVE") {
    p.log.error(`The contract status is "${facts.status}" — it doesn't govern this project yet. Finish the conversion first.`);
    process.exitCode = 1;
    return;
  }

  p.intro(`${facts.name || "Your project"} — milestone: ${facts.milestone || "not set"}`);
  const engine = pickEngine(opts.mock);

  // ---- Direction Gate: computed from the log, enforced before anything else.
  const gate = checkDirectionGate(parseLog(root));
  if (gate.tripped) {
    p.log.error(`${label.gate} ${gate.reason}`);
    p.log.info("No third narrow patch. Running a direction check instead — nothing will be changed.");
    const spin = p.spinner();
    spin.start("Thinking about genuinely different options…");
    const res = await runDirectionCheck(root, gate.reason, engine, events(spin));
    spin.stop("Direction check complete.");
    p.note(res.text.slice(0, 4000), "Your options");
    p.outro("Choose a different approach, a smaller milestone, help, or a pause — then run `cairn task` again.");
    return;
  }

  // ---- 1. DEFINE
  const outcome = await p.text({
    message: "What do you want to see? (one visible outcome, plain language)",
    placeholder: "The home page shows my list of books",
    validate: (v) => (v && v.trim().length > 4 ? undefined : "Say what you want to see, in a sentence."),
  });
  if (p.isCancel(outcome)) { p.cancel("Nothing was changed."); return; }

  const dSpin = p.spinner();
  dSpin.start("Writing the brief…");
  let def;
  try {
    def = await defineTask(root, String(outcome), engine, events(dSpin));
  } catch (err) {
    dSpin.stop("The definer stopped.");
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }
  dSpin.stop(`Brief drafted.${cost(def.costUsd)}`);
  p.note(def.briefText.slice(0, 4000), `The brief — docs/ai-work/tasks/${pad(def.taskNumber)}-brief.md`);

  // ---- 2. THE APPROVAL GATE (human action; hash-locked and persisted)
  const approve = await p.confirm({
    message: "Approve this exact brief? Nothing is built until you say yes.",
    initialValue: false,
  });
  if (p.isCancel(approve) || !approve) {
    p.cancel(`Not approved. The brief stays at docs/ai-work/tasks/${pad(def.taskNumber)}-brief.md — edit your outcome and run \`cairn task\` again.`);
    return;
  }
  const approval = approveBrief(root, def.taskNumber);
  p.log.success(`Approval recorded (brief locked: ${approval.briefSha256.slice(0, 12)}…).`);

  // ---- 3. BUILD (fresh session; buildTask re-reads and re-checks the approval file)
  const bSpin = p.spinner();
  bSpin.start("Building — only what the brief allows…");
  const build = await buildTask(root, def.taskNumber, engine, events(bSpin));
  bSpin.stop(`Build finished.${cost(build.costUsd)}`);

  p.log.info(`Outcome: ${build.disposition === "DONE" ? label.done : build.disposition === "STOPPED" ? label.stopped : pc.yellow("no clear disposition")}`);
  if (build.reportText) p.note(build.reportText.slice(0, 4000), `The report — docs/ai-work/tasks/${pad(def.taskNumber)}-report.md`);

  const howM = (build.reportText.match(/how[^\n]*try[^\n]*:?\s*([\s\S]{0,300}?)(\n\n|\n[A-Z#])/i) || [])[1];
  if (howM) p.note(howM.trim(), "Try it yourself before deciding");

  // ---- 4. VERIFY (optional fresh-context review; report locked until provisional verdict)
  const wantReview = await p.confirm({ message: "Run a fresh-context review now? (recommended every third task and after any STOPPED)", initialValue: build.disposition !== "DONE" });
  let verdict = "";
  if (!p.isCancel(wantReview) && wantReview) {
    const rSpin = p.spinner();
    rSpin.start("Fresh reviewer at work — the builder's report is locked until it forms its own view…");
    const review = await reviewTask(root, def.taskNumber, engine, events(rSpin));
    verdict = review.finalVerdict;
    rSpin.stop(`Review complete: ${pc.bold(verdict)}${cost(review.costUsd)}`);
    p.note(review.text.slice(0, 4000), "The reviewer's verdict");
  }

  // ---- 5. DECIDE (human; core writes the log row)
  const decision = await p.select({
    message: "Your decision closes the task. What happened when you tried it?",
    options: [
      { value: "accept", label: "Accept — it does what I wanted" },
      { value: "revise", label: "Revise — not quite; a new task will follow" },
      { value: "rollback", label: "Rollback — undo this in a new task" },
      { value: "defer", label: "Defer — park it for now" },
      { value: "escalate", label: "Escalate — this needs experienced help" },
    ],
  });
  if (p.isCancel(decision)) { p.cancel("Task left open — run `cairn task` later to continue."); return; }
  const saw = await p.text({ message: "One line for the log: what did you personally see?", placeholder: "The list shows all three books I typed in" });
  const summary = p.isCancel(saw) ? "" : String(saw);
  const moved = await p.select({
    message: "Did this visibly move the milestone?",
    options: [
      { value: "YES", label: "Yes" },
      { value: "NO", label: "No" },
      { value: "UNCLEAR", label: "Unclear" },
    ],
  });

  closeTask(root, def.taskNumber, {
    decision: String(decision) as "accept" | "revise" | "rollback" | "defer" | "escalate",
    summary: summary || String(outcome),
    moved: p.isCancel(moved) ? "UNCLEAR" : (String(moved) as "YES" | "NO" | "UNCLEAR"),
  });
  p.log.success("Logged in docs/ai-work/LOG.md — a stone on your cairn.");
  p.outro(`Task ${pad(def.taskNumber)} closed${verdict ? ` (review: ${verdict})` : ""}. Next task: \`cairn task\` — each task gets a fresh start.`);
}
