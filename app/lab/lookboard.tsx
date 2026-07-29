import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "../src/renderer/tokens.css";
import "./concepts.css";
import "./lookboard.css";

type Direction = {
  id: string;
  title: string;
  essence: string;
  keep: string;
  watch: string;
  motion: string;
  palette: { name: string; value: string }[];
  scene: {
    skyTop: string;
    skyBottom: string;
    hillFar: string;
    hillNear: string;
    glow: string;
    stars: string;
    starBrights: string;
    cairn: string;
    cairnWarm: string;
    worker: string;
    workerPad: string;
    thread: string;
    card: string;
    cardLine: string;
    cardText: string;
    button: string;
    buttonText: string;
  };
};

const DIRECTIONS: Direction[] = [
  {
    id: "vibrant",
    title: "Vibrant garden",
    essence:
      "The new GitS anime's saturated palette lives on the characters — vivid teal Cairn, magenta-amber worker, lantern dots — while the world itself goes organic: dusk hills, no grid, no scanlines.",
    keep: "Color comes from who is in the scene, not from the machinery around them.",
    watch: "Saturation must stay on two or three anchors or the scene turns back into neon noise.",
    motion: "Idle bob stays slow; state changes pop once like a bubble, then settle.",
    palette: [
      { name: "cairn teal", value: "#3ef2c8" },
      { name: "worker magenta", value: "#ff5e9c" },
      { name: "lantern amber", value: "#ffc979" },
      { name: "dusk indigo", value: "#161b3d" },
      { name: "deep teal", value: "#0d2b33" },
    ],
    scene: {
      skyTop: "#161b3d",
      skyBottom: "#0d2b33",
      hillFar: "#1d3f4f",
      hillNear: "#122d38",
      glow: "rgb(62 242 200 / 10%)",
      stars: "rgb(255 233 176 / 50%)",
      starBrights: "#ffd9ec",
      cairn: "#3ef2c8",
      cairnWarm: "#8ef0c9",
      worker: "#ff5e9c",
      workerPad: "rgb(255 94 156 / 30%)",
      thread: "#7ef0ff",
      card: "rgb(22 27 61 / 82%)",
      cardLine: "rgb(62 242 200 / 40%)",
      cardText: "#d7f5ec",
      button: "#ffc979",
      buttonText: "#241a08",
    },
  },
  {
    id: "festival",
    title: "Soft festival",
    essence:
      "The Animal Crossing read: a peach-lavender dusk, a meadow with tufts and fireflies, coral and sky-blue spirits, and lantern light doing the work that glow used to do.",
    keep: "The warmest, most welcoming direction — the 'come play' feeling.",
    watch: "Light backgrounds make the app feel like a toy if typography and spacing go soft too.",
    motion: "Everything bounces a little softer and lands a little slower, like a balloon settling.",
    palette: [
      { name: "coral", value: "#ff8f7a" },
      { name: "sky blue", value: "#3f92e8" },
      { name: "lantern", value: "#ffd27a" },
      { name: "lavender dusk", value: "#5c4a8a" },
      { name: "meadow", value: "#5e8a6a" },
    ],
    scene: {
      skyTop: "#5c4a8a",
      skyBottom: "#f2a56b",
      hillFar: "#8a76b8",
      hillNear: "#5e8a6a",
      glow: "rgb(255 210 122 / 14%)",
      stars: "rgb(255 233 168 / 65%)",
      starBrights: "#fff3d0",
      cairn: "#ff8f7a",
      cairnWarm: "#ff7f66",
      worker: "#3f92e8",
      workerPad: "rgb(255 210 122 / 35%)",
      thread: "#ffe1b0",
      card: "rgb(46 34 74 / 78%)",
      cardLine: "rgb(255 210 122 / 45%)",
      cardText: "#f7ead9",
      button: "#ffd27a",
      buttonText: "#3a2408",
    },
  },
  {
    id: "calm",
    title: "Deep calm",
    essence:
      "Today's night garden, de-digitized: the scanlines and perspective grid are gone, the sky becomes a quiet nebula with fireflies, and the spirits soften from neon to lamplight.",
    keep: "The smallest step from where the app already is — calm, serious, still warm.",
    watch: "May read as 'more of the same' if the goal is a felt change, not a cleanup.",
    motion: "Almost nothing moves unless it means something; bobbing is slow and shallow.",
    palette: [
      { name: "soft cyan", value: "#8fd8e8" },
      { name: "soft amber", value: "#e8c48f" },
      { name: "nebula", value: "#1b2b4d" },
      { name: "night", value: "#0a0f1f" },
      { name: "hill", value: "#14202f" },
    ],
    scene: {
      skyTop: "#0a0f1f",
      skyBottom: "#101a33",
      hillFar: "#14202f",
      hillNear: "#0e1626",
      glow: "rgb(143 216 232 / 8%)",
      stars: "rgb(232 236 248 / 40%)",
      starBrights: "#cfe8f0",
      cairn: "#8fd8e8",
      cairnWarm: "#b5e2d8",
      worker: "#e8c48f",
      workerPad: "rgb(232 196 143 / 22%)",
      thread: "#9fd4de",
      card: "rgb(16 26 51 / 82%)",
      cardLine: "rgb(143 216 232 / 32%)",
      cardText: "#d5e2ea",
      button: "#e8c48f",
      buttonText: "#241a08",
    },
  },
];

