# Cairn Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Cairn Desktop — an Electron app that runs the gated Cairn loop (define → approve → build → verify → decide) for novices — on a core engine shared with the existing CLI.

**Architecture:** Extract the CLI's engine into a `core/` workspace package exposing resumable step functions with persisted approvals; the CLI becomes a thin terminal sequencer over those steps; a new standalone `app/` Electron package (main-process engine host, contextBridge preload, React + Vite renderer) drives the same steps over a narrow typed IPC surface. The project files remain the single source of truth, so either skin can resume a task the other started.

**Tech Stack:** TypeScript, Node >= 20 (tooling; CLI keeps >= 18), npm workspaces, @anthropic-ai/claude-agent-sdk ^0.2, Electron ^33, Electron Forge ^7 (Vite plugin), React ^18, Vite ^5, node:test, @playwright/test ^1.48, @fontsource/quicksand.

**Spec:** `docs/superpowers/specs/2026-07-17-cairn-desktop-design.md` — read it before starting any task.

## Global Constraints

- All safety gates live in `core/` behind the IPC boundary; the renderer can never bypass them.
- Approval is persisted to `docs/ai-work/tasks/NNN-approval.json`; build re-reads the file and re-verifies the brief's SHA-256 before anything runs.
- Auth is the user's Claude Code sign-in only — no API keys anywhere in code, settings, or docs.
- All user-facing copy is plain language for novices. Raw errors go to a log file under Electron `userData/logs/`, never the screen.
- Visual identity: faded pastels, nature blended with technology (dotted traces, mono accents), no mascots, rounded type (Quicksand), pill buttons, large radii. Light and dark follow the system theme.
- Electron security: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, strict CSP meta tag, no remote content.
- CLI behavior stays identical for `init` / `task` / `status` — same prompts, same output, now calling core.
- v1 ships unsigned; Windows + Mac installers are built by GitHub Actions on `v*` tags.
- Windows dev machine: shell commands below are Git Bash / POSIX unless noted.

## Repository Layout After This Plan

```
package.json                 npm workspaces root: ["core", "cli"]  (app is standalone — see Task 5)
core/
  package.json               @cairn/core — the engine, no terminal deps
  tsconfig.json
  scripts/sync-contract.mjs  copies ../CONTRACT-TEMPLATE.md -> assets/contract.md (moved from cli)
  assets/contract.md         synced at build
  src/index.ts               re-exports everything below
  src/files.ts               paths, parsing, scaffold (moved from cli; + paths.approval, setContractPath)
  src/gates.ts               approval hash gate, Direction Gate, bash deny-list (moved from cli)
  src/prompts.ts             role charters (moved from cli)
  src/agents.ts              Engine interface, SdkEngine, MockEngine, tool gate (moved from cli)
  src/parse.ts               dispositionOf, finalVerdictOf (moved from cli/src/ui.ts)
  src/steps.ts               NEW: resumable steps — define/approve/build/review/close/direction/status/init
  test/gates.test.ts         moved from cli
  test/files.test.ts         moved from cli
  test/parse.test.ts         NEW
  test/steps.test.ts         NEW
cli/
  package.json               cairn-cli — depends on @cairn/core; keeps @clack/prompts + picocolors
  src/index.ts               unchanged commands
  src/ui.ts                  banner, stack, labels, spinnerLine (parsers removed)
  src/flows/init.ts          rewired onto core initProject
  src/flows/task.ts          rewired onto core steps
  src/flows/status.ts        rewired onto core projectStatus
  test/ui.test.ts            spinnerLine tests stay
app/                         standalone package (NOT a workspace member — see Task 5 note)
  package.json               cairn-desktop; depends on @cairn/core via file:../core
  forge.config.ts            packager + makers + Vite plugin
  vite.main.config.ts        main bundle; agent SDK kept external
  vite.preload.config.ts
  vite.renderer.config.ts
  index.html                 CSP + root div
  scripts/copy-assets.mjs    copies ../core/assets/contract.md -> resources/contract.md
  resources/contract.md      (gitignored; copied at build)
  src/shared/ipc.ts          the typed IPC contract — single source for main/preload/renderer
  src/main/main.ts           window, security, contract path wiring
  src/main/log.ts            append-only error log under userData/logs
  src/main/registry.ts       recent-projects JSON in userData
  src/main/ipc.ts            preflight + project channels
  src/main/tasks.ts          task/direction channels, engine event forwarding, single-flight guard
  src/preload.ts             contextBridge -> window.cairn
  src/renderer/main.tsx      mount + fonts + css
  src/renderer/global.d.ts   window.cairn declaration
  src/renderer/api.ts        typed accessor
  src/renderer/tokens.css    faded-pastel design tokens (light-dark)
  src/renderer/app.css       layout, cards, pills, scene, animations
  src/renderer/App.tsx       view state machine
  src/renderer/components/   Ui.tsx (Card/Pill/Badge/ErrorCard), Md.tsx, ActivityFeed.tsx, StepRail.tsx, Scene.tsx
  src/renderer/screens/      Welcome.tsx, Picker.tsx, Dashboard.tsx, Wizard.tsx, Direction.tsx, Settings.tsx
  tests/smoke.spec.ts        Playwright: full mock loop drops a stone
  playwright.config.ts
.github/workflows/release.yml
```

Note on this repository: the repo root is itself a Cairn project (`AGENTS.md`). Do not touch `AGENTS.md`, `docs/ai-work/**`, or the root guide documents in any task below except where a task explicitly lists them.

---

### Task 1: npm workspaces root

**Files:**
- Create: `package.json` (repo root)
- Create: `.gitignore` (repo root)
- Delete: `cli/node_modules/` (regenerated at root)

**Interfaces:**
- Consumes: nothing.
- Produces: a root workspace so Task 2 can add `core/` as `@cairn/core` and `cli/` can depend on it by name.

- [ ] **Step 1: Write the root package.json**

```json
{
  "name": "cairn-monorepo",
  "private": true,
  "license": "MIT",
  "workspaces": ["cli"],
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "npm test --workspaces"
  }
}
```

- [ ] **Step 2: Write the root .gitignore**

```
node_modules/
cli/dist/
core/dist/
app/node_modules/
app/dist/
app/.vite/
app/out/
app/resources/contract.md
app/test-results/
```

- [ ] **Step 3: Remove the nested install and reinstall from the root**

Run (repo root):
```bash
rm -rf cli/node_modules && npm install
```
Expected: `node_modules/` appears at the repo root; a root `package-lock.json` is created.

- [ ] **Step 4: Verify the CLI still builds and passes its tests**

Run: `npm test`
Expected: the cairn-cli suite runs (gates, files, ui) and ends with `# fail 0`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git rm -r --cached cli/node_modules 2>/dev/null; git commit -m "Monorepo root: npm workspaces around the CLI"
```

---

### Task 2: Extract @cairn/core from the CLI

**Files:**
- Create: `core/package.json`, `core/tsconfig.json`, `core/src/index.ts`, `core/src/parse.ts`, `core/test/parse.test.ts`
- Move (git mv): `cli/src/files.ts` → `core/src/files.ts`; `cli/src/gates.ts` → `core/src/gates.ts`; `cli/src/prompts.ts` → `core/src/prompts.ts`; `cli/src/agents.ts` → `core/src/agents.ts`; `cli/test/gates.test.ts` → `core/test/gates.test.ts`; `cli/test/files.test.ts` → `core/test/files.test.ts`; `cli/scripts/sync-contract.mjs` → `core/scripts/sync-contract.mjs`; `cli/assets/contract.md` → `core/assets/contract.md`
- Modify: root `package.json` (workspaces), `cli/package.json`, `cli/src/ui.ts`, `cli/src/flows/task.ts`, `cli/src/flows/init.ts`, `cli/src/flows/status.ts`, `core/src/files.ts` (after move: `setContractPath`)

**Interfaces:**
- Consumes: the moved modules exactly as they are in `cli/src` today.
- Produces: package `@cairn/core` importable as `import { paths, parseFacts, parseLog, appendLogRow, nextTaskNumber, pad, isCairnProject, scaffoldProject, fillFacts, sha256File, contractTemplate, setContractPath, recordApproval, assertApprovalValid, checkDirectionGate, checkBashCommand, definerPrompt, builderPrompt, reviewerPrompt, directionPrompt, pickEngine, dispositionOf, finalVerdictOf } from "@cairn/core"` plus types `ProjectFacts, LogRow, ApprovalRecord, DirectionGateResult, Engine, RunEvents, RunResult, RunSpec, Role`. Declarations (`.d.ts`) are emitted — later tasks type against them.

- [ ] **Step 1: Move the files with git mv**

```bash
mkdir -p core/src core/test core/scripts core/assets
git mv cli/src/files.ts cli/src/gates.ts cli/src/prompts.ts cli/src/agents.ts core/src/
git mv cli/test/gates.test.ts cli/test/files.test.ts core/test/
git mv cli/scripts/sync-contract.mjs core/scripts/
git mv cli/assets/contract.md core/assets/
```

`core/scripts/sync-contract.mjs` already resolves `..`/`..`/CONTRACT-TEMPLATE.md relative to itself, and `core/` sits at the same depth as `cli/` — no edit needed.

- [ ] **Step 2: Create core/package.json and core/tsconfig.json**

`core/package.json`:
```json
{
  "name": "@cairn/core",
  "version": "0.1.0",
  "description": "The Cairn engine — files, gates, prompts, agents — shared by every skin",
  "license": "MIT",
  "type": "module",
  "main": "dist/src/index.js",
  "types": "dist/src/index.d.ts",
  "files": ["dist/src", "assets"],
  "engines": { "node": ">=18" },
  "scripts": {
    "sync-contract": "node scripts/sync-contract.mjs",
    "build": "npm run sync-contract && tsc",
    "test": "npm run build && node --test dist/test/gates.test.js dist/test/files.test.js dist/test/parse.test.js"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0"
  }
}
```

`core/tsconfig.json` (the CLI's, plus declarations):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": false
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

- [ ] **Step 3: Create core/src/parse.ts and core/src/index.ts**

`core/src/parse.ts` — cut `dispositionOf` and `finalVerdictOf` out of `cli/src/ui.ts` verbatim:
```ts
export function dispositionOf(text: string): "DONE" | "STOPPED" | "UNKNOWN" {
  if (/Disposition:\s*DONE/i.test(text)) return "DONE";
  if (/Disposition:\s*STOPPED/i.test(text)) return "STOPPED";
  return "UNKNOWN";
}

export function finalVerdictOf(text: string): string {
  const m = text.match(/FINAL VERDICT:\s*([A-Z ]+)/);
  return m ? m[1].trim() : "NO VERDICT";
}
```

`core/src/index.ts`:
```ts
export * from "./files.js";
export * from "./gates.js";
export * from "./prompts.js";
export * from "./agents.js";
export * from "./parse.js";
```

- [ ] **Step 4: Add setContractPath to core/src/files.ts**

The packaged desktop app cannot rely on `import.meta.url` asset probing (its main bundle is CJS). Give core an explicit override. In `core/src/files.ts`, replace the `contractTemplate` function with:

```ts
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
```

- [ ] **Step 5: Write the failing parse test**

`core/test/parse.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { dispositionOf, finalVerdictOf } from "../src/parse.js";

test("dispositionOf reads DONE, STOPPED, and neither", () => {
  assert.equal(dispositionOf("...\nDisposition: DONE\n"), "DONE");
  assert.equal(dispositionOf("Disposition: STOPPED — blocked on install"), "STOPPED");
  assert.equal(dispositionOf("no disposition line"), "UNKNOWN");
});

