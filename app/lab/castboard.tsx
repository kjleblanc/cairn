/**
 * The cast board, expression pass (Task 152): the Task 149 stroke faces
 * learn to feel. Per the owner's "build them all": state expressions
 * (ready / thinking / working / done per model — Cairn's thinking and
 * working are the app's real marks from TownSquare.tsx), a per-model blink
 * rhythm (live here), one tiny signature mark (crescent / spark / brow /
 * bobbing dots — dots are zero-length round-capped strokes, so the stroke
 * vocabulary holds), a few degrees of head-tilt, and reactive one-shots
 * (delighted flash, waiting look) driven by the board's buttons. Lab-only;
 * the port into the real town is a later task.
 */
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "@fontsource/quicksand/700.css";
import "./castboard.css";
import React from "react";
import { createRoot } from "react-dom/client";

type Part = "eyeL" | "eyeR" | "mouth";
type Stroke = { d: string; w?: number; o?: number; part: Part };
type StateName = "ready" | "thinking" | "working" | "done" | "delighted";
type Blink = "single" | "double" | "slow" | "alternate" | "squeeze";

type FaceDef = {
  id: string; label: string; color: string; tilt: number; blink: Blink;
  /** Signature mark strokes, drawn in the face's color (part ignored). */
  mark: Stroke[];
  note: string; blinkNote: string;
  states: Record<StateName, Stroke[]>;
};

const S = (part: Part, d: string, w = 3, o = 1): Stroke => ({ part, d, w, o });

