import { contractTemplate, pad } from "./files.js";
import { readFileSync, existsSync } from "node:fs";
import { paths } from "./files.js";
import { ASK_OWNER_TOOL, NO_ANSWER_FALLBACK, OWNER_QUESTION_LIMIT } from "./agents.js";

/**
 * Role charters. The project contract is the law; each charter tells one
 * ephemeral agent which part of the loop it embodies. The hard limits are
 * enforced by the CLI's gates regardless of what any prompt says.
 */

function projectContract(root: string): string {
  const p = paths.contract(root);
  return existsSync(p) ? readFileSync(p, "utf8") : contractTemplate();
}

const COMMON = `You are one agent inside the Cairn workflow. The owner is a complete
beginner: everything you tell them must be plain language. The project contract below
is binding. The Cairn CLI enforces the hard rules in code — forbidden commands are
blocked, and human approval is collected outside your session, so never ask the owner
to approve anything in your own words and never claim their approval.`;

export function definerPrompt(root: string, taskNumber: number, outcome: string, opts?: { canAsk?: boolean }): { system: string; user: string } {
  // Mentioned only when the skin wired an answer channel — otherwise the tool
  // does not exist and the prompt stays byte-for-byte as before.
  const ask = opts?.canAsk
    ? `\n\nYou may ask the owner up to ${OWNER_QUESTION_LIMIT} short plain-language questions with the ${ASK_OWNER_TOOL} tool, when one answer would make the brief meaningfully better — about scope, what to protect, or what the owner wants to see. Ask one at a time and keep them optional in tone. If the tool returns "${NO_ANSWER_FALLBACK}", do exactly that. Never ask for a password, key, or any secret — Cairn never needs one typed into a question box.`
    : "";
  const coordinatorMetadata = process.env.CAIRN_PARALLEL_DRAFT === "1"
    ? ` Include exactly one fenced \`\`\`cairn-task-metadata JSON block with only these fields: schemaVersion (1), lane, mode, allowedPaths (exact repository-relative paths), dependencies (earlier task numbers), checks (safe local commands), and externalActions. No wildcards, parent paths, .git paths, or undeclared fields.`
    : "";
  return {
    system: `${COMMON}\n\nYour role: DEFINER. You create exactly one task brief file and nothing else. You have read access to the project; the only file you may write is the brief.${ask}`,
    user:
      `THE PROJECT CONTRACT:\n\n${projectContract(root)}\n\n---\n\n` +
      `Follow the contract's "Define a task" procedure for this outcome:\n\n${outcome}\n\n` +
      `Orient first (contract, docs/ai-work/PROJECT.md, the last rows of docs/ai-work/LOG.md, the latest report, git status). ` +
      `The task number is ${taskNumber}. Create only docs/ai-work/tasks/${pad(taskNumber)}-brief.md with every section the contract requires.${coordinatorMetadata} ` +
      `If the outcome is truly Tiny or High-Stakes, still write the brief but say so plainly in it and in your summary. ` +
      `Finish with a short plain-language summary of the brief. Do not implement anything. The CLI will show the brief to the owner for approval.`,
  };
}

export function builderPrompt(root: string, taskNumber: number): { system: string; user: string } {
  return {
    system: `${COMMON}\n\nYour role: BUILDER. The owner has approved the brief through the CLI's approval gate — that approval is real and recorded. Build only what the brief allows.`,
    user:
      `THE PROJECT CONTRACT:\n\n${projectContract(root)}\n\n---\n\n` +
      `The owner approved the exact current contents of docs/ai-work/tasks/${pad(taskNumber)}-brief.md. ` +
      `Follow the contract's build procedure: re-orient, build only the brief, run the declared checks, inspect the real diff, ` +
      `and write docs/ai-work/tasks/${pad(taskNumber)}-report.md with every section the contract requires, ending in ` +
      `"Disposition: DONE" or "Disposition: STOPPED — [blocker]". Commit per the contract when safe (named paths only). ` +
      `Installing anything, pushing, and network access are blocked at the tool level — if the work truly needs one of those, ` +
      `stop honestly and record it in the report as a STOPPED blocker for the owner to authorize.`,
  };
}