test("finalVerdictOf extracts the verdict or says so", () => {
  assert.equal(finalVerdictOf("FINAL VERDICT: PASS WITH CONCERNS — details"), "PASS WITH CONCERNS");
  assert.equal(finalVerdictOf("nothing here"), "NO VERDICT");
});
```

- [ ] **Step 6: Slim the CLI onto core**

Root `package.json` workspaces becomes `["core", "cli"]` (core first so `--workspaces` builds it first).

`cli/package.json` — remove the agent SDK dep and the sync script, depend on core:
```json
{
  "name": "cairn-cli",
  "version": "0.1.0",
  "description": "Cairn — the gated AI coding workflow for people who don't code, as a CLI",
  "license": "MIT",
  "type": "module",
  "bin": { "cairn": "dist/src/index.js" },
  "files": ["dist/src"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsc",
    "test": "npm run build && node --test dist/test/ui.test.js",
    "start": "npm run build && node dist/src/index.js"
  },
  "dependencies": {
    "@cairn/core": "*",
    "@clack/prompts": "^0.11.0",
    "picocolors": "^1.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0"
  }
}
```

`cli/src/ui.ts`: delete the `dispositionOf` and `finalVerdictOf` functions (now in core). Keep `banner`, `stone`, `stack`, `label`, `spinnerLine` unchanged. If `cli/test/ui.test.ts` contains test cases for the removed parsers, delete those cases — `core/test/parse.test.ts` covers them now.

Import fixes (mechanical — same names, new module):
- `cli/src/flows/task.ts`: `from "../files.js"` → `from "@cairn/core"`; `from "../gates.js"` → `from "@cairn/core"`; `from "../agents.js"` → `from "@cairn/core"`; `from "../prompts.js"` → `from "@cairn/core"`; and split the ui import: `import { banner, label, spinnerLine } from "../ui.js";` plus `import { dispositionOf, finalVerdictOf } from "@cairn/core";`
- `cli/src/flows/init.ts`: `from "../files.js"` → `from "@cairn/core"`
- `cli/src/flows/status.ts`: `from "../files.js"` and `from "../gates.js"` → `from "@cairn/core"`
- `core/test/*.test.ts` import paths stay `../src/*.js` — they moved together with the sources.

- [ ] **Step 7: Install, build, and run all tests**

Run (repo root):
```bash
npm install && npm test
```
Expected: `@cairn/core` runs gates + files + parse suites, `cairn-cli` runs ui — all end `# fail 0`, exit 0.

- [ ] **Step 8: Sanity-run the CLI against this very repo**

Run (repo root):
```bash
node cli/dist/src/index.js status
```
Expected: the banner, this repo's project name and milestone from `AGENTS.md`, stones from `docs/ai-work/LOG.md` — same output as before the refactor.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Extract @cairn/core: one engine, ready for a second skin"
```

---

### Task 3: Resumable steps in core — persisted approvals, status, init

**Files:**
- Create: `core/src/steps.ts`, `core/test/steps.test.ts`
- Modify: `core/src/files.ts` (add `paths.approval`), `core/src/index.ts` (export steps), `core/package.json` (test script)

**Interfaces:**
- Consumes: everything Task 2 exported from `@cairn/core`.
- Produces (all exported from `@cairn/core`):
  - `type Disposition = "DONE" | "STOPPED" | "UNKNOWN"`
  - `defineTask(root: string, outcome: string, engine: Engine, events?: RunEvents): Promise<DefineResult>` where `DefineResult = { taskNumber: number; briefPath: string; briefText: string; costUsd?: number }`
  - `approveBrief(root: string, taskNumber: number): ApprovalRecord` — persists the record
  - `loadApproval(root: string, taskNumber: number): ApprovalRecord | null`
  - `buildTask(root: string, taskNumber: number, engine: Engine, events?: RunEvents): Promise<BuildResult>` where `BuildResult = { reportPath: string; reportText: string; disposition: Disposition; costUsd?: number }`
  - `reviewTask(root: string, taskNumber: number, engine: Engine, events?: RunEvents): Promise<ReviewResult>` where `ReviewResult = { text: string; finalVerdict: string; costUsd?: number }`
  - `closeTask(root: string, taskNumber: number, input: CloseInput): LogRow` where `CloseInput = { decision: "accept" | "revise" | "rollback" | "defer" | "escalate"; summary: string; moved: "YES" | "NO" | "UNCLEAR" }`
  - `runDirectionCheck(root: string, reason: string, engine: Engine, events?: RunEvents): Promise<{ text: string }>`
  - `projectStatus(root: string): ProjectStatus` where `ProjectStatus = { facts: ProjectFacts; log: LogRow[]; stones: number; gate: DirectionGateResult; unfinished: UnfinishedTask | null }` and `UnfinishedTask = { taskNumber: number; hasBrief: boolean; hasApproval: boolean; hasReport: boolean; disposition: Disposition; briefText: string; reportText: string }`
  - `initProject(root: string, facts: { name: string; what: string; who: string; milestone: string; timebox: string }): { created: string[]; gitReady: boolean }`
  - `paths.approval(root: string, n: number): string`

- [ ] **Step 1: Add the approval path to core/src/files.ts**

In the `paths` object, after the `report` entry, add:
```ts
  approval: (root: string, n: number) => join(paths.tasks(root), `${pad(n)}-approval.json`),
```
(`nextTaskNumber` already counts any `NNN-*` file, so an approval file alone still reserves its number.)

- [ ] **Step 2: Write the failing steps tests**

`core/test/steps.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MockEngine } from "../src/agents.js";
import { paths, parseLog, scaffoldProject } from "../src/files.js";
import {
  approveBrief, buildTask, closeTask, defineTask, initProject, loadApproval,
  projectStatus, reviewTask, runDirectionCheck,
} from "../src/steps.js";

const engine = new MockEngine();

function freshProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "cairn-steps-"));
  scaffoldProject(dir, { name: "Steps", what: "w", who: "me", milestone: "see it", timebox: "default" });
  return dir;
}

test("full loop: define, approve, build, review, close — files carry the state", async () => {
  const dir = freshProject();
  const def = await defineTask(dir, "A demo file appears", engine);
  assert.equal(def.taskNumber, 1);
  assert.ok(def.briefText.includes("brief"));

  const approval = approveBrief(dir, 1);
  assert.ok(existsSync(paths.approval(dir, 1)));
  assert.equal(loadApproval(dir, 1)?.briefSha256, approval.briefSha256);

  const build = await buildTask(dir, 1, engine);
  assert.equal(build.disposition, "DONE");
  assert.ok(build.reportText.includes("demo.txt"));

  const review = await reviewTask(dir, 1, engine);
  assert.match(review.finalVerdict, /PASS/);

  const row = closeTask(dir, 1, { decision: "accept", summary: "saw the file", moved: "YES" });
  assert.equal(row.task, "001");
  assert.equal(parseLog(dir).length, 1);
});

test("build refuses without a persisted approval, and after tampering", async () => {
  const dir = freshProject();
  await defineTask(dir, "A demo file appears", engine);
  await assert.rejects(() => buildTask(dir, 1, engine), /No approval on file/);
  approveBrief(dir, 1);
  writeFileSync(paths.brief(dir, 1), "silently widened scope");
  await assert.rejects(() => buildTask(dir, 1, engine), /GATE: the brief changed/);
});

test("defineTask refuses while the Direction Gate is tripped", async () => {
  const dir = freshProject();
  const row = "| 001 | 2026-07-17 | Standard | Draft | STOPPED | revise | s | NO |\n" +
              "| 002 | 2026-07-17 | Standard | Draft | STOPPED | revise | s | NO |\n";
  writeFileSync(paths.log(dir), readFileSync(paths.log(dir), "utf8") + row);
  await assert.rejects(() => defineTask(dir, "another patch", engine), /DIRECTION GATE/);
  const check = await runDirectionCheck(dir, "two STOPPED in a row", engine);
  assert.ok(check.text.length > 0);
});

test("projectStatus reports stones, gate, and an unfinished task", async () => {
  const dir = freshProject();
  const s0 = projectStatus(dir);
  assert.equal(s0.stones, 0);
  assert.equal(s0.unfinished, null);

  await defineTask(dir, "A demo file appears", engine);
  const s1 = projectStatus(dir);
  assert.equal(s1.unfinished?.taskNumber, 1);
  assert.equal(s1.unfinished?.hasBrief, true);
  assert.equal(s1.unfinished?.hasApproval, false);
  assert.ok(s1.unfinished?.briefText.includes("brief"));

  approveBrief(dir, 1);
  await buildTask(dir, 1, engine);
  closeTask(dir, 1, { decision: "accept", summary: "s", moved: "YES" });
  const s2 = projectStatus(dir);
  assert.equal(s2.stones, 1);
  assert.equal(s2.unfinished, null);
});

test("steps refuse a folder that is not a Cairn project", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-not-"));
  await assert.rejects(() => defineTask(dir, "x", engine), /No Cairn contract/);
  assert.throws(() => projectStatus(dir), /No Cairn contract/);
});

test("initProject scaffolds and commits when git identity exists", () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-init-"));
  const res = initProject(dir, { name: "Init", what: "w", who: "me", milestone: "m", timebox: "default" });
  assert.ok(res.created.length >= 4);
  if (res.gitReady) {
    const log = execFileSync("git", ["log", "--oneline"], { cwd: dir, encoding: "utf8" });
    assert.match(log, /Cairn setup/);
  }
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Add `dist/test/steps.test.js` to core's test script in `core/package.json`:
```json
    "test": "npm run build && node --test dist/test/gates.test.js dist/test/files.test.js dist/test/parse.test.js dist/test/steps.test.js"
```
Run: `npm test -w @cairn/core`
Expected: FAIL — TypeScript cannot resolve `../src/steps.js`.

- [ ] **Step 4: Write core/src/steps.ts**

```ts
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  appendLogRow, isCairnProject, nextTaskNumber, pad, parseFacts, parseLog, paths,
  scaffoldProject, type LogRow, type ProjectFacts,
} from "./files.js";
import {
  assertApprovalValid, checkDirectionGate, recordApproval,
  type ApprovalRecord, type DirectionGateResult,
} from "./gates.js";
import type { Engine, RunEvents } from "./agents.js";
import { builderPrompt, definerPrompt, directionPrompt, reviewerPrompt } from "./prompts.js";
import { dispositionOf, finalVerdictOf } from "./parse.js";

/**
 * The gated loop as resumable steps. Every skin (CLI, desktop) sequences these;
 * no skin re-implements a rule. Each step re-reads its state from the project
 * files, so a task can be resumed by a different skin than the one that started it.
 */

export type Disposition = "DONE" | "STOPPED" | "UNKNOWN";

export interface DefineResult { taskNumber: number; briefPath: string; briefText: string; costUsd?: number }
export interface BuildResult { reportPath: string; reportText: string; disposition: Disposition; costUsd?: number }
export interface ReviewResult { text: string; finalVerdict: string; costUsd?: number }
export interface CloseInput {
  decision: "accept" | "revise" | "rollback" | "defer" | "escalate";
  summary: string;
  moved: "YES" | "NO" | "UNCLEAR";
}
export interface UnfinishedTask {
  taskNumber: number;
  hasBrief: boolean;
  hasApproval: boolean;
  hasReport: boolean;
  disposition: Disposition;
  briefText: string;
  reportText: string;
}
export interface ProjectStatus {
  facts: ProjectFacts;
  log: LogRow[];
  stones: number;
  gate: DirectionGateResult;
  unfinished: UnfinishedTask | null;
}

function assertGoverned(root: string): ProjectFacts {
  if (!isCairnProject(root)) {
    throw new Error("No Cairn contract here. Run init in an empty folder, or use Project Conversion for existing work.");
  }
  const facts = parseFacts(root);
  if (facts.status && facts.status !== "ACTIVE") {
    throw new Error(`The contract status is "${facts.status}" — it doesn't govern this project yet. Finish the conversion first.`);
  }
  return facts;
}

export async function defineTask(root: string, outcome: string, engine: Engine, events: RunEvents = {}): Promise<DefineResult> {
  assertGoverned(root);
  const gate = checkDirectionGate(parseLog(root));
  if (gate.tripped) throw new Error(`DIRECTION GATE: ${gate.reason} No third narrow patch — run the direction check instead.`);
  const taskNumber = nextTaskNumber(root);
  const p = definerPrompt(root, taskNumber, outcome);
  const res = await engine.run({ role: "definer", root, taskNumber, system: p.system, user: p.user }, events);
  const briefPath = paths.brief(root, taskNumber);
  if (!existsSync(briefPath)) {
    throw new Error("The definer produced no brief file. Nothing was approved and nothing will be built.");
  }
  return { taskNumber, briefPath, briefText: readFileSync(briefPath, "utf8"), costUsd: res.costUsd };
}

/** The one human gate. Persisted so approve and build survive a restart — and so build can re-check the hash. */
export function approveBrief(root: string, taskNumber: number): ApprovalRecord {
  assertGoverned(root);
  const record = recordApproval(taskNumber, paths.brief(root, taskNumber));
  writeFileSync(paths.approval(root, taskNumber), JSON.stringify(record, null, 2) + "\n");
  return record;
}

export function loadApproval(root: string, taskNumber: number): ApprovalRecord | null {
  const p = paths.approval(root, taskNumber);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as ApprovalRecord;
}

export async function buildTask(root: string, taskNumber: number, engine: Engine, events: RunEvents = {}): Promise<BuildResult> {
  assertGoverned(root);
  const approval = loadApproval(root, taskNumber);
  if (!approval) {
    throw new Error(`No approval on file for task ${pad(taskNumber)}. Approve the brief first — nothing is built without you.`);
  }
  assertApprovalValid(approval);
  const p = builderPrompt(root, taskNumber);
  const res = await engine.run({ role: "builder", root, taskNumber, system: p.system, user: p.user }, events);
  const reportPath = paths.report(root, taskNumber);
  const reportText = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
  return { reportPath, reportText, disposition: dispositionOf(reportText || res.text), costUsd: res.costUsd };
}

