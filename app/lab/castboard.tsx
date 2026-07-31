/**
 * The cast board, take two (Task 149): personalized stroke faces per model.
 * The owner's call on Task 147: "Keep the style faces we have now, but
 * personalize them per model type." So no bodies, no animals — the app's
 * own TownFace vocabulary (minimal strokes, round caps, 100×100 box), with
 * distinct geometry and a signature color per model. Cairn's face is the
 * real one, byte-for-byte from TownSquare.tsx; the worker faces are new
 * geometry in the same family. Lab-only; the winner ports for real as a
 * later task.
 */
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "@fontsource/quicksand/700.css";
import "./castboard.css";
import React from "react";
import { createRoot } from "react-dom/client";

type Stroke = { d: string; w?: number; o?: number };

type FaceDef = {
  id: string; label: string; color: string; note: string;
  strokes: Stroke[];
};

/**
 * The reference: the app's real marks today (TownSquare.tsx). Ready Cairn
 * is `cairn` below; today's worker face is the SAME geometry in coral —
 * that sameness is what this board fixes.
 */
const TODAY_WORKER: FaceDef = {
  id: "today", label: "every worker, today", color: "#ff9e8a",
  note: "One shared face: Cairn's exact marks, only recolored coral.",
  strokes: [
    { d: "M 36 35 L 36 48", w: 3.8 },
    { d: "M 64 39 L 64 46", w: 2.6, o: 0.75 },
    { d: "M 33 63 Q 48 70 70 57", w: 3 },
  ],
};

const FACES: FaceDef[] = [
  {
    id: "cairn", label: "Cairn", color: "#7fd8c8",
    note: "The guide keeps the real face, untouched — the asymmetric eyes and the lopsided smile are the app's handshake. Everyone else is measured against it.",
    strokes: [
      { d: "M 36 35 L 36 48", w: 3.8 },
      { d: "M 64 39 L 64 46", w: 2.6, o: 0.75 },
      { d: "M 33 63 Q 48 70 70 57", w: 3 },
    ],
  },
  {
    id: "kimi", label: "Kimi worker", color: "#c9a7e8",
    note: "Moonserene: closed happy arcs for eyes, a soft open smile. Where Cairn's eyes are alert strokes, Kimi's rest — the moon to Cairn's lantern.",
    strokes: [
      { d: "M 29 42 Q 37 33 45 42", w: 3.4 },
      { d: "M 57 40 Q 63 34 69 40", w: 2.6, o: 0.8 },
      { d: "M 38 61 Q 50 69 64 59", w: 3 },
    ],
  },
  {
    id: "codex", label: "Codex worker", color: "#f2a35c",
    note: "Keen and quick: one angled eye borrowed from the app's own 'thinking' marks, one winking dash, and a crooked confident smirk. The builder mid-solve.",
    strokes: [
      { d: "M 27 33 L 43 40", w: 3.6 },
      { d: "M 60 36 L 68 36", w: 2.8, o: 0.85 },
      { d: "M 36 62 Q 50 68 69 57", w: 3 },
    ],
  },
  {
    id: "claude", label: "Claude worker", color: "#9fb8d8",
    note: "Calm and level: two even horizontal strokes, a gentle level smile. The careful reader — unhurried, exact, symmetrical on purpose.",
    strokes: [
      { d: "M 28 40 L 44 40", w: 3.2 },
      { d: "M 56 40 L 72 40", w: 3.2 },
      { d: "M 35 61 Q 50 66 65 61", w: 2.8 },
    ],
  },
  {
    id: "gemini", label: "Gemini worker", color: "#8ad8b0",
    note: "Everything doubled: twin strokes for each eye, a two-part smile. Two halves of one thought — the only face made of pairs.",
    strokes: [
      { d: "M 31 35 L 31 46", w: 2.6 },
      { d: "M 38 35 L 38 46", w: 2.6 },
      { d: "M 60 36 L 60 45", w: 2.2, o: 0.85 },
      { d: "M 66 36 L 66 45", w: 2.2, o: 0.85 },
      { d: "M 32 62 Q 41 68 50 62", w: 2.8 },
      { d: "M 52 61 Q 61 67 70 60", w: 2.8 },
    ],
  },
];

function Face({ face, size }: { face: FaceDef; size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img"
      aria-label={face.label} style={{ display: "block", overflow: "visible" }}>
      {face.strokes.map((s, i) => (
        <path key={i} d={s.d} stroke={face.color} strokeWidth={s.w ?? 3}
          strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={s.o ?? 1} />
      ))}
    </svg>
  );
}

/* The two worlds worth judging contrast on: the shipped Lantern Dusk and
   the Meadow morning alternative (Golden hour sits between, per Task 144). */