const FACES: FaceDef[] = [
  {
    id: "cairn", label: "Cairn", color: "#7fd8c8", tilt: 0, blink: "single",
    mark: [],
    note: "The guide keeps the real face, and its ready, thinking, and working marks are the app's own, byte-for-byte. Its done is the one new geometry here — the lopsided smile, opened wider.",
    blinkNote: "One calm blink every few seconds. The metronome the town breathes by.",
    states: {
      ready: [S("eyeL", "M 36 35 L 36 48", 3.8), S("eyeR", "M 64 39 L 64 46", 2.6, 0.75), S("mouth", "M 33 63 Q 48 70 70 57")],
      thinking: [S("eyeL", "M 33 33 L 40 41", 3.8), S("eyeR", "M 65 32 L 65 41", 2.6, 0.75), S("mouth", "M 35 63 L 43 63 M 49 60 L 56 67 M 63 61 L 70 61")],
      working: [S("eyeL", "M 28 36 L 44 42", 3.6), S("eyeR", "M 70 34 L 57 41", 3.6), S("mouth", "M 35 63 L 42 58 L 50 67 L 58 59 L 68 61", 3.4)],
      done: [S("eyeL", "M 36 35 L 36 48", 3.8), S("eyeR", "M 64 39 L 64 46", 2.6, 0.75), S("mouth", "M 32 62 Q 49 73 71 56", 3.2)],
      delighted: [S("eyeL", "M 30 42 Q 38 33 46 42", 3.6), S("eyeR", "M 56 40 Q 63 34 70 40", 2.8), S("mouth", "M 36 61 Q 50 71 66 59")],
    },
  },
  {
    id: "kimi", label: "Kimi worker", color: "#c9a7e8", tilt: -2, blink: "squeeze",
    mark: [S("mouth", "M 77 23 Q 71 28.5 77 34", 2), S("mouth", "M 81.5 28 L 81.5 28.1", 2.4, 0.8)],
    note: "The moon to Cairn's lantern. Thinking flattens the happy arcs; working narrows them; done opens the smile. A small crescent keeps watch at the top right.",
    blinkNote: "A soft squeeze rather than a blink — the arcs press wider as they close.",
    states: {
      ready: [S("eyeL", "M 29 42 Q 37 33 45 42", 3.4), S("eyeR", "M 57 40 Q 63 34 69 40", 2.6, 0.8), S("mouth", "M 38 61 Q 50 69 64 59")],
      thinking: [S("eyeL", "M 29 40 Q 37 36 45 40", 3.4), S("eyeR", "M 57 39 Q 63 36 69 39", 2.6, 0.8), S("mouth", "M 40 62 Q 50 65 62 60", 2.8)],
      working: [S("eyeL", "M 31 41 Q 37 34 43 41", 3.4), S("eyeR", "M 58 40 Q 63 35 68 40", 2.6, 0.8), S("mouth", "M 42 62 Q 51 65 60 61", 2.8)],
      done: [S("eyeL", "M 29 42 Q 37 33 45 42", 3.4), S("eyeR", "M 57 40 Q 63 34 69 40", 2.6, 0.8), S("mouth", "M 38 61 Q 50 70 64 59"), S("mouth", "M 45 65.5 Q 51 70 57 65.5", 2.6)],
      delighted: [S("eyeL", "M 27 43 Q 37 31 47 43", 3.6), S("eyeR", "M 55 41 Q 63 32 71 41", 2.8, 0.85), S("mouth", "M 36 60 Q 50 72 66 58"), S("mouth", "M 44 66 Q 51 72 58 66", 2.6)],
    },
  },
  {
    id: "codex", label: "Codex worker", color: "#f2a35c", tilt: 4, blink: "double",
    mark: [S("mouth", "M 24 17 L 24 25", 2), S("mouth", "M 20 21 L 28 21", 2)],
    note: "The builder mid-solve. Thinking opens the wink into a second angled eye; working makes both eyes keen; done is a grin. The little spark marks where ideas strike.",
    blinkNote: "Quick double-blink, and only the open eye — the wink never breaks character.",
    states: {
      ready: [S("eyeL", "M 27 33 L 43 40", 3.6), S("eyeR", "M 60 36 L 68 36", 2.8, 0.85), S("mouth", "M 36 62 Q 50 68 69 57")],
      thinking: [S("eyeL", "M 27 33 L 43 40", 3.6), S("eyeR", "M 72 32 L 59 39", 2.8), S("mouth", "M 38 63 L 46 63 M 52 61 L 59 66 M 65 62 L 70 62", 2.8)],
      working: [S("eyeL", "M 26 32 L 44 40", 3.8), S("eyeR", "M 73 31 L 58 39", 3.2), S("mouth", "M 38 64 L 47 61 L 55 66 L 63 62 L 71 63")],
      done: [S("eyeL", "M 29 36 L 42 41", 3.4), S("eyeR", "M 61 37 L 69 37", 2.6, 0.85), S("mouth", "M 34 61 Q 51 72 70 57", 3.2)],
      delighted: [S("eyeL", "M 27 41 Q 36 32 45 41", 3.6), S("eyeR", "M 57 39 Q 64 32 71 39", 3), S("mouth", "M 33 60 Q 50 73 69 57"), S("mouth", "M 43 66.5 Q 51 73 60 66.5", 2.6)],
    },
  },
  {
    id: "claude", label: "Claude worker", color: "#9fb8d8", tilt: 0, blink: "slow",
    mark: [S("mouth", "M 42 25 L 58 25", 2.2, 0.7)],
    note: "The careful reader. Thinking dips the level strokes toward the middle — concentration, not worry; working shortens them; done warms the smile. One calm brow-line above it all.",
    blinkNote: "Slow and rare. You will catch it once, then start waiting for it.",
    states: {
      ready: [S("eyeL", "M 28 40 L 44 40", 3.2), S("eyeR", "M 56 40 L 72 40", 3.2), S("mouth", "M 35 61 Q 50 66 65 61", 2.8)],
      thinking: [S("eyeL", "M 28 39 L 44 41", 3.2), S("eyeR", "M 56 41 L 72 39", 3.2), S("mouth", "M 38 62 Q 50 64 62 62", 2.6)],
      working: [S("eyeL", "M 30 40 L 42 40", 3.4), S("eyeR", "M 58 40 L 70 40", 3.4), S("mouth", "M 40 62 L 60 62", 2.8)],
      done: [S("eyeL", "M 28 40 L 44 40", 3.2), S("eyeR", "M 56 40 L 72 40", 3.2), S("mouth", "M 34 60 Q 50 68 66 60")],
      delighted: [S("eyeL", "M 28 41 Q 36 35 44 41", 3.2), S("eyeR", "M 56 41 Q 64 35 72 41", 3.2), S("mouth", "M 33 60 Q 50 69 67 59")],
    },
  },
  {
    id: "gemini", label: "Gemini worker", color: "#8ad8b0", tilt: -1.5, blink: "alternate",
    mark: [S("mouth", "M 46 20 L 46 20.1", 2.6), S("mouth", "M 74 20 L 74 20.1", 2.6)],
    note: "Two halves of one thought. Thinking rests the left pair; working rests the right; done arcs both and doubles the smile. Two small dots bob overhead, taking turns.",
    blinkNote: "The pairs blink in alternation — one half is always watching.",
    states: {
      ready: [S("eyeL", "M 31 35 L 31 46", 2.6), S("eyeL", "M 38 35 L 38 46", 2.6), S("eyeR", "M 60 36 L 60 45", 2.2, 0.85), S("eyeR", "M 66 36 L 66 45", 2.2, 0.85), S("mouth", "M 32 62 Q 41 68 50 62", 2.8), S("mouth", "M 52 61 Q 61 67 70 60", 2.8)],
      thinking: [S("eyeL", "M 30 41 Q 34.5 36 39 41", 2.6), S("eyeR", "M 60 36 L 60 45", 2.2, 0.85), S("eyeR", "M 66 36 L 66 45", 2.2, 0.85), S("mouth", "M 36 63 Q 43 66 50 63", 2.6), S("mouth", "M 54 62 Q 61 65 68 62", 2.6)],
      working: [S("eyeL", "M 31 35 L 31 46", 2.6), S("eyeL", "M 38 35 L 38 46", 2.6), S("eyeR", "M 59 41 Q 63 36 67 41", 2.4), S("mouth", "M 32 62 Q 41 68 50 62", 2.8), S("mouth", "M 52 61 Q 61 67 70 60", 2.8)],
      done: [S("eyeL", "M 29 42 Q 34.5 35 40 42", 2.6), S("eyeR", "M 58 42 Q 63 35 68 42", 2.6), S("mouth", "M 31 61 Q 41 69 51 61", 2.8), S("mouth", "M 51 60 Q 61 68 71 59", 2.8)],
      delighted: [S("eyeL", "M 29 42 Q 34.5 35 40 42", 2.6), S("eyeR", "M 58 42 Q 63 35 68 42", 2.6), S("mouth", "M 30 60 Q 41 71 52 60.5", 2.8), S("mouth", "M 50 59 Q 61 70 72 58", 2.8)],
    },
  },
];

