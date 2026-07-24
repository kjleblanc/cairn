# Cairn Conductor v0 (Thinking Partner) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A conversational conductor in the Cairn desktop app that reads the project's records, thinks with the owner, and proposes one well-scoped task that hands off to the existing dispatch flow.

**Architecture:** All new logic lives in `app/src/main/conductor/` (Electron main). Pure node-only modules (task-block parsing, briefing, client, store, constitution) are unit-tested with `node --test` against a small tsc build; Electron-bound modules (keystore, service, IPC) are covered by Playwright against a fake OpenAI-compatible server. The renderer gains a chat screen (layout A) gated behind `CAIRN_CONDUCTOR=1` until the final task enables it with the contract amendment and the 0.1.0 bump. Core is untouched.

**Tech Stack:** Electron 33, React 18, Vite 5, TypeScript 5.6 strict, node:test, Playwright. Zero new runtime dependencies — fetch and SSE are hand-rolled.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-23-cairn-conductor-v0-design.md`. Copy strings (constitution, consent scope, amendment) from it verbatim.
- **Repo record protocol:** every plan task lands as one recorded repo task (plan task 1 = repo Task 018, task 2 = 019, … task 10 = 027). Before starting, write `docs/ai-work/tasks/NNN-brief.md` (outcome, boundary, checks, DONE/STOPPED meaning); after verifying, write `NNN-report.md` (files touched, checks run with real results, how to try, limitations, `Milestone movement:` line, `Disposition:` line), append one LOG row (`| NNN | date | Standard | Applied | DONE | completed | summary | NO |`), stage **exact paths only**, commit `"Task NNN: <summary>"` ending with `Co-Authored-By:` trailer. Tree must be clean after every commit.
- The API key exists only in the Electron main process. Never in the renderer, IPC payloads back to renderer, logs, records, or test snapshots.
- All owner-facing copy: plain language, sentence case, honest about what did and did not happen (repo voice).
- No new runtime dependencies in app/, core/, or cli/.
- Node >= 20. App main bundles via `vite.main.config.ts` (CJS); unit build uses its own tsconfig; don't touch core/ or cli/ source.
- Run commands from the repo root with `npm.cmd --prefix app run <script>` (PowerShell) or `cd app && npm run <script>` (bash).

## File Structure

```
app/src/shared/ipc.ts                     modify: conductor types + channel map
app/src/main/conductor/constitution.ts    new: CONSTITUTION + version
app/src/main/conductor/taskblock.ts       new: extractTaskBlock (pure)
app/src/main/conductor/context.ts         new: assembleBriefing (pure, uses @cairn/core)
app/src/main/conductor/client.ts          new: buildRequestBody/streamChat/error map (pure, fetch injected)
app/src/main/conductor/store.ts           new: .cairn/conversations jsonl (pure)
app/src/main/conductor/keystore.ts        new: safeStorage persistence (Electron)
app/src/main/conductor/service.ts         new: consent card, send/stop orchestration (Electron)
app/src/main/ipc.ts                       modify: register conductor channels
app/src/preload.ts                        modify: expose window.cairn.conductor*
app/src/renderer/screens/Chat.tsx         new: layout-A chat screen
app/src/renderer/components/TaskCard.tsx  new: proposed-task card with concern gating
app/src/renderer/components/ConnectCard.tsx new: standing-consent connect card
app/src/renderer/components/BodyPill.tsx  new: provider · model indicator
app/src/renderer/App.tsx                  modify: "chat" view + TaskRun prefill
app/src/renderer/screens/TaskRun.tsx      modify: optional initialOutcome prefill
app/tsconfig.unit.json                    new: unit-test build (pure modules only)
app/tests-unit/*.test.ts                  new: node:test suites
app/tests/fixtures/fake-conductor.mjs     new: OpenAI-compatible SSE fixture server
app/tests/conductor.spec.ts               new: Playwright end-to-end
CONTRACT-TEMPLATE.md, AGENTS.md, cairn.html, CHANGELOG.md, package files   modify in final task only
docs/superpowers/evals/conductor-v0.md    new in final task
```

---

### Task 1 (repo Task 018): Task-block parser + unit-test harness

**Files:**
- Create: `app/src/main/conductor/taskblock.ts`
- Create: `app/tests-unit/taskblock.test.ts`
- Create: `app/tsconfig.unit.json`
- Modify: `app/src/shared/ipc.ts` (add types at end)
- Modify: `app/package.json` (add `test:unit` script)
- Modify: `app/.gitignore` if present, else root `.gitignore` already ignores `dist`; add `app/dist-unit/` to root `.gitignore`

**Interfaces:**
- Produces: `TaskBlock { outcome: string; concerns: TaskBlockConcern[]; notes: string }`, `TaskBlockConcern { kind: "question" | "risk"; text: string }` (in `shared/ipc.ts`); `extractTaskBlock(reply: string): { block: TaskBlock | null; text: string }` where `text` is the reply with the fence removed and trimmed.

- [ ] **Step 1: Add shared types.** Append to `app/src/shared/ipc.ts`:

```ts
export interface TaskBlockConcern {
  kind: "question" | "risk";
  text: string;
}

export interface TaskBlock {
  outcome: string;
  concerns: TaskBlockConcern[];
  notes: string;
}

export interface ConductorTurn {
  role: "owner" | "cairn";
  text: string;
  ts: string;
  tokens?: number;
  costUsd?: number;
}
```

- [ ] **Step 2: Create the unit build config** `app/tsconfig.unit.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist-unit",
    "rootDir": ".",
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/main/conductor/taskblock.ts", "src/shared/ipc.ts", "tests-unit/**/*.ts"]
}
```

Add to `app/package.json` scripts: `"test:unit": "tsc -p tsconfig.unit.json && node --test dist-unit/tests-unit/"`. Extend the `include` list in later tasks as pure modules are added. Note: NodeNext requires `.js` extensions on relative imports in these files.

- [ ] **Step 3: Write the failing tests** `app/tests-unit/taskblock.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { extractTaskBlock } from "../src/main/conductor/taskblock.js";

