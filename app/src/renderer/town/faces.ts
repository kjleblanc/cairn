/**
 * The cast, ported for real (Task 156): the town's faces. Geometry is the
 * owner-approved set from the Task 149/152 lab boards, drawn in the app's
 * stroke vocabulary. Cairn's ready/thinking/working marks are the app's
 * own, byte-for-byte from the original TownFace; only its done is new.
 * Unknown adapters keep the previous shared worker face (working marks in
 * garden amber) exactly as before — a villager represents a real
 * model-backed process, and an unrecognized one changes nothing.
 */

export type TownFaceState = "ready" | "thinking" | "working" | "done";
export type TownFaceId = "cairn" | "kimi" | "codex" | "claude" | "gemini" | "worker-fallback";
export type TownFaceBlink = "single" | "double" | "slow" | "alternate" | "squeeze";

type Stroke = { d: string; w: number; o?: number; part: "eyeL" | "eyeR" | "mouth" };
const S = (part: Stroke["part"], d: string, w = 3, o?: number): Stroke => ({ part, d, w, o });

export type TownFaceDef = {
  id: TownFaceId;
  /** CSS color (token) for every stroke and the holo glow. */
  color: string;
  glow: string;
  /** Whole-face tilt in degrees; 0 is the character for Cairn and Claude. */
  tilt: number;
  blink: TownFaceBlink;
  /** Signature mark strokes drawn in the face color (part is ignored). */
  mark: Stroke[];
  states: Record<TownFaceState, Stroke[]>;
};

/** The previous shared worker face: the working marks, whatever the state. */
const FALLBACK_WORKING: Stroke[] = [
  S("eyeL", "M 28 36 L 44 42", 3.6),
  S("eyeR", "M 70 34 L 57 41", 3.6),
  S("mouth", "M 35 63 L 42 58 L 50 67 L 58 59 L 68 61", 3.4),
];

