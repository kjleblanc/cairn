/**
 * The cast board (Task 147): one guide and four worker villagers, hand-drawn
 * SVG so the shapes themselves are the design artifact. The owner's brief:
 * "different avatars for each type of AI model, as well as one for Cairn, so
 * all workers look different" — Animal Crossing warmth, with one Ghost in
 * the Shell cybernetic detail per character. The same cast is shown under
 * three lighting directions (the Task 144 worlds) so the owner picks the
 * treatment, not just the shapes. Lab-only; the winner is ported for real
 * as a later task.
 *
 * Cast, grounded in the app's real adapters (town/model.ts):
 *   Cairn  — the guide: a stone-stack spirit, the real face marks kept.
 *   Mochi  — Kimi worker: a moon rabbit (Moonshot → moon), glowing ear seam.
 *   Rusty  — Codex worker: a fox with a satchel, data-wisp tail tip.
 *   Barnaby — Claude worker: an owl, circuit trace on one wing.
 *   Pip & Kit — Gemini worker: twin kittens under one thin halo ring.
 * Villager names are placeholders for the owner's taste.
 */
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "@fontsource/quicksand/700.css";
import "./castboard.css";
import React from "react";
import { createRoot } from "react-dom/client";

/** Per-direction treatment: the same shapes under different light. */
type Treatment = {
  /** Strength of the GitS glow details (0–1). */
  glow: number;
  /** Blush-cheek opacity (0–1). */
  cheek: number;
  /** CSS filter on each character, standing in for scene lighting. */
  light: string;
};

type CharColors = {
  body: string; shade: string; cream: string; ink: string;
  accent: string; glow: string; cheek: string;
};

type CastMember = {
  id: string; villager: string; role: string; note: string;
  colors: CharColors;
  Body: (c: CharColors, t: Treatment) => React.ReactNode;
};

/* ------------------------------------------------------------------ */
/* The cast. Every figure draws inside a 120×120 box, feet near y=106. */
/* ------------------------------------------------------------------ */

function CairnBody(c: CharColors, t: Treatment) {
  return (
    <>
      <ellipse cx="60" cy="108" rx="26" ry="5" fill="rgb(0 0 0 / 14%)" />
      {/* lantern twig, tucked between the stones */}
      <path d="M 78 74 Q 90 66 91 54" stroke="#7a5c3e" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <g style={{ filter: `drop-shadow(0 0 6px ${c.glow})`, opacity: 0.35 + 0.65 * t.glow }}>
        <rect x="85" y="54" width="12" height="15" rx="5" fill={c.accent} />
        <path d="M 85 58 L 97 58 M 85 65 L 97 65" stroke={c.ink} strokeWidth="0.9" opacity="0.35" />
      </g>
      <rect x="88" y="51" width="6" height="3" rx="1.5" fill={c.ink} opacity="0.55" />
      {/* the three stones */}
      <ellipse cx="60" cy="97" rx="31" ry="13" fill={c.shade} />
      <ellipse cx="59" cy="77" rx="23.5" ry="11.5" fill={c.body} />
      {/* glow seam: the GitS detail, between head and body */}
      <path d="M 43 70 Q 60 75 77 70" stroke={c.glow} strokeWidth="1.6" strokeLinecap="round" fill="none"
        style={{ filter: `drop-shadow(0 0 4px ${c.glow})` }} opacity={t.glow} />
      <ellipse cx="60" cy="58" rx="18" ry="13.5" fill={c.cream} />
      {/* the REAL ready face marks, scaled onto the top stone */}
      <path d="M 52 53 L 52 59.5" stroke={c.ink} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M 68 54 L 68 58.5" stroke={c.ink} strokeWidth="1.9" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M 50 62 Q 59 67.5 70 60" stroke={c.ink} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );
}