type World = {
  id: string; title: string;
  skyTop: string; skyBottom: string; hillFar: string; hillNear: string; ground: string;
  tag: string; tagInk: string; night: boolean;
};

const WORLDS: World[] = [
  {
    id: "dusk", title: "Lantern dusk — the shipped world",
    skyTop: "#2e2a4e", skyBottom: "#443d63", hillFar: "#46406a", hillNear: "#35304f", ground: "#2c2842",
    tag: "#f4ead9", tagInk: "#54452f", night: true,
  },
  {
    id: "meadow", title: "Meadow morning — the daylight check",
    skyTop: "#9fd9f2", skyBottom: "#e9f6e4", hillFar: "#7cc48a", hillNear: "#4da267", ground: "#3f8f5c",
    tag: "#fbf6ea", tagInk: "#57452f", night: false,
  },
];

function Lineup({ world }: { world: World }) {
  return (
    <section className="cb-scene cb-scene-faces" id={`faces-${world.id}`}
      style={{ background: `linear-gradient(180deg, ${world.skyTop}, ${world.skyBottom} 60%, ${world.ground} 60%)` }}>
      {world.night
        ? [[14, 10], [32, 20], [50, 8], [66, 16], [82, 7], [90, 24], [7, 26]].map(([x, y], i) => (
            <span key={i} className="cb-firefly" style={{ left: `${x}%`, top: `${y}%` }} />
          ))
        : <>
            <span className="cb-cloud" style={{ left: "10%", top: "10%" }} />
            <span className="cb-cloud cb-cloud-small" style={{ left: "62%", top: "6%" }} />
            <span className="cb-sun" style={{ left: "84%", top: "9%" }} />
          </>}
      <svg className="cb-hills" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,120 C200,60 380,150 600,110 C820,70 1000,140 1200,90 L1200,220 L0,220 Z" fill={world.hillFar} />
        <path d="M0,170 C240,120 420,190 660,160 C880,135 1040,185 1200,150 L1200,220 L0,220 Z" fill={world.hillNear} />
      </svg>
      <div className="cb-cast-row">
        {FACES.map((face) => (
          <figure key={face.id} className="cb-villager">
            <Face face={face} size={118} />
            <figcaption className="cb-tag" style={{ background: world.tag, color: world.tagInk }}>
              <strong>{face.label}</strong>
            </figcaption>
          </figure>
        ))}
      </div>
      <span className="cb-world-title" style={{ color: world.tag }}>{world.title}</span>
    </section>
  );
}

function FaceCards() {
  return (
    <div className="fb-cards" id="faces-cards">
      {FACES.map((face) => (
        <div key={face.id} className="fb-card">
          <div className="fb-face-row">
            <span className="fb-face-lg"><Face face={face} size={120} /></span>
            <span className="fb-face-sizes">
              <span className="fb-chip fb-chip-dark" title="town size, on dusk"><Face face={face} size={40} /></span>
              <span className="fb-chip fb-chip-light" title="town size, on meadow"><Face face={face} size={40} /></span>
            </span>
          </div>
          <h3>
            {face.label}
            <span className="fb-dot" style={{ background: face.color }} />
            <code>{face.color}</code>
          </h3>
          <p>{face.note}</p>
        </div>
      ))}
      <div className="fb-card fb-card-dim">
        <div className="fb-face-row">
          <span className="fb-face-lg"><Face face={TODAY_WORKER} size={120} /></span>
          <span className="fb-face-sizes">
            <span className="fb-chip fb-chip-dark"><Face face={TODAY_WORKER} size={40} /></span>
            <span className="fb-chip fb-chip-light"><Face face={TODAY_WORKER} size={40} /></span>
          </span>
        </div>
        <h3>{TODAY_WORKER.label}<span className="fb-dot" style={{ background: TODAY_WORKER.color }} /><code>{TODAY_WORKER.color}</code></h3>
        <p>{TODAY_WORKER.note} Shown for reference — the “before”.</p>
      </div>
    </div>
  );
}

function Board() {
  return (
    <main className="cb-board">
      <h1>The cast, take two — same faces, personalized</h1>
      <p className="cb-sub">
        The app's own stroke-face language, one face per model. Cairn keeps the real marks;
        each worker gets its own geometry and signature color, drawn with the same lines,
        arcs, and round caps. Judge them in both worlds and at town size. Mock only —
        nothing here is in the app yet.
      </p>
      <FaceCards />
      {WORLDS.map((world) => <Lineup key={world.id} world={world} />)}
      <p className="cb-sub cb-footnote">
        States are the next layer: thinking and working variants reuse these same geometries,
        the way the app's current faces do. And if a face doesn't sing, it gets redrawn —
        the vocabulary is the constraint, not any single mark.
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Board />);