export const TOWN_FACES: Record<TownFaceId, TownFaceDef> = {
  cairn: {
    id: "cairn", color: "var(--garden-cyan)", glow: "var(--garden-cyan-glow)",
    tilt: 0, blink: "single", mark: [],
    states: {
      ready: [S("eyeL", "M 36 35 L 36 48", 3.8), S("eyeR", "M 64 39 L 64 46", 2.6, 0.75), S("mouth", "M 33 63 Q 48 70 70 57")],
      thinking: [S("eyeL", "M 33 33 L 40 41", 3.8), S("eyeR", "M 65 32 L 65 41", 2.6, 0.75), S("mouth", "M 35 63 L 43 63 M 49 60 L 56 67 M 63 61 L 70 61")],
      working: FALLBACK_WORKING,
      done: [S("eyeL", "M 36 35 L 36 48", 3.8), S("eyeR", "M 64 39 L 64 46", 2.6, 0.75), S("mouth", "M 32 62 Q 49 73 71 56", 3.2)],
    },
  },
  kimi: {
    id: "kimi", color: "var(--face-kimi)", glow: "var(--face-kimi-glow)",
    tilt: -2, blink: "squeeze",
    mark: [S("mouth", "M 77 23 Q 71 28.5 77 34", 2), S("mouth", "M 81.5 28 L 81.5 28.1", 2.4, 0.8)],
    states: {
      ready: [S("eyeL", "M 29 42 Q 37 33 45 42", 3.4), S("eyeR", "M 57 40 Q 63 34 69 40", 2.6, 0.8), S("mouth", "M 38 61 Q 50 69 64 59")],
      thinking: [S("eyeL", "M 29 40 Q 37 36 45 40", 3.4), S("eyeR", "M 57 39 Q 63 36 69 39", 2.6, 0.8), S("mouth", "M 40 62 Q 50 65 62 60", 2.8)],
      working: [S("eyeL", "M 31 41 Q 37 34 43 41", 3.4), S("eyeR", "M 58 40 Q 63 35 68 40", 2.6, 0.8), S("mouth", "M 42 62 Q 51 65 60 61", 2.8)],
      done: [S("eyeL", "M 29 42 Q 37 33 45 42", 3.4), S("eyeR", "M 57 40 Q 63 34 69 40", 2.6, 0.8), S("mouth", "M 38 61 Q 50 70 64 59"), S("mouth", "M 45 65.5 Q 51 70 57 65.5", 2.6)],
    },
  },
  codex: {
    id: "codex", color: "var(--face-codex)", glow: "var(--face-codex-glow)",
    tilt: 4, blink: "double",
    mark: [S("mouth", "M 24 17 L 24 25", 2), S("mouth", "M 20 21 L 28 21", 2)],
    states: {
      ready: [S("eyeL", "M 27 33 L 43 40", 3.6), S("eyeR", "M 60 36 L 68 36", 2.8, 0.85), S("mouth", "M 36 62 Q 50 68 69 57")],
      thinking: [S("eyeL", "M 27 33 L 43 40", 3.6), S("eyeR", "M 72 32 L 59 39", 2.8), S("mouth", "M 38 63 L 46 63 M 52 61 L 59 66 M 65 62 L 70 62", 2.8)],
      working: [S("eyeL", "M 26 32 L 44 40", 3.8), S("eyeR", "M 73 31 L 58 39", 3.2), S("mouth", "M 38 64 L 47 61 L 55 66 L 63 62 L 71 63")],
      done: [S("eyeL", "M 29 36 L 42 41", 3.4), S("eyeR", "M 61 37 L 69 37", 2.6, 0.85), S("mouth", "M 34 61 Q 51 72 70 57", 3.2)],
    },
  },
  claude: {
    id: "claude", color: "var(--face-claude)", glow: "var(--face-claude-glow)",
    tilt: 0, blink: "slow",
    mark: [S("mouth", "M 42 25 L 58 25", 2.2, 0.7)],
    states: {
      ready: [S("eyeL", "M 28 40 L 44 40", 3.2), S("eyeR", "M 56 40 L 72 40", 3.2), S("mouth", "M 35 61 Q 50 66 65 61", 2.8)],
      thinking: [S("eyeL", "M 28 39 L 44 41", 3.2), S("eyeR", "M 56 41 L 72 39", 3.2), S("mouth", "M 38 62 Q 50 64 62 62", 2.6)],
      working: [S("eyeL", "M 30 40 L 42 40", 3.4), S("eyeR", "M 58 40 L 70 40", 3.4), S("mouth", "M 40 62 L 60 62", 2.8)],
      done: [S("eyeL", "M 28 40 L 44 40", 3.2), S("eyeR", "M 56 40 L 72 40", 3.2), S("mouth", "M 34 60 Q 50 68 66 60")],
    },
  },
  gemini: {
    id: "gemini", color: "var(--face-gemini)", glow: "var(--face-gemini-glow)",
    tilt: -1.5, blink: "alternate",
    mark: [S("mouth", "M 46 20 L 46 20.1", 2.6), S("mouth", "M 74 20 L 74 20.1", 2.6)],
    states: {
      ready: [S("eyeL", "M 31 35 L 31 46", 2.6), S("eyeL", "M 38 35 L 38 46", 2.6), S("eyeR", "M 60 36 L 60 45", 2.2, 0.85), S("eyeR", "M 66 36 L 66 45", 2.2, 0.85), S("mouth", "M 32 62 Q 41 68 50 62", 2.8), S("mouth", "M 52 61 Q 61 67 70 60", 2.8)],
      thinking: [S("eyeL", "M 30 41 Q 34.5 36 39 41", 2.6), S("eyeR", "M 60 36 L 60 45", 2.2, 0.85), S("eyeR", "M 66 36 L 66 45", 2.2, 0.85), S("mouth", "M 36 63 Q 43 66 50 63", 2.6), S("mouth", "M 54 62 Q 61 65 68 62", 2.6)],
      working: [S("eyeL", "M 31 35 L 31 46", 2.6), S("eyeL", "M 38 35 L 38 46", 2.6), S("eyeR", "M 59 41 Q 63 36 67 41", 2.4), S("mouth", "M 32 62 Q 41 68 50 62", 2.8), S("mouth", "M 52 61 Q 61 67 70 60", 2.8)],
      done: [S("eyeL", "M 29 42 Q 34.5 35 40 42", 2.6), S("eyeR", "M 58 42 Q 63 35 68 42", 2.6), S("mouth", "M 31 61 Q 41 69 51 61", 2.8), S("mouth", "M 51 60 Q 61 68 71 59", 2.8)],
    },
  },
  "worker-fallback": {
    id: "worker-fallback", color: "var(--garden-amber)", glow: "var(--garden-amber-glow)",
    tilt: 0, blink: "single", mark: [],
    states: { ready: FALLBACK_WORKING, thinking: FALLBACK_WORKING, working: FALLBACK_WORKING, done: FALLBACK_WORKING },
  },
};

/**
 * The face a live worker wears, from its run's adapter id. Substring match
 * so `codex-exec`, `kimi-exec`, and future `claude-*` / `gemini-*` adapters
 * all land; anything else keeps the previous shared worker face.
 */
export function faceForAdapter(adapterId: string | null | undefined): TownFaceDef {
  const id = (adapterId ?? "").toLowerCase();
  if (id.includes("codex")) return TOWN_FACES.codex;
  if (id.includes("kimi")) return TOWN_FACES.kimi;
  if (id.includes("claude")) return TOWN_FACES.claude;
  if (id.includes("gemini")) return TOWN_FACES.gemini;
  return TOWN_FACES["worker-fallback"];
}