function MochiBody(c: CharColors, t: Treatment) {
  return (
    <>
      <ellipse cx="60" cy="108" rx="24" ry="5" fill="rgb(0 0 0 / 14%)" />
      {/* ears: one tall, one flopped */}
      <path d="M 47 60 C 39 40 41 20 50 18 C 59 16 59 42 55 60 Z" fill={c.body} />
      <path d="M 49 54 C 45 40 46 28 50 25" stroke={c.glow} strokeWidth="1.8" strokeLinecap="round" fill="none"
        style={{ filter: `drop-shadow(0 0 4px ${c.glow})` }} opacity={t.glow} />
      <path d="M 67 58 C 73 40 87 32 94 39 C 100 45 86 56 71 62 Z" fill={c.body} />
      <path d="M 72 56 C 78 46 86 41 90 43" stroke={c.cream} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* body */}
      <ellipse cx="60" cy="82" rx="28" ry="26" fill={c.body} />
      {/* crescent mark on the belly */}
      <path d="M 66 88 A 11 11 0 1 0 66 104 A 8.4 8.4 0 1 1 66 88 Z" fill={c.accent} fillRule="evenodd" opacity="0.95" />
      {/* face */}
      <circle cx="50" cy="76" r="2.7" fill={c.ink} />
      <circle cx="68" cy="76" r="2.7" fill={c.ink} />
      <path d="M 55 84 Q 59 87.5 63 84" stroke={c.ink} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <ellipse cx="43" cy="82" rx="4" ry="2.3" fill={c.cheek} opacity={t.cheek} />
      <ellipse cx="75" cy="82" rx="4" ry="2.3" fill={c.cheek} opacity={t.cheek} />
    </>
  );
}

function RustyBody(c: CharColors, t: Treatment) {
  return (
    <>
      <ellipse cx="60" cy="108" rx="26" ry="5" fill="rgb(0 0 0 / 14%)" />
      {/* tail sweeping around the right side, cream tip */}
      <path d="M 78 102 C 102 100 112 76 99 58 C 108 74 100 92 82 98 Z" fill={c.body} />
      <path d="M 99 58 C 103 64 104 70 103 76 C 100 68 96 63 92 60 Z" fill={c.cream} />
      <circle cx="101" cy="59" r="3.2" fill={c.glow}
        style={{ filter: `drop-shadow(0 0 6px ${c.glow})` }} opacity={t.glow} />
      {/* body and head */}
      <ellipse cx="57" cy="87" rx="24" ry="20" fill={c.body} />
      <ellipse cx="57" cy="96" rx="13" ry="9" fill={c.cream} opacity="0.85" />
      <path d="M 41 45 L 38 25 Q 38 20 43 23 L 56 37 Z" fill={c.body} />
      <path d="M 73 45 L 76 25 Q 76 20 71 23 L 58 37 Z" fill={c.body} />
      <path d="M 43 40 L 41.5 28 L 50 36 Z" fill={c.ink} opacity="0.35" />
      <path d="M 71 40 L 72.5 28 L 64 36 Z" fill={c.ink} opacity="0.35" />
      <circle cx="57" cy="55" r="18.5" fill={c.body} />
      <ellipse cx="57" cy="63" rx="10.5" ry="7.5" fill={c.cream} />
      <circle cx="57" cy="59" r="2.5" fill={c.ink} />
      <circle cx="49" cy="52" r="2.7" fill={c.ink} />
      <circle cx="65" cy="52" r="2.7" fill={c.ink} />
      <ellipse cx="42" cy="60" rx="3.6" ry="2.1" fill={c.cheek} opacity={t.cheek} />
      <ellipse cx="72" cy="60" rx="3.6" ry="2.1" fill={c.cheek} opacity={t.cheek} />
      {/* satchel: the worker's tool bag */}
      <path d="M 34 78 Q 57 90 80 78" stroke={c.shade} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <rect x="72" y="76" width="13" height="11" rx="3.5" fill={c.accent} />
      <path d="M 72 80.5 L 85 80.5" stroke={c.ink} strokeWidth="1" opacity="0.35" />
    </>
  );
}

function BarnabyBody(c: CharColors, t: Treatment) {
  return (
    <>
      <ellipse cx="60" cy="108" rx="24" ry="5" fill="rgb(0 0 0 / 14%)" />
      {/* wings */}
      <path d="M 32 68 Q 24 88 35 101 Q 40 88 40 74 Z" fill={c.shade} />
      <path d="M 88 68 Q 96 88 85 101 Q 80 88 80 74 Z" fill={c.shade} />
      {/* circuit trace on the left wing: the GitS detail */}
      <g stroke={c.glow} strokeWidth="1.2" strokeLinecap="round" fill="none"
        style={{ filter: `drop-shadow(0 0 3px ${c.glow})` }} opacity={t.glow}>
        <path d="M 33 76 L 36 80 L 34 87" />
        <circle cx="36" cy="80" r="1.3" fill={c.glow} stroke="none" />
        <circle cx="34" cy="90" r="1.1" fill={c.glow} stroke="none" />
      </g>
      {/* body */}
      <ellipse cx="60" cy="76" rx="30" ry="32" fill={c.body} />
      <ellipse cx="60" cy="90" rx="16" ry="13" fill={c.cream} opacity="0.85" />
      <path d="M 48 88 Q 52 92 56 88 M 60 92 Q 64 96 68 92 M 52 96 Q 56 100 60 96"
        stroke={c.shade} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* brow tufts */}
      <path d="M 38 52 L 33 33 Q 33 28 38 31 L 51 43 Z" fill={c.body} />
      <path d="M 82 52 L 87 33 Q 87 28 82 31 L 69 43 Z" fill={c.body} />
      {/* face disc */}
      <ellipse cx="60" cy="62" rx="22" ry="16" fill={c.cream} />
      <circle cx="50" cy="60" r="6.8" fill="#fff" />
      <circle cx="70" cy="60" r="6.8" fill="#fff" />
      <circle cx="50" cy="60" r="3.1" fill={c.ink} />
      <circle cx="70" cy="60" r="3.1" fill={c.ink} />
      <circle cx="51.4" cy="58.6" r="1.1" fill="#fff" />
      <circle cx="71.4" cy="58.6" r="1.1" fill="#fff" />
      <path d="M 57.5 67 L 62.5 67 L 60 71.5 Z" fill={c.accent} />
    </>
  );
}

