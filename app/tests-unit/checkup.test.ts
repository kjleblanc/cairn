import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCheckup, type ExecFn, type ExecResult } from "../src/main/checkup.js";
import type { CheckupFinding } from "../src/shared/ipc.js";

/**
 * Task 160's pins for the checkup engine. Fixtures are real directories
 * (the module's fs reads are its honest reads); git is always the injected
 * stub, so no test ever touches a real repository.
 */

const CONTRACT = (version: string) => `# Project Contract

Cairn Contract v${version}

\`\`\`text
STATUS: ACTIVE
PROJECT NAME: Fixture
WHAT WE ARE BUILDING: a fixture
WHO WILL USE IT: me
CURRENT MILESTONE: see it
\`\`\`
`;

const LOG_HEADER =
  "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n" +
  "|---|---|---|---|---|---|---|---|\n";

function logRow(task: string, outcome: string): string {
  return `| ${task} | 2026-08-01 | Standard | Applied | ${outcome} | completed | fixture summary | NO |\n`;
}

type FixtureSpec = {
  contractVersion?: string;
  templateVersion?: string | null;
  projectMd?: string | null;
  tasks?: Array<{ n: number; brief?: boolean; report?: boolean }>;
  logRows?: Array<{ task: string; outcome: string }>;
};

function makeProject(spec: FixtureSpec): string {
  const dir = mkdtempSync(join(tmpdir(), "cairn-checkup-"));
  writeFileSync(join(dir, "AGENTS.md"), CONTRACT(spec.contractVersion ?? "0.6.0"));
  if (spec.templateVersion != null) {
    writeFileSync(join(dir, "CONTRACT-TEMPLATE.md"), `# Project Contract\n\nCairn Contract v${spec.templateVersion}\n`);
  }
  if (spec.projectMd != null) {
    mkdirSync(join(dir, "docs", "ai-work"), { recursive: true });
    writeFileSync(join(dir, "docs", "ai-work", "PROJECT.md"), spec.projectMd);
  }
  if (spec.logRows) {
    mkdirSync(join(dir, "docs", "ai-work"), { recursive: true });
    writeFileSync(
      join(dir, "docs", "ai-work", "LOG.md"),
      LOG_HEADER + spec.logRows.map((r) => logRow(r.task, r.outcome)).join(""),
    );
  }
  for (const t of spec.tasks ?? []) {
    const tasksDir = join(dir, "docs", "ai-work", "tasks");
    mkdirSync(tasksDir, { recursive: true });
    const label = String(t.n).padStart(3, "0");
    if (t.brief) writeFileSync(join(tasksDir, `${label}-brief.md`), `# Task ${label} brief\n`);
    if (t.report) writeFileSync(join(tasksDir, `${label}-report.md`), `# Task ${label} report\n`);
  }
  return dir;
}

/** Git answers keyed by the exact joined argv; anything unmatched "fails",
 * the way a non-repository or a missing upstream fails for real git. */
function stubGit(table: Record<string, Partial<ExecResult>>): ExecFn {
  return (args: string[]): ExecResult => {
    const r = table[args.join(" ")];
    return r ? { status: 0, stdout: "", stderr: "", ...r } : { status: 1, stdout: "", stderr: "" };
  };
}

const CLEAN_REPO = {
  "rev-parse --git-dir": {},
  "rev-parse --abbrev-ref --symbolic-full-name @{u}": { stdout: "origin/main\n" },
  "rev-list --count @{u}..HEAD": { stdout: "0\n" },
  "status --porcelain": { stdout: "" },
};

function titles(report: { findings: CheckupFinding[] }, group: string): string[] {
  return report.findings.filter((f) => f.group === group).map((f) => f.title);
}