export async function reviewTask(root: string, taskNumber: number, engine: Engine, events: RunEvents = {}): Promise<ReviewResult> {
  assertGoverned(root);
  const p = reviewerPrompt(root, taskNumber);
  const res = await engine.run({ role: "reviewer", root, taskNumber, system: p.system, user: p.user }, events);
  return { text: res.text, finalVerdict: finalVerdictOf(res.text), costUsd: res.costUsd };
}

export function closeTask(root: string, taskNumber: number, input: CloseInput): LogRow {
  assertGoverned(root);
  const briefPath = paths.brief(root, taskNumber);
  const brief = existsSync(briefPath) ? readFileSync(briefPath, "utf8") : "";
  const reportPath = paths.report(root, taskNumber);
  const report = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
  const disposition = dispositionOf(report);
  const row: LogRow = {
    task: pad(taskNumber),
    date: new Date().toISOString().slice(0, 10),
    lane: "Standard",
    mode: /Mode:\s*Final/i.test(brief) ? "Final" : "Draft",
    outcome: disposition === "UNKNOWN" ? "STOPPED" : disposition,
    decision: input.decision,
    summary: input.summary,
    moved: input.moved,
  };
  appendLogRow(root, row);
  return row;
}

export async function runDirectionCheck(root: string, reason: string, engine: Engine, events: RunEvents = {}): Promise<{ text: string }> {
  assertGoverned(root);
  const p = directionPrompt(root, reason);
  const res = await engine.run({ role: "direction", root, system: p.system, user: p.user }, events);
  return { text: res.text };
}

export function projectStatus(root: string): ProjectStatus {
  if (!isCairnProject(root)) throw new Error("No Cairn contract in this folder.");
  const facts = parseFacts(root);
  const log = parseLog(root);
  const stones = log.filter((r) => /DONE/i.test(r.outcome)).length;
  const gate = checkDirectionGate(log);
  const last = nextTaskNumber(root) - 1;
  let unfinished: UnfinishedTask | null = null;
  if (last >= 1 && !log.some((r) => r.task === pad(last))) {
    const hasBrief = existsSync(paths.brief(root, last));
    const hasReport = existsSync(paths.report(root, last));
    const reportText = hasReport ? readFileSync(paths.report(root, last), "utf8") : "";
    unfinished = {
      taskNumber: last,
      hasBrief,
      hasApproval: loadApproval(root, last) !== null,
      hasReport,
      disposition: hasReport ? dispositionOf(reportText) : "UNKNOWN",
      briefText: hasBrief ? readFileSync(paths.brief(root, last), "utf8") : "",
      reportText,
    };
  }
  return { facts, log, stones, gate, unfinished };
}

export function initProject(root: string, facts: { name: string; what: string; who: string; milestone: string; timebox: string }): { created: string[]; gitReady: boolean } {
  const created = scaffoldProject(root, facts);
  let gitReady = false;
  try {
    const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    git(["--version"]);
    try { git(["rev-parse", "--git-dir"]); } catch { git(["init"]); }
    if (!git(["config", "user.name"])) throw new Error("no identity");
    git(["add", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
    git(["commit", "-m", "Cairn setup: contract, project, log, pilot"]);
    gitReady = true;
  } catch {
    // Files exist either way; the caller tells the user how to finish git setup.
  }
  return { created, gitReady };
}
```

Add to `core/src/index.ts`:
```ts
export * from "./steps.js";
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -w @cairn/core`
Expected: all four suites end `# fail 0`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add core
git commit -m "core: the loop as resumable steps, approvals persisted to disk"
```

---

### Task 4: Rewire the CLI onto the steps

**Files:**
- Modify: `cli/src/flows/task.ts`, `cli/src/flows/init.ts`, `cli/src/flows/status.ts`

**Interfaces:**
- Consumes: Task 3's steps API exactly as specified there.
- Produces: identical CLI behavior (same prompts, same messages); approval now also persisted as `NNN-approval.json`.

- [ ] **Step 1: Rewrite cli/src/flows/task.ts as a sequencer**

Replace the whole file with:

```ts
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
```

- [ ] **Step 2: Rewire init and status**

`cli/src/flows/init.ts` — replace the scaffold + git block (everything from `const created = scaffoldProject(...)` through the git `try/catch`) with:

```ts
  const res = initProject(root, answers as never);
  p.log.success(`Created:\n${res.created.map((c) => "  " + pc.dim(c)).join("\n")}`);
  if (res.gitReady) {
    p.log.success("Git initialized and the setup commit is saved.");
  } else {
    p.log.warn(
      "Files created, but Git isn't ready (missing, or no name/email configured). See GETTING-READY.md, then commit AGENTS.md and docs/ai-work/ yourself.",
    );
  }
```
and change the import to `import { initProject, isCairnProject } from "@cairn/core";` (drop `scaffoldProject` and the local `git` helper plus the `execFileSync` import).

`cli/src/flows/status.ts` — replace the three separate parses with one call:
```ts
import pc from "picocolors";
import { projectStatus } from "@cairn/core";
import { banner, label, stack } from "../ui.js";

export function statusFlow(root: string): void {
  console.log(banner());
  let s;
  try {
    s = projectStatus(root);
  } catch {
    console.log(pc.yellow("No Cairn contract in this folder. Run `cairn init` (empty folder) or see PROJECT-CONVERSION.md."));
    process.exitCode = 1;
    return;
  }
  const stopped = s.log.filter((r) => /STOP/i.test(r.outcome)).length;

  console.log(`${pc.bold(s.facts.name || "Unnamed project")}  ${pc.dim(`(Contract v${s.facts.contractVersion || "?"}, ${s.facts.status || "?"})`)}`);
  console.log(`Milestone: ${s.facts.milestone || pc.dim("not set")}`);
  console.log("");
  if (s.stones > 0) console.log(stack(s.stones) + "\n");
  console.log(`Tasks closed: ${s.log.length}   ${pc.green(`DONE: ${s.stones}`)}   ${pc.yellow(`STOPPED: ${stopped}`)}`);

  const recent = s.log.slice(-5).reverse();
  if (recent.length) {
    console.log("\nRecent work:");
    for (const r of recent) {
      const mark = /DONE/i.test(r.outcome) ? pc.green("●") : pc.yellow("◐");
      console.log(`  ${mark} #${r.task} ${r.summary || r.decision} ${pc.dim(`(${r.outcome}, ${r.date})`)}`);
    }
  } else {
    console.log(pc.dim("\nNo tasks closed yet — run `cairn task` to place the first stone."));
  }

  if (s.unfinished) {
    console.log(`\n${pc.yellow("◌")} Task ${s.unfinished.taskNumber} has a brief but no logged decision — run \`cairn task\` to continue it.`);
  }
  if (s.gate.tripped) console.log(`\n${label.gate} ${s.gate.reason}\nRun \`cairn task\` — it will hold the line and walk you through the options.`);
}
```
(One visible addition: status now mentions an unfinished task. Everything else is byte-identical output.)

- [ ] **Step 3: Build and test everything**

Run (repo root): `npm test`
Expected: core and cli suites all end `# fail 0`.

- [ ] **Step 4: End-to-end mock check in a scratch folder**

Run (any empty temp dir; interactive — answer the prompts):
```bash
mkdir -p /tmp/cairn-manual && cd /tmp/cairn-manual
node "<repo>/cli/dist/src/index.js" init          # answer the five questions
node "<repo>/cli/dist/src/index.js" task --mock   # approve, skip review, accept
node "<repo>/cli/dist/src/index.js" status
```
Expected: the loop completes; `docs/ai-work/tasks/001-approval.json` exists in the scratch project; status shows one stone.

- [ ] **Step 5: Commit**

```bash
git add cli
git commit -m "CLI: thin terminal sequencer over core steps"
```

---

### Task 5: Electron app scaffold — secure window, Vite, contract asset

**Why app/ is NOT a workspace member:** electron-packager copies only the app directory, so dependencies hoisted to the monorepo root would be missing from the packaged app. `app/` therefore installs its own `node_modules` and depends on core via `file:../core` (npm symlinks it; packaging dereferences the symlink). Build core before installing app.

**Files:**
- Create: `app/package.json`, `app/tsconfig.json`, `app/forge.config.ts`, `app/vite.main.config.ts`, `app/vite.preload.config.ts`, `app/vite.renderer.config.ts`, `app/index.html`, `app/scripts/copy-assets.mjs`, `app/src/main/main.ts`, `app/src/main/vite-env.d.ts`, `app/src/preload.ts`, `app/src/renderer/main.tsx`, `app/.gitignore`

**Interfaces:**
- Consumes: `@cairn/core` built to `core/dist` (Tasks 2–3); `setContractPath` from core.
- Produces: `npm start` in `app/` opens a secure window rendering React; `MAIN_WINDOW_VITE_DEV_SERVER_URL` / `MAIN_WINDOW_VITE_NAME` globals declared for main; `createWindow()` pattern later tasks attach IPC to.

- [ ] **Step 1: Write app/package.json**

```json
{
  "name": "cairn-desktop",
  "productName": "Cairn",
  "version": "0.1.0",
  "description": "Build software with AI, one safe step at a time — the Cairn workflow as a desktop app",
  "author": "Ken LeBlanc",
  "license": "MIT",
  "private": true,
  "main": ".vite/build/main.js",
  "scripts": {
    "prestart": "node scripts/copy-assets.mjs",
    "start": "electron-forge start",
    "premake": "node scripts/copy-assets.mjs",
    "make": "electron-forge make",
    "prepackage": "node scripts/copy-assets.mjs",
    "package": "electron-forge package",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cairn/core": "file:../core",
    "@anthropic-ai/claude-agent-sdk": "^0.2.0",
    "electron-squirrel-startup": "^1.0.1"
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.5.0",
    "@electron-forge/maker-dmg": "^7.5.0",
    "@electron-forge/maker-squirrel": "^7.5.0",
    "@electron-forge/maker-zip": "^7.5.0",
    "@electron-forge/plugin-vite": "^7.5.0",
    "@fontsource/quicksand": "^5.1.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^33.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```
(React and fonts live in devDependencies because Vite bundles them; only the SDK and squirrel-startup stay external at runtime.)

- [ ] **Step 2: Write app/tsconfig.json and app/.gitignore**

`app/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"],
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src", "tests", "forge.config.ts", "vite.main.config.ts", "vite.preload.config.ts", "vite.renderer.config.ts", "playwright.config.ts"]
}
```

`app/.gitignore`:
```
node_modules/
.vite/
out/
resources/contract.md
test-results/
```

- [ ] **Step 3: Write the Forge and Vite configs**

`app/forge.config.ts`:
```ts
import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
  packagerConfig: {
    name: "Cairn",
    executableName: "cairn-desktop",
    // The agent SDK spawns its bundled CLI as a child process, which cannot run
    // from inside an asar archive — so no asar in v1.
    asar: false,
    extraResource: ["./resources/contract.md"],
  },
  makers: [new MakerSquirrel({}), new MakerZIP({}, ["darwin"]), new MakerDMG({})],
  plugins: [
    new VitePlugin({
      build: [
        { entry: "src/main/main.ts", config: "vite.main.config.ts", target: "main" },
        { entry: "src/preload.ts", config: "vite.preload.config.ts", target: "preload" },
      ],
      renderer: [{ name: "main_window", config: "vite.renderer.config.ts" }],
    }),
  ],
};

export default config;
```

`app/vite.main.config.ts` (explicit entry/outDir so Task 15's manual `vite build` produces the same layout Forge does):
```ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: ".vite/build",
    emptyOutDir: false,
    lib: { entry: "src/main/main.ts", formats: ["cjs"], fileName: () => "main.js" },
    rollupOptions: {
      // Rollup 4 keeps dynamic import() live in CJS output, so core's
      // `await import("@anthropic-ai/claude-agent-sdk")` still loads the ESM SDK.
      external: ["electron", "electron-squirrel-startup", "@anthropic-ai/claude-agent-sdk", /^node:/],
    },
  },
});
```

`app/vite.preload.config.ts`:
```ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: ".vite/build",
    emptyOutDir: false,
    lib: { entry: "src/preload.ts", formats: ["cjs"], fileName: () => "preload.js" },
    rollupOptions: { external: ["electron"] },
  },
});
```

`app/vite.renderer.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: ".vite/renderer/main_window" },
});
```

- [ ] **Step 4: Write the asset copy script and index.html**

`app/scripts/copy-assets.mjs`:
```js
// The contract template ships as an Electron extraResource; in dev it is read
// from this same copy. Core's sync-contract (run by core's build) keeps
// core/assets/contract.md current from CONTRACT-TEMPLATE.md.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "..", "core", "assets", "contract.md");
const target = join(here, "..", "resources", "contract.md");

if (!existsSync(source)) {
  console.error("core/assets/contract.md not found — run `npm run build -w @cairn/core` at the repo root first.");
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("resources/contract.md synced from core");
```

`app/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws://localhost:*; base-uri 'none'; form-action 'none'" />
    <title>Cairn</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write main, preload stub, renderer stub**

`app/src/main/vite-env.d.ts`:
```ts
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
```

`app/src/main/main.ts`:
```ts
import { app, BrowserWindow } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { setContractPath } from "@cairn/core";

if (started) app.quit();

function contractPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "contract.md")
    : path.join(app.getAppPath(), "resources", "contract.md");
}

export function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#fbf7ee",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== "undefined" && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "renderer", "main_window", "index.html"));
  }
  return win;
}

