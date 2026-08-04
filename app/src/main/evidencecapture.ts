import { isAbsolute, normalize, parse, sep } from "node:path";

/**
 * Main-process capture of the selected project's visible workspace.
 *
 * The seam is deliberately structural instead of importing Electron. That
 * keeps the trust decisions below unit-testable and lets BrowserWindow satisfy
 * the interface directly when Task 173 wires it into the run envelope.
 */

export const WORKSPACE_STAGE_SELECTOR = ".workspace-stage" as const;

/** This is constant trusted application code. No selector or renderer value is
 * interpolated into it. */
export const WORKSPACE_STAGE_RECT_SCRIPT = `(async () => {
  const stage = document.querySelector(".workspace-stage");
  if (!stage) return null;
  const projectDir = stage.getAttribute("data-project-dir");
  if (!projectDir || !window.cairn || typeof window.cairn.taskCurrent !== "function") return null;
  const session = await window.cairn.taskCurrent(projectDir);
  const rect = stage.getBoundingClientRect();
  return {
    projectDir,
    generation: Number(stage.getAttribute("data-project-generation")),
    evidenceRunId: session && session.evidenceRunId,
    phase: session && session.phase,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  };
})()`;

/** Refresh the renderer from main's now-closed session, then resolve only after
 * that terminal state has had two opportunities to paint. The project path is
 * read from the trusted stage; no request value is interpolated into code. */
export const TWO_FRAME_PAINT_SCRIPT = `(async () => {
  const stage = document.querySelector(".workspace-stage");
  const dir = stage && stage.getAttribute("data-project-dir");
  if (!dir || !window.cairn || typeof window.cairn.taskCurrent !== "function") return false;
  const session = await window.cairn.taskCurrent(dir);
  if (!session) return false;
  window.dispatchEvent(new CustomEvent("cairn:task-session-refresh", {
    detail: { dir, session }
  }));
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve({
      painted: true,
      projectDir: dir,
      generation: Number(stage.getAttribute("data-project-generation")),
      evidenceRunId: session.evidenceRunId,
      phase: session.phase
    })));
  });
})()`;

export type StageRectangle = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

type StageObservation = StageRectangle & Readonly<{
  projectDir: string;
  generation: number;
  evidenceRunId: string;
  phase: "running" | "closed";
}>;

export type CapturedStage = Readonly<{
  png: Buffer;
  width: number;
  height: number;
}>;

export interface StageNativeImage {
  toPNG(): Uint8Array;
  getSize(): Readonly<{ width: number; height: number }>;
}

export interface StageWebContents {
  executeJavaScript<T = unknown>(code: string): Promise<T>;
  capturePage(rect: StageRectangle): Promise<StageNativeImage>;
  isDestroyed?(): boolean;
}

export interface StageCaptureWindow {
  getContentBounds(): StageRectangle;
  readonly webContents: StageWebContents;
  isDestroyed?(): boolean;
}

export type CaptureDeadline = <T>(operation: Promise<T>, timeoutMs: number) => Promise<T>;

export type StageCaptureOptions = Readonly<{
  /** Bounds each renderer query and capturePage call independently. */
  captureTimeoutMs?: number;
  /** Bounds the terminal two-frame paint barrier. */
  paintTimeoutMs?: number;
  /** Injectable so timeout paths do not depend on wall-clock time in tests. */
  deadline?: CaptureDeadline;
}>;

const DEFAULT_CAPTURE_TIMEOUT_MS = 500;
const DEFAULT_PAINT_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 2_000;

function timeout(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(value, MAX_TIMEOUT_MS);
}