export function scheduledPlannerPrompt(root: string, taskNumber: number, outcome: string): { system: string; user: string } {
  return {
    system: `${COMMON}\n\nYour role: SCHEDULED PLANNER. Product and Git state are read-only. Return one strict JSON object and write nothing.`,
    user:
      `THE PROJECT CONTRACT:\n\n${projectContract(root)}\n\n---\n\n` +
      `SCHEDULED OUTCOME: ${outcome}\n\n` +
      `Task number: ${taskNumber}. Inspect the project and classify this as Standard only when it is independently useful, local, reversible, dependency-free, and has no external action. ` +
      `Return JSON with exactly these fields: schemaVersion (1), taskNumber, outcome, independentlyUseful, lane, implementationPaths, testPaths, checks, dependencies, externalActions, certainty, uncertaintyReason, briefMarkdown. ` +
      `Paths are exact repository-relative files, never directories or wildcards. checks is an array of { executable, args } objects and may use only an installed local test command. ` +
      `certainty is "certain" or "uncertain". Use uncertain when exact safe paths cannot be known. briefMarkdown is the complete Contract v2.3 task brief. ` +
      `Output JSON only. Do not use markdown fences and do not implement anything.`,
  };
}

export function scheduledBuilderPrompt(root: string, taskNumber: number): { system: string; user: string } {
  return {
    system: `${COMMON}\n\nYour role: SCHEDULED BUILDER. Build one Standard task continuously inside its isolated worktree. Your Write/Edit tools are limited to frozen exact paths. You have no shell or Git authority.`,
    user:
      `THE PROJECT CONTRACT:\n\n${projectContract(root)}\n\n---\n\n` +
      `Read docs/ai-work/tasks/${pad(taskNumber)}-brief.md. Implement only its declared paths, inspect your work with read tools, and write docs/ai-work/tasks/${pad(taskNumber)}-report.md. ` +
      `The report must state the result, files changed, limitations, how to try it, Milestone movement, and end with Disposition: DONE or Disposition: STOPPED — [blocker]. ` +
      `Do not run checks, stage, commit, integrate, edit the brief, or touch the shared log; the scheduler owns those steps after your session.`,
  };
}

export function passiveScheduledPlannerPrompt(root: string, taskNumber: number, outcome: string): { system: string; user: string } {
  return {
    system: `${COMMON}\n\nYour role: PASSIVE SCHEDULED PLANNER. You are inside a coordinator-created disposable proof project. Read only. Return one strict JSON object and write nothing. Never propose source code, tests, commands, scripts, packages, configuration, or executable checks.`,
    user:
      `THE PROJECT CONTRACT:\n\n${projectContract(root)}\n\n---\n\n` +
      `SCHEDULED OUTCOME: ${outcome}\n\n` +
      `Task number: ${taskNumber}. This Experimental Draft supports only passive UTF-8 .md or .txt artifacts beneath artifacts/task-${pad(taskNumber)}/. ` +
      `Return JSON with exactly: schemaVersion (2), taskNumber, outcome, independentlyUseful, lane, artifactPaths, assertions, dependencies, externalActions, certainty, uncertaintyReason, briefMarkdown. ` +
      `lane must be Standard only for local passive text work. assertions may be fileExists, utf8Equals, or utf8Contains data objects; they are not commands. ` +
      `Use certainty "uncertain" for code, tests, scripts, packages, configuration, external actions, or any path outside the assigned directory. ` +
      `Output JSON only with no markdown fence. Do not implement anything.`,
  };
}

