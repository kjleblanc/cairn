import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TownPoint, TownPresentationState } from "../shared/ipc.js";
import { ensureCairnExcluded } from "./conductor/store.js";

const VERSION = 1;
const DEFAULT_DIVIDER_WIDTH = 620;
const MAX_POSITIONS = 32;

function defaultState(): TownPresentationState {
  return { version: VERSION, positions: {}, dividerWidth: DEFAULT_DIVIDER_WIDTH };
}

function isPoint(value: unknown): value is TownPoint {
  if (typeof value !== "object" || value === null) return false;
  const point = value as Partial<TownPoint>;
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x! >= 0 && point.x! <= 1 && point.y! >= 0 && point.y! <= 1;
}

function validate(value: unknown): TownPresentationState {
  if (typeof value !== "object" || value === null) throw new Error("TOWN_STATE_INVALID: Town presentation state is not an object.");
  const state = value as Partial<TownPresentationState>;
  if (state.version !== VERSION) throw new Error("TOWN_STATE_INVALID: Town presentation state has an unsupported version.");
  if (!Number.isFinite(state.dividerWidth) || state.dividerWidth! < 420 || state.dividerWidth! > 860) {
    throw new Error("TOWN_STATE_INVALID: Town divider width is outside its safe range.");
  }
  if (typeof state.positions !== "object" || state.positions === null || Array.isArray(state.positions)) {
    throw new Error("TOWN_STATE_INVALID: Town positions are not an object.");
  }
  const entries = Object.entries(state.positions);
  if (entries.length > MAX_POSITIONS) throw new Error("TOWN_STATE_INVALID: Town presentation state has too many positions.");
  const positions: Record<string, TownPoint> = {};
  for (const [id, point] of entries) {
    if (id.length === 0 || id.length > 160 || id === "__proto__" || id === "constructor" || id === "prototype" || !isPoint(point)) {
      throw new Error("TOWN_STATE_INVALID: Town presentation state contains an invalid position.");
    }
    positions[id] = { x: point.x, y: point.y };
  }
  return { version: VERSION, positions, dividerWidth: state.dividerWidth! };
}

export function townStatePath(root: string): string {
  return join(root, ".cairn", "town-square.json");
}

/** Corrupt or unknown presentation state is disposable: fall back to the
 * deterministic layout rather than letting visual preferences block work. */
export function readTownState(root: string): TownPresentationState {
  const path = townStatePath(root);
  if (!existsSync(path)) return defaultState();
  try {
    return validate(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return defaultState();
  }
}

export function writeTownState(root: string, input: TownPresentationState): TownPresentationState {
  const state = validate(input);
  ensureCairnExcluded(root);
  mkdirSync(join(root, ".cairn"), { recursive: true });
  // Serialize only the validated presentation schema; caller extras cannot
  // leak task or provider content into this file.
  writeFileSync(townStatePath(root), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}