function defaultDeadline<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let open = true;
    const timer = setTimeout(() => {
      if (!open) return;
      open = false;
      reject(new Error("STAGE_CAPTURE_TIMEOUT"));
    }, timeoutMs);

    void operation.then(
      (value) => {
        if (!open) return;
        open = false;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (!open) return;
        open = false;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function finiteRectangle(value: unknown): value is StageRectangle {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StageRectangle>;
  return Number.isFinite(candidate.x)
    && Number.isFinite(candidate.y)
    && Number.isFinite(candidate.width)
    && Number.isFinite(candidate.height);
}

function normalizedProjectDir(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 32_768
    || /[\u0000\r\n]/.test(value) || !isAbsolute(value)) return null;
  let result = normalize(value);
  const root = parse(result).root;
  while (result.length > root.length && result.endsWith(sep)) result = result.slice(0, -1);
  return process.platform === "win32" ? result.toLowerCase() : result;
}

/** Pure lexical comparison for the trusted main-selected directory and the
 * stage identity returned by the constant renderer query. */
export function projectDirsMatch(observed: unknown, expected: unknown): boolean {
  const observedDir = normalizedProjectDir(observed);
  const expectedDir = normalizedProjectDir(expected);
  return observedDir !== null && expectedDir !== null && observedDir === expectedDir;
}

/**
 * A DOMRect and capturePage rectangle are content-local. BrowserWindow's
 * content-bounds x/y are screen coordinates, so containment is intentionally
 * checked against the content area's 0..width and 0..height limits.
 */
export function validateWorkspaceStageRect(
  value: unknown,
  contentBounds: unknown,
  expectedProjectDir: string,
): StageRectangle | null {
  if (!finiteRectangle(value) || !finiteRectangle(contentBounds)) return null;
  const candidate = value as StageRectangle & { projectDir?: unknown };
  if (!projectDirsMatch(candidate.projectDir, expectedProjectDir)) return null;
  if (contentBounds.width <= 0 || contentBounds.height <= 0
    || value.x < 0 || value.y < 0 || value.width <= 0 || value.height <= 0) return null;

  const right = value.x + value.width;
  const bottom = value.y + value.height;
  if (!Number.isFinite(right) || !Number.isFinite(bottom)
    || right > contentBounds.width || bottom > contentBounds.height) return null;

  return { x: value.x, y: value.y, width: value.width, height: value.height };
}

function stageIdentity(
  value: unknown,
  expectedProjectDir: string,
  expectedRunId: string,
  expectedPhase: "running" | "closed",
): value is StageObservation {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StageObservation>;
  return projectDirsMatch(candidate.projectDir, expectedProjectDir)
    && Number.isSafeInteger(candidate.generation) && Number(candidate.generation) >= 0
    && candidate.evidenceRunId === expectedRunId
    && candidate.phase === expectedPhase;
}

function usable(target: StageCaptureWindow): boolean {
  return target.isDestroyed?.() !== true && target.webContents.isDestroyed?.() !== true;
}

/**
 * Capture only the proven selected-project stage. Every error is converted to
 * null: evidence is optional and can never rewrite a run's disposition.
 */
export async function captureWorkspaceStage(
  target: StageCaptureWindow | null,
  expectedProjectDir: string,
  expectedRunId: string,
  expectedPhase: "running" | "closed",
  options: StageCaptureOptions = {},
): Promise<CapturedStage | null> {
  if (target === null) return null;
  const deadline = options.deadline ?? defaultDeadline;
  const captureTimeoutMs = timeout(options.captureTimeoutMs, DEFAULT_CAPTURE_TIMEOUT_MS);

  try {
    if (!usable(target)) return null;
    const contentBounds = target.getContentBounds();
    const candidate = await deadline(
      target.webContents.executeJavaScript<unknown>(WORKSPACE_STAGE_RECT_SCRIPT),
      captureTimeoutMs,
    );
    const rect = validateWorkspaceStageRect(candidate, contentBounds, expectedProjectDir);
    if (rect === null || !stageIdentity(candidate, expectedProjectDir, expectedRunId, expectedPhase) || !usable(target)) return null;

    // There is intentionally no capturePage() fallback without this rectangle.
    const image = await deadline(target.webContents.capturePage(rect), captureTimeoutMs);
    const dimensions = image.getSize();
    const png = Buffer.from(image.toPNG());
    if (png.byteLength === 0
      || !Number.isSafeInteger(dimensions.width) || dimensions.width <= 0
      || !Number.isSafeInteger(dimensions.height) || dimensions.height <= 0) return null;

    // capturePage is asynchronous. Re-read the same monotonic project
    // generation and run identity after it returns, so a switch away/back or
    // a cleared/replaced session cannot relabel pixels from another state.
    const after = await deadline(
      target.webContents.executeJavaScript<unknown>(WORKSPACE_STAGE_RECT_SCRIPT),
      captureTimeoutMs,
    );
    if (!stageIdentity(after, expectedProjectDir, expectedRunId, expectedPhase)
      || (after as StageObservation).generation !== (candidate as StageObservation).generation) return null;

    return { png, width: dimensions.width, height: dimensions.height };
  } catch {
    return null;
  }
}

/** The explicit pre-worker entry point; callers invoke it before the adapter. */
export async function captureBeforeWorkerStage(
  target: StageCaptureWindow | null,
  expectedProjectDir: string,
  expectedRunId: string,
  options: StageCaptureOptions = {},
): Promise<CapturedStage | null> {
  return captureWorkspaceStage(target, expectedProjectDir, expectedRunId, "running", options);
}

/**
 * Fail closed if the renderer cannot prove two paint frames before the short
 * deadline. Taking a stale picture and labelling it terminal would be worse
 * than honestly having no terminal capture.
 */
export async function captureTerminalStage(
  target: StageCaptureWindow | null,
  expectedProjectDir: string,
  expectedRunId: string,
  options: StageCaptureOptions = {},
): Promise<CapturedStage | null> {
  if (target === null) return null;
  const deadline = options.deadline ?? defaultDeadline;
  const paintTimeoutMs = timeout(options.paintTimeoutMs, DEFAULT_PAINT_TIMEOUT_MS);

  try {
    if (!usable(target)) return null;
    const painted = await deadline(
      target.webContents.executeJavaScript<unknown>(TWO_FRAME_PAINT_SCRIPT),
      paintTimeoutMs,
    );
    if (typeof painted !== "object" || painted === null || (painted as { painted?: unknown }).painted !== true
      || !stageIdentity(painted, expectedProjectDir, expectedRunId, "closed")) return null;
  } catch {
    return null;
  }

  return captureWorkspaceStage(target, expectedProjectDir, expectedRunId, "closed", options);
}