app.whenReady().then(() => {
  setContractPath(contractPath());
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
```

`app/src/preload.ts` (stub; Task 6 replaces it):
```ts
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("cairn", { ready: true });
```

`app/src/renderer/main.tsx` (stub; Task 8 replaces it):
```tsx
import React from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <h1>Cairn</h1>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Install and typecheck**

Run:
```bash
npm run build -w @cairn/core        # repo root — core dist must exist first
cd app && npm install && npm run typecheck
```
Expected: install succeeds (`node_modules/@cairn/core` is a symlink to `../core`); typecheck exits 0.

- [ ] **Step 7: Manual smoke — the window opens**

Run (in `app/`): `npm start`
Expected: a 1100×760 window titled "Cairn" with the `<h1>Cairn</h1>` stub on a warm paper background; no devtools errors about CSP or the preload. Close the window; the process exits.

- [ ] **Step 8: Commit**

```bash
git add app package.json
git commit -m "Cairn Desktop scaffold: secure Electron + Vite + React shell"
```
(Root `package.json` is unchanged in this task — `git add package.json` is included only if npm touched it; drop it if not.)

---

### Task 6: IPC part 1 — shared contract, preload bridge, preflight, projects

**Files:**
- Create: `app/src/shared/ipc.ts`, `app/src/main/log.ts`, `app/src/main/registry.ts`, `app/src/main/ipc.ts`, `app/src/renderer/api.ts`, `app/src/renderer/global.d.ts`
- Modify: `app/src/preload.ts` (full bridge), `app/src/main/main.ts` (register IPC), `app/src/renderer/main.tsx` (debug view of preflight + projects)

**Interfaces:**
- Consumes: core's `projectStatus`, `initProject`, `isCairnProject`, type `ProjectStatus`.
- Produces: `window.cairn: CairnApi` (every later renderer task calls this); channels `preflight:check`, `project:list`, `project:pickFolder`, `project:open`, `project:init`, `project:status`, `app:openExternal`. Task 7 adds the task channels to the same files.

- [ ] **Step 1: Write the shared IPC contract**

`app/src/shared/ipc.ts` (type-only imports from core so the renderer bundle stays node-free):
```ts
import type { CloseInput, Disposition, LogRow, ProjectStatus } from "@cairn/core";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export type Preflight = { claudeReady: boolean; reason: "no-sdk" | "no-login" | null };
export type RecentProject = { dir: string; ok: boolean; name: string; milestone: string; stones: number };
export type ProjectList = { recent: RecentProject[]; autoOpen: string | null };
export type InitInput = { dir: string; name: string; what: string; who: string; milestone: string; timebox: string };
export type EngineEvent = { role: string; kind: "text" | "tool" | "denied"; text: string };
export type DefinePayload = { taskNumber: number; briefText: string; costUsd?: number };
export type BuildPayload = { reportText: string; disposition: Disposition; costUsd?: number };
export type ReviewPayload = { text: string; finalVerdict: string; costUsd?: number };
export type UpdateInfo = { current: string; latest: string | null; newer: boolean };

export interface CairnApi {
  preflight(): Promise<Preflight>;
  projectList(): Promise<ProjectList>;
  projectPickFolder(): Promise<string | null>;
  projectOpen(dir: string): Promise<Result<ProjectStatus>>;
  projectInit(input: InitInput): Promise<Result<ProjectStatus>>;
  projectStatus(dir: string): Promise<Result<ProjectStatus>>;
  taskDefine(dir: string, outcome: string): Promise<Result<DefinePayload>>;
  taskApprove(dir: string, taskNumber: number): Promise<Result<{ briefSha256: string }>>;
  taskBuild(dir: string, taskNumber: number): Promise<Result<BuildPayload>>;
  taskReview(dir: string, taskNumber: number): Promise<Result<ReviewPayload>>;
  taskClose(dir: string, taskNumber: number, input: CloseInput): Promise<Result<LogRow>>;
  taskDirection(dir: string, reason: string): Promise<Result<{ text: string }>>;
  updateCheck(): Promise<UpdateInfo>;
  openExternal(url: string): Promise<void>;
  onEngineEvent(cb: (ev: EngineEvent) => void): () => void;
}
```

- [ ] **Step 2: Write the error log and the registry**

`app/src/main/log.ts`:
```ts
import { app } from "electron";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/** Raw errors go here, never to the screen. The UI shows plain words only. */
export function logError(context: string, err: unknown): void {
  try {
    const dir = path.join(app.getPath("userData"), "logs");
    mkdirSync(dir, { recursive: true });
    const line = `${new Date().toISOString()} [${context}] ${err instanceof Error ? err.stack || err.message : String(err)}\n`;
    appendFileSync(path.join(dir, "cairn.log"), line);
  } catch {
    // Logging must never take the app down.
  }
}

export function plainMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
```

`app/src/main/registry.ts`:
```ts
import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Entry = { dir: string; lastOpened: string };

function file(): string {
  return path.join(app.getPath("userData"), "projects.json");
}

export function recentDirs(): string[] {
  try {
    if (!existsSync(file())) return [];
    const data = JSON.parse(readFileSync(file(), "utf8")) as { recent: Entry[] };
    return data.recent.map((e) => e.dir);
  } catch {
    return [];
  }
}

export function touchProject(dir: string): void {
  const rest = recentDirs().filter((d) => d !== dir);
  const recent: Entry[] = [dir, ...rest].slice(0, 8).map((d) => ({ dir: d, lastOpened: new Date().toISOString() }));
  writeFileSync(file(), JSON.stringify({ recent }, null, 2));
}
```

- [ ] **Step 3: Write the main-process handlers**

`app/src/main/ipc.ts`:
```ts
import { dialog, ipcMain, shell } from "electron";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { initProject, isCairnProject, projectStatus } from "@cairn/core";
import type { InitInput, Preflight, ProjectList, RecentProject, Result } from "../shared/ipc.js";
import { logError, plainMessage } from "./log.js";
import { recentDirs, touchProject } from "./registry.js";

function toResult<T>(context: string, fn: () => T): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    logError(context, err);
    return { ok: false, message: plainMessage(err) };
  }
}

async function preflight(): Promise<Preflight> {
  try {
    await import("@anthropic-ai/claude-agent-sdk");
  } catch (err) {
    logError("preflight", err);
    return { claudeReady: false, reason: "no-sdk" };
  }
  const home = homedir();
  const signedIn =
    existsSync(path.join(home, ".claude", ".credentials.json")) ||
    existsSync(path.join(home, ".claude.json"));
  return signedIn ? { claudeReady: true, reason: null } : { claudeReady: false, reason: "no-login" };
}

export function registerProjectIpc(): void {
  ipcMain.handle("preflight:check", () => preflight());

  ipcMain.handle("project:list", (): ProjectList => {
    const recent: RecentProject[] = recentDirs().map((dir) => {
      try {
        const s = projectStatus(dir);
        return { dir, ok: true, name: s.facts.name, milestone: s.facts.milestone, stones: s.stones };
      } catch {
        return { dir, ok: false, name: path.basename(dir), milestone: "", stones: 0 };
      }
    });
    return { recent, autoOpen: process.env.CAIRN_OPEN ?? null };
  });

  ipcMain.handle("project:pickFolder", async (): Promise<string | null> => {
    const res = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0];
  });

  ipcMain.handle("project:open", (_e, dir: string) =>
    toResult("project:open", () => {
      if (!isCairnProject(dir)) {
        throw new Error("That folder has no Cairn contract. Start a new project in an empty folder, or see Project Conversion in the guides for existing work.");
      }
      const s = projectStatus(dir);
      touchProject(dir);
      return s;
    }));

  ipcMain.handle("project:init", (_e, input: InitInput) =>
    toResult("project:init", () => {
      const entries = existsSync(input.dir) ? readdirSync(input.dir).filter((e) => e !== ".git") : [];
      if (entries.length > 0) {
        throw new Error("That folder isn't empty. A new project needs an empty folder — for existing work, see Project Conversion in the guides.");
      }
      initProject(input.dir, input);
      const s = projectStatus(input.dir);
      touchProject(input.dir);
      return s;
    }));

  ipcMain.handle("project:status", (_e, dir: string) => toResult("project:status", () => projectStatus(dir)));

  ipcMain.handle("app:openExternal", async (_e, url: string) => {
    if (!/^https:\/\/(github\.com\/kjleblanc\/|kjleblanc\.github\.io\/|claude\.com\/)/.test(url)) return;
    await shell.openExternal(url);
  });
}
```

- [ ] **Step 4: Write the full preload bridge**

Replace `app/src/preload.ts`:
```ts
import { contextBridge, ipcRenderer } from "electron";
import type { CairnApi, EngineEvent } from "./shared/ipc.js";

const api: CairnApi = {
  preflight: () => ipcRenderer.invoke("preflight:check"),
  projectList: () => ipcRenderer.invoke("project:list"),
  projectPickFolder: () => ipcRenderer.invoke("project:pickFolder"),
  projectOpen: (dir) => ipcRenderer.invoke("project:open", dir),
  projectInit: (input) => ipcRenderer.invoke("project:init", input),
  projectStatus: (dir) => ipcRenderer.invoke("project:status", dir),
  taskDefine: (dir, outcome) => ipcRenderer.invoke("task:define", dir, outcome),
  taskApprove: (dir, taskNumber) => ipcRenderer.invoke("task:approve", dir, taskNumber),
  taskBuild: (dir, taskNumber) => ipcRenderer.invoke("task:build", dir, taskNumber),
  taskReview: (dir, taskNumber) => ipcRenderer.invoke("task:review", dir, taskNumber),
  taskClose: (dir, taskNumber, input) => ipcRenderer.invoke("task:close", dir, taskNumber, input),
  taskDirection: (dir, reason) => ipcRenderer.invoke("task:direction", dir, reason),
  updateCheck: () => ipcRenderer.invoke("app:updateCheck"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  onEngineEvent: (cb) => {
    const listener = (_e: unknown, ev: EngineEvent) => cb(ev);
    ipcRenderer.on("engine:event", listener as never);
    return () => ipcRenderer.removeListener("engine:event", listener as never);
  },
};

contextBridge.exposeInMainWorld("cairn", api);
```

- [ ] **Step 5: Wire main and the renderer accessor**

In `app/src/main/main.ts`, import and register before `createWindow()`:
```ts
import { registerProjectIpc } from "./ipc.js";
```
and inside `app.whenReady().then(() => { ... })`, after `setContractPath(...)`:
```ts
  registerProjectIpc();
```

`app/src/renderer/global.d.ts`:
```ts
import type { CairnApi } from "../shared/ipc.js";

declare global {
  interface Window { cairn: CairnApi }
}
export {};
```

`app/src/renderer/api.ts`:
```ts
export const cairn = window.cairn;
```

Replace `app/src/renderer/main.tsx` with a throwaway debug view (Task 8 replaces it):
```tsx
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { cairn } from "./api";
import type { Preflight, ProjectList } from "../shared/ipc";

function Debug() {
  const [pf, setPf] = useState<Preflight | null>(null);
  const [pl, setPl] = useState<ProjectList | null>(null);
  useEffect(() => {
    cairn.preflight().then(setPf);
    cairn.projectList().then(setPl);
  }, []);
  return <pre>{JSON.stringify({ pf, pl }, null, 2)}</pre>;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Debug />
  </React.StrictMode>,
);
```

- [ ] **Step 6: Typecheck and manual smoke**

Run (in `app/`): `npm run typecheck && npm start`
Expected: typecheck exits 0. The window shows JSON: `pf.claudeReady: true` (this machine is signed in) and an empty `recent` list, `autoOpen: null`.

- [ ] **Step 7: Commit**

```bash
git add app
git commit -m "app: typed IPC bridge — preflight, projects, registry, error log"
```

---

### Task 7: IPC part 2 — task steps over the wire, engine events, single flight

**Files:**
- Create: `app/src/main/tasks.ts`
- Modify: `app/src/main/main.ts` (register task IPC with a window getter)

**Interfaces:**
- Consumes: core steps (Task 3), `pickEngine`, `RunEvents`; `logError`/`plainMessage` (Task 6); channel names exactly as preload wired them in Task 6.
- Produces: channels `task:define/approve/build/review/close/direction` returning the `Result<…>` payload types from `shared/ipc.ts`; `engine:event` pushed to the focused window; mock mode via `CAIRN_MOCK=1`.

- [ ] **Step 1: Write app/src/main/tasks.ts**

```ts
import { ipcMain, type BrowserWindow } from "electron";
import {
  approveBrief, buildTask, closeTask, defineTask, pickEngine, reviewTask, runDirectionCheck,
  type CloseInput, type Engine, type RunEvents,
} from "@cairn/core";
import type { EngineEvent, Result } from "../shared/ipc.js";
import { logError, plainMessage } from "./log.js";

/** One agent at a time — the loop is sequential by design. */
let busy = false;

async function exclusive<T>(context: string, fn: () => Promise<T>): Promise<Result<T>> {
  if (busy) return { ok: false, message: "One step at a time — an agent is already running." };
  busy = true;
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    logError(context, err);
    return { ok: false, message: plainMessage(err) };
  } finally {
    busy = false;
  }
}

function sync<T>(context: string, fn: () => T): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    logError(context, err);
    return { ok: false, message: plainMessage(err) };
  }
}

function forward(win: () => BrowserWindow | null, role: string): RunEvents {
  const send = (ev: EngineEvent) => win()?.webContents.send("engine:event", ev);
  return {
    onText: (t) => { if (t.trim()) send({ role, kind: "text", text: t }); },
    onTool: (name, detail) => send({ role, kind: "tool", text: `${name}: ${detail}` }),
    onDenied: (name, why) => send({ role, kind: "denied", text: `${name} — ${why}` }),
  };
}

export function registerTaskIpc(win: () => BrowserWindow | null): void {
  const engine: Engine = pickEngine(process.env.CAIRN_MOCK === "1");

  ipcMain.handle("task:define", (_e, dir: string, outcome: string) =>
    exclusive("task:define", async () => {
      const r = await defineTask(dir, outcome, engine, forward(win, "definer"));
      return { taskNumber: r.taskNumber, briefText: r.briefText, costUsd: r.costUsd };
    }));

  ipcMain.handle("task:approve", (_e, dir: string, taskNumber: number) =>
    sync("task:approve", () => ({ briefSha256: approveBrief(dir, taskNumber).briefSha256 })));

  ipcMain.handle("task:build", (_e, dir: string, taskNumber: number) =>
    exclusive("task:build", async () => {
      const r = await buildTask(dir, taskNumber, engine, forward(win, "builder"));
      return { reportText: r.reportText, disposition: r.disposition, costUsd: r.costUsd };
    }));

  ipcMain.handle("task:review", (_e, dir: string, taskNumber: number) =>
    exclusive("task:review", async () => {
      const r = await reviewTask(dir, taskNumber, engine, forward(win, "reviewer"));
      return { text: r.text, finalVerdict: r.finalVerdict, costUsd: r.costUsd };
    }));

  ipcMain.handle("task:close", (_e, dir: string, taskNumber: number, input: CloseInput) =>
    sync("task:close", () => closeTask(dir, taskNumber, input)));

  ipcMain.handle("task:direction", (_e, dir: string, reason: string) =>
    exclusive("task:direction", () => runDirectionCheck(dir, reason, engine, forward(win, "direction"))));
}
```

- [ ] **Step 2: Register it in main.ts with a window getter**

In `app/src/main/main.ts`:
```ts
import { registerTaskIpc } from "./tasks.js";
```
Track the window: change `createWindow` to store its result in a module-level `let mainWindow: BrowserWindow | null = null;` (set `mainWindow = win;` before returning, and `win.on("closed", () => { mainWindow = null; })`). Inside `whenReady`, after `registerProjectIpc();`:
```ts
  registerTaskIpc(() => mainWindow);
```

- [ ] **Step 3: Typecheck and manual mock loop over IPC**

Run (in `app/`): `npm run typecheck`
Expected: exit 0.

Then verify the channels end-to-end with the mock engine and the debug renderer. Create a scratch Cairn project first:
```bash
mkdir -p /tmp/cairn-app-smoke
node --input-type=module -e "import { initProject } from '@cairn/core'; initProject('/tmp/cairn-app-smoke', { name: 'S', what: 'w', who: 'me', milestone: 'm', timebox: 'default' });"
```
(Run from inside `app/` so `@cairn/core` resolves from its `node_modules`.)
Temporarily extend the Debug component in `app/src/renderer/main.tsx` with a button (delete after checking):
```tsx
<button onClick={async () => {
  const dir = "/tmp/cairn-app-smoke";
  console.log(await cairn.taskDefine(dir, "A demo file appears"));
  console.log(await cairn.taskApprove(dir, 1));
  console.log(await cairn.taskBuild(dir, 1));
  console.log(await cairn.taskClose(dir, 1, { decision: "accept", summary: "s", moved: "YES" }));
}}>run mock loop</button>
```
Run: `CAIRN_MOCK=1 npm start` (PowerShell: `$env:CAIRN_MOCK="1"; npm start`), click the button.
Expected: devtools console logs four `{ ok: true, ... }` results; `engine:event` messages appear if you also log `cairn.onEngineEvent(console.log)`. Remove the temporary button.

- [ ] **Step 4: Commit**

```bash
git add app
git commit -m "app: task steps over IPC — engine events streamed, one agent at a time"
```

---

### Task 8: Renderer foundation — tokens, shell, shared components

**Files:**
- Create: `app/src/renderer/tokens.css`, `app/src/renderer/app.css`, `app/src/renderer/App.tsx`, `app/src/renderer/components/Ui.tsx`, `app/src/renderer/components/Md.tsx`, `app/src/renderer/components/ActivityFeed.tsx`, and stub screens `app/src/renderer/screens/{Welcome,Picker,Dashboard,Wizard,Direction,Settings}.tsx`
- Modify: `app/src/renderer/main.tsx` (final version)

**Interfaces:**
- Consumes: `window.cairn` (Task 6/7); types from `shared/ipc.ts` and `@cairn/core`.
- Produces: the `View` state machine in `App.tsx` and the exact screen prop signatures below — Tasks 9–15 replace stub screen files wholesale and MUST keep these signatures; CSS utility classes (`card`, `pill`, `pill-primary`, `badge-done`, `badge-stopped`, `mono`, `chip-denied`) used by every screen.

Screen prop signatures (fixed from this task on):
```ts
Welcome:   { preflight: Preflight; hasRecent: boolean; onRecheck(): void; onOpenFolder(): void; onNew(): void; onBrowseRecent(): void }
Picker:    { startNew: boolean; onOpen(dir: string): void; onOpenFolder(): void; onCreated(dir: string, status: ProjectStatus): void; onSettings(): void }
Dashboard: { dir: string; status: ProjectStatus; justAdded: boolean; onStartTask(): void; onResume(): void; onDirection(reason: string): void; onSwitch(): void; onSettings(): void }
Wizard:    { dir: string; resume: UnfinishedTask | null; onDone(stoneAdded: boolean): void }
Direction: { dir: string; reason: string; onBack(): void }
Settings:  { onBack(): void }
```

- [ ] **Step 1: Write tokens.css — the faded pastel palette**

`app/src/renderer/tokens.css` (ported from `cairn.html`, desaturated per the approved mockup):
```css
:root {
  color-scheme: light dark;
  --bg: light-dark(#fbf7ee, #1b1e26);
  --sky: light-dark(#edf4fa, #141721);
  --cloud: light-dark(#dcebf7, #232a3a);
  --hill-back: light-dark(#eaf3de, #202a22);
  --hill-front: light-dark(#d9e8c4, #263427);
  --card: light-dark(rgb(255 255 255 / 74%), rgb(38 42 54 / 74%));
  --card-solid: light-dark(#ffffff, #262a36);
  --ink: light-dark(#44423c, #e6e2d8);
  --muted: light-dark(#8a8375, #a09a8d);
  --line: light-dark(#eae4d6, #333947);
  --green: light-dark(#7fae62, #9ec98a);
  --green-ink: light-dark(#ffffff, #16241b);
  --green-deep: light-dark(#3f5c31, #cfe4c2);
  --green-soft: light-dark(#e9f1e0, #26331f);
  --amber: light-dark(#b08a45, #d8b57c);
  --amber-deep: light-dark(#6b5222, #ecd9b4);
  --amber-soft: light-dark(#f7eeda, #37301f);
  --stop: light-dark(#a96e63, #d8a49a);
  --stop-soft: light-dark(#f6e9e6, #3a2a27);
  --stone-a: light-dark(#d6d1c5, #4a5162);
  --stone-b: light-dark(#c4beb0, #3d4453);
  --trail: light-dark(#a49c8c, #6a7284);
  --mono: ui-monospace, "Cascadia Code", Consolas, Menlo, monospace;
  --r: 22px;
  --r-sm: 14px;
  --spring: cubic-bezier(.34, 1.4, .5, 1);
}
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"] { color-scheme: dark; }
```

- [ ] **Step 2: Write app.css — layout and the shared vocabulary**

`app/src/renderer/app.css`:
```css
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: "Quicksand", ui-rounded, "Segoe UI", system-ui, sans-serif;
  font-size: 15.5px;
  line-height: 1.55;
  overflow-x: hidden;
}
#root { min-height: 100vh; display: flex; flex-direction: column; }
h1, h2, h3 { line-height: 1.2; margin: 0 0 .35em; letter-spacing: -.01em; font-weight: 600; }
h1 { font-size: 1.6rem; }
h2 { font-size: 1.2rem; }
p { margin: 0 0 10px; }
p:last-child { margin-bottom: 0; }
.muted { color: var(--muted); }
.small { font-size: .87rem; }
.mono { font-family: var(--mono); font-size: .84em; }

.shell { width: min(860px, 100%); margin: 0 auto; padding: 18px 22px 40px; flex: 1; }

.card {
  background: var(--card);
  border-radius: var(--r);
  padding: 16px 20px;
  margin: 0 0 12px;
}
.card-title { font-size: .8rem; letter-spacing: .05em; color: var(--muted); margin: 0 0 8px; }

.pill {
  font: inherit; font-weight: 600; font-size: .95rem;
  border: none; border-radius: 999px; padding: 11px 22px;
  background: var(--card-solid); color: var(--ink);
  cursor: pointer; transition: transform .15s var(--spring), opacity .15s;
}
.pill:hover { transform: translateY(-1px); }
.pill:active { transform: scale(.97); }
.pill:disabled { opacity: .5; cursor: default; transform: none; }
.pill-primary { background: var(--green); color: var(--green-ink); }
.pill-quiet { background: transparent; color: var(--muted); }
.pill-danger { background: var(--stop-soft); color: var(--stop); }

.badge { display: inline-block; border-radius: 999px; padding: 1px 12px; font-size: .78rem; font-weight: 600; }
.badge-done { background: var(--green-soft); color: var(--green-deep); }
.badge-stopped { background: var(--amber-soft); color: var(--amber-deep); }

.chip-denied {
  display: inline-block; border-radius: 999px; padding: 1px 10px;
  background: var(--amber-soft); color: var(--amber-deep); font-weight: 600;
}

.feed {
  background: var(--card); border-radius: var(--r-sm); padding: 10px 14px;
  font-family: var(--mono); font-size: .8rem; color: var(--muted);
  max-height: 180px; overflow-y: auto; line-height: 1.9;
}
.feed div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.error-card { background: var(--stop-soft); border-radius: var(--r-sm); padding: 12px 16px; color: var(--stop); margin: 0 0 12px; }

.row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.spread { justify-content: space-between; }

textarea, input[type="text"] {
  font: inherit; color: var(--ink); width: 100%;
  background: var(--card-solid); border: 1px solid var(--line);
  border-radius: var(--r-sm); padding: 10px 14px; outline: none;
}
textarea:focus, input[type="text"]:focus { border-color: var(--green); }
```

- [ ] **Step 3: Write the shared components**

`app/src/renderer/components/Ui.tsx`:
```tsx
import type { ReactNode } from "react";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title ? <p className="card-title">{title}</p> : null}
      {children}
    </section>
  );
}

export function Pill({ children, onClick, kind = "soft", disabled }: {
  children: ReactNode; onClick?: () => void; kind?: "primary" | "soft" | "quiet" | "danger"; disabled?: boolean;
}) {
  const cls = { primary: "pill pill-primary", soft: "pill", quiet: "pill pill-quiet", danger: "pill pill-danger" }[kind];
  return <button type="button" className={cls} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Badge({ kind }: { kind: "DONE" | "STOPPED" | "UNKNOWN" }) {
  if (kind === "DONE") return <span className="badge badge-done">done</span>;
  return <span className="badge badge-stopped">{kind === "STOPPED" ? "stopped" : "unclear"}</span>;
}

export function ErrorCard({ message }: { message: string }) {
  return (
    <div className="error-card">
      <p>{message}</p>
      <p className="small">The technical details were saved to the app's log file.</p>
    </div>
  );
}
```

`app/src/renderer/components/Md.tsx` — tiny, safe markdown (built as React elements; no HTML injection):
```tsx
import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else out.push(<code className="mono" key={k++}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Md({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let k = 0;
  const flush = () => {
    if (list.length) {
      blocks.push(<ul key={k++}>{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>);
      list = [];
    }
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const b = line.match(/^[-*]\s+(.*)$/);
    if (h) { flush(); const H = (["h1", "h2", "h3"] as const)[h[1].length - 1]; blocks.push(<H key={k++}>{inline(h[2])}</H>); }
    else if (b) list.push(b[1]);
    else if (line.trim() === "") flush();
    else { flush(); blocks.push(<p key={k++}>{inline(line)}</p>); }
  }
  flush();
  return <div>{blocks}</div>;
}
```

`app/src/renderer/components/ActivityFeed.tsx`:
```tsx
import { useEffect, useRef } from "react";
import type { EngineEvent } from "../../shared/ipc";

export function ActivityFeed({ events }: { events: EngineEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [events.length]);
  if (events.length === 0) return null;
  return (
    <div className="feed" ref={ref} aria-live="polite">
      {events.map((e, i) =>
        e.kind === "denied"
          ? <div key={i}><span className="chip-denied">⊘ blocked · {e.text}</span></div>
          : <div key={i}>▸ {e.text}</div>,
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write App.tsx and the stub screens**

`app/src/renderer/App.tsx`:
```tsx
import { useCallback, useEffect, useState } from "react";
import type { ProjectStatus, UnfinishedTask } from "@cairn/core";
import type { Preflight } from "../shared/ipc";
import { cairn } from "./api";
import { ErrorCard } from "./components/Ui";
import { Welcome } from "./screens/Welcome";
import { Picker } from "./screens/Picker";
import { Dashboard } from "./screens/Dashboard";
import { Wizard } from "./screens/Wizard";
import { Direction } from "./screens/Direction";
import { Settings } from "./screens/Settings";

type View =
  | { name: "loading" }
  | { name: "welcome"; preflight: Preflight; hasRecent: boolean }
  | { name: "picker"; startNew: boolean }
  | { name: "dashboard"; dir: string; status: ProjectStatus; justAdded: boolean }
  | { name: "wizard"; dir: string; resume: UnfinishedTask | null }
  | { name: "direction"; dir: string; reason: string }
  | { name: "settings"; dir: string | null };

export function App() {
  const [view, setView] = useState<View>({ name: "loading" });
  const [error, setError] = useState<string | null>(null);

  const openProject = useCallback(async (dir: string, justAdded = false) => {
    const r = await cairn.projectOpen(dir);
    if (r.ok) { setError(null); setView({ name: "dashboard", dir, status: r.value, justAdded }); }
    else setError(r.message);
  }, []);

  const boot = useCallback(async () => {
    const pf = await cairn.preflight();
    const list = await cairn.projectList();
    if (!pf.claudeReady) { setView({ name: "welcome", preflight: pf, hasRecent: list.recent.length > 0 }); return; }
    if (list.autoOpen) { await openProject(list.autoOpen); return; }
    if (list.recent.length > 0) setView({ name: "picker", startNew: false });
    else setView({ name: "welcome", preflight: pf, hasRecent: false });
  }, [openProject]);

  useEffect(() => { void boot(); }, [boot]);

  const pickAndOpen = useCallback(async () => {
    const dir = await cairn.projectPickFolder();
    if (dir) await openProject(dir);
  }, [openProject]);

  const body = (() => {
    switch (view.name) {
      case "loading":
        return <p className="muted">Getting ready…</p>;
      case "welcome":
        return <Welcome preflight={view.preflight} hasRecent={view.hasRecent}
          onRecheck={() => void boot()}
          onOpenFolder={() => void pickAndOpen()}
          onNew={() => setView({ name: "picker", startNew: true })}
          onBrowseRecent={() => setView({ name: "picker", startNew: false })} />;
      case "picker":
        return <Picker startNew={view.startNew}
          onOpen={(dir) => void openProject(dir)}
          onOpenFolder={() => void pickAndOpen()}
          onCreated={(dir, status) => setView({ name: "dashboard", dir, status, justAdded: false })}
          onSettings={() => setView({ name: "settings", dir: null })} />;
      case "dashboard":
        return <Dashboard dir={view.dir} status={view.status} justAdded={view.justAdded}
          onStartTask={() => setView({ name: "wizard", dir: view.dir, resume: null })}
          onResume={() => setView({ name: "wizard", dir: view.dir, resume: view.status.unfinished })}
          onDirection={(reason) => setView({ name: "direction", dir: view.dir, reason })}
          onSwitch={() => setView({ name: "picker", startNew: false })}
          onSettings={() => setView({ name: "settings", dir: view.dir })} />;
      case "wizard":
        return <Wizard dir={view.dir} resume={view.resume}
          onDone={(stoneAdded) => void openProject(view.dir, stoneAdded)} />;
      case "direction":
        return <Direction dir={view.dir} reason={view.reason} onBack={() => void openProject(view.dir)} />;
      case "settings":
        return <Settings onBack={() => (view.dir ? void openProject(view.dir) : setView({ name: "picker", startNew: false }))} />;
    }
  })();

  return (
    <main className="shell">
      {error ? <ErrorCard message={error} /> : null}
      {body}
    </main>
  );
}
```

Stub screens — six files, each exporting the final signature with placeholder markup. Example `app/src/renderer/screens/Welcome.tsx` (the other five follow the same pattern with their own props from the signature table):
```tsx
import type { Preflight } from "../../shared/ipc";

export function Welcome(_props: {
  preflight: Preflight; hasRecent: boolean;
  onRecheck: () => void; onOpenFolder: () => void; onNew: () => void; onBrowseRecent: () => void;
}) {
  return <p className="muted">Welcome screen coming in Task 9.</p>;
}
```

- [ ] **Step 5: Write the final main.tsx**

```tsx
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "./tokens.css";
import "./app.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const savedTheme = localStorage.getItem("cairn-theme");
if (savedTheme === "light" || savedTheme === "dark") document.documentElement.dataset.theme = savedTheme;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 6: Typecheck and manual smoke**

Run (in `app/`): `npm run typecheck && npm start`
Expected: typecheck exits 0; the window shows the Quicksand-set stub for Welcome (fresh userData) or Picker, on the warm paper background — light and dark both work (flip the OS theme).

- [ ] **Step 7: Commit**

```bash
git add app
git commit -m "app renderer: pastel tokens, view machine, shared components"
```

---

### Task 9: Welcome / first-run screen

**Files:**
- Replace: `app/src/renderer/screens/Welcome.tsx`

**Interfaces:**
- Consumes: props signature from Task 8 (unchanged); `Card`/`Pill` from `components/Ui`.
- Produces: the finished first-run experience.

- [ ] **Step 1: Write the screen**

```tsx
import type { Preflight } from "../../shared/ipc";
import { Card, Pill } from "../components/Ui";
import { cairn } from "../api";

export function Welcome({ preflight, hasRecent, onRecheck, onOpenFolder, onNew, onBrowseRecent }: {
  preflight: Preflight; hasRecent: boolean;
  onRecheck: () => void; onOpenFolder: () => void; onNew: () => void; onBrowseRecent: () => void;
}) {
  if (!preflight.claudeReady) {
    return (
      <div style={{ maxWidth: 560, margin: "48px auto" }}>
        <h1>Almost ready</h1>
        {preflight.reason === "no-sdk" ? (
          <Card>
            <p>A piece of Cairn didn't come along properly. Reinstalling the app usually fixes it.</p>
            <p className="small muted">If it keeps happening, the app's log file has the details for anyone helping you.</p>
          </Card>
        ) : (
          <Card>
            <p>Cairn builds with Claude, and Claude isn't signed in on this computer yet. One-time setup:</p>
            <p>1. Install Claude Code from <button className="pill pill-quiet" onClick={() => void cairn.openExternal("https://claude.com/claude-code")}>claude.com/claude-code</button></p>
            <p>2. Open it once and sign in with your Claude account.</p>
            <p>3. Come back here and check again.</p>
          </Card>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          <Pill kind="primary" onClick={onRecheck}>Check again</Pill>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "48px auto", textAlign: "center" }}>
      <h1>Welcome to Cairn</h1>
      <p className="muted">Build software with AI, one safe step at a time. Every task ends with something you can see.</p>
      <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
        <Pill kind="primary" onClick={onNew}>Start a new project</Pill>
        <Pill onClick={onOpenFolder}>Open a project folder</Pill>
      </div>
      {hasRecent ? (
        <p style={{ marginTop: 16 }}>
          <button className="pill pill-quiet" onClick={onBrowseRecent}>Your recent projects</button>
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run (in `app/`): `npm run typecheck && npm start`
Expected: with Claude signed in and no recent projects, the two big choices appear. To see the fix-it variant, temporarily hardcode `preflight.reason = "no-login"` in devtools React or rename `~/.claude.json` — the guided steps and *Check again* appear; *Check again* re-runs boot.

- [ ] **Step 3: Commit**

```bash
git add app
git commit -m "app: first-run welcome — guided Claude setup in plain words"
```

---

### Task 10: Project picker and the new-project form

**Files:**
- Replace: `app/src/renderer/screens/Picker.tsx`

**Interfaces:**
- Consumes: props from Task 8; `cairn.projectList/projectPickFolder/projectInit`; `RecentProject` type.
- Produces: the finished picker + init flow.

- [ ] **Step 1: Write the screen**

```tsx
import { useEffect, useState } from "react";
import type { ProjectStatus } from "@cairn/core";
import type { RecentProject } from "../../shared/ipc";
import { Card, ErrorCard, Pill } from "../components/Ui";
import { cairn } from "../api";

type Draft = { dir: string; name: string; what: string; who: string; milestone: string; timebox: string };
const emptyDraft: Draft = { dir: "", name: "", what: "", who: "", milestone: "", timebox: "two Standard tasks without visible progress (default)" };

export function Picker({ startNew, onOpen, onOpenFolder, onCreated, onSettings }: {
  startNew: boolean; onOpen: (dir: string) => void; onOpenFolder: () => void;
  onCreated: (dir: string, status: ProjectStatus) => void; onSettings: () => void;
}) {
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [creating, setCreating] = useState(startNew);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void cairn.projectList().then((l) => setRecent(l.recent)); }, []);

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: e.target.value });

  async function create() {
    if (!draft.dir || !draft.name.trim() || !draft.milestone.trim()) {
      setError("Pick an empty folder and fill in at least the name and the first thing you want to see.");
      return;
    }
    setBusy(true);
    const r = await cairn.projectInit(draft);
    setBusy(false);
    if (r.ok) onCreated(draft.dir, r.value);
    else setError(r.message);
  }

  if (creating) {
    return (
      <div style={{ maxWidth: 560, margin: "24px auto" }}>
        <h1>A new project</h1>
        <p className="muted">Five questions, then your project gets its rulebook.</p>
        {error ? <ErrorCard message={error} /> : null}
        <Card>
          <p className="card-title">where it lives</p>
          <div className="row">
            <Pill onClick={() => void cairn.projectPickFolder().then((d) => d && setDraft({ ...draft, dir: d }))}>
              {draft.dir ? "Change folder" : "Choose an empty folder"}
            </Pill>
            {draft.dir ? <span className="mono small">{draft.dir}</span> : null}
          </div>
        </Card>
        <Card>
          <p>What's the project called?</p>
          <input type="text" value={draft.name} onChange={set("name")} placeholder="Recipe Box" />
          <p style={{ marginTop: 10 }}>What do you want to build?</p>
          <input type="text" value={draft.what} onChange={set("what")} placeholder="A simple app where I can save and search my recipes" />
          <p style={{ marginTop: 10 }}>Who will use it?</p>
          <input type="text" value={draft.who} onChange={set("who")} placeholder="Just me, maybe my family later" />
          <p style={{ marginTop: 10 }}>What's the first thing you want to SEE working?</p>
          <input type="text" value={draft.milestone} onChange={set("milestone")} placeholder="A page that lists three of my recipes" />
          <p style={{ marginTop: 10 }}>Timebox before rethinking the approach</p>
          <input type="text" value={draft.timebox} onChange={set("timebox")} />
        </Card>
        <div className="row">
          <Pill kind="primary" onClick={() => void create()} disabled={busy}>{busy ? "Setting up…" : "Create the project"}</Pill>
          <Pill kind="quiet" onClick={() => setCreating(false)}>Back</Pill>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "24px auto" }}>
      <div className="row spread">
        <h1>Your projects</h1>
        <button className="pill pill-quiet" onClick={onSettings}>Settings</button>
      </div>
      {recent.filter((r) => r.ok).map((r) => (
        <button key={r.dir} className="card" style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer", font: "inherit" }}
          onClick={() => onOpen(r.dir)}>
          <div className="row spread">
            <div>
              <strong>{r.name || "Unnamed project"}</strong>
              <p className="small muted">{r.milestone || "milestone not set"}</p>
            </div>
            <span className="badge badge-done">{r.stones} {r.stones === 1 ? "stone" : "stones"}</span>
          </div>
        </button>
      ))}
      {recent.filter((r) => r.ok).length === 0 ? <p className="muted">Nothing here yet.</p> : null}
      <div className="row" style={{ marginTop: 16 }}>
        <Pill kind="primary" onClick={() => setCreating(true)}>Start a new project</Pill>
        <Pill onClick={onOpenFolder}>Open a project folder</Pill>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run (in `app/`): `npm run typecheck && npm start`