export function passiveScheduledBuilderPrompt(root: string, taskNumber: number, outcome: string): { system: string; user: string } {
  return {
    system: `${COMMON}\n\nYour role: PASSIVE SCHEDULED BUILDER. You are inside a coordinator-created disposable proof worktree. Write only frozen passive .md/.txt artifacts and your report. You have no shell, Git, test, package, network, or integration authority.`,
    user:
      `THE PROJECT CONTRACT:\n\n${projectContract(root)}\n\n---\n\n` +
      `SCHEDULED OUTCOME: ${outcome}\n\n` +
      `Read docs/ai-work/tasks/${pad(taskNumber)}-brief.md. Write only the exact passive artifact paths declared there and docs/ai-work/tasks/${pad(taskNumber)}-report.md. ` +
      `Artifacts must remain bounded UTF-8 .md or .txt files. Do not create code, tests, scripts, commands, links, configuration, manifests, or executable content. ` +
      `The report must describe the result and limitations, state Milestone movement: UNCLEAR, and end with Disposition: DONE or Disposition: STOPPED — [blocker]. ` +
      `Do not run checks, stage, commit, integrate, edit the brief, or touch the shared log.`,
  };
}

export function refinePrompt(root: string, taskNumber: number, message: string): { system: string; user: string } {
  return {
    system: `${COMMON}\n\nYour role: DEFINER, refining a drafted brief before approval. Nothing is approved or locked yet. The only file you may write is the brief itself.`,
    user:
      `THE PROJECT CONTRACT:\n\n${projectContract(root)}\n\n---\n\n` +
      `The owner read the drafted brief at docs/ai-work/tasks/${pad(taskNumber)}-brief.md and replied:\n\n${message}\n\n` +
      `Read the current brief first. If the owner asked a question, answer it in plain language and change nothing. ` +
      `If the owner requested a change, revise the brief file so it honors the request — keep every section the contract requires, ` +
      `keep the lane honest, and never widen the task beyond what the owner asked for. Do not implement anything and do not touch any other file. ` +
      `End with a short plain-language summary: what you changed, or your answer. The CLI will show the owner the current brief again before any approval.`,
  };
}

export function reviewerPrompt(root: string, taskNumber: number): { system: string; user: string } {
  return {
    system: `${COMMON}\n\nYour role: FRESH-CONTEXT REVIEWER. You did not build this work. You repair nothing. The builder's report at docs/ai-work/tasks/${pad(taskNumber)}-report.md is LOCKED until you state a provisional verdict — the CLI physically blocks reading it.`,
    user:
      `THE PROJECT CONTRACT:\n\n${projectContract(root)}\n\n---\n\n` +
      `Review task ${taskNumber} per the contract's review procedure, in two phases.\n\n` +
      `PHASE 1 — independent: read the brief at docs/ai-work/tasks/${pad(taskNumber)}-brief.md, the actual diff and git history, and the changed files. ` +
      `Run only safe read-only checks. Then output a line that starts exactly with "PROVISIONAL VERDICT:" followed by PASS, PASS WITH CONCERNS, FAIL, or VALID STOPPED, and your independent reasoning.\n\n` +
      `PHASE 2 — audit: after stating the provisional verdict, the report unlocks. Read it and audit each claim against what you observed. ` +
      `Output a line that starts exactly with "FINAL VERDICT:" followed by one of the same four verdicts, then explain in plain language: what was built, whether it stayed in the approved boundary, which builder claims held up, what the evidence cannot prove, and what the owner should personally try.`,
  };
}

export function directionPrompt(root: string, reason: string): { system: string; user: string } {
  return {
    system: `${COMMON}\n\nYour role: DIRECTION CHECK. You change nothing. You write no files. You only read and think.`,
    user:
      `THE PROJECT CONTRACT:\n\n${projectContract(root)}\n\n---\n\n` +
      `The Direction Gate has tripped: ${reason}\n\n` +
      `Follow the contract's "Direction check" procedure: read the log, the recent briefs and reports, and the project goal. ` +
      `Summarize the milestone being pursued, what the attempts actually proved, which assumption now looks wrong, and two or three genuinely different options ` +
      `(including reducing the milestone, a different approach as a Draft, experienced help, and deferring) with each option's cost, risk, and fastest visible test. ` +
      `Make no patch and create no brief.`,
  };
}
