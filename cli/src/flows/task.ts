import * as p from "@clack/prompts";
import pc from "picocolors";
import { readFileSync, existsSync } from "node:fs";
import {
  appendLogRow, isCairnProject, nextTaskNumber, pad, parseFacts, parseLog, paths,
  assertApprovalValid, checkDirectionGate, recordApproval,
  pickEngine, RunEvents,
  builderPrompt, definerPrompt, directionPrompt, reviewerPrompt,
  dispositionOf, finalVerdictOf,
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
    const res = await engine.run(
      { role: "direction", root, system: directionPrompt(root, gate.reason).system, user: directionPrompt(root, gate.reason).user },
      events(spin),
    );
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

  const taskNumber = nextTaskNumber(root);
  const dSpin = p.spinner();
  dSpin.start(`Task ${pad(taskNumber)} — writing the brief…`);
  const dp = definerPrompt(root, taskNumber, String(outcome));
  const defRes = await engine.run({ role: "definer", root, taskNumber, system: dp.system, user: dp.user }, events(dSpin));
  dSpin.stop(`Brief drafted.${defRes.costUsd ? pc.dim(`  ($${defRes.costUsd.toFixed(2)})`) : ""}`);

  const briefPath = paths.brief(root, taskNumber);
  if (!existsSync(briefPath)) {
    p.log.error("The definer produced no brief file. Nothing was approved and nothing will be built.");
    process.exitCode = 1;
    return;
  }
  p.note(readFileSync(briefPath, "utf8").slice(0, 4000), `The brief — docs/ai-work/tasks/${pad(taskNumber)}-brief.md`);

  // ---- 2. THE APPROVAL GATE (human action; hash-locked)
  const approve = await p.confirm({
    message: "Approve this exact brief? Nothing is built until you say yes.",
    initialValue: false,
  });
  if (p.isCancel(approve) || !approve) {
    p.cancel(`Not approved. The brief stays at docs/ai-work/tasks/${pad(taskNumber)}-brief.md — edit your outcome and run \`cairn task\` again.`);
    return;
  }
  const approval = recordApproval(taskNumber, briefPath);
  p.log.success(`Approval recorded (brief locked: ${approval.briefSha256.slice(0, 12)}…).`);

  // ---- 3. BUILD (fresh session; the gate re-checks the brief hash first)
  assertApprovalValid(approval);
  const bSpin = p.spinner();
  bSpin.start("Building — only what the brief allows…");
  const bp = builderPrompt(root, taskNumber);
  const buildRes = await engine.run({ role: "builder", root, taskNumber, system: bp.system, user: bp.user }, events(bSpin));
  bSpin.stop(`Build finished.${buildRes.costUsd ? pc.dim(`  ($${buildRes.costUsd.toFixed(2)})`) : ""}`);

  const reportPath = paths.report(root, taskNumber);
  const report = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
  const disposition = dispositionOf(report || buildRes.text);
  p.log.info(`Outcome: ${disposition === "DONE" ? label.done : disposition === "STOPPED" ? label.stopped : pc.yellow("no clear disposition")}`);
  if (report) p.note(report.slice(0, 4000), `The report — docs/ai-work/tasks/${pad(taskNumber)}-report.md`);

  const howM = (report.match(/how[^\n]*try[^\n]*:?\s*([\s\S]{0,300}?)(\n\n|\n[A-Z#])/i) || [])[1];
  if (howM) p.note(howM.trim(), "Try it yourself before deciding");

  // ---- 4. VERIFY (optional fresh-context review; report locked until provisional verdict)
  const wantReview = await p.confirm({ message: "Run a fresh-context review now? (recommended every third task and after any STOPPED)", initialValue: disposition !== "DONE" });
  let verdict = "";
  if (!p.isCancel(wantReview) && wantReview) {
    const rSpin = p.spinner();
    rSpin.start("Fresh reviewer at work — the builder's report is locked until it forms its own view…");
    const rp = reviewerPrompt(root, taskNumber);
    const revRes = await engine.run({ role: "reviewer", root, taskNumber, system: rp.system, user: rp.user }, events(rSpin));
    verdict = finalVerdictOf(revRes.text);
    rSpin.stop(`Review complete: ${pc.bold(verdict)}${revRes.costUsd ? pc.dim(`  ($${revRes.costUsd.toFixed(2)})`) : ""}`);
    p.note(revRes.text.slice(0, 4000), "The reviewer's verdict");
  }

  // ---- 5. DECIDE (human; the CLI writes the log row itself)
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

  appendLogRow(root, {
    task: pad(taskNumber),
    date: new Date().toISOString().slice(0, 10),
    lane: "Standard",
    mode: /Mode:\s*Final/i.test(readFileSync(briefPath, "utf8")) ? "Final" : "Draft",
    outcome: disposition === "UNKNOWN" ? "STOPPED" : disposition,
    decision: String(decision),
    summary: summary || String(outcome),
    moved: p.isCancel(moved) ? "UNCLEAR" : String(moved),
  });
  p.log.success("Logged in docs/ai-work/LOG.md — a stone on your cairn.");
  p.outro(`Task ${pad(taskNumber)} closed${verdict ? ` (review: ${verdict})` : ""}. Next task: \`cairn task\` — each task gets a fresh start.`);
}
