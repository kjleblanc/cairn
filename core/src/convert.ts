import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join, sep } from "node:path";
import {
  LOG_HEADER,
  contractTemplate,
  fillFacts,
  isCairnProject,
  paths,
} from "./files.js";
import { hasLegacyState } from "./steps.js";

/**
 * Task 161: project conversion — turning an ordinary existing folder into a
 * governed Cairn project, deterministically, from the desktop's projects
 * screen. This module is the whole write path; the app only renders what
 * `inspectConversion` found and forwards the owner's approval to
 * `convertProject`.
 *
 * The module's law (the brief's boundary of intent):
 * - PRESERVE. Conversion only ever CREATES new paths (every write uses the
 *   wx flag, so an existing file cannot be overwritten even by accident).
 *   A pre-existing non-Cairn AGENTS.md is a hard refusal, not a judgment
 *   call: rule conflicts belong to the guided paste flow in
 *   PROJECT-CONVERSION.md, where a person reads them.
 * - LOCAL and DETERMINISTIC. No model call, no network; git is invoked
 *   locally with GIT_TERMINAL_PROMPT=0.
 * - EXACT-PATH COMMIT, CONDITIONAL. The one commit stages only the files
 *   conversion just created, and only when a git identity exists; otherwise
 *   the files are reported "written, not committed" and the folder is still
 *   fully usable.
 * - HONEST. `inspectConversion` reports what is actually there (other AI
 *   rule files, git state, legacy runtime state) and `convertProject`'s
 *   CONVERSION.md report lists what was added and what stayed untouched.
 */

export interface ConvertFacts {
  name: string;
  what: string;
  who: string;
  milestone: string;
}

export interface ConvertGitInfo {
  isRepo: boolean;
  branch: string | null;
  identitySet: boolean;
  /** Tracked-but-modified/staged entries and untracked entries, counted
   * separately so the approval screen can say "N files have uncommitted
   * changes, M are untracked — all left untouched." */
  dirty: number;
  untracked: number;
}

export interface ConvertInspection {
  exists: boolean;
  alreadyCairn: boolean;
  /** A pre-existing AGENTS.md that is not a Cairn contract: hard refusal. */
  agentsConflict: boolean;
  /** Scaffold paths that already exist and will be KEPT, never overwritten. */
  kept: string[];
  /** Other AI rule files found, reported and left alone. */
  otherRules: string[];
  git: ConvertGitInfo;
  /** Legacy .git/cairn runtime state: disclosed, never touched; tasks stay
   * blocked until a separate reviewed migration. */
  legacyState: boolean;
  suggestedName: string;
}

export interface ConvertOutcome {
  /** Relative paths of every file conversion created. */
  created: string[];
  /** Scaffold paths that already existed and were left exactly as found. */
  kept: string[];
  committed: boolean;
  /** Plain-language caveats the owner should see (no identity, legacy
   * state, git init performed, existing work left uncommitted). */
  notes: string[];
}

/** Other tools' rule files conversion looks for — reported, never read into,
 * never touched. Presence is all the owner needs to know. */
const OTHER_RULE_FILES = [
  "CLAUDE.md",
  "AGENT.md",
  "GEMINI.md",
  ".cursorrules",
  ".windsurfrules",
  ".claude",
  ".cursor",
  join(".github", "copilot-instructions.md"),
];

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trim();
}

