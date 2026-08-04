import test from "node:test";
import assert from "node:assert/strict";
import { basename, join, resolve, sep } from "node:path";
import {
  TWO_FRAME_PAINT_SCRIPT,
  WORKSPACE_STAGE_RECT_SCRIPT,
  WORKSPACE_STAGE_SELECTOR,
  captureBeforeWorkerStage,
  captureTerminalStage,
  captureWorkspaceStage,
  projectDirsMatch,
  validateWorkspaceStageRect,
  type CaptureDeadline,
  type StageCaptureWindow,
  type StageNativeImage,
  type StageRectangle,
} from "../src/main/evidencecapture.js";

const PROJECT_DIR = resolve("evidence-capture-fixture");
const RUN_ID = "11111111-1111-4111-8111-111111111111";

test("the two constant renderer scripts are valid JavaScript", () => {
  assert.doesNotThrow(() => Function(`return ${WORKSPACE_STAGE_RECT_SCRIPT};`));
  assert.doesNotThrow(() => Function(`return ${TWO_FRAME_PAINT_SCRIPT};`));
});

function stage(
  rect: StageRectangle,
  projectDir = PROJECT_DIR,
  phase: "running" | "closed" = "running",
  generation = 1,
): StageRectangle & { projectDir: string; evidenceRunId: string; phase: "running" | "closed"; generation: number } {
  return { projectDir, evidenceRunId: RUN_ID, phase, generation, ...rect };
}

function painted(projectDir = PROJECT_DIR, generation = 1): object {
  return { painted: true, projectDir, generation, evidenceRunId: RUN_ID, phase: "closed" };
}

type FakeOptions = {
  bounds?: StageRectangle;
  scripts?: unknown[];
  capture?: StageNativeImage | Error;
};

function image(bytes = Buffer.from([137, 80, 78, 71]), width = 640, height = 360): StageNativeImage {
  return {
    toPNG: () => bytes,
    getSize: () => ({ width, height }),
  };
}

function fakeWindow(options: FakeOptions = {}): {
  target: StageCaptureWindow;
  executed: string[];
  captured: StageRectangle[];
} {
  const executed: string[] = [];
  const captured: StageRectangle[] = [];
  const initial = stage({ x: 0, y: 0, width: 800, height: 600 });
  const scripts = [...(options.scripts ?? [initial, initial])];
  const target: StageCaptureWindow = {
    getContentBounds: () => options.bounds ?? { x: 120, y: 80, width: 800, height: 600 },
    webContents: {
      async executeJavaScript<T>(script: string): Promise<T> {
        executed.push(script);
        const next = scripts.shift();
        if (next instanceof Error) throw next;
        if (next instanceof Promise) return await next as T;
        return next as T;
      },
      async capturePage(rect: StageRectangle): Promise<StageNativeImage> {
        captured.push(rect);
        if (options.capture instanceof Error) throw options.capture;
        return options.capture ?? image();
      },
    },
  };
  return { target, executed, captured };
}

test("the capture query is a constant workspace-stage query", () => {
  assert.equal(WORKSPACE_STAGE_SELECTOR, ".workspace-stage");
  assert.match(WORKSPACE_STAGE_RECT_SCRIPT, /querySelector\("\.workspace-stage"\)/);
  assert.match(WORKSPACE_STAGE_RECT_SCRIPT, /getAttribute\("data-project-dir"\)/);
  assert.equal(WORKSPACE_STAGE_RECT_SCRIPT.includes("${"), false);
});

test("stage rectangles must be finite, positive, and wholly content-local", () => {
  const bounds = { x: 300, y: 200, width: 800, height: 600 };
  assert.deepEqual(
    validateWorkspaceStageRect(stage({ x: 0.25, y: 10, width: 799.75, height: 590 }), bounds, PROJECT_DIR),
    { x: 0.25, y: 10, width: 799.75, height: 590 },
  );

  const invalid: unknown[] = [
    null,
    stage({ x: Number.NaN, y: 0, width: 10, height: 10 }),
    stage({ x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 10 }),
    stage({ x: -1, y: 0, width: 10, height: 10 }),
    stage({ x: 0, y: -1, width: 10, height: 10 }),
    stage({ x: 0, y: 0, width: 0, height: 10 }),
    stage({ x: 0, y: 0, width: 10, height: 0 }),
    stage({ x: 799, y: 0, width: 2, height: 10 }),
    stage({ x: 0, y: 599, width: 10, height: 2 }),
  ];
  for (const rect of invalid) assert.equal(validateWorkspaceStageRect(rect, bounds, PROJECT_DIR), null);
  assert.equal(validateWorkspaceStageRect(
    stage({ x: 0, y: 0, width: 1, height: 1 }),
    { ...bounds, width: 0 },
    PROJECT_DIR,
  ), null);
});