function PipKitBody(c: CharColors, t: Treatment) {
  return (
    <>
      <ellipse cx="60" cy="108" rx="30" ry="5" fill="rgb(0 0 0 / 14%)" />
      {/* halo ring linking the twins: the GitS detail */}
      <ellipse cx="60" cy="36" rx="23" ry="6" stroke={c.glow} strokeWidth="1.8" fill="none"
        style={{ filter: `drop-shadow(0 0 5px ${c.glow})` }} opacity={t.glow} />
      {/* Pip (left, sky) */}
      <path d="M 31 92 Q 22 88 24 76" stroke={c.body} strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <ellipse cx="44" cy="88" rx="14.5" ry="13" fill={c.body} />
      <path d="M 35 59 L 32.5 47 L 42 54 Z" fill={c.body} />
      <path d="M 53 59 L 55.5 47 L 46 54 Z" fill={c.body} />
      <circle cx="44" cy="65" r="11.5" fill={c.body} />
      <path d="M 38 65 Q 40 62.8 42 65 M 46 65 Q 48 62.8 50 65" stroke={c.ink} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M 42.5 70 Q 44 71.5 45.5 70" stroke={c.ink} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <ellipse cx="36.5" cy="68.5" rx="2.6" ry="1.5" fill={c.cheek} opacity={t.cheek} />
      {/* Kit (right, mint) */}
      <path d="M 89 92 Q 98 88 96 76" stroke={c.accent} strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <ellipse cx="76" cy="88" rx="14.5" ry="13" fill={c.accent} />
      <path d="M 67 59 L 64.5 47 L 74 54 Z" fill={c.accent} />
      <path d="M 85 59 L 87.5 47 L 78 54 Z" fill={c.accent} />
      <circle cx="76" cy="65" r="11.5" fill={c.accent} />
      <path d="M 70 65 Q 72 62.8 74 65 M 78 65 Q 80 62.8 82 65" stroke={c.ink} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M 74.5 70 Q 76 71.5 77.5 70" stroke={c.ink} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <ellipse cx="83.5" cy="68.5" rx="2.6" ry="1.5" fill={c.cheek} opacity={t.cheek} />
    </>
  );
}

const CAST: CastMember[] = [
  {
    id: "cairn", villager: "Cairn", role: "the guide",
    note: "A stone-stack spirit — a cairn come alive. Keeps the real face marks, carries the lantern; the glow seam between the stones is its one machine detail.",
    colors: { body: "#cfc4ae", shade: "#b3a78f", cream: "#f4ead9", ink: "#54452f", accent: "#f2b95c", glow: "#7fd8c8", cheek: "#e8a588" },
    Body: CairnBody,
  },
  {
    id: "mochi", villager: "Mochi", role: "Kimi worker",
    note: "A moon rabbit for Moonshot's Kimi — moon-cream fur, a crescent mark, and one glowing ear seam where the signal comes in.",
    colors: { body: "#efe6f2", shade: "#d9cbe0", cream: "#fbf6fb", ink: "#4e4258", accent: "#b48ad6", glow: "#7fd8c8", cheek: "#e8a0b8" },
    Body: MochiBody,
  },
  {
    id: "rusty", villager: "Rusty", role: "Codex worker",
    note: "A fox with a tool satchel — quick, clever, happiest mid-build. The data-wisp at the tail tip flickers while it works.",
    colors: { body: "#e0875a", shade: "#c46b42", cream: "#fdeedd", ink: "#54382a", accent: "#f2b95c", glow: "#ffb35c", cheek: "#e8a588" },
    Body: RustyBody,
  },
  {
    id: "barnaby", villager: "Barnaby", role: "Claude worker",
    note: "An owl in dusk plum — the careful reader of the cast. A faint circuit trace runs down the left wing like an old tattoo.",
    colors: { body: "#7a6a9e", shade: "#635384", cream: "#f4ead9", ink: "#3f3652", accent: "#f2b95c", glow: "#9fe8d8", cheek: "#c99ab8" },
    Body: BarnabyBody,
  },
  {
    id: "pipkit", villager: "Pip & Kit", role: "Gemini worker",
    note: "Twin kittens under one thin halo ring — two halves of one thought. The ring is the only machine thing about them.",
    colors: { body: "#a8c8e8", shade: "#8aaccc", cream: "#eef6fc", ink: "#3a4a5c", accent: "#a8dcc0", glow: "#8ad8ff", cheek: "#e8a0a8" },
    Body: PipKitBody,
  },
];