const fence = (body: string) => "Here is my proposal.\n\n```cairn-task\n" + body + "\n```\nAnything else?";

test("a valid block parses and the fence leaves the text", () => {
  const reply = fence('{"outcome": "The page title says My Bookshelf", "concerns": [], "notes": ""}');
  const { block, text } = extractTaskBlock(reply);
  assert.ok(block);
  assert.equal(block.outcome, "The page title says My Bookshelf");
  assert.deepEqual(block.concerns, []);
  assert.equal(text.includes("cairn-task"), false);
  assert.ok(text.startsWith("Here is my proposal."));
});

test("concerns parse with kinds and bounded shape", () => {
  const reply = fence('{"outcome": "Save the book list locally", "concerns": [{"kind": "risk", "text": "Plain-text storage is readable by anything on this computer"}], "notes": "owner set aside the sync question"}');
  const { block } = extractTaskBlock(reply);
  assert.ok(block);
  assert.equal(block.concerns.length, 1);
  assert.equal(block.concerns[0].kind, "risk");
});

test("no fence means no block and untouched text", () => {
  const { block, text } = extractTaskBlock("Just a chat reply.");
  assert.equal(block, null);
  assert.equal(text, "Just a chat reply.");
});

for (const [name, body] of [
  ["malformed json", "{not json"],
  ["extra key", '{"outcome": "x", "concerns": [], "notes": "", "sneaky": true}'],
  ["missing outcome", '{"concerns": [], "notes": ""}'],
  ["empty outcome", '{"outcome": "  ", "concerns": [], "notes": ""}'],
  ["oversized outcome", `{"outcome": "${"x".repeat(301)}", "concerns": [], "notes": ""}`],
  ["bad concern kind", '{"outcome": "x", "concerns": [{"kind": "warning", "text": "y"}], "notes": ""}'],
  ["concern extra key", '{"outcome": "x", "concerns": [{"kind": "risk", "text": "y", "z": 1}], "notes": ""}'],
  ["too many concerns", '{"outcome": "x", "concerns": [{"kind":"risk","text":"a"},{"kind":"risk","text":"b"},{"kind":"risk","text":"c"},{"kind":"risk","text":"d"}], "notes": ""}'],
  ["array payload", '["outcome"]'],
  ["oversized notes", `{"outcome": "x", "concerns": [], "notes": "${"n".repeat(1001)}"}`],
] as const) {
  test(`invalid block is rejected: ${name}`, () => {
    const { block, text } = extractTaskBlock(fence(body));
    assert.equal(block, null);
    assert.ok(text.length > 0, "conversation text is preserved even when the block is invalid");
  });
}

test("only the first fence is honored", () => {
  const reply = fence('{"outcome": "first", "concerns": [], "notes": ""}') + "\n" + fence('{"outcome": "second", "concerns": [], "notes": ""}');
  const { block } = extractTaskBlock(reply);
  assert.ok(block);
  assert.equal(block.outcome, "first");
});
```

- [ ] **Step 4: Run to verify failure.** `cd app && npm run test:unit` — Expected: tsc error `Cannot find module '../src/main/conductor/taskblock.js'`.

- [ ] **Step 5: Implement** `app/src/main/conductor/taskblock.ts`:

```ts
import type { TaskBlock, TaskBlockConcern } from "../../shared/ipc.js";

const FENCE = /```cairn-task\s*\n([\s\S]*?)\n```/;

export interface TaskBlockResult {
  block: TaskBlock | null;
  text: string;
}

/** Cairn's code, not the model, decides what becomes a card. Anything that
 * fails the exact shape is dropped; the conversation text always survives. */
export function extractTaskBlock(reply: string): TaskBlockResult {
  const match = FENCE.exec(reply);
  if (!match) return { block: null, text: reply };
  const text = (reply.slice(0, match.index) + reply.slice(match.index + match[0].length)).trim();
  return { block: parseBlock(match[1]), text };
}