function inspectGit(root: string): ConvertGitInfo {
  let isRepo = true;
  try {
    git(root, ["rev-parse", "--git-dir"]);
  } catch {
    isRepo = false;
  }
  // Identity resolves from global config even outside a repository — and
  // conversion may be about to init one — so probe it either way.
  let identitySet = false;
  try {
    identitySet = git(root, ["config", "user.name"]).length > 0;
  } catch {
    identitySet = false;
  }
  if (!isRepo) {
    return { isRepo, branch: null, identitySet, dirty: 0, untracked: 0 };
  }
  let branch: string | null = null;
  try {
    branch = git(root, ["branch", "--show-current"]) || null;
  } catch {
    branch = null;
  }
  let dirty = 0;
  let untracked = 0;
  try {
    for (const line of git(root, ["status", "--porcelain"]).split("\n")) {
      if (!line) continue;
      if (line.startsWith("??")) untracked += 1;
      else dirty += 1;
    }
  } catch {
    // Counts are a courtesy for the approval screen; leave them at zero.
  }
  return { isRepo: true, branch, identitySet, dirty, untracked };
}

const SCAFFOLD_REL = [
  "AGENTS.md",
  join("docs", "ai-work", "PROJECT.md"),
  join("docs", "ai-work", "LOG.md"),
];

export function inspectConversion(root: string): ConvertInspection {
  if (!existsSync(root)) {
    return {
      exists: false,
      alreadyCairn: false,
      agentsConflict: false,
      kept: [],
      otherRules: [],
      git: { isRepo: false, branch: null, identitySet: false, dirty: 0, untracked: 0 },
      legacyState: false,
      suggestedName: basename(root),
    };
  }
  const alreadyCairn = isCairnProject(root);
  const agentsConflict = existsSync(paths.contract(root)) && !alreadyCairn;
  // A kept AGENTS.md is impossible (that is either alreadyCairn or a
  // conflict), so the kept list never carries it — but the filter stays so
  // the invariant is enforced rather than assumed.
  const kept = SCAFFOLD_REL.filter((rel) => rel !== "AGENTS.md" && existsSync(join(root, rel)));
  const otherRules = OTHER_RULE_FILES.filter((rel) => existsSync(join(root, rel)));
  return {
    exists: true,
    alreadyCairn,
    agentsConflict,
    kept,
    otherRules,
    git: inspectGit(root),
    legacyState: hasLegacyState(root),
    suggestedName: basename(root),
  };
}