Expected: create a scratch project through the form (choose an empty folder, answer, *Create the project*) — you land on the Dashboard stub; reopening the app lists it as a card; opening a non-Cairn folder shows the plain-words error at the top.

- [ ] **Step 3: Commit**

```bash
git add app
git commit -m "app: project picker and the five-question kickoff form"
```

---

### Task 11: Dashboard — the hillside, the log, the gate

**Files:**
- Create: `app/src/renderer/components/Scene.tsx`, `app/src/renderer/sound.ts`
- Replace: `app/src/renderer/screens/Dashboard.tsx`
- Modify: `app/src/renderer/app.css` (scene + animation styles appended)

**Interfaces:**
- Consumes: props from Task 8; `ProjectStatus` (facts, log, stones, gate, unfinished).
- Produces: `Scene({ stones, justAdded })` (Task 13's close path relies on `justAdded` for the drop animation); `pluck()` from `sound.ts` (called here; toggled in Task 14's settings via localStorage key `cairn-sound`).

- [ ] **Step 1: Append scene styles to app.css**

```css
.scene-wrap { position: relative; border-radius: var(--r); overflow: hidden; margin: 0 0 14px; background: var(--sky); }
.scene-head { position: absolute; top: 14px; left: 20px; }
.scene-head h1 { margin: 0; }
.stone-top { transform-origin: center; }
.stone-drop { animation: drop .7s var(--spring); }
@keyframes drop {
  0% { transform: translateY(-46px); opacity: 0; }
  60% { transform: translateY(3px); opacity: 1; }
  100% { transform: translateY(0); }
}
.status-pill {
  display: inline-block; background: var(--card); border-radius: 999px;
  padding: 8px 16px; font-family: var(--mono); font-size: .78rem; color: var(--muted);
}
.gate-banner { background: var(--amber-soft); color: var(--amber-deep); border-radius: var(--r); padding: 14px 18px; margin: 0 0 12px; }
.log-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line); }
.log-row:last-child { border-bottom: none; }
```

