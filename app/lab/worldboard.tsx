/**
 * World palette board (Task 144): the same town scene — sky, rolling hills,
 * the REAL face marks, a chat card, a button, a thread — painted under three
 * de-digitized directions. The owner's brief: "more Animal Crossing, with a
 * color palette and vibe of Ghost in the Shell" — AC's warm organic world,
 * GitS saturation living on the characters. Lab-only taste exploration; the
 * winning direction gets ported into tokens.css as a later task.
 */
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "./worldboard.css";
import React from "react";
import { createRoot } from "react-dom/client";

type Palette = {
  skyTop: string; skyBottom: string; hillFar: string; hillNear: string;
  ground: string; panel: string; panelInk: string; panelMuted: string;
  bubbleCairn: string; bubbleOwner: string; bubbleOwnerInk: string;
  cairn: string; worker: string; button: string; buttonInk: string;
  thread: string; accent: string;
};

type Direction = {
  id: string; title: string; essence: string; keep: string; watch: string;
  sky: "day" | "sunset" | "dusk"; palette: Palette;
  chips: { name: string; value: string }[];
};

/* The real TownFace path data (ready Cairn; working worker), copied so what
 * is judged is color and world, never new marks. */
function Face({ color, pose, width }: { color: string; pose: "ready" | "working"; width: number }) {
  return (
    <svg viewBox="0 0 100 100" width={width} height={width} aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}>
      {pose === "ready" ? (
        <>
          <path d="M 36 35 L 36 48" stroke={color} strokeWidth={3.8} strokeLinecap="round" fill="none" />
          <path d="M 64 39 L 64 46" stroke={color} strokeWidth={2.6} strokeLinecap="round" fill="none" opacity={0.75} />
          <path d="M 33 63 Q 48 70 70 57" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      ) : (
        <>
          <path d="M 28 36 L 44 42" stroke={color} strokeWidth={3.6} strokeLinecap="round" fill="none" />
          <path d="M 70 34 L 57 41" stroke={color} strokeWidth={3.6} strokeLinecap="round" fill="none" />
          <path d="M 35 63 L 42 58 L 50 67 L 58 59 L 68 61" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
    </svg>
  );
}

const DIRECTIONS: Direction[] = [
  {
    id: "meadow",
    title: "Meadow morning",
    essence:
      "Full Animal Crossing daylight. Soft blue sky with round clouds, rolling green hills, cream paper panels with warm brown ink. The Ghost in the Shell saturation lives only on the two spirits — teal Cairn, coral worker — so color comes from who is home, not from machinery.",
    keep: "The friendliest read by far; cream panels make the chat feel like a letter, not a terminal.",
    watch: "Daylight can read as a toy if type and spacing go soft; the ink must stay a serious brown.",
    sky: "day",
    palette: {
      skyTop: "#9fd9f2", skyBottom: "#e9f6e4", hillFar: "#7cc48a", hillNear: "#4da267",
      ground: "#3f8f5c", panel: "#fbf6ea", panelInk: "#57452f", panelMuted: "#9b8a6e",
      bubbleCairn: "#ffffff", bubbleOwner: "#dff0d8", bubbleOwnerInk: "#3f6b3a",
      cairn: "#14b8a6", worker: "#ff5e7e", button: "#ffd45e", buttonInk: "#5e4413",
      thread: "#b09a78", accent: "#ffffff",
    },
    chips: [
      { name: "sky", value: "#9fd9f2" }, { name: "meadow", value: "#4da267" },
      { name: "cream", value: "#fbf6ea" }, { name: "cairn teal", value: "#14b8a6" },
      { name: "worker coral", value: "#ff5e7e" }, { name: "sun button", value: "#ffd45e" },
    ],
  },
  {
    id: "golden",
    title: "Golden hour",
    essence:
      "The middle step: a peach-gold sky over an amber-green meadow, everything lit like late afternoon. Warm without going full day, and the dusk lovers keep some honey in the sky.",
    keep: "Warmest sky; the meadow at golden hour is the closest to AC's late-afternoon mood.",
    watch: "Peach on cream needs the brown ink to stay dark or contrast slips.",
    sky: "sunset",
    palette: {
      skyTop: "#ffc98f", skyBottom: "#ffe6c4", hillFar: "#b5a35e", hillNear: "#7d9b52",
      ground: "#6b8a47", panel: "#fbf1de", panelInk: "#5e4632", panelMuted: "#a08a6d",
      bubbleCairn: "#ffffff", bubbleOwner: "#f6e3c2", bubbleOwnerInk: "#7a5a28",
      cairn: "#12a394", worker: "#ff6e6e", button: "#f5a83d", buttonInk: "#57360a",
      thread: "#b5926a", accent: "#fff3d9",
    },
    chips: [
      { name: "peach sky", value: "#ffc98f" }, { name: "gold meadow", value: "#7d9b52" },
      { name: "warm cream", value: "#fbf1de" }, { name: "deep teal", value: "#12a394" },
      { name: "coral", value: "#ff6e6e" }, { name: "amber", value: "#f5a83d" },
    ],
  },
  {
    id: "lantern",
    title: "Lantern dusk",
    essence:
      "Today's night kept, but de-neoned: a warmer plum-indigo sky, no cyan glow, paper-lantern light doing the work, and cream panels that read as lamp-lit rather than backlit. For owners who love the dusk but not the techy.",
    keep: "Smallest move from today; the fireflies and lamp-warm panels are genuinely cozy.",
    watch: "Still the darkest option — if the goal is maximum Animal Crossing, this keeps one foot in the old world.",
    sky: "dusk",
    palette: {
      skyTop: "#2e2a4e", skyBottom: "#443d63", hillFar: "#46406a", hillNear: "#35304f",
      ground: "#2c2842", panel: "#f4ead9", panelInk: "#54452f", panelMuted: "#97856b",
      bubbleCairn: "#fffaf0", bubbleOwner: "#e8f0d8", bubbleOwnerInk: "#4a6638",
      cairn: "#7fd8c8", worker: "#ff9e8a", button: "#f2b95c", buttonInk: "#4e3208",
      thread: "#8d80a8", accent: "#ffd98a",
    },
    chips: [
      { name: "plum dusk", value: "#2e2a4e" }, { name: "hill silhouette", value: "#35304f" },
      { name: "lamp cream", value: "#f4ead9" }, { name: "soft teal", value: "#7fd8c8" },
      { name: "warm coral", value: "#ff9e8a" }, { name: "lantern", value: "#f2b95c" },
    ],
  },
];

function SkyDecor({ kind, accent }: { kind: Direction["sky"]; accent: string }) {
  if (kind === "day") {
    return (
      <>
        <span className="wb-cloud" style={{ left: "12%", top: "12%" }} />
        <span className="wb-cloud wb-cloud-small" style={{ left: "58%", top: "7%" }} />
        <span className="wb-sun" style={{ left: "80%", top: "10%" }} />
      </>
    );
  }
  if (kind === "sunset") {
    return <span className="wb-sun wb-sun-low" style={{ left: "74%", top: "26%", background: accent }} />;
  }
  return (
    <>
      {[[16, 12], [34, 22], [52, 9], [68, 18], [84, 8], [90, 26], [8, 28]].map(([x, y], i) => (
        <span key={i} className="wb-firefly" style={{ left: `${x}%`, top: `${y}%`, background: accent }} />
      ))}
    </>
  );
}

function Scene({ direction }: { direction: Direction }) {
  const p = direction.palette;
  return (
    <section className="wb-scene" id={`wb-${direction.id}`}
      style={{ background: `linear-gradient(180deg, ${p.skyTop}, ${p.skyBottom} 62%, ${p.ground} 62%)` }}>
      <SkyDecor kind={direction.sky} accent={p.accent} />
      {/* Rolling hills: two soft layers, the near one meeting the meadow. */}
      <svg className="wb-hills" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,120 C200,60 380,150 600,110 C820,70 1000,140 1200,90 L1200,220 L0,220 Z" fill={p.hillFar} />
        <path d="M0,170 C240,120 420,190 660,160 C880,135 1040,185 1200,150 L1200,220 L0,220 Z" fill={p.hillNear} />
      </svg>

      {/* The spirits at home, with their thread between them. */}
      <svg className="wb-thread" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="31" y1="46" x2="68" y2="40" stroke={p.thread} strokeWidth={0.5}
          strokeDasharray="3 2" vector-effect="non-scaling-stroke" />
      </svg>
      <div className="wb-spirit" style={{ left: "24%", top: "30%" }}>
        <Face color={p.cairn} pose="ready" width={92} />
        <span className="wb-spirit-name" style={{ color: p.panelInk, background: p.panel }}>Cairn</span>
      </div>
      <div className="wb-spirit" style={{ left: "62%", top: "24%" }}>
        <Face color={p.worker} pose="working" width={80} />
        <span className="wb-spirit-name" style={{ color: p.panelInk, background: p.panel }}>worker</span>
      </div>

      {/* A chat card, so the panel treatment is judged too. */}
      <div className="wb-card" style={{ background: p.panel, color: p.panelInk }}>
        <div className="wb-bubble" style={{ background: p.bubbleCairn, color: p.panelInk }}>
          The recipe page lists all three now — want the search box next?
        </div>
        <div className="wb-bubble wb-bubble-owner" style={{ background: p.bubbleOwner, color: p.bubbleOwnerInk }}>
          Yes — and make it forgive my typos.
        </div>
        <div className="wb-card-row">
          <span className="wb-input" style={{ color: p.panelMuted }}>Talk to Cairn…</span>
          <span className="wb-button" style={{ background: p.button, color: p.buttonInk }}>Send</span>
        </div>
      </div>
    </section>
  );
}

function DirectionBlock({ direction }: { direction: Direction }) {
  return (
    <div className="wb-direction">
      <Scene direction={direction} />
      <div className="wb-meta">
        <h2>{direction.title}</h2>
        <p className="wb-essence">{direction.essence}</p>
        <p className="wb-kw"><strong>Keep:</strong> {direction.keep}</p>
        <p className="wb-kw"><strong>Watch:</strong> {direction.watch}</p>
        <div className="wb-chips">
          {direction.chips.map((chip) => (
            <span key={chip.name} className="wb-chip">
              <i style={{ background: chip.value }} />{chip.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Board() {
  return (
    <main className="wb-board">
      <h1>World palette board</h1>
      <p className="wb-sub">
        One town scene, three de-digitized worlds. Animal Crossing carries the environment;
        Ghost in the Shell carries the spirits. Mock only — nothing here is in the app yet.
      </p>
      {DIRECTIONS.map((direction) => <DirectionBlock key={direction.id} direction={direction} />)}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Board />);