function conversionReport(
  facts: ConvertFacts,
  inspection: ConvertInspection,
  created: string[],
  willCommit: boolean,
  gitInit: boolean,
): string {
  const lines: string[] = [
    "# Conversion report",
    "",
    `Converted on ${new Date().toISOString().slice(0, 10)} by Cairn's desktop conversion (deterministic, no model call).`,
    "",
    `Project: ${facts.name}`,
    "",
    "## What Cairn added",
    "",
    ...created.map((rel) => `- \`${rel}\``),
    "",
    "## What stayed untouched",
    "",
    "- Every pre-existing file and folder — conversion only creates new paths, never overwrites.",
  ];
  if (inspection.kept.length > 0) {
    lines.push(
      `- Records that already existed and were kept as found: ${inspection.kept.map((rel) => `\`${rel}\``).join(", ")}.`,
    );
  }
  if (inspection.otherRules.length > 0) {
    lines.push(
      `- Other AI rule files left in place and still governing their tools: ${inspection.otherRules.map((rel) => `\`${rel}\``).join(", ")}.`,
    );
  }
  lines.push("", "## Git", "");
  if (gitInit) {
    lines.push("- No git repository existed, so Cairn started one — tasks need it to protect work.");
  }
  if (willCommit) {
    lines.push("- Cairn committed only its own new files, by exact path. Your existing work is not in that commit.");
  } else {
    lines.push("- The new files are written but NOT committed (no git identity is set). Once `git config user.name` and `user.email` are set, commit them yourself.");
  }
  if (inspection.git.dirty > 0 || inspection.git.untracked > 0) {
    lines.push(`- At conversion time, ${inspection.git.dirty} path(s) had uncommitted changes and ${inspection.git.untracked} were untracked. All left exactly as they were.`);
  }
  if (inspection.legacyState) {
    lines.push("", "## Warning", "", "- Legacy Cairn runtime state (`.git/cairn`) is present. It was preserved untouched; new tasks stay blocked until it is migrated in a separate reviewed task.");
  }
  lines.push("");
  return lines.join("\n");
}

/** Git pathspecs are forward-slash on every platform, Windows included. */
function gitPath(rel: string): string {
  return rel.split(sep).join("/");
}

export function convertProject(root: string, facts: ConvertFacts): ConvertOutcome {
  if (!facts.name.trim() || !facts.what.trim() || !facts.who.trim() || !facts.milestone.trim()) {
    throw new Error("Conversion needs all four answers: the name, what you're building, who it's for, and the first thing you want to see.");
  }
  // Re-inspect at the moment of writing: the screen's inspection may be
  // stale, and the refusal rules are fail-closed.
  const inspection = inspectConversion(root);
  if (!inspection.exists) throw new Error("That folder doesn't exist.");
  if (inspection.alreadyCairn) {
    throw new Error("That folder is already a Cairn project — open it directly instead.");
  }
  if (inspection.agentsConflict) {
    throw new Error(
      "That folder already has its own AGENTS.md. Cairn never overwrites existing rules — use the guided Project Conversion flow in PROJECT-CONVERSION.md, which reads the conflict with you.",
    );
  }

  const created: string[] = [];
  const create = (rel: string, content: string) => {
    const target = join(root, rel);
    mkdirSync(dirname(target), { recursive: true });
    appendFileSync(target, content, { flag: "wx" as never });
    created.push(rel);
  };

  create("AGENTS.md", fillFacts(contractTemplate(), facts) + "\n");
  const projectRel = join("docs", "ai-work", "PROJECT.md");
  if (!existsSync(join(root, projectRel))) {
    create(
      projectRel,
      `# ${facts.name}\n\nGoal: ${facts.what}\n\nUsers: ${facts.who}\n\n` +
        `First visible milestone: ${facts.milestone}\n\n` +
        "Out of scope for now: to be decided as tasks close.\n\n" +
        "Working rule: one serial task at a time; pause only at a concrete risk boundary.\n",
    );
  }
  const logRel = join("docs", "ai-work", "LOG.md");
  if (!existsSync(join(root, logRel))) create(logRel, LOG_HEADER);
  mkdirSync(paths.tasks(root), { recursive: true });

  const gitInit = !inspection.git.isRepo;
  const willCommit = inspection.git.identitySet;
  const reportRel = join("docs", "ai-work", "CONVERSION.md");
  create(reportRel, conversionReport(facts, inspection, [...created, reportRel], willCommit, gitInit));

  const notes: string[] = [];
  if (gitInit) notes.push("No git repository existed, so Cairn started one — tasks need it to protect work.");
  if (inspection.otherRules.length > 0) {
    notes.push(`Other AI rule files were left in place and still govern their tools: ${inspection.otherRules.join(", ")}.`);
  }
  if (inspection.legacyState) {
    notes.push("Legacy Cairn runtime state (.git/cairn) is present and untouched — new tasks stay blocked until it is migrated in a separate reviewed task.");
  }

  let committed = false;
  try {
    git(root, ["--version"]);
    if (gitInit) git(root, ["init"]);
    if (willCommit) {
      git(root, ["add", "--", ...created.map(gitPath)]);
      git(root, ["commit", "-m", "Cairn conversion: contract and project records"]);
      committed = true;
    } else {
      notes.push("Git has no identity set, so the new files are written but not committed. Set user.name and user.email, then commit them whenever you're ready.");
    }
  } catch {
    notes.push("Git setup did not complete — the new files are written and safe, but nothing was committed.");
  }
  if (committed && (inspection.git.dirty > 0 || inspection.git.untracked > 0 || gitInit)) {
    notes.push("Only Cairn's own new files were committed, by exact path. Your existing work is untouched and uncommitted, exactly as found.");
  }

  return { created, kept: inspection.kept, committed, notes };
}