function parseBlock(raw: string): TaskBlock | null {
  if (raw.length > 4000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowed = new Set(["outcome", "concerns", "notes"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.outcome !== "string") return null;
  const outcome = record.outcome.trim();
  if (!outcome || outcome.length > 300) return null;
  const concernsRaw = record.concerns ?? [];
  if (!Array.isArray(concernsRaw) || concernsRaw.length > 3) return null;
  const concerns: TaskBlockConcern[] = [];
  for (const item of concernsRaw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    if (Object.keys(item).sort().join(",") !== "kind,text") return null;
    const kind = (item as Record<string, unknown>).kind;
    const text = (item as Record<string, unknown>).text;
    if (kind !== "question" && kind !== "risk") return null;
    if (typeof text !== "string" || !text.trim() || text.length > 300) return null;
    concerns.push({ kind, text: text.trim() });
  }
  const notesRaw = record.notes ?? "";
  if (typeof notesRaw !== "string" || notesRaw.length > 1000) return null;
  return { outcome, concerns, notes: notesRaw.trim() };
}
```

- [ ] **Step 6: Run to verify pass.** `cd app && npm run test:unit` — Expected: all tests pass. Also `npm run typecheck` — clean.

- [ ] **Step 7: Records + commit (repo Task 018).** Write brief/report/log row per Global Constraints. Stage exactly: `app/src/main/conductor/taskblock.ts app/src/shared/ipc.ts app/tests-unit/taskblock.test.ts app/tsconfig.unit.json app/package.json .gitignore docs/ai-work/tasks/018-brief.md docs/ai-work/tasks/018-report.md docs/ai-work/LOG.md`. Commit `"Task 018: conductor task-block parser with strict validation"`.

---

### Task 2 (repo Task 019): Constitution with invariant tests

**Files:**
- Create: `app/src/main/conductor/constitution.ts`
- Create: `app/tests-unit/constitution.test.ts`
- Modify: `app/tsconfig.unit.json` include list

**Interfaces:**
- Produces: `CONSTITUTION: string`, `CONSTITUTION_VERSION = "conductor-v1"`.

- [ ] **Step 1: Write the failing tests** `app/tests-unit/constitution.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { CONSTITUTION, CONSTITUTION_VERSION } from "../src/main/conductor/constitution.js";

test("constitution version is pinned", () => {
  assert.equal(CONSTITUTION_VERSION, "conductor-v1");
});

const LOAD_BEARING = [
  "You are Cairn, this project's conductor.",
  "Say only what the records show",
  "Never claim work happened unless a record shows DONE.",
  "Raise, then defer.",
  "do not use, repeat, or store it",
  "never yours to perform or approve",
  "emit exactly one block",
  "If the records show the outcome already holds, say so instead of proposing work.",
  "You cannot read file contents",
];

for (const line of LOAD_BEARING) {
  test(`constitution keeps: "${line.slice(0, 40)}…"`, () => {
    assert.ok(CONSTITUTION.includes(line), `missing load-bearing text: ${line}`);
  });
}

test("constitution has no emoji and no exclamation marks", () => {
  assert.doesNotMatch(CONSTITUTION, /[!\u{1F300}-\u{1FAFF}]/u);
});
```

- [ ] **Step 2: Run to verify failure.** `cd app && npm run test:unit` after adding `"src/main/conductor/constitution.ts"` to the tsconfig include. Expected: module not found.

- [ ] **Step 3: Implement** `app/src/main/conductor/constitution.ts` — the exported string is the spec's constitution draft **verbatim** (spec section "The constitution"), from "You are Cairn, this project's conductor." through "No emoji." Do not paraphrase; copy from the spec. Note the spec text contains a nested ```cairn-task fence — in the TS source it lives inside a template literal, so escape the backticks (`` \`\`\` ``):

```ts
export const CONSTITUTION_VERSION = "conductor-v1";

export const CONSTITUTION = `You are Cairn, this project's conductor. You speak as "I".

Voice. You are calm, kind, and plain-spoken — a quiet, competent friend. [… full spec text verbatim …]

Format. Short paragraphs. Lists only for real lists. No headers in chat. No emoji.`;
```

(The bracketed ellipsis above is a plan-space abbreviation only — the implementer copies the complete text from the spec, which is the single source of truth for the wording.)

- [ ] **Step 4: Run to verify pass.** `cd app && npm run test:unit` — Expected: all pass, including the no-exclamation rule (the spec text deliberately contains none).

- [ ] **Step 5: Records + commit (repo Task 019).** Stage exactly the two new files, tsconfig.unit.json, and the three record paths. Commit `"Task 019: Cairn's constitution, with its honesty pinned by tests"`.

---

### Task 3 (repo Task 020): Briefing assembly

**Files:**
- Create: `app/src/main/conductor/context.ts`
- Create: `app/tests-unit/context.test.ts`
- Modify: `app/tsconfig.unit.json` include list

**Interfaces:**
- Consumes: `parseFacts`, `parseLog`, `paths`, `pad` from `@cairn/core` (already a dependency of app main).
- Produces: `assembleBriefing(root: string, caps?: BriefingCaps): string`; `DEFAULT_CAPS: BriefingCaps { maxDepth: 3, maxTreeEntries: 400, maxRecordChars: 6000 }`.

- [ ] **Step 1: Write the failing tests** `app/tests-unit/context.test.ts`. Build a throwaway governed project in a temp dir (same shape the core serial tests use: AGENTS.md with contract markers, PROJECT.md, LOG.md with two rows, tasks/001-brief.md + 001-report.md, a `src/` folder with two files, `node_modules/junk.js`, and a git repo with one commit):

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assembleBriefing, DEFAULT_CAPS } from "../src/main/conductor/context.js";

function fixtureProject(): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-briefing-"));
  mkdirSync(join(root, "docs", "ai-work", "tasks"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "node_modules"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), [
    "# Project Contract", "", "Cairn Contract v0.0.5", "STATUS: ACTIVE",
    "PROJECT NAME: Briefing fixture", "WHAT WE ARE BUILDING: a fixture",
    "WHO WILL USE IT: tests", "CURRENT MILESTONE: see a briefing", "",
  ].join("\n"));
  writeFileSync(join(root, "docs", "ai-work", "PROJECT.md"), "# Briefing fixture\n\nGoal: prove briefings.\n");
  writeFileSync(join(root, "docs", "ai-work", "LOG.md"),
    "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |\n" +
    "|---|---|---|---|---|---|---|---|\n" +
    "| 001 | 2026-07-23 | Standard | Applied | DONE | completed | First fixture row | NO |\n");
  writeFileSync(join(root, "docs", "ai-work", "tasks", "001-brief.md"), "# Task 001 — fixture brief\n");
  writeFileSync(join(root, "docs", "ai-work", "tasks", "001-report.md"), "# Task 001 report\n\nDisposition: **DONE**\n");
  writeFileSync(join(root, "src", "index.ts"), "export {}\n");
  writeFileSync(join(root, "src", "app.ts"), "export {}\n");
  writeFileSync(join(root, "node_modules", "junk.js"), "x\n");
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git(["init", "-q"]);
  git(["config", "user.name", "T"]);
  git(["config", "user.email", "t@example.invalid"]);
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "fixture commit"]);
  return root;
}

test("briefing carries facts, project, log, records, git, and tree", () => {
  const briefing = assembleBriefing(fixtureProject());
  assert.match(briefing, /Briefing fixture/);
  assert.match(briefing, /CURRENT MILESTONE: see a briefing|see a briefing/);
  assert.match(briefing, /First fixture row/);
  assert.match(briefing, /Task 001 — fixture brief/);
  assert.match(briefing, /fixture commit/);
  assert.match(briefing, /src\/index\.ts/);
  assert.doesNotMatch(briefing, /node_modules/);
  assert.match(briefing, /assembled by Cairn's code/);
});

test("tree entries and record sizes respect caps", () => {
  const root = fixtureProject();
  for (let index = 0; index < 30; index += 1) writeFileSync(join(root, "src", `extra-${index}.ts`), "export {}\n");
  const briefing = assembleBriefing(root, { ...DEFAULT_CAPS, maxTreeEntries: 5, maxRecordChars: 10 });
  assert.match(briefing, /\(truncated\)/);
  const treeSection = briefing.slice(briefing.indexOf("## Files"));
  assert.ok(treeSection.split("\n").filter((line) => line.startsWith("- ")).length <= 5);
});

test("a briefing is deterministic for an unchanged project", () => {
  const root = fixtureProject();
  assert.equal(assembleBriefing(root), assembleBriefing(root));
});
```

- [ ] **Step 2: Run to verify failure.** Expected: module not found.

- [ ] **Step 3: Implement** `app/src/main/conductor/context.ts`:

```ts
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseFacts, parseLog, paths } from "@cairn/core";

export interface BriefingCaps {
  maxDepth: number;
  maxTreeEntries: number;
  maxRecordChars: number;
}

export const DEFAULT_CAPS: BriefingCaps = { maxDepth: 3, maxTreeEntries: 400, maxRecordChars: 6000 };

const SKIP_DIRS = new Set(["node_modules", "dist", "dist-unit", "out", ".cairn"]);

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n…(truncated)`;
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "(unavailable)";
  }
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
}

function gitSummary(root: string): string {
  try {
    const branch = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const dirty = git(root, ["diff", "--name-only"]).length > 0 || git(root, ["ls-files", "--others", "--exclude-standard"]).length > 0;
    const subjects = git(root, ["log", "-5", "--format=%s"]);
    return `Branch: ${branch}\nWorking tree: ${dirty ? "has uncommitted changes" : "clean"}\nRecent commits:\n${subjects}`;
  } catch {
    return "Git information is unavailable for this project.";
  }
}

function fileTree(root: string, caps: BriefingCaps): { entries: string[]; truncated: boolean } {
  const entries: string[] = [];
  let truncated = false;
  const walk = (dir: string, depth: number): void => {
    if (depth > caps.maxDepth || entries.length >= caps.maxTreeEntries) return;
    let names: string[] = [];
    try {
      names = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of names) {
      if (entries.length >= caps.maxTreeEntries) {
        truncated = true;
        return;
      }
      if (name.startsWith(".") || SKIP_DIRS.has(name)) continue;
      const absolute = join(dir, name);
      let isDirectory = false;
      try {
        isDirectory = statSync(absolute).isDirectory();
      } catch {
        continue;
      }
      entries.push(relative(root, absolute).replace(/\\/g, "/") + (isDirectory ? "/" : ""));
      if (isDirectory) walk(absolute, depth + 1);
    }
  };
  walk(root, 1);
  return { entries, truncated };
}

function recentRecords(root: string, caps: BriefingCaps): string {
  let names: string[] = [];
  try {
    names = readdirSync(paths.tasks(root));
  } catch {
    return "(no task records yet)";
  }
  const numbers = [...new Set(names.map((name) => /^(\d{3})-/.exec(name)?.[1]).filter(Boolean))] as string[];
  const recent = numbers.sort().slice(-3);
  if (recent.length === 0) return "(no task records yet)";
  return recent.map((number) => {
    const brief = clip(safeRead(join(paths.tasks(root), `${number}-brief.md`)), caps.maxRecordChars);
    const report = clip(safeRead(join(paths.tasks(root), `${number}-report.md`)), caps.maxRecordChars);
    return `### Task ${number} brief\n${brief}\n\n### Task ${number} report\n${report}`;
  }).join("\n\n");
}

export function assembleBriefing(root: string, caps: BriefingCaps = DEFAULT_CAPS): string {
  const facts = parseFacts(root);
  const log = parseLog(root);
  const logLines = log.map((row) => `| ${row.task} | ${row.date} | ${row.outcome} | ${row.summary} | moved: ${row.moved} |`).join("\n");
  const tree = fileTree(root, caps);
  return [
    "# Project briefing (assembled by Cairn's code, not by a model)",
    "## Contract facts",
    `Project: ${facts.name}\nBuilding: ${facts.what}\nUsers: ${facts.who}\nCurrent milestone: ${facts.milestone}\nContract status: ${facts.status}`,
    "## PROJECT.md",
    clip(safeRead(paths.project(root)), caps.maxRecordChars),
    "## Work log (task | date | outcome | summary | milestone moved)",
    logLines || "(empty)",
    "## Recent task records (last 3)",
    recentRecords(root, caps),
    "## Git",
    gitSummary(root),
    `## Files (names only${tree.truncated ? ", (truncated)" : ""})`,
    tree.entries.map((entry) => `- ${entry}`).join("\n") || "(none)",
  ].join("\n\n");
}
```

Add `"src/main/conductor/context.ts"` to the unit tsconfig include.

- [ ] **Step 4: Run to verify pass.** `cd app && npm run test:unit` — Expected: all pass. Note the truncation test also proves `maxRecordChars: 10` clips records (the `(truncated)` marker can come from either records or tree; both paths are exercised).

- [ ] **Step 5: Records + commit (repo Task 020).** Commit `"Task 020: the conductor's deterministic project briefing"`.

---

### Task 4 (repo Task 021): OpenAI-compatible streaming client

**Files:**
- Create: `app/src/main/conductor/client.ts`
- Create: `app/tests-unit/client.test.ts`
- Modify: `app/tsconfig.unit.json` include list

**Interfaces:**
- Produces: `SlotWithKey { baseUrl: string; model: string; apiKey: string }`; `ChatTurnMessage { role: "system" | "user" | "assistant"; content: string }`; `StreamEvent { kind: "delta" | "usage" | "done"; text?: string; promptTokens?: number; completionTokens?: number; costUsd?: number }`; `streamChat(slot, messages, fetchImpl?, signal?): AsyncGenerator<StreamEvent>`; `buildRequestBody(model, messages)`; `ConductorHttpError` with `.status` and `.ownerMessage`; `ownerMessageFor(status: number): string`.

- [ ] **Step 1: Write the failing tests** `app/tests-unit/client.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildRequestBody, ownerMessageFor, streamChat, ConductorHttpError } from "../src/main/conductor/client.js";