test("project directory comparison normalizes lexical equivalents and rejects ambiguity", () => {
  const equivalent = join(PROJECT_DIR, "..", basename(PROJECT_DIR)) + sep;
  assert.equal(projectDirsMatch(equivalent, PROJECT_DIR), true);
  assert.equal(projectDirsMatch("relative/project", PROJECT_DIR), false);
  assert.equal(projectDirsMatch(null, PROJECT_DIR), false);
  assert.equal(projectDirsMatch(PROJECT_DIR, ""), false);
});

test("pre-worker capture returns PNG bytes and dimensions from only the proven rectangle", async () => {
  const rect = { x: 25, y: 15, width: 700, height: 500 };
  const png = Buffer.from([1, 2, 3, 4]);
  const fake = fakeWindow({ scripts: [stage(rect), stage(rect)], capture: image(png, 1400, 1000) });

  const result = await captureBeforeWorkerStage(fake.target, PROJECT_DIR, RUN_ID);

  assert.deepEqual(fake.executed, [WORKSPACE_STAGE_RECT_SCRIPT, WORKSPACE_STAGE_RECT_SCRIPT]);
  assert.deepEqual(fake.captured, [rect]);
  assert.deepEqual(result, { png, width: 1400, height: 1000 });
});

test("a missing or out-of-bounds stage is skipped with no full-window fallback", async () => {
  for (const candidate of [
    null,
    stage({ x: 0, y: 0, width: 801, height: 600 }),
    stage({ x: 0, y: 0, width: 800, height: 601 }),
  ]) {
    const fake = fakeWindow({ scripts: [candidate] });
    assert.equal(await captureWorkspaceStage(fake.target, PROJECT_DIR, RUN_ID, "running"), null);
    assert.deepEqual(fake.captured, []);
  }
  assert.equal(await captureWorkspaceStage(null, PROJECT_DIR, RUN_ID, "running"), null);
});

test("a stage for another project is rejected before capturePage", async () => {
  const otherProject = resolve("another-evidence-project");
  const fake = fakeWindow({ scripts: [stage({ x: 0, y: 0, width: 800, height: 600 }, otherProject)] });

  assert.equal(await captureWorkspaceStage(fake.target, PROJECT_DIR, RUN_ID, "running"), null);
  assert.deepEqual(fake.executed, [WORKSPACE_STAGE_RECT_SCRIPT]);
  assert.deepEqual(fake.captured, []);
});

test("a project switch or run replacement while capturePage is pending discards the pixels", async () => {
  const rect = { x: 0, y: 0, width: 800, height: 600 };
  const switched = fakeWindow({
    scripts: [stage(rect, PROJECT_DIR, "running", 4), stage(rect, PROJECT_DIR, "running", 5)],
  });
  assert.equal(await captureWorkspaceStage(switched.target, PROJECT_DIR, RUN_ID, "running"), null);
  assert.deepEqual(switched.captured, [rect]);

  const wrongRun = fakeWindow({ scripts: [{ ...stage(rect), evidenceRunId: "22222222-2222-4222-8222-222222222222" }] });
  assert.equal(await captureWorkspaceStage(wrongRun.target, PROJECT_DIR, RUN_ID, "running"), null);
  assert.deepEqual(wrongRun.captured, []);
});