/** The reference: today's shared worker face (Task 149's "before"). */
const TODAY: Stroke[] = [
  S("eyeL", "M 36 35 L 36 48", 3.8), S("eyeR", "M 64 39 L 64 46", 2.6, 0.75),
  S("mouth", "M 33 63 Q 48 70 70 57"),
];

function FaceSvg({ strokes, color, size, blink, waiting, label }: {
  strokes: Stroke[]; color: string; size: number;
  blink?: Blink; waiting?: boolean; label: string;
}) {
  const group = (part: Part) => strokes.filter((s) => s.part === part);
  const render = (list: Stroke[]) => list.map((s, i) => (
    <path key={i} d={s.d} stroke={color} strokeWidth={s.w} opacity={s.o}
      strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ));
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label}
      className={blink ? `fb-svg fb-blink-${blink}${waiting ? " fb-waiting" : ""}` : "fb-svg"}
      style={{ display: "block", overflow: "visible" }}>
      {/* fb-look composes with the per-eye blink transforms (nested groups). */}
      <g className="fb-look">
        <g className="fb-eye fb-eye-l">{render(group("eyeL"))}</g>
        <g className="fb-eye fb-eye-r">{render(group("eyeR"))}</g>
      </g>
      {render(group("mouth"))}
    </svg>
  );
}