function Scene({ direction }: { direction: Direction }) {
  const s = direction.scene;
  const gid = `sky-${direction.id}`;
  return (
    <svg className="look-scene" viewBox="0 0 360 240" role="img"
      aria-label={`${direction.title} scene sketch`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.skyTop} />
          <stop offset="1" stopColor={s.skyBottom} />
        </linearGradient>
      </defs>

      <rect width="360" height="240" fill={`url(#${gid})`} />
      <ellipse className="look-glow" cx="180" cy="196" rx="150" ry="42" fill={s.glow} />

      <g fill={s.stars}>
        <circle cx="34" cy="28" r="1.4" /><circle cx="88" cy="16" r="1" />
        <circle cx="150" cy="34" r="1.2" /><circle cx="216" cy="14" r="1" />
        <circle cx="282" cy="30" r="1.4" /><circle cx="330" cy="18" r="1" />
      </g>
      <g fill={s.starBrights}>
        <circle cx="62" cy="48" r="1.8" /><circle cx="252" cy="44" r="1.8" />
        <circle cx="312" cy="58" r="1.5" />
      </g>

      <path fill={s.hillFar} d="M 0 168 Q 70 138 150 162 Q 240 188 360 156 L 360 240 L 0 240 Z" />
      <path fill={s.hillNear} d="M 0 196 Q 90 172 180 192 Q 280 214 360 190 L 360 240 L 0 240 Z" />

      <ellipse cx="248" cy="186" rx="34" ry="9" fill="none" stroke={s.workerPad}
        strokeWidth="2" strokeDasharray="4 4" />

      <path className="look-thread" d="M 138 158 Q 190 128 236 168" fill="none"
        stroke={s.thread} strokeWidth="1.6" strokeDasharray="5 4" strokeLinecap="round" />

      {/* Cairn — ready pose, bare marks (Task 121 face) */}
      <g transform="translate(88 118) scale(0.52)" stroke={s.cairn} strokeLinecap="round"
        strokeLinejoin="round" fill="none">
        <path d="M 36 35 L 36 48" strokeWidth="7" />
        <path d="M 64 39 L 64 46" strokeWidth="5" opacity="0.75" />
        <path d="M 33 63 Q 48 70 70 57" stroke={s.cairnWarm} strokeWidth="6" />
      </g>
      <text x="114" y="186" fill={s.cardText} className="look-name">Cairn</text>

      {/* Worker — working pose, bare marks */}
      <g transform="translate(226 148) scale(0.42)" stroke={s.worker} strokeLinecap="round"
        strokeLinejoin="round" fill="none">
        <path d="M 28 36 L 44 42" strokeWidth="7" />
        <path d="M 70 34 L 57 41" strokeWidth="7" />
        <path d="M 35 63 L 42 58 L 50 67 L 58 59 L 68 61" strokeWidth="6" />
      </g>
      <text x="242" y="206" fill={s.cardText} className="look-name">worker</text>

      {/* A result card and one action, so the panel judges UI accents too */}
      <g>
        <rect x="18" y="188" width="128" height="40" rx="10" fill={s.card}
          stroke={s.cardLine} strokeWidth="1" />
        <rect x="28" y="198" width="72" height="5" rx="2.5" fill={s.cardLine} />
        <rect x="28" y="208" width="52" height="5" rx="2.5" fill={s.cardLine} opacity="0.6" />
        <rect x="96" y="212" width="42" height="12" rx="6" fill={s.button} />
        <text x="117" y="221" fill={s.buttonText} className="look-button-text">open</text>
      </g>
    </svg>
  );
}

function LookBoard() {
  return (
    <main className="concept-page look-page">
      <header className="concept-header">
        <a className="concept-back" href="/lab/index.html">← Back to the live visual lab</a>
        <p className="concept-kicker">unification look board · visual scenes only</p>
        <h1>One garden, three ways to paint it</h1>
        <p>
          The same scene in every panel — Cairn ready, a worker on its pad, a thread between
          them, a card and one button. The characters carry the color now; the world around
          them goes organic. Pick a direction, or name a mix, the same way the face was chosen.
        </p>
      </header>

      <section className="concept-grid look-grid" aria-label="Unification direction comparison">
        {DIRECTIONS.map((direction, index) => (
          <article className="concept-column" data-direction={direction.id} key={direction.id}>
            <header className="concept-title">
              <p className="concept-number">direction {String(index + 1).padStart(2, "0")}</p>
              <h2>{direction.title}</h2>
              <p>{direction.essence}</p>
            </header>

            <div className="look-scene-frame"><Scene direction={direction} /></div>

            <div className="look-palette" aria-label={`${direction.title} palette`}>
              {direction.palette.map((swatch) => (
                <span className="look-swatch" key={swatch.name} title={`${swatch.name} ${swatch.value}`}>
                  <i style={{ background: swatch.value }} />{swatch.name}
                </span>
              ))}
            </div>

            <p className="look-motion"><strong>Motion:</strong> {direction.motion}</p>

            <footer className="concept-judgment">
              <p><strong>Keep:</strong> {direction.keep}</p>
              <p><strong>Watch:</strong> {direction.watch}</p>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}

import { createRoot } from "react-dom/client";
import React from "react";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LookBoard />
  </React.StrictMode>,
);