test("query timeout is deterministic, fail-closed, and never reaches capturePage", async () => {
  const fake = fakeWindow({ scripts: [new Promise<never>(() => undefined)] });
  const timeout: CaptureDeadline = async <T>(_operation: Promise<T>, timeoutMs: number): Promise<T> => {
    assert.equal(timeoutMs, 17);
    throw new Error("test deadline");
  };

  assert.equal(await captureWorkspaceStage(fake.target, PROJECT_DIR, RUN_ID, "running", { captureTimeoutMs: 17, deadline: timeout }), null);
  assert.deepEqual(fake.captured, []);
});

test("capturePage and native-image failures return null without escaping", async () => {
  const rect = { x: 10, y: 10, width: 200, height: 100 };
  const rejected = fakeWindow({ scripts: [stage(rect)], capture: new Error("GPU unavailable") });
  assert.equal(await captureWorkspaceStage(rejected.target, PROJECT_DIR, RUN_ID, "running"), null);
  assert.deepEqual(rejected.captured, [rect]);

  const empty = fakeWindow({ scripts: [stage(rect)], capture: image(Buffer.alloc(0), 200, 100) });
  assert.equal(await captureWorkspaceStage(empty.target, PROJECT_DIR, RUN_ID, "running"), null);

  const invalidDimensions = fakeWindow({ scripts: [stage(rect)], capture: image(Buffer.from([1]), 0, 100) });
  assert.equal(await captureWorkspaceStage(invalidDimensions.target, PROJECT_DIR, RUN_ID, "running"), null);
});

test("terminal capture proves two frames before querying and capturing the stage", async () => {
  const rect = { x: 20, y: 30, width: 760, height: 540 };
  const fake = fakeWindow({ scripts: [painted(), stage(rect, PROJECT_DIR, "closed"), stage(rect, PROJECT_DIR, "closed")] });
  const deadlines: number[] = [];
  const passThrough: CaptureDeadline = async <T>(operation: Promise<T>, timeoutMs: number): Promise<T> => {
    deadlines.push(timeoutMs);
    return await operation;
  };

  const result = await captureTerminalStage(fake.target, PROJECT_DIR, RUN_ID, {
    paintTimeoutMs: 41,
    captureTimeoutMs: 73,
    deadline: passThrough,
  });

  assert.notEqual(result, null);
  assert.deepEqual(fake.executed, [TWO_FRAME_PAINT_SCRIPT, WORKSPACE_STAGE_RECT_SCRIPT, WORKSPACE_STAGE_RECT_SCRIPT]);
  assert.deepEqual(fake.captured, [rect]);
  assert.deepEqual(deadlines, [41, 73, 73, 73]);
  assert.equal((TWO_FRAME_PAINT_SCRIPT.match(/requestAnimationFrame/g) ?? []).length, 2);
  assert.match(TWO_FRAME_PAINT_SCRIPT, /window\.cairn\.taskCurrent\(dir\)/);
  assert.match(TWO_FRAME_PAINT_SCRIPT, /cairn:task-session-refresh/);
});

test("terminal paint timeout skips a potentially stale capture and cannot hang the run", async () => {
  const fake = fakeWindow({ scripts: [new Promise<never>(() => undefined)] });
  const timeout: CaptureDeadline = async <T>(_operation: Promise<T>, timeoutMs: number): Promise<T> => {
    assert.equal(timeoutMs, 23);
    throw new Error("paint deadline");
  };

  assert.equal(await captureTerminalStage(fake.target, PROJECT_DIR, RUN_ID, { paintTimeoutMs: 23, deadline: timeout }), null);
  assert.deepEqual(fake.executed, [TWO_FRAME_PAINT_SCRIPT]);
  assert.deepEqual(fake.captured, []);
});

test("destroyed windows and web contents fail closed", async () => {
  const destroyedWindow = fakeWindow();
  destroyedWindow.target.isDestroyed = () => true;
  assert.equal(await captureWorkspaceStage(destroyedWindow.target, PROJECT_DIR, RUN_ID, "running"), null);
  assert.deepEqual(destroyedWindow.executed, []);

  const destroyedContents = fakeWindow();
  destroyedContents.target.webContents.isDestroyed = () => true;
  assert.equal(await captureTerminalStage(destroyedContents.target, PROJECT_DIR, RUN_ID), null);
  assert.deepEqual(destroyedContents.executed, []);
});