const SLOT = { baseUrl: "https://openrouter.ai/api/v1", model: "moonshotai/kimi-k2", apiKey: "test-key" };

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

test("request body pins model, stream, and usage accounting", () => {
  const body = buildRequestBody("m", [{ role: "user", content: "hi" }]);
  assert.deepEqual(body, { model: "m", messages: [{ role: "user", content: "hi" }], stream: true, stream_options: { include_usage: true } });
});

test("streaming yields deltas, usage, and done — and the url and key are used", async () => {
  let seenUrl = "";
  let seenAuth = "";
  const fake: typeof fetch = async (url, init) => {
    seenUrl = String(url);
    seenAuth = String((init?.headers as Record<string, string>).authorization);
    return sseResponse([
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":4,"cost":0.0001}}\n\n',
      "data: [DONE]\n\n",
    ]);
  };
  const events = [];
  for await (const event of streamChat(SLOT, [{ role: "user", content: "hi" }], fake)) events.push(event);
  assert.equal(seenUrl, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(seenAuth, "Bearer test-key");
  assert.deepEqual(events[0], { kind: "delta", text: "Hel" });
  assert.deepEqual(events[1], { kind: "delta", text: "lo" });
  assert.equal(events[2].kind, "usage");
  assert.equal(events[2].promptTokens, 12);
  assert.equal(events[2].costUsd, 0.0001);
  assert.equal(events.at(-1)?.kind, "done");
});

test("an http error surfaces a plain-words owner message and no key", async () => {
  const fake: typeof fetch = async () => new Response("raw provider secret detail", { status: 401 });
  await assert.rejects(
    async () => { for await (const _ of streamChat(SLOT, [], fake)) void _; },
    (error: unknown) => {
      assert.ok(error instanceof ConductorHttpError);
      assert.equal(error.status, 401);
      assert.doesNotMatch(error.ownerMessage, /test-key|raw provider/);
      return true;
    },
  );
});

test("owner messages exist for the failure statuses", () => {
  for (const status of [401, 402, 404, 429, 500]) {
    assert.ok(ownerMessageFor(status).length > 10);
    assert.doesNotMatch(ownerMessageFor(status), /\d{3}/);
  }
});
```

- [ ] **Step 2: Run to verify failure.** Expected: module not found.

- [ ] **Step 3: Implement** `app/src/main/conductor/client.ts`:

```ts
export interface SlotWithKey {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface ChatTurnMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamEvent {
  kind: "delta" | "usage" | "done";
  text?: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
}

export function ownerMessageFor(status: number): string {
  if (status === 401 || status === 403) return "The provider did not accept the key. Reconnect with a fresh key.";
  if (status === 402) return "The provider account is out of credit. Top it up, then try again.";
  if (status === 404) return "The provider does not recognize that model name. Check the model in settings.";
  if (status === 429) return "The provider is asking us to slow down. Wait a moment and try again.";
  return "The provider had a problem answering. Trying again in a moment usually works.";
}

export class ConductorHttpError extends Error {
  constructor(readonly status: number, readonly ownerMessage: string) {
    super(ownerMessage);
    this.name = "ConductorHttpError";
  }
}

export function buildRequestBody(model: string, messages: ChatTurnMessage[]): object {
  return { model, messages, stream: true, stream_options: { include_usage: true } };
}

function toEvent(payload: string): StreamEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as { choices?: Array<{ delta?: { content?: unknown } }>; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; cost?: unknown } };
  const content = record.choices?.[0]?.delta?.content;
  if (typeof content === "string" && content.length > 0) return { kind: "delta", text: content };
  if (record.usage && typeof record.usage === "object") {
    const usage = record.usage;
    return {
      kind: "usage",
      promptTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : 0,
      completionTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : 0,
      costUsd: typeof usage.cost === "number" ? usage.cost : undefined,
    };
  }
  return null;
}