test("a tidy project comes back Healthy with its healthy rows asserted", () => {
  const dir = makeProject({
    templateVersion: "0.6.0",
    tasks: [
      { n: 1, brief: true, report: true },
      { n: 2, brief: true, report: true },
    ],
    logRows: [
      { task: "001", outcome: "DONE" },
      { task: "002", outcome: "DONE" },
    ],
  });
  const report = runCheckup(dir, stubGit(CLEAN_REPO));
  assert.equal(report.verdict, "Healthy");
  assert.equal(report.findings.some((f) => f.group === "risk"), false);
  assert.equal(report.findings.some((f) => f.group === "attention"), false);
  const ok = titles(report, "healthy");
  assert.ok(ok.some((t) => t.includes("Records intact — 2 brief/report pairs")), ok.join(" | "));
  assert.ok(ok.some((t) => t.includes("Contract in sync — v0.6.0")), ok.join(" | "));
  assert.ok(ok.some((t) => t.includes("Working tree clean")), ok.join(" | "));
  assert.ok(ok.some((t) => t.includes("Everything committed is also pushed")), ok.join(" | "));
  assert.deepEqual(report.counts, { done: 2, stopped: 0, inFlight: 0, unlogged: 0, total: 2 });
  assert.deepEqual(report.trail.map((t) => [t.n, t.state]), [[1, "done"], [2, "done"]]);
});

test("twenty-plus unpushed commits are the risk row, with a push suggestion", () => {
  const dir = makeProject({
    tasks: [{ n: 1, brief: true, report: true }],
    logRows: [{ task: "001", outcome: "DONE" }],
  });
  const report = runCheckup(dir, stubGit({ ...CLEAN_REPO, "rev-list --count @{u}..HEAD": { stdout: "25\n" } }));
  assert.equal(report.verdict, "Needs a decision");
  const risks = report.findings.filter((f) => f.group === "risk");
  assert.equal(risks.length, 1);
  assert.ok(risks[0].title.includes("25 commits not pushed"), risks[0].title);
  assert.equal(risks[0].suggestionLabel, "Make the push decision");
  assert.ok((risks[0].suggestion ?? "").includes("25 unpushed commits"));
});

test("a few unpushed commits are attention, not risk", () => {
  const dir = makeProject({ tasks: [{ n: 1, brief: true, report: true }], logRows: [{ task: "001", outcome: "DONE" }] });
  const report = runCheckup(dir, stubGit({ ...CLEAN_REPO, "rev-list --count @{u}..HEAD": { stdout: "3\n" } }));
  assert.equal(report.verdict, "Mostly healthy");
  assert.ok(titles(report, "attention").some((t) => t.includes("3 commits not pushed")));
  assert.equal(report.findings.some((f) => f.group === "risk"), false);
});

test("in-flight brief, numbering gap, and a stopped last row are told apart", () => {
  const dir = makeProject({
    tasks: [
      { n: 1, brief: true, report: true },
      { n: 2, brief: true, report: true },
      // 003 has neither file: the gap.
      { n: 4, brief: true }, // the in-flight task (it is the latest)
    ],
    logRows: [
      { task: "001", outcome: "DONE" },
      { task: "002", outcome: "STOPPED" },
    ],
  });
  const report = runCheckup(dir, stubGit(CLEAN_REPO));
  const attn = titles(report, "attention");
  assert.ok(attn.some((t) => t.includes("Missing records for task 003")), attn.join(" | "));
  assert.ok(attn.some((t) => t.includes("Task 004 is in flight")), attn.join(" | "));
  assert.ok(attn.some((t) => t.includes("latest logged task stopped")), attn.join(" | "));
  // The in-flight task carries no suggestion — it is normal work, not a fix.
  const inflight = report.findings.find((f) => f.title.includes("in flight"));
  assert.equal(inflight?.suggestion, undefined);
  // The stopped-run-is-honest healthy row only fires when the last row is not STOPPED.
  assert.equal(titles(report, "healthy").some((t) => t.includes("filed honestly")), false);
  assert.deepEqual(report.counts, { done: 1, stopped: 1, inFlight: 1, unlogged: 0, total: 3 });
  assert.deepEqual(report.trail.map((t) => [t.n, t.state]), [[1, "done"], [2, "stopped"], [4, "inflight"]]);
  assert.equal(report.verdict, "Mostly healthy");
});

test("a stale brief (not the latest task) is a different finding than in-flight", () => {
  const dir = makeProject({
    tasks: [
      { n: 1, brief: true, report: true },
      { n: 2, brief: true }, // never reported, and not the latest
      { n: 3, brief: true, report: true },
    ],
    logRows: [
      { task: "001", outcome: "DONE" },
      { task: "002", outcome: "DONE" },
      { task: "003", outcome: "DONE" },
    ],
  });
  const report = runCheckup(dir, stubGit(CLEAN_REPO));
  const attn = titles(report, "attention");
  assert.ok(attn.some((t) => t.includes("Task 002 has a brief but no report")), attn.join(" | "));
  assert.equal(attn.some((t) => t.includes("in flight")), false);
});