- [ ] **Step 2: Write sound.ts — one soft optional pluck**

`app/src/renderer/sound.ts`:
```ts
/** A soft synthesized pluck for the stone drop. Off unless the user turned it on. */
export function pluck(): void {
  if (localStorage.getItem("cairn-sound") !== "1") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(392, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(196, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close();
  } catch {
    // No audio device is fine.
  }
}
```

- [ ] **Step 3: Write Scene.tsx**

```tsx
/** The log made visible: one stone per closed task on a faded hillside, a dotted trace winding up. */
export function Scene({ stones, justAdded }: { stones: number; justAdded: boolean }) {
  const visible = Math.min(stones, 7);
  const rows: { cx: number; cy: number; rx: number; ry: number }[] = [];
  let cy = 112, rx = 27, ry = 7.5;
  for (let i = 0; i < visible; i++) {
    rows.push({ cx: 382, cy, rx, ry });
    cy -= ry + 5;
    rx *= 0.8; ry *= 0.93;
  }
  return (
    <svg viewBox="0 0 640 140" width="100%" role="img" aria-label={`Your cairn: ${stones} ${stones === 1 ? "stone" : "stones"}`}>
      <ellipse cx="100" cy="30" rx="36" ry="11" fill="var(--cloud)" />
      <ellipse cx="530" cy="22" rx="44" ry="12" fill="var(--cloud)" />
      <ellipse cx="300" cy="185" rx="430" ry="85" fill="var(--hill-back)" />
      <ellipse cx="580" cy="195" rx="320" ry="75" fill="var(--hill-front)" />
      <path d="M60 132 C 150 128, 200 122, 250 116 S 330 104, 352 96"
        fill="none" stroke="var(--trail)" strokeWidth="1.5" strokeDasharray="1 6" strokeLinecap="round" />
      <circle cx="120" cy="129" r="2.5" fill="var(--trail)" />
      <circle cx="250" cy="116" r="2.5" fill="var(--trail)" />
      <circle cx="352" cy="96" r="2.5" fill="var(--green)" />
      {rows.map((r, i) => {
        const top = i === visible - 1;
        return (
          <ellipse key={i} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
            fill={top ? "var(--green)" : i % 2 ? "var(--stone-a)" : "var(--stone-b)"}
            className={top ? (justAdded ? "stone-top stone-drop" : "stone-top") : undefined} />
        );
      })}
      {stones > 7 ? (
        <text x="440" y="70" fontSize="12" fill="var(--muted)" fontFamily="var(--mono)">{stones} stones</text>
      ) : null}
    </svg>
  );
}
```