export async function* streamChat(
  slot: SlotWithKey,
  messages: ChatTurnMessage[],
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const base = slot.baseUrl.endsWith("/") ? slot.baseUrl : `${slot.baseUrl}/`;
  const response = await fetchImpl(new URL("chat/completions", base).toString(), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${slot.apiKey}` },
    body: JSON.stringify(buildRequestBody(slot.model, messages)),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new ConductorHttpError(response.status, ownerMessageFor(response.status));
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") {
        yield { kind: "done" };
        return;
      }
      const event = toEvent(payload);
      if (event) yield event;
    }
  }
  yield { kind: "done" };
}
```

- [ ] **Step 4: Run to verify pass.** `cd app && npm run test:unit` — Expected: all pass.

- [ ] **Step 5: Records + commit (repo Task 021).** Commit `"Task 021: streaming OpenAI-compatible conductor client with plain-words failures"`.

---

### Task 5 (repo Task 022): Conversation store

**Files:**
- Create: `app/src/main/conductor/store.ts`
- Create: `app/tests-unit/store.test.ts`
- Modify: `app/tsconfig.unit.json` include list

**Interfaces:**
- Consumes: `ConductorTurn` from `shared/ipc.ts`.
- Produces: `ensureCairnIgnored(root): boolean` (true when it changed `.gitignore`), `newConversationId(root): string` (zero-padded, "001" first), `appendTurn(root, id, turn): void`, `readTurns(root, id): ConductorTurn[]`, `listConversations(root): Array<{ id: string; startedTs: string; preview: string }>`.

- [ ] **Step 1: Write the failing tests** `app/tests-unit/store.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendTurn, ensureCairnIgnored, listConversations, newConversationId, readTurns } from "../src/main/conductor/store.js";

const turn = (role: "owner" | "cairn", text: string) => ({ role, text, ts: "2026-07-23T12:00:00.000Z" });

test("turns round-trip and ids increment", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  const first = newConversationId(root);
  assert.equal(first, "001");
  appendTurn(root, first, turn("owner", "hello"));
  appendTurn(root, first, turn("cairn", "hello back"));
  assert.deepEqual(readTurns(root, first).map((item) => item.text), ["hello", "hello back"]);
  assert.equal(newConversationId(root), "002");
  const list = listConversations(root);
  assert.equal(list.length, 1);
  assert.equal(list[0].preview, "hello");
});

test("a corrupt line is skipped, not fatal", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  const id = newConversationId(root);
  appendTurn(root, id, turn("owner", "good"));
  writeFileSync(join(root, ".cairn", "conversations", `${id}.jsonl`), `${JSON.stringify(turn("owner", "good"))}\n{broken\n`, "utf8");
  assert.deepEqual(readTurns(root, id).map((item) => item.text), ["good"]);
});

test("gitignore gains /.cairn/ exactly once", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  writeFileSync(join(root, ".gitignore"), "node_modules\n", "utf8");
  assert.equal(ensureCairnIgnored(root), true);
  assert.equal(ensureCairnIgnored(root), false);
  const lines = readFileSync(join(root, ".gitignore"), "utf8").split(/\r?\n/);
  assert.equal(lines.filter((line) => line === "/.cairn/").length, 1);
});

test("gitignore is created when missing", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  assert.equal(ensureCairnIgnored(root), true);
  assert.ok(existsSync(join(root, ".gitignore")));
});
```

- [ ] **Step 2: Run to verify failure.** Expected: module not found.

- [ ] **Step 3: Implement** `app/src/main/conductor/store.ts`:

```ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ConductorTurn } from "../../shared/ipc.js";

const IGNORE_LINE = "/.cairn/";

export function conversationsDir(root: string): string {
  return join(root, ".cairn", "conversations");
}

export function ensureCairnIgnored(root: string): boolean {
  const path = join(root, ".gitignore");
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (existing.split(/\r?\n/).includes(IGNORE_LINE)) return false;
  const prefix = existing.length === 0 || existing.endsWith("\n") ? existing : `${existing}\n`;
  writeFileSync(path, `${prefix}${IGNORE_LINE}\n`, "utf8");
  return true;
}

export function newConversationId(root: string): string {
  let max = 0;
  try {
    for (const name of readdirSync(conversationsDir(root))) {
      const match = /^(\d{3})\.jsonl$/.exec(name);
      if (match) max = Math.max(max, Number(match[1]));
    }
  } catch {
    // No conversations yet.
  }
  return String(max + 1).padStart(3, "0");
}

export function appendTurn(root: string, id: string, turn: ConductorTurn): void {
  mkdirSync(conversationsDir(root), { recursive: true });
  appendFileSync(join(conversationsDir(root), `${id}.jsonl`), `${JSON.stringify(turn)}\n`, "utf8");
}

export function readTurns(root: string, id: string): ConductorTurn[] {
  const path = join(conversationsDir(root), `${id}.jsonl`);
  if (!existsSync(path)) return [];
  const turns: ConductorTurn[] = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line) as ConductorTurn;
      if ((value.role === "owner" || value.role === "cairn") && typeof value.text === "string" && typeof value.ts === "string") {
        turns.push(value);
      }
    } catch {
      // A corrupt line is skipped; the rest of the memory survives.
    }
  }
  return turns;
}

export function listConversations(root: string): Array<{ id: string; startedTs: string; preview: string }> {
  let names: string[] = [];
  try {
    names = readdirSync(conversationsDir(root));
  } catch {
    return [];
  }
  return names
    .map((name) => /^(\d{3})\.jsonl$/.exec(name)?.[1])
    .filter((id): id is string => Boolean(id))
    .sort()
    .map((id) => {
      const turns = readTurns(root, id);
      return { id, startedTs: turns[0]?.ts ?? "", preview: turns[0]?.text.slice(0, 80) ?? "" };
    });
}
```

- [ ] **Step 4: Run to verify pass.** `cd app && npm run test:unit` — Expected: all pass.

- [ ] **Step 5: Records + commit (repo Task 022).** Commit `"Task 022: project-local conversation memory under .cairn/"`.

---

### Task 6 (repo Task 023): Keystore, consent service, and IPC

**Files:**
- Create: `app/src/main/conductor/keystore.ts`
- Create: `app/src/main/conductor/service.ts`
- Modify: `app/src/shared/ipc.ts` (channel payloads), `app/src/main/ipc.ts` (register channels), `app/src/preload.ts` (expose API)

**Interfaces:**
- Consumes: everything produced by tasks 1–5.
- Produces (shared/ipc.ts):

```ts
export interface ConductorStatus {
  connected: boolean;
  baseUrl: string;
  model: string;
  provider: string;
  encryptionAvailable: boolean;
}

export interface ConductorConsentCard {
  provider: string;
  baseUrl: string;
  model: string;
  data: string;
  cost: string;
}

export interface ConductorConnectRequest {
  card: ConductorConsentCard;
  apiKey: string;
  consentConfirmed: boolean;
}

export interface ConductorSendRequest {
  dir: string;
  conversationId: string | null;
  text: string;
}

export interface ConductorDelta {
  dir: string;
  conversationId: string;
  kind: "delta" | "done" | "error";
  text?: string;
  turn?: ConductorTurn;
  taskBlock?: TaskBlock | null;
  message?: string;
}
```

- Produces (service.ts): `conductorConsentCard(baseUrl: string, model: string): ConductorConsentCard` with the exact strings:
  - `data`: `"Your messages, this project's task records (PROJECT, the work log, recent briefs and reports), and project file names. Never file contents. Never credentials. Cairn keeps conversation memory in a .cairn folder inside your project, kept out of git."`
  - `cost`: `"Pay-as-you-go on your provider account. Conversation runs without per-message approval while connected. Disconnect at any time to delete the stored key."`
  - `provider`: `new URL(baseUrl).host`.
- IPC channels: `conductor:status` (dir-independent), `conductor:connect(ConductorConnectRequest)`, `conductor:disconnect()`, `conductor:setModel(model: string)`, `conductor:send(ConductorSendRequest) -> { conversationId }`, `conductor:stop(dir: string)`, `conductor:conversations(dir: string)`, `conductor:turns(dir: string, id: string)`; push channel `conductor:delta` carrying `ConductorDelta`, scoped to the sender's webContents like `task:activity`.
- **Main-side authority (the dispatch-gate pattern):** `conductor:connect` re-derives `conductorConsentCard(card.baseUrl, card.model)` in main and requires field equality with the renderer's card plus `consentConfirmed === true`, else it returns the fixed error `CONDUCTOR_CONNECT_NOT_AUTHORIZED`. The key is encrypted with `safeStorage.encryptString` and persisted to `userData/conductor.json` as `{ baseUrl, model, keyB64 }`; if `safeStorage.isEncryptionAvailable()` is false, connect fails with plain copy `"This computer cannot store the key securely, so Cairn did not save it."`. `conductor:send` refuses when a serial task run is active for the project (reuse the running-set check in `tasks.ts`) — one brain-owner interaction at a time keeps evidence clean.
- `service.send` flow: load connection (else error), resolve conversation id (`newConversationId` when null), `ensureCairnIgnored(root)`, persist the owner turn, build messages `[{role:"system", content: CONSTITUTION}, {role:"system", content: assembleBriefing(root)}, …readTurns mapped owner→user / cairn→assistant]`, stream via `streamChat` with an `AbortController` kept per dir, forward each delta over `conductor:delta`, and on done: `extractTaskBlock(fullText)`, persist the cairn turn (raw text plus usage), emit `{kind:"done", turn, taskBlock}`. On `ConductorHttpError` emit `{kind:"error", message: ownerMessage}`; on abort emit `{kind:"error", message: "Stopped."}` after persisting the partial text with a trailing `\n\n(stopped early)` marker. Raw errors go to `log.ts`, never the screen.

- [ ] **Step 1: Write the code** for keystore.ts and service.ts per the interfaces above, then register the channels in `ipc.ts` following the file's existing `handle(channel, async (event, payload) => Result<T>)` style, and expose `window.cairn.conductorStatus/Connect/Disconnect/SetModel/Send/Stop/Conversations/Turns/onConductorDelta` in `preload.ts` mirroring the existing `onTaskActivity` pattern.

- [ ] **Step 2: Verify.** `cd app && npm run typecheck` — clean. `npm run test:unit` — still green (no unit tests for Electron-bound code; Playwright covers it in Task 9). `npm run build:vite` — bundles cleanly.

- [ ] **Step 3: Records + commit (repo Task 023).** Commit `"Task 023: conductor keystore, standing-consent gate, and IPC surface"`. Report notes honestly: covered by typecheck and build only until Task 026's Playwright suite.

---

### Task 7 (repo Task 024): Chat screen (layout A), gated behind CAIRN_CONDUCTOR=1

**Files:**
- Create: `app/src/renderer/screens/Chat.tsx`, `app/src/renderer/components/ConnectCard.tsx`, `app/src/renderer/components/BodyPill.tsx`
- Modify: `app/src/renderer/App.tsx` (add `"chat"` view; Dashboard gains a "Talk with Cairn" button when `window.cairn.flags?.conductor` is true), `app/src/main/main.ts` or existing flags plumbing (expose `CAIRN_CONDUCTOR=1` the same way `CAIRN_MOCK` reaches the app), `app/src/renderer/app.css` (chat layout styles), `app/src/renderer/components/Scene.tsx` (accept a `fill` prop to render full-bleed without changing the Dashboard's use)

**Interfaces:**
- Consumes: `window.cairn.conductor*` from Task 6; `Md` from `components/Md.tsx` (first real use of the dormant renderer); `Scene` stones count from `projectStatus` already available on the dashboard load path.
- Produces: `Chat` screen component with props `{ dir: string; onOpenTask(prefill: string): void; onBack(): void }`.

Behavior (all owner-facing copy in plain sentence case):

- Not connected → `ConnectCard` (fields: base URL defaulted to `https://openrouter.ai/api/v1`, model text field, key password field; the consent text from `conductorConsentCard`; checkbox `"I understand what will be shared and that conversation costs money on my account"`; Connect button disabled until checked). On success the card gives way to the conversation.
- Connected → full-bleed `Scene fill` behind a floating conversation column: message list (owner right-aligned plain bubbles, Cairn left-aligned rendered through `Md`), a streaming bubble while deltas arrive with a Stop button, a composer (`textarea`, Enter to send, Shift+Enter newline), `BodyPill` (provider · model, click → small panel with model field + "Save", Disconnect button, and per-reply token/cost line when present), and a back control to the dashboard.
- Conversation persistence: on mount, `conductor:conversations` → resume the newest or start fresh; "New conversation" control.
- Provider errors render as a plain-words system bubble with a "Try again" affordance (resends the last owner message).

- [ ] **Step 1: Implement the components** per the behavior above. Keep `Chat.tsx` under ~250 lines by pushing the card and pill into their components; reuse existing `pill`/`card` CSS vocabulary from `app.css`; add only the layout styles needed for the floating column (position, max-width 720px, translucent-free solid surfaces per the spec).
- [ ] **Step 2: Verify.** `npm run typecheck` clean; `npm run build:vite` clean; manual smoke with the fake server is deferred to Task 9 (note it in the report); `$env:CAIRN_MOCK="1"; $env:CAIRN_CONDUCTOR="1"; npm.cmd --prefix app start` shows the button, the connect card, and the layout (visual check, no provider).
- [ ] **Step 3: Records + commit (repo Task 024).** Commit `"Task 024: the chat screen — the hillside is the room (dark until 0.1.0)"`.

---

### Task 8 (repo Task 025): TaskCard with concern gating + dispatch handoff

**Files:**
- Create: `app/src/renderer/components/TaskCard.tsx`
- Modify: `app/src/renderer/screens/Chat.tsx` (render card from `taskBlock` on done), `app/src/renderer/App.tsx` (chat → task view with prefill), `app/src/renderer/screens/TaskRun.tsx` (accept `initialOutcome?: string` and seed the outcome textarea once on mount)

**Interfaces:**
- Consumes: `TaskBlock` from done deltas.
- Produces: `TaskCard` props `{ block: TaskBlock; onAnswer(concern: TaskBlockConcern, answer: string): void; onSetAside(concern: TaskBlockConcern): void; onSend(outcome: string): void }`.

Behavior:
- The card shows the outcome sentence and one chip per concern. A `question` chip offers a one-line answer box; submitting sends `"About your question — <answer>"` as a normal owner message (the model may then revise its proposal; a new task block replaces the card). A `risk` chip offers "Set aside" which marks it struck-through and appends the owner turn `"I understand the risk you raised — set it aside and keep the task as proposed."`.
- "Send to dispatch" stays disabled until every chip is answered or set aside; enabled it calls `onOpenTask(block.outcome)` → App switches to TaskRun prefilled. The existing route preview, disclosure checkbox, and confirm flow are untouched.

- [ ] **Step 1: Implement** the card and the two wiring changes. TaskRun change is minimal: `useState(initialOutcome ?? "")` for the outcome field it already has.
- [ ] **Step 2: Verify.** `npm run typecheck`; `npm run build:vite`; existing Playwright suite still green (`npm run test:smoke`) since nothing reachable changed without the flag.
- [ ] **Step 3: Records + commit (repo Task 025).** Commit `"Task 025: the proposed-task card — concerns answered or set aside before dispatch"`.

---

### Task 9 (repo Task 026): Fake body + Playwright end-to-end

**Files:**
- Create: `app/tests/fixtures/fake-conductor.mjs`
- Create: `app/tests/conductor.spec.ts`

**Interfaces:**
- The fixture is a bare `node:http` server on an ephemeral port implementing `POST /v1/chat/completions` with SSE. It scripts replies off the **last user message content**: contains `"title"` → replies with a valid task block including one `risk` concern; contains `"garble"` → replies with a malformed task block (extra key); contains `"fail-key"` → responds 401; anything else → a plain two-delta reply. Each streamed reply ends with a usage chunk (`prompt_tokens: 20, completion_tokens: 9, cost: 0.00002`) then `[DONE]`.

- [ ] **Step 1: Write the fixture** (`fake-conductor.mjs`, ~80 lines, exports `start(): Promise<{ url, close }>`) and **the spec** covering, in the established disk-truth style (temp governed project via the existing scaffold helper, `CAIRN_MOCK=1 CAIRN_CONDUCTOR=1`):
  1. Connect flow: card blocks until the checkbox; connect against the fixture URL; pill shows host · model; disconnect wipes (relaunch shows the connect card again).
  2. Full loop: chat "Change the page title" → task card appears with the risk chip → Send disabled → set aside → Send → TaskRun prefilled with the outcome → offline mock dispatch → DONE result → LOG.md on disk gains the row (existing assertions style).
  3. Persistence: send a message, restart the app (same project), the conversation is still there; `.cairn/` is in the project's `.gitignore` and `git status` in the project shows no `.cairn` entries.
  4. Malformed block: "garble" reply renders as plain chat, **no card** (honesty: invalid proposals never become buttons).
  5. Failure copy: reconnect pointing at the fixture with `fail-key` → the plain-words key message appears; no status code, no key text anywhere in the DOM.
- [ ] **Step 2: Run.** `cd app && npx playwright test tests/conductor.spec.ts` — all pass; then the full suite `npm run test:smoke` — all pass.
- [ ] **Step 3: Records + commit (repo Task 026).** Commit `"Task 026: a fake body proves the whole conductor loop offline"`.

---

### Task 10 (repo Task 027): Contract amendment, 0.1.0, chat becomes home

**Files:**
- Modify: `CONTRACT-TEMPLATE.md` (new section after "Secrets and provider access"), `AGENTS.md` (same section; facts untouched), `cairn.html` (embed + eyebrow → v0.1.0), `CHANGELOG.md` (0.1.0 entry), `core/package.json`, `cli/package.json`, `app/package.json` (+ lockfiles via `npm install` at root and app, cli lockfile version fields by hand), `app/src/renderer/App.tsx` (chat is the home view for a governed project; Dashboard reachable from a pill; drop the `CAIRN_CONDUCTOR` gate), affected Playwright specs (boot-to-chat instead of boot-to-dashboard where asserted)
- Create: `docs/superpowers/evals/conductor-v0.md` (the eight scenarios and the body-comparison table, copied from the spec)

**Amendment text (verbatim from the spec):** insert as a new contract section titled `## The connected conductor` — the paragraph beginning "The owner may connect one conversation model — the conductor — with a single standing authorization…" through "…still waits for that action's own approval."

- [ ] **Step 1: Contract first.** Template → AGENTS.md → cairn.html embed, per the MAINTAINERS six-step procedure. Bump every version declaration to **0.1.0** (minor: new capability), `npm install` at root and in app to refresh lockfiles, update cli lockfile version fields, add the CHANGELOG entry (what the conductor is, what it cannot do, the standing-consent boundary, what still confirms per action).
- [ ] **Step 2: Chat becomes home.** App boots a governed project into Chat (which shows the connect card when unconnected); Dashboard stays one click away; remove the env gate; update the Playwright specs that asserted dashboard-first boot.
- [ ] **Step 3: Verify everything.** Root `npm test` (core 51 + cli 9, mirror equality at 0.1.0), `cd app && npm run typecheck && npm run test:smoke` (full suite incl. conductor spec). Fresh-clone check: clone to temp, `npm ci && npm test` green.
- [ ] **Step 4: Records + commit (repo Task 027).** Commit `"Task 027: the connected conductor — contract amendment, 0.1.0, chat becomes home"`.
- [ ] **Step 5: After the commit** (separate owner session, paid): connect a real OpenRouter key, run the eval set against 2–3 bodies, record results in `docs/superpowers/evals/conductor-v0.md`, and attempt the Phase 1 milestone on a real project. Money moves only with the owner's explicit go, per the contract.

---

## Self-review notes

- Spec coverage: architecture → Tasks 1–6; connect/consent → 6, 7, 9; screen → 7; briefing → 3; constitution → 2; card/handoff → 8; storage → 5; amendment/0.1.0/eval doc → 10; failure honesty and cost → 4, 6, 7, 9; testing → every task. No spec section is uncovered.
- The constitution's full text deliberately lives in the spec, not duplicated here; Task 2 marks the single permitted abbreviation and names the source of truth.
- Type names were cross-checked across tasks (`TaskBlock`, `ConductorTurn`, `StreamEvent`, `ConductorConsentCard`, `extractTaskBlock`, `assembleBriefing`, `streamChat`, `ensureCairnIgnored`).
- Repo task numbering starts at 018 because 017 records this plan's adoption.