function Character({ member, treatment, size }: { member: CastMember; treatment: Treatment; size: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img"
      aria-label={`${member.villager}, ${member.role}`}
      style={{ display: "block", overflow: "visible", filter: treatment.light }}>
      {member.Body(member.colors, treatment)}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Directions: the Task 144 worlds as lighting, so the owner picks    */
/* the treatment, not just the shapes.                                */
/* ------------------------------------------------------------------ */

type Direction = {
  id: string; title: string; essence: string; keep: string; watch: string;
  sky: "day" | "sunset" | "dusk";
  backdrop: { skyTop: string; skyBottom: string; hillFar: string; hillNear: string; ground: string; tag: string; tagInk: string };
  treatment: Treatment;
  chips: { name: string; value: string }[];
};

const DIRECTIONS: Direction[] = [
  {
    id: "paper",
    title: "Paper villagers — Meadow morning",
    essence:
      "Full Animal Crossing daylight. Matte chalky bodies, visible blush, and the GitS details dialed down to a single warm point each — the cast reads as plush, not machine. If the app should feel like a toy you trust, this is it.",
    keep: "Friendliest by far; silhouettes carry all the identity, which survives shrinking to town size.",
    watch: "With the glows this quiet, the cybernetic idea nearly vanishes — GitS lives only in the concept notes.",
    sky: "day",
    backdrop: { skyTop: "#9fd9f2", skyBottom: "#e9f6e4", hillFar: "#7cc48a", hillNear: "#4da267", ground: "#3f8f5c", tag: "#fbf6ea", tagInk: "#57452f" },
    treatment: { glow: 0.35, cheek: 0.55, light: "saturate(1.02) brightness(1.02)" },
    chips: [
      { name: "sky", value: "#9fd9f2" }, { name: "meadow", value: "#4da267" },
      { name: "glow at 35%", value: "#7fd8c8" }, { name: "blush on", value: "#e8a588" },
    ],
  },
  {
    id: "golden",
    title: "Golden hour",
    essence:
      "The middle step: late-afternoon honey over the meadow, bodies warmed by the light, glows at half strength like embers waking up. Warm without going full plush, digital without going neon.",
    keep: "Best balance of the two worlds; the warm light flatters every palette in the cast.",
    watch: "A compromise direction — it may win no one's heart the way the extremes do.",
    sky: "sunset",
    backdrop: { skyTop: "#ffc98f", skyBottom: "#ffe6c4", hillFar: "#b5a35e", hillNear: "#7d9b52", ground: "#6b8a47", tag: "#fbf1de", tagInk: "#5e4632" },
    treatment: { glow: 0.65, cheek: 0.4, light: "sepia(0.16) saturate(1.06) brightness(1.01)" },
    chips: [
      { name: "peach sky", value: "#ffc98f" }, { name: "gold meadow", value: "#7d9b52" },
      { name: "glow at 65%", value: "#f2b95c" }, { name: "soft blush", value: "#e8a588" },
    ],
  },
  {
    id: "neon",
    title: "Neon seam — Lantern dusk",
    essence:
      "The shipped Lantern Dusk world, with the GitS details fully lit: the seam, the ear line, the tail wisp, the circuit trace and the halo all glow against the plum night, bodies rim-lit and saturated. Ghost in the Shell carried by the characters, exactly as the owner framed it.",
    keep: "Most distinctive; the glow points make states (idle vs working) readable from across the room.",
    watch: "The darkest option — if the goal is maximum Animal Crossing, this keeps one foot in the old world.",
    sky: "dusk",
    backdrop: { skyTop: "#2e2a4e", skyBottom: "#443d63", hillFar: "#46406a", hillNear: "#35304f", ground: "#2c2842", tag: "#f4ead9", tagInk: "#54452f" },
    treatment: { glow: 1, cheek: 0.25, light: "brightness(0.88) saturate(1.18)" },
    chips: [
      { name: "plum dusk", value: "#2e2a4e" }, { name: "hill silhouette", value: "#35304f" },
      { name: "glow full", value: "#7fd8c8" }, { name: "rim-lit", value: "#9fe8d8" },
    ],
  },
];

function SkyDecor({ kind }: { kind: Direction["sky"] }) {
  if (kind === "day") {
    return (
      <>
        <span className="cb-cloud" style={{ left: "10%", top: "10%" }} />
        <span className="cb-cloud cb-cloud-small" style={{ left: "62%", top: "6%" }} />
        <span className="cb-sun" style={{ left: "84%", top: "9%" }} />
      </>
    );
  }
  if (kind === "sunset") {
    return <span className="cb-sun cb-sun-low" style={{ left: "78%", top: "22%" }} />;
  }
  return (
    <>
      {[[14, 10], [32, 20], [50, 8], [66, 16], [82, 7], [90, 24], [7, 26]].map(([x, y], i) => (
        <span key={i} className="cb-firefly" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
    </>
  );
}

function Scene({ direction }: { direction: Direction }) {
  const b = direction.backdrop;
  return (
    <section className="cb-scene" id={`cast-${direction.id}`}
      style={{ background: `linear-gradient(180deg, ${b.skyTop}, ${b.skyBottom} 60%, ${b.ground} 60%)` }}>
      <SkyDecor kind={direction.sky} />
      <svg className="cb-hills" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,120 C200,60 380,150 600,110 C820,70 1000,140 1200,90 L1200,220 L0,220 Z" fill={b.hillFar} />
        <path d="M0,170 C240,120 420,190 660,160 C880,135 1040,185 1200,150 L1200,220 L0,220 Z" fill={b.hillNear} />
      </svg>
      <div className="cb-cast-row">
        {CAST.map((member) => (
          <figure key={member.id} className="cb-villager">
            <Character member={member} treatment={direction.treatment} size={132} />
            <figcaption className="cb-tag" style={{ background: b.tag, color: b.tagInk }}>
              <strong>{member.villager}</strong>
              <span>{member.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function TownSizeStrip({ direction }: { direction: Direction }) {
  return (
    <div className="cb-town-strip">
      <span className="cb-town-label">town size — silhouettes must survive this:</span>
      {CAST.map((member) => (
        <span key={member.id} className="cb-town-chip" title={`${member.villager}, ${member.role}`}>
          <Character member={member} treatment={direction.treatment} size={44} />
        </span>
      ))}
    </div>
  );
}

function CastNotes() {
  return (
    <div className="cb-notes">
      <h2>Who they are</h2>
      {CAST.map((member) => (
        <p key={member.id} className="cb-note">
          <strong>{member.villager}</strong> <em>({member.role})</em> — {member.note}
        </p>
      ))}
      <p className="cb-note cb-note-dim">
        Villager names are placeholders — Animal Crossing names every resident, and the owner's
        taste decides ours. States are the next layer: idle, working, and done poses reuse these
        same silhouettes.
      </p>
    </div>
  );
}

function DirectionBlock({ direction }: { direction: Direction }) {
  return (
    <div className="cb-direction">
      <Scene direction={direction} />
      <TownSizeStrip direction={direction} />
      <div className="cb-meta">
        <h2>{direction.title}</h2>
        <p className="cb-essence">{direction.essence}</p>
        <p className="cb-kw"><strong>Keep:</strong> {direction.keep}</p>
        <p className="cb-kw"><strong>Watch:</strong> {direction.watch}</p>
        <div className="cb-chips">
          {direction.chips.map((chip) => (
            <span key={chip.name} className="cb-chip">
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
    <main className="cb-board">
      <h1>The cast</h1>
      <p className="cb-sub">
        One guide and four workers, drawn as villagers — each readable by silhouette alone,
        each carrying exactly one Ghost in the Shell detail. The same cast under three lights;
        pick the treatment. Mock only — nothing here is in the app yet.
      </p>
      <CastNotes />
      {DIRECTIONS.map((direction) => <DirectionBlock key={direction.id} direction={direction} />)}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Board />);