- [ ] **Step 4: Write Dashboard.tsx**

```tsx
import { useEffect } from "react";
import type { ProjectStatus } from "@cairn/core";
import { Badge, Card, Pill } from "../components/Ui";
import { Scene } from "../components/Scene";
import { pluck } from "../sound";

export function Dashboard({ dir, status, justAdded, onStartTask, onResume, onDirection, onSwitch, onSettings }: {
  dir: string; status: ProjectStatus; justAdded: boolean;
  onStartTask: () => void; onResume: () => void; onDirection: (reason: string) => void;
  onSwitch: () => void; onSettings: () => void;
}) {
  useEffect(() => { if (justAdded) pluck(); }, [justAdded]);
  const { facts, log, stones, gate, unfinished } = status;
  const recent = log.slice(-6).reverse();

  return (
    <div>
      <div className="scene-wrap">
        <div className="scene-head">
          <h1>{facts.name || "Your project"}</h1>
          <p className="small muted">milestone · {facts.milestone || "not set"}</p>
        </div>
        <Scene stones={stones} justAdded={justAdded} />
      </div>

      <div className="row spread" style={{ marginBottom: 12 }}>
        <span className="status-pill">▸ idle · {stones} {stones === 1 ? "stone" : "stones"} · gate {gate.tripped ? "tripped" : "quiet"}</span>
        {!gate.tripped ? <Pill kind="primary" onClick={onStartTask}>Start a task</Pill> : null}
      </div>

      {gate.tripped ? (
        <div className="gate-banner">
          <p><strong>Direction Gate.</strong> {gate.reason} No third narrow patch — time to look at the direction instead.</p>
          <Pill onClick={() => onDirection(gate.reason)}>Run a direction check</Pill>
        </div>
      ) : null}

      {unfinished ? (
        <Card title="unfinished task">
          <div className="row spread">
            <p>Task {String(unfinished.taskNumber).padStart(3, "0")} was started but never closed. Pick up where you left off.</p>
            <Pill onClick={onResume}>Continue it</Pill>
          </div>
        </Card>
      ) : null}

      <Card title="recent stones">
        {recent.length === 0 ? <p className="muted">No tasks closed yet — start the first one.</p> : null}
        {recent.map((r) => (
          <div className="log-row" key={r.task}>
            <span><span className="mono muted" style={{ marginRight: 10 }}>{r.task}</span>{r.summary || r.decision}</span>
            <span className="row" style={{ gap: 8 }}>
              <Badge kind={/DONE/i.test(r.outcome) ? "DONE" : "STOPPED"} />
              <span className="small muted">{r.date}</span>
            </span>
          </div>
        ))}
      </Card>

      <div className="row">
        <Pill kind="quiet" onClick={onSwitch}>Switch project</Pill>
        <Pill kind="quiet" onClick={onSettings}>Settings</Pill>
      </div>
      <p className="small muted mono" style={{ marginTop: 8 }}>{dir}</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run (in `app/`): `npm run typecheck && npm start`
Expected: open the Task 10 scratch project — hillside with no stones, "recent stones" empty state, big *Start a task*. Open a project whose log has rows (point it at a copy of this repo's log via a scratch clone if needed): stones stack, rows show badges. Hand-edit a scratch LOG.md to two consecutive STOPPED rows: the amber Direction Gate banner replaces the start button.

- [ ] **Step 6: Commit**

```bash
git add app
git commit -m "app: dashboard — the cairn on its hillside, log, gate, resume"
```

---

### Task 12: Wizard core — define, the approval gate, build

**Files:**
- Create: `app/src/renderer/components/StepRail.tsx`
- Replace: `app/src/renderer/screens/Wizard.tsx`
- Modify: `app/src/renderer/app.css` (rail styles appended)

**Interfaces:**
- Consumes: props from Task 8; `cairn.taskDefine/taskApprove/taskBuild`, `onEngineEvent`; `Md`, `ActivityFeed`, `Card`, `Pill`, `ErrorCard`.
- Produces: `StepRail({ current: number })`; the wizard through the build report. Task 13 replaces `Wizard.tsx` again with the verify/decide phases — the phase names and state fields here are final.

- [ ] **Step 1: Append rail styles to app.css**

```css
.rail { display: flex; justify-content: center; align-items: center; gap: 18px; margin: 6px 0 18px; }
.rail-step { display: inline-flex; align-items: center; gap: 7px; color: var(--muted); font-size: .85rem; }
.rail-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--stone-a); }
.rail-done { color: var(--ink); }
.rail-done .rail-dot { background: var(--green); }
.rail-now { color: var(--green-deep); font-weight: 600; }
.rail-now .rail-dot { width: 15px; height: 15px; background: var(--green-soft); border: 2px solid var(--green); }
```

- [ ] **Step 2: Write StepRail.tsx**

```tsx
const LABELS = ["define", "approve", "build", "verify", "decide"] as const;

