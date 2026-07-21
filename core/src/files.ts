import { existsSync, mkdirSync, readFileSync, appendFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface ProjectFacts {
  status: string;
  name: string;
  what: string;
  who: string;
  milestone: string;
  timebox: string;
  contractVersion: string;
}

export interface LogRow {
  task: string;
  date: string;
  lane: string;
  mode: string;
  outcome: string;
  decision: string;
  summary: string;
  moved: string;
}

const LOG_HEADER =
  "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n" +
  "|---|---|---|---|---|---|---|---|\n";

const PILOT_HEADER =
  "| Task | Lane | Time to visible result | Visible progress? | DONE/STOPPED | Rework needed later? | Notes |\n" +
  "|---|---|---|---|---|---|---|\n";

export const paths = {
  contract: (root: string) => join(root, "AGENTS.md"),
  aiWork: (root: string) => join(root, "docs", "ai-work"),
  project: (root: string) => join(root, "docs", "ai-work", "PROJECT.md"),
  log: (root: string) => join(root, "docs", "ai-work", "LOG.md"),
  pilot: (root: string) => join(root, "docs", "ai-work", "PILOT.md"),
  tasks: (root: string) => join(root, "docs", "ai-work", "tasks"),
  brief: (root: string, n: number) => join(paths.tasks(root), `${pad(n)}-brief.md`),
  report: (root: string, n: number) => join(paths.tasks(root), `${pad(n)}-report.md`),
};

export function pad(n: number): string {
  return String(n).padStart(3, "0");
}

let contractOverride: string | null = null;

/** The desktop app bundles core, so import.meta.url probing fails there; it names the asset explicitly instead. */
export function setContractPath(p: string): void {
  contractOverride = p;
}

export function contractTemplate(): string {
  if (contractOverride && existsSync(contractOverride)) return readFileSync(contractOverride, "utf8");
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/src -> package root -> assets
  const candidates = [
    join(here, "..", "..", "assets", "contract.md"),
    join(here, "..", "..", "..", "assets", "contract.md"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return readFileSync(c, "utf8");
  }
  throw new Error("Bundled contract not found — reinstall cairn-cli.");
}

export function isCairnProject(root: string): boolean {
  const file = paths.contract(root);
  if (!existsSync(file)) return false;
  const text = readFileSync(file, "utf8");
  // A real Cairn contract is recognised by structural markers shared by the real
  // contract and every freshly-scaffolded project — not by a bare "Cairn" mention.
  // In the real AGENTS.md the word "Cairn" and "Contract v1.2" fall on separate
  // lines, so we look for a "Contract v<number>" version string, the contract
  // heading, and the project-facts labels rather than a "Cairn Contract v" phrase.
  const hasHeading = /^#[ \t]+Project Contract[ \t]*$/m.test(text);
  const hasVersion = /Contract v[0-9]/.test(text);
  const hasFacts =
    /^STATUS:/m.test(text) &&
    /^PROJECT NAME:/m.test(text) &&
    /^CURRENT MILESTONE:/m.test(text);
  return hasHeading && hasVersion && hasFacts;
}

export function parseFacts(root: string): ProjectFacts {
  const text = readFileSync(paths.contract(root), "utf8");
  const grab = (label: string): string => {
    const m = text.match(new RegExp(`^${label}:[ \\t]*(.*)$`, "m"));
    return m ? m[1].trim() : "";
  };
  const version = text.match(/Contract v([0-9][0-9.]*)/);
  return {
    status: grab("STATUS"),
    name: grab("PROJECT NAME"),
    what: grab("WHAT WE ARE BUILDING"),
    who: grab("WHO WILL USE IT"),
    milestone: grab("CURRENT MILESTONE"),
    timebox: grab("DIRECTION GATE TIMEBOX"),
    contractVersion: version ? version[1] : "",
  };
}

export function fillFacts(template: string, facts: { name: string; what: string; who: string; milestone: string; timebox: string }): string {
  const put = (text: string, re: RegExp, value: string) =>
    text.replace(re, (line) => `${line.split(":")[0]}: ${value}`);
  let out = template;
  out = put(out, /^PROJECT NAME:.*$/m, facts.name);
  out = put(out, /^WHAT WE ARE BUILDING:.*$/m, facts.what);
  out = put(out, /^WHO WILL USE IT:.*$/m, facts.who);
  out = put(out, /^CURRENT MILESTONE:.*$/m, facts.milestone);
  out = put(out, /^DIRECTION GATE TIMEBOX:.*$/m, facts.timebox);
  return out;
}

export function parseLog(root: string): LogRow[] {
  if (!existsSync(paths.log(root))) return [];
  const rows: LogRow[] = [];
  for (const raw of readFileSync(paths.log(root), "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (!cells.length || /^Task$/i.test(cells[0]) || /^[-: ]*$/.test(cells[0])) continue;
    rows.push({
      task: cells[0] ?? "", date: cells[1] ?? "", lane: cells[2] ?? "", mode: cells[3] ?? "",
      outcome: cells[4] ?? "", decision: cells[5] ?? "", summary: cells[6] ?? "", moved: cells[7] ?? "",
    });
  }
  return rows;
}

export function appendLogRow(root: string, row: LogRow): void {
  const clean = (s: string) => s.replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
  const line = `| ${clean(row.task)} | ${clean(row.date)} | ${clean(row.lane)} | ${clean(row.mode)} | ${clean(row.outcome)} | ${clean(row.decision)} | ${clean(row.summary)} | ${clean(row.moved)} |\n`;
  appendFileSync(paths.log(root), line);
}

export function nextTaskNumber(root: string): number {
  const dir = paths.tasks(root);
  if (!existsSync(dir)) return 1;
  let max = 0;
  for (const f of readdirSync(dir)) {
    const m = f.match(/^(\d{3})-/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

export function scaffoldProject(root: string, facts: { name: string; what: string; who: string; milestone: string; timebox: string }): string[] {
  const created: string[] = [];
  const write = (path: string, content: string) => {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, content, { flag: "wx" as never });
    created.push(path);
  };
  write(paths.contract(root), fillFacts(contractTemplate(), facts) + "\n");
  write(
    paths.project(root),
    `# ${facts.name}\n\nGoal: ${facts.what}\n\nUsers: ${facts.who}\n\n` +
      `First visible milestone: ${facts.milestone}\n\n` +
      `Out of scope for now: to be decided as tasks close.\n\nDirection Gate timebox: ${facts.timebox}\n`,
  );
  write(paths.log(root), LOG_HEADER);
  write(paths.pilot(root), PILOT_HEADER);
  mkdirSync(paths.tasks(root), { recursive: true });
  return created;
}