test("a report with neither brief nor log row is named both ways, honestly", () => {
  const dir = makeProject({
    tasks: [
      { n: 1, brief: true, report: true },
      { n: 2, report: true }, // report only
    ],
    logRows: [{ task: "001", outcome: "DONE" }],
  });
  const report = runCheckup(dir, stubGit(CLEAN_REPO));
  const attn = titles(report, "attention");
  assert.ok(attn.some((t) => t.includes("Task 002 has a report but no brief")), attn.join(" | "));
  assert.ok(attn.some((t) => t.includes("Task 002's report is not in the log")), attn.join(" | "));
  assert.deepEqual(report.trail.map((t) => [t.n, t.state]), [[1, "done"], [2, "unlogged"]]);
});

test("contract and PROJECT.md drift are two separate attention rows", () => {
  const dir = makeProject({
    contractVersion: "0.6.0",
    templateVersion: "0.5.0",
    projectMd: "# Fixture\n\nEvidence level (contract v0.5.0): Verified\n",
    tasks: [{ n: 1, brief: true, report: true }],
    logRows: [{ task: "001", outcome: "DONE" }],
  });
  const report = runCheckup(dir, stubGit(CLEAN_REPO));
  const attn = titles(report, "attention");
  assert.ok(attn.some((t) => t.includes("Contract drift")), attn.join(" | "));
  assert.ok(attn.some((t) => t.includes("Doc drift")), attn.join(" | "));
  const doc = report.findings.find((f) => f.title === "Doc drift");
  assert.ok(doc?.detail.includes("v0.5.0") && doc.detail.includes("v0.6.0"), doc?.detail);
  assert.equal(titles(report, "healthy").some((t) => t.includes("Contract in sync")), false);
});

test("uncommitted and untracked work are told with names, and clean means clean", () => {
  const dir = makeProject({
    tasks: [{ n: 1, brief: true, report: true }],
    logRows: [{ task: "001", outcome: "DONE" }],
  });
  const dirty = stubGit({
    ...CLEAN_REPO,
    "status --porcelain": { stdout: " M src/a.ts\n M src/b.ts\n?? debug.log\n?? design/\n" },
  });
  const report = runCheckup(dir, dirty);
  const attn = titles(report, "attention");
  assert.ok(attn.some((t) => t.includes("Uncommitted changes in 2 files")), attn.join(" | "));
  const untracked = report.findings.find((f) => f.title.includes("untracked"));
  assert.ok(untracked?.title.includes("debug.log"), untracked?.title);
  assert.equal(titles(report, "healthy").some((t) => t.includes("Working tree clean")), false);
});

test("no upstream reads as no backup; no git repo skips git findings entirely", () => {
  const dir = makeProject({
    tasks: [{ n: 1, brief: true, report: true }],
    logRows: [{ task: "001", outcome: "DONE" }],
  });
  const noUpstream = runCheckup(dir, stubGit({ "rev-parse --git-dir": {} }));
  assert.ok(titles(noUpstream, "attention").some((t) => t.includes("No backup remote")));

  const noGit = runCheckup(dir, stubGit({}));
  assert.equal(noGit.findings.some((f) => f.title.includes("backup")), false);
  assert.equal(noGit.findings.some((f) => f.title.includes("untracked")), false);
  assert.equal(noGit.findings.some((f) => f.title.includes("Working tree")), false);
});

test("stopped runs filed behind later DONE rows are named as honest history", () => {
  const dir = makeProject({
    tasks: [
      { n: 1, brief: true, report: true },
      { n: 2, brief: true, report: true },
      { n: 3, brief: true, report: true },
    ],
    logRows: [
      { task: "001", outcome: "DONE" },
      { task: "002", outcome: "STOPPED" },
      { task: "003", outcome: "DONE" },
    ],
  });
  const report = runCheckup(dir, stubGit(CLEAN_REPO));
  assert.ok(titles(report, "healthy").some((t) => t.includes("1 stopped run filed honestly")));
  assert.equal(titles(report, "attention").some((t) => t.includes("latest logged task stopped")), false);
});

test("a folder with no contract is refused, not audited", () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-checkup-plain-"));
  assert.throws(() => runCheckup(dir, stubGit({})), /no Cairn contract/i);
});