function Face({ face, state = "ready", size, waiting, animate = true }: {
  face: FaceDef; state?: StateName; size: number; waiting?: boolean; animate?: boolean;
}) {
  return (
    <span className="fb-tilt" style={{ transform: `rotate(${face.tilt}deg)` }}>
      {face.mark.length > 0 && (
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true"
          className={`fb-mark fb-mark-${face.id}`} style={{ display: "block", overflow: "visible" }}>
          {face.mark.map((s, i) => (
            <path key={i} d={s.d} stroke={face.color} strokeWidth={s.w} opacity={s.o}
              strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </svg>
      )}
      <FaceSvg strokes={face.states[state]} color={face.color} size={size}
        blink={animate ? face.blink : undefined} waiting={waiting} label={`${face.label}, ${state}`} />
    </span>
  );
}

/* ------------------------------------------------------------------ */

const STATE_COLS: { name: StateName; label: string }[] = [
  { name: "ready", label: "ready" },
  { name: "thinking", label: "thinking" },
  { name: "working", label: "working" },
  { name: "done", label: "done" },
];

function StateGrid() {
  return (
    <div className="fb-grid" id="expr-grid">
      <div className="fb-grid-head" />
      {STATE_COLS.map((c) => <div key={c.name} className="fb-grid-head">{c.label}</div>)}
      {FACES.map((face) => (
        <React.Fragment key={face.id}>
          <div className="fb-grid-name">
            <span className="fb-dot" style={{ background: face.color }} />
            {face.label}
          </div>
          {STATE_COLS.map((c) => (
            <div key={c.name} className="fb-grid-cell">
              <Face face={face} state={c.name} size={86} animate={false} />
            </div>
          ))}
        </React.Fragment>
      ))}
      <div className="fb-grid-name fb-grid-dim">
        <span className="fb-dot" style={{ background: "#ff9e8a" }} />
        every worker, today
      </div>
      <div className="fb-grid-cell fb-grid-dim">
        <FaceSvg strokes={TODAY} color="#ff9e8a" size={86} label="today's shared worker face" />
      </div>
      <div className="fb-grid-cell fb-grid-dim fb-grid-note" />
      <div className="fb-grid-cell fb-grid-dim fb-grid-note" />
      <div className="fb-grid-cell fb-grid-dim fb-grid-note" />
    </div>
  );
}

function CastRow() {
  const [mood, setMood] = React.useState<null | "delighted" | "waiting">(null);
  const fire = (next: "delighted" | "waiting") => {
    if (next === "waiting") { setMood((m) => (m === "waiting" ? null : "waiting")); return; }
    setMood("delighted");
    window.setTimeout(() => setMood((m) => (m === "delighted" ? null : m)), 1600);
  };
  return (
    <section className="cb-scene cb-scene-faces" id="expr-cast"
      style={{ background: "linear-gradient(180deg, #2e2a4e, #443d63 60%, #2c2842 60%)" }}>
      {[[14, 10], [32, 20], [50, 8], [66, 16], [82, 7], [90, 24], [7, 26]].map(([x, y], i) => (
        <span key={i} className="cb-firefly" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
      <svg className="cb-hills" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,120 C200,60 380,150 600,110 C820,70 1000,140 1200,90 L1200,220 L0,220 Z" fill="#46406a" />
        <path d="M0,170 C240,120 420,190 660,160 C880,135 1040,185 1200,150 L1200,220 L0,220 Z" fill="#35304f" />
      </svg>
      <div className="cb-cast-row">
        {FACES.map((face) => (
          <figure key={face.id} className="cb-villager">
            <Face face={face} state={mood === "delighted" ? "delighted" : "ready"}
              size={112} waiting={mood === "waiting"} />
            <figcaption className="cb-tag" style={{ background: "#f4ead9", color: "#54452f" }}>
              <strong>{face.label}</strong>
            </figcaption>
          </figure>
        ))}
      </div>
      <span className="cb-world-title" style={{ color: "#f4ead9" }}>
        live — blinks, tilt, and marks are real on this page
      </span>
      <div className="fb-mood-bar">
        <button type="button" className="fb-mood-btn" onClick={() => fire("delighted")}>A result lands</button>
        <button type="button" className={`fb-mood-btn${mood === "waiting" ? " active" : ""}`} onClick={() => fire("waiting")}>Waiting on you</button>
      </div>
    </section>
  );
}

function Notes() {
  return (
    <div className="fb-cards" id="expr-notes">
      {FACES.map((face) => (
        <div key={face.id} className="fb-card">
          <h3>{face.label}<span className="fb-dot" style={{ background: face.color }} /><code>{face.color}</code></h3>
          <p>{face.note}</p>
          <p className="fb-blink-note"><strong>Blink:</strong> {face.blinkNote}</p>
        </div>
      ))}
    </div>
  );
}

function Board() {
  return (
    <main className="cb-board">
      <h1>The cast learns to feel</h1>
      <p className="cb-sub">
        Task 149's faces, given states, a signature mark, a few degrees of tilt, their own
        blink rhythms, and two reactive one-shots. Everything is still the app's stroke
        vocabulary — lines, arcs, round caps; the dots are zero-length strokes. Mock only —
        nothing here is in the app yet.
      </p>
      <CastRow />
      <h2 className="cb-h2">Every mood of every face</h2>
      <StateGrid />
      <h2 className="cb-h2">Why each face moves the way it does</h2>
      <Notes />
      <p className="cb-sub cb-footnote">
        In the real town these states would follow the conductor's own signals: thinking
        while Cairn streams, working while a run is live, done when the result card lands,
        delighted as a one-shot, waiting whenever an approval is yours to give.
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Board />);