/** The five steps as stones on a trace — the user always knows where they are. */
export function StepRail({ current }: { current: number }) {
  return (
    <div className="rail" aria-label={`Step ${current + 1} of 5: ${LABELS[current]}`}>
      {LABELS.map((l, i) => (
        <span key={l} className={"rail-step" + (i === current ? " rail-now" : i < current ? " rail-done" : "")}>
          <span className="rail-dot" />{l}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write Wizard.tsx (through build)**

```tsx
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
```

- [ ] **Step 4: Verify with the mock engine**

Run (in `app/`): `npm run typecheck`, then `$env:CAIRN_MOCK="1"; npm start` (PowerShell).
Expected: in a scratch project — *Start a task* → outcome input → *Write the brief* → the mock brief renders as formatted markdown → *Approve this exact brief* → build streams instantly → report card with the `done` badge. On disk: `001-brief.md`, `001-approval.json`, `001-report.md`. Quit before deciding, reopen: the dashboard shows the unfinished-task card; *Continue it* lands on the report.

- [ ] **Step 5: Commit**

```bash
git add app
git commit -m "app wizard: define, the hash-locked approval gate, live build"
```

---

### Task 13: Wizard — verify and decide, the stone lands

**Files:**
- Replace: `app/src/renderer/screens/Wizard.tsx` (final version)

**Interfaces:**
- Consumes: everything Task 12 set up; `cairn.taskReview/taskClose`; `CloseInput` from core.
- Produces: the complete loop; `onDone(true)` fires after a close so App re-opens the dashboard with `justAdded` (stone drop + optional pluck from Task 11).

- [ ] **Step 1: Replace Wizard.tsx with the final version**

The file is Task 12's version with: `report` phase buttons replaced, `reviewing`/`verdict`/`decide` phases implemented, `initialPhase` sending `hasReport` to `"decide"`, and close state added. Full final file:

```tsx
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
```

- [ ] **Step 2: Verify the full mock loop, including resume**

Run (in `app/`): `npm run typecheck`, then `$env:CAIRN_MOCK="1"; npm start`.
Expected: full loop in a scratch project — define → approve → build → *Run a fresh review* (verdict card shows `PASS`) → decide → close. The dashboard returns with the new stone dropping in (and a soft pluck if sound was enabled via localStorage). Quit mid-loop after building; reopen → *Continue it* lands directly on the decision.

- [ ] **Step 3: Commit**

```bash
git add app
git commit -m "app wizard: fresh-context verify, the human decision, the stone lands"
```

---

### Task 14: Settings, the direction check screen, update check

**Files:**
- Replace: `app/src/renderer/screens/Settings.tsx`, `app/src/renderer/screens/Direction.tsx`
- Modify: `app/src/main/ipc.ts` (add the `app:updateCheck` handler)

**Interfaces:**
- Consumes: props from Task 8; `cairn.taskDirection/updateCheck/openExternal`; localStorage keys `cairn-theme` (Task 8 boot) and `cairn-sound` (Task 11).
- Produces: the last two screens; `UpdateInfo` served over `app:updateCheck`.

- [ ] **Step 1: Add the update-check handler to app/src/main/ipc.ts**

Add `app` to the electron import, `UpdateInfo` to the shared-ipc type import, and inside `registerProjectIpc()`:
```ts
  ipcMain.handle("app:updateCheck", async (): Promise<UpdateInfo> => {
    const current = app.getVersion();
    try {
      const res = await fetch("https://api.github.com/repos/kjleblanc/cairn/releases/latest", {
        headers: { accept: "application/vnd.github+json" },
      });
      if (!res.ok) return { current, latest: null, newer: false };
      const data = (await res.json()) as { tag_name?: string };
      const latest = (data.tag_name ?? "").replace(/^v/, "") || null;
      const newer = latest !== null && latest.localeCompare(current, undefined, { numeric: true }) > 0;
      return { current, latest, newer };
    } catch (err) {
      logError("updateCheck", err);
      return { current, latest: null, newer: false };
    }
  });
```

- [ ] **Step 2: Write Settings.tsx**

```tsx
import { useState } from "react";
import type { UpdateInfo } from "../../shared/ipc";
import { Card, Pill } from "../components/Ui";
import { cairn } from "../api";

export function Settings({ onBack }: { onBack: () => void }) {
  const [theme, setThemeState] = useState(localStorage.getItem("cairn-theme") ?? "system");
  const [sound, setSound] = useState(localStorage.getItem("cairn-sound") === "1");
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  function applyTheme(t: "system" | "light" | "dark") {
    setThemeState(t);
    if (t === "system") { localStorage.removeItem("cairn-theme"); delete document.documentElement.dataset.theme; }
    else { localStorage.setItem("cairn-theme", t); document.documentElement.dataset.theme = t; }
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    if (next) localStorage.setItem("cairn-sound", "1");
    else localStorage.removeItem("cairn-sound");
  }

  async function check() {
    setChecking(true);
    setUpdate(await cairn.updateCheck());
    setChecking(false);
  }

  return (
    <div style={{ maxWidth: 560, margin: "24px auto" }}>
      <h1>Settings</h1>
      <Card title="appearance">
        <div className="row">
          {(["system", "light", "dark"] as const).map((t) => (
            <Pill key={t} kind={theme === t ? "primary" : "soft"} onClick={() => applyTheme(t)}>
              {t === "system" ? "Match my computer" : t === "light" ? "Light" : "Dark"}
            </Pill>
          ))}
        </div>
      </Card>
      <Card title="sound">
        <div className="row spread">
          <p>A soft pluck when a stone lands.</p>
          <Pill kind={sound ? "primary" : "soft"} onClick={toggleSound}>{sound ? "On" : "Off"}</Pill>
        </div>
      </Card>
      <Card title="about">
        <div className="row spread">
          <p>Cairn Desktop {update ? `v${update.current}` : ""}</p>
          <Pill onClick={() => void check()} disabled={checking}>{checking ? "Checking…" : "Check for updates"}</Pill>
        </div>
        {update && update.newer ? (
          <p style={{ marginTop: 10 }}>
            A newer version exists (v{update.latest}).{" "}
            <button className="pill pill-quiet" onClick={() => void cairn.openExternal("https://github.com/kjleblanc/cairn/releases/latest")}>
              Get it from the releases page
            </button>
          </p>
        ) : null}
        {update && !update.newer ? <p className="small muted" style={{ marginTop: 10 }}>{update.latest ? "You're up to date." : "Couldn't reach the releases page — try again later."}</p> : null}
        <p className="small" style={{ marginTop: 10 }}>
          <button className="pill pill-quiet" onClick={() => void cairn.openExternal("https://kjleblanc.github.io/cairn/")}>The written guides</button>
        </p>
      </Card>
      <Pill kind="quiet" onClick={onBack}>Back</Pill>
    </div>
  );
}
```

- [ ] **Step 3: Write Direction.tsx**

```tsx
import { useEffect, useState } from "react";
import type { EngineEvent } from "../../shared/ipc";
import { Card, ErrorCard, Pill } from "../components/Ui";
import { Md } from "../components/Md";
import { ActivityFeed } from "../components/ActivityFeed";
import { cairn } from "../api";

export function Direction({ dir, reason, onBack }: { dir: string; reason: string; onBack: () => void }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [text, setText] = useState("");
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => cairn.onEngineEvent((ev) => setEvents((p) => [...p.slice(-199), ev])), []);

  async function run() {
    setError(null); setEvents([]); setPhase("running");
    const r = await cairn.taskDirection(dir, reason);
    if (r.ok) { setText(r.value.text); setPhase("done"); }
    else { setError(r.message); setPhase("idle"); }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1>A direction check</h1>
      {error ? <ErrorCard message={error} /> : null}
      <div className="gate-banner">
        <p>{reason} Two tries without visible progress means the next patch probably isn't the answer — a step back is.</p>
      </div>
      {phase === "idle" ? (
        <div className="row">
          <Pill kind="primary" onClick={() => void run()}>Run a direction check</Pill>
          <Pill kind="quiet" onClick={onBack}>Back to your project</Pill>
        </div>
      ) : null}
      {phase === "running" ? (
        <Card title="thinking about genuinely different options">
          <p className="muted">Nothing will be changed — this agent can only read and think.</p>
          <ActivityFeed events={events} />
        </Card>
      ) : null}
      {phase === "done" ? (
        <>
          <Card title="your options"><Md text={text} /></Card>
          <Pill kind="primary" onClick={onBack}>Back to your project</Pill>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run (in `app/`): `npm run typecheck`, then `$env:CAIRN_MOCK="1"; npm start`.
Expected: Settings — theme pills switch immediately and persist across restart; sound toggles; *Check for updates* reports "Couldn't reach" or "up to date" (no release exists yet). Direction — in a scratch project whose log ends with two STOPPED rows, the dashboard banner leads here; *Run a direction check* streams and shows the mock options text.

- [ ] **Step 5: Commit**

```bash
git add app
git commit -m "app: settings, gentle update note, and the direction check screen"
```

---

### Task 15: Playwright smoke — the whole mock loop drops a stone

**Files:**
- Create: `app/playwright.config.ts`, `app/tests/smoke.spec.ts`
- Modify: `app/package.json` (devDep + scripts), `app/src/main/ipc.ts` (preflight passes in mock mode)

**Interfaces:**
- Consumes: the built app (`.vite/build/main.js`); `CAIRN_MOCK` + `CAIRN_OPEN` env; button labels exactly as Tasks 11–13 wrote them.
- Produces: `npm run test:smoke` — the offline regression net for the whole UI.

- [ ] **Step 1: Let preflight pass in mock mode**

In `app/src/main/ipc.ts`, first line of `preflight()`:
```ts
  if (process.env.CAIRN_MOCK === "1") return { claudeReady: true, reason: null };
```
(The smoke test must not depend on the machine's Claude sign-in.)

- [ ] **Step 2: Add Playwright and the build-for-test scripts**

In `app/package.json` devDependencies add `"@playwright/test": "^1.48.0"`, and to scripts add:
```json
    "build:vite": "node scripts/copy-assets.mjs && vite build -c vite.main.config.ts && vite build -c vite.preload.config.ts && vite build -c vite.renderer.config.ts",
    "test:smoke": "npm run build:vite && playwright test"
```
Run (in `app/`): `npm install`

`app/playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  workers: 1,
});
```

- [ ] **Step 3: Write the failing smoke test**

`app/tests/smoke.spec.ts`:
```ts
import { _electron as electron, expect, test } from "@playwright/test";
import { initProject } from "@cairn/core";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("the full mock loop drops a stone", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-smoke-"));
  initProject(proj, { name: "Smoke", what: "w", who: "me", milestone: "see it", timebox: "default" });

  const app = await electron.launch({
    args: ["."],
    env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: proj },
  });
  const win = await app.firstWindow();

  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();
  await win.getByRole("button", { name: "Start a task" }).click();

  await win.getByPlaceholder("The home page shows my list of books").fill("A demo file appears");
  await win.getByRole("button", { name: "Write the brief" }).click();

  await win.getByRole("button", { name: "Approve this exact brief" }).click();

  await win.getByRole("button", { name: "Skip to the decision" }).click();

  await win.getByRole("button", { name: "Accept — it does what I wanted" }).click();
  await win.getByPlaceholder("What did you personally see?").fill("demo.txt exists");
  await win.getByRole("button", { name: "Yes", exact: true }).click();
  await win.getByRole("button", { name: "Close the task — a stone on your cairn" }).click();

  await expect(win.getByText("▸ idle · 1 stone · gate quiet")).toBeVisible();
  await app.close();
});
```

- [ ] **Step 4: Run it**

Run (in `app/`): `npm run test:smoke`
Expected: 1 passed. If a locator misses, fix the label in the test to match the screen (screens are the source of truth), not the other way around.

- [ ] **Step 5: Commit**

```bash
git add app
git commit -m "app: Playwright smoke — the whole mock loop, offline, in seconds"
```

---

### Task 16: Ship it — CI release, install notes, changelog

**Files:**
- Create: `.github/workflows/release.yml`, `app/README.md`
- Modify: `CHANGELOG.md` (new entry at the top)

**Interfaces:**
- Consumes: `npm run make` (Task 5's Forge config); the monorepo build order.
- Produces: tagged releases with Windows + Mac artifacts; honest install docs.

- [ ] **Step 1: Write the release workflow**

`.github/workflows/release.yml`:
```yaml
name: release
on:
  push:
    tags: ["v*"]
permissions:
  contents: write
jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm ci
        working-directory: app
      - run: npm run make
        working-directory: app
      - uses: softprops/action-gh-release@v2
        with:
          files: app/out/make/**/*
          draft: true
```
(Root `npm ci` + `npm test` builds core and runs every suite; `draft: true` so the release notes get written by a human before publishing.)

- [ ] **Step 2: Write app/README.md**

```markdown
# Cairn Desktop

The Cairn workflow as a desktop app: define → approve → build → verify → decide,
with the safety rules enforced by code. One project, one window, one safe step at a time.

## Install

Download the latest release for your computer from
https://github.com/kjleblanc/cairn/releases — the `.exe` Setup on Windows,
the `.dmg` on Mac.

**The honest part about the warnings.** Cairn Desktop is not yet code-signed
(signing certificates cost real money; it's planned). Your computer will warn you
once:

- **Windows** shows "Windows protected your PC". Click **More info**, then
  **Run anyway**.
- **Mac** says the app "can't be opened because it is from an unidentified
  developer". Right-click the app, choose **Open**, then **Open** again.

The app also needs [Claude Code](https://claude.com/claude-code) signed in once —
the first-run screen walks you through it.

## Develop

```sh
npm run build -w @cairn/core   # repo root, once
cd app && npm install
npm start                      # dev window
npm run test:smoke             # offline mock loop, end to end
npm run make                   # local installer for this OS
```

`CAIRN_MOCK=1 npm start` runs the whole app against the offline demo engine —
no AI calls, no sign-in needed.
```

- [ ] **Step 3: Add the changelog entry**

At the top of `CHANGELOG.md`, above the existing entries, add (matching the file's existing heading style — read it first):

```markdown
## Cairn Desktop v0.1 — 2026-07-XX

The gated loop as a desktop app. A project picker, a dashboard where your cairn
stands on a hillside, and the five steps — define, approve, build, verify,
decide — as one calm wizard. Approvals are hash-locked and now persisted to
`docs/ai-work/tasks/NNN-approval.json` (the CLI does the same). Windows and Mac
installers are built by CI on every version tag; v1 ships unsigned with honest
install notes.
```
Replace `XX` with the real date when the task runs.

- [ ] **Step 4: Verify what can be verified locally**

Run (in `app/`): `npm run make`
Expected: `app/out/make/squirrel.windows/x64/` contains a Setup `.exe`; launching the packaged app from `app/out/Cairn-win32-x64/` opens the real app (mock env vars off — it uses the machine's Claude sign-in).

The Mac leg and the release upload can only be proven by pushing a tag (e.g. `v0.1.0-rc1`) after this plan lands on the default branch — note this in the PR/summary rather than guessing.

- [ ] **Step 5: Commit**

```bash
git add .github app/README.md CHANGELOG.md
git commit -m "Ship: CI-built Windows and Mac releases, honest install notes"
```

---

## Execution Notes

- **Order matters:** Tasks 1–4 (core + CLI) before 5; 5–8 before any screen task; 12 before 13; 15 after 13; 16 last. Tasks 9, 10, 11 are independent of each other once 8 lands; 14 is independent of 12–13.
- **This repo is Cairn-governed** (`AGENTS.md` at the root). This plan's commits are framework development, like the earlier task-numbered commits; keep `docs/ai-work/**` untouched except by the person running the pilot.
- **The real engine is never needed during this plan.** Every verification uses `CAIRN_MOCK=1`. First real-engine run is a post-plan manual test.





