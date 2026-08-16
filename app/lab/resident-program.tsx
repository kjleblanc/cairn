/**
 * Task 255 - the resident-program visual constitution and state board.
 *
 * LAB ONLY, and deliberately self-contained: this page imports the bundled
 * Quicksand faces and its own stylesheet, and nothing from `src/renderer/`.
 * That is on purpose. `app.css` is the retired night-garden cascade; importing
 * it would mean judging the new system through the old one. The production
 * `CairnProgram` primitive and the real token file belong to Slice 3.
 *
 * Everything on this page is fixed synthetic data. There is no project, no
 * connection, no store, no IPC, and no control that can apply, run, open,
 * send, publish, approve, or verify anything.
 *
 * Marker: cairn-resident-program-board/v1
 */
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "@fontsource/quicksand/700.css";
import "./resident-program.css";

import React from "react";
import { createRoot } from "react-dom/client";

/* ===================================================================== */
/* The resident program                                                  */
/* ===================================================================== */

/**
 * One geometry, drawn once, scaled by the viewBox alone. Every coordinate
 * below is in the units of that viewBox and was measured from the approved
 * face-D reference at docs/visual-reference/cairn-face-d-approved-2026-08-13.png
 * (see the design spec for the conversion). Nothing is a raster asset, so the
 * same component is sharp at a 28 px brand mark and at an 88 px presence.
 *
 * `size` means the AMBER FRONT PANE's height — how big Cairn actually looks —
 * not the SVG's bounding box. Measured against the approved mockup that is the
 * honest reading: Cairn's pane there is roughly 90 px tall in a 1320 px window
 * and roughly 28 px in the header, which is exactly the 28–88 range the plan
 * names. Sizing by the bounding box would have shipped a Cairn a third smaller
 * than the one the owner approved.
 */
const VIEW = { x: 0, y: 3, w: 128, h: 94 };
/** The compact mark drops the rear fan and the data squares; see MARK_VIEW. */
const MARK_VIEW = { x: 22, y: 18, w: 90, h: 78 };

/** The amber front pane, with its clipped top-right corner. */
const PANE_X = 30;
const PANE_Y = 26;
const PANE_W = 76;
const PANE_H = 63.5;
const PANE_R = 5.5;
/**
 * Measured, not estimated. On the approved reference the pane's right edge
 * climbs from x=388 at its top row (y=644) to x=429 at y=684 - a 45-degree cut
 * of 41 px across a 240 px pane, which is 12.8 of the 76 units here. An earlier
 * eyeballed 9.5 was 26% short, on the single most distinctive line of the
 * silhouette.
 */
const CHAMFER = 12.8;

const FRONT_PANE_PATH = [
  `M ${PANE_X + PANE_R} ${PANE_Y}`,
  `H ${PANE_X + PANE_W - CHAMFER}`,
  `L ${PANE_X + PANE_W} ${PANE_Y + CHAMFER}`,
  `V ${PANE_Y + PANE_H - PANE_R}`,
  `A ${PANE_R} ${PANE_R} 0 0 1 ${PANE_X + PANE_W - PANE_R} ${PANE_Y + PANE_H}`,
  `H ${PANE_X + PANE_R}`,
  `A ${PANE_R} ${PANE_R} 0 0 1 ${PANE_X} ${PANE_Y + PANE_H - PANE_R}`,
  `V ${PANE_Y + PANE_R}`,
  `A ${PANE_R} ${PANE_R} 0 0 1 ${PANE_X + PANE_R} ${PANE_Y}`,
  "Z",
].join(" ");

/** Eye and mouth anchors, measured from the reference. */
const EYE_L = { x: 46.4, y: 45.9, s: 12.3 };
const EYE_R = { cx: 84.6, base: 54.4, rx: 4.95, ry: 3.9 };
const MOUTH_LEFT = 65.9;

type ProgramState =
  | "ready"
  | "thinking"
  | "needs-decision"
  | "working"
  | "checking"
  | "done"
  | "stopped"
  | "error"
  | "disconnected";

/* --- the mark vocabulary. Five shapes, recombined; no state invents one. --- */

function OutlinedSquare({ x, y, s, w = 2.5 }: { x: number; y: number; s: number; w?: number }) {
  return <rect x={x + w / 2} y={y + w / 2} width={s - w} height={s - w} rx={1.3} fill="none" stroke="currentColor" strokeWidth={w} />;
}

function SolidSquare({ x, y, s }: { x: number; y: number; s: number }) {
  return <rect x={x} y={y} width={s} height={s} rx={1.2} fill="currentColor" />;
}

function CrescentUp({ cx, base, rx, ry, w = 3 }: { cx: number; base: number; rx: number; ry: number; w?: number }) {
  return (
    <path
      d={`M ${cx - rx} ${base} A ${rx} ${ry} 0 0 1 ${cx + rx} ${base}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="butt"
    />
  );
}

function Bar({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={0.8} fill="currentColor" />;
}

/**
 * The lopsided stepped smile. Measured from the reference row by row, it is
 * three SEPARATE blocks, not one outline: two small posts side by side at the
 * top, and a wider bar below and strictly BETWEEN them. The lopsidedness is
 * real but quiet - the right post is a hair wider, and the whole mouth sits
 * about a fifth of a pane-width right of the eyes' midpoint.
 *
 * `down` mirrors the staircase - bar on top, posts below - which is how ERROR
 * differs from STOPPED by SHAPE and not only by colour.
 */
function SteppedMouth({ x, tone = "smile" }: { x: number; tone?: "smile" | "level" | "down" | "small" }) {
  if (tone === "level") return <Bar x={x + 1.9} y={73.4} w={14.2} h={3.6} />;
  if (tone === "small") return <Bar x={x + 3.8} y={73.4} w={10.1} h={3.5} />;
  if (tone === "down") {
    return (
      <>
        <Bar x={x + 3.8} y={70.8} w={10.1} h={3.5} />
        <Bar x={x} y={74.6} w={3.8} h={3.8} />
        <Bar x={x + 13.9} y={74.6} w={4.1} h={3.8} />
      </>
    );
  }
  return (
    <>
      <Bar x={x} y={70.8} w={3.8} h={3.8} />
      <Bar x={x + 3.8} y={74.9} w={10.1} h={3.5} />
      <Bar x={x + 13.9} y={70.8} w={4.1} h={3.8} />
    </>
  );
}

/** Each state's face, described once so the board and the spec cannot drift. */
function Face({ state }: { state: ProgramState }) {
  switch (state) {
    case "thinking":
      // Attentive: the closed eye opens to a small solid square, the smile
      // flattens to a level step. Awake and listening, not surprised.
      return (
        <>
          <OutlinedSquare x={EYE_L.x} y={EYE_L.y} s={EYE_L.s} />
          <SolidSquare x={EYE_R.cx - 3.6} y={48.4} s={7.2} />
          <SteppedMouth x={MOUTH_LEFT} tone="small" />
        </>
      );
    case "needs-decision":
      // Candid, not angry: two open outlined eyes, the right one lifted a
      // little - the quizzical tilt of someone waiting for an answer - over a
      // short mouth. Deliberately NOT the same face as STOPPED, whose mouth
      // runs the full width and whose eyes sit level.
      return (
        <>
          <OutlinedSquare x={EYE_L.x} y={EYE_L.y} s={EYE_L.s} />
          <OutlinedSquare x={EYE_R.cx - 6.15} y={EYE_L.y - 2.4} s={EYE_L.s} />
          <SteppedMouth x={MOUTH_LEFT} tone="small" />
        </>
      );
    case "working":
      // Purposeful and compact: both eyes drop to level bars - looking down at
      // the work - and the mouth closes to a small step.
      return (
        <>
          <Bar x={EYE_L.x} y={50.2} w={EYE_L.s} h={3.6} />
          <Bar x={EYE_R.cx - 6.15} y={50.2} w={EYE_L.s} h={3.6} />
          <SteppedMouth x={MOUTH_LEFT} tone="small" />
        </>
      );
    case "checking":
      // Concentrated: two outlined eyes, the right one smaller, as if reading
      // closely. The pane carries one finite scan; see ProgramBody.
      return (
        <>
          <OutlinedSquare x={EYE_L.x} y={EYE_L.y} s={EYE_L.s} />
          <OutlinedSquare x={EYE_R.cx - 4.4} y={47.7} s={8.8} w={2.2} />
          <SteppedMouth x={MOUTH_LEFT} tone="small" />
        </>
      );
    case "done":
      // Contained satisfaction: both eyes close into crescents and the stepped
      // smile stays exactly as approved. No celebration, no confetti.
      return (
        <>
          <CrescentUp cx={52.55} base={EYE_R.base} rx={EYE_R.rx} ry={EYE_R.ry} />
          <CrescentUp cx={EYE_R.cx} base={EYE_R.base} rx={EYE_R.rx} ry={EYE_R.ry} />
          <SteppedMouth x={MOUTH_LEFT} />
        </>
      );
    case "stopped":
      // Serious and attentive, not ashamed: both eyes open and level, mouth
      // level. Cairn is looking straight at the owner with the bad news.
      return (
        <>
          <OutlinedSquare x={EYE_L.x} y={EYE_L.y} s={EYE_L.s} />
          <OutlinedSquare x={EYE_R.cx - 6.15} y={EYE_L.y} s={EYE_L.s} />
          <SteppedMouth x={MOUTH_LEFT} tone="level" />
        </>
      );
    case "error":
      // Distinct from STOPPED by shape, not colour: the eyes narrow to upright
      // bars and the stepped mouth inverts. Rueful, never menacing.
      return (
        <>
          <Bar x={EYE_L.x + 4.2} y={46.6} w={3.9} h={10.9} />
          <Bar x={EYE_R.cx - 1.95} y={46.6} w={3.9} h={10.9} />
          <SteppedMouth x={MOUTH_LEFT} tone="down" />
        </>
      );
    case "disconnected":
      // Neutral and available: two level dashes and one short mouth. Dormant,
      // not asleep and not unhappy.
      return (
        <>
          <Bar x={EYE_L.x + 1.4} y={50.9} w={9.5} h={3.2} />
          <Bar x={EYE_R.cx - 4.75} y={50.9} w={9.5} h={3.2} />
          <SteppedMouth x={MOUTH_LEFT} tone="small" />
        </>
      );
    case "ready":
    default:
      // Face D exactly as approved.
      return (
        <>
          <OutlinedSquare x={EYE_L.x} y={EYE_L.y} s={EYE_L.s} />
          <CrescentUp cx={EYE_R.cx} base={EYE_R.base} rx={EYE_R.rx} ry={EYE_R.ry} />
          <SteppedMouth x={MOUTH_LEFT} />
        </>
      );
  }
}

/**
 * The body. Two translucent teal rear panes fanned behind the amber front
 * pane, a cyan seam pane at the lower left, and two tiny data marks at the
 * right seam. The art is decorative: it is `aria-hidden` and unfocusable, and
 * it announces nothing. Every status it accompanies is written in words.
 */
function CairnProgram({
  state = "ready",
  size = 88,
  variant = "full",
  className,
  animate = false,
}: {
  state?: ProgramState;
  /** Height of the amber front pane in CSS pixels — Cairn's apparent size. */
  size?: number;
  /** "mark" drops the rear fan and data squares; below ~40 px they turn to mud. */
  variant?: "full" | "mark";
  className?: string;
  animate?: boolean;
}) {
  const uid = React.useId().replace(/:/gu, "");
  const view = variant === "mark" ? MARK_VIEW : VIEW;
  const scale = size / PANE_H;
  const height = Math.round(view.h * scale);
  const width = Math.round(view.w * scale);
  const separated = state === "thinking";
  const dim = state === "disconnected";

  return (
    <svg
      className={["rp-program", className, animate ? "rp-anim-arrive" : undefined].filter(Boolean).join(" ")}
      width={width}
      height={height}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      aria-hidden="true"
      focusable="false"
      data-rp-program={state}
      data-rp-variant={variant}
    >
      <defs>
        <linearGradient id={`${uid}-amber`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--rp-amber)" />
          <stop offset="1" stopColor="var(--rp-amber-low)" />
        </linearGradient>
        <clipPath id={`${uid}-front`}>
          <path d={FRONT_PANE_PATH} />
        </clipPath>
      </defs>

      {variant === "full" ? (
        <>
          {/* The cyan seam pane, drawn first so the rear fan veils all of it
              but the lower-left corner - which is the only part the approved
              reference shows in the clear. */}
          <rect
            x={24}
            y={44}
            width={45}
            height={50.7}
            rx={PANE_R}
            fill="var(--rp-seam)"
            fillOpacity={dim ? 0.08 : 0.2}
            stroke={state === "done" ? "var(--rp-sage-ink)" : "var(--rp-seam)"}
            strokeWidth={1.4}
            strokeOpacity={dim ? 0.4 : 0.95}
          />
          {/* Back pane: fanned counter-clockwise, reaching down and left. */}
          <rect
            x={9}
            y={24}
            width={PANE_W}
            height={PANE_H}
            rx={PANE_R}
            fill="var(--rp-rear)"
            fillOpacity={dim ? 0.28 : 0.55}
            stroke="var(--rp-rear)"
            strokeOpacity={dim ? 0.35 : 0.9}
            strokeWidth={1}
            transform={`rotate(-7 47 55.75) translate(${separated ? -3 : 0} ${separated ? 2 : 0})`}
          />
          {/* Middle pane: fanned clockwise, reaching up and right. */}
          <rect
            x={16}
            y={13}
            width={PANE_W}
            height={PANE_H}
            rx={PANE_R}
            fill="var(--rp-rear)"
            fillOpacity={dim ? 0.28 : 0.55}
            stroke="var(--rp-rear)"
            strokeOpacity={dim ? 0.35 : 0.9}
            strokeWidth={1}
            transform={`rotate(7 54 44.75) translate(${separated ? 2 : 0} ${separated ? -3 : 0})`}
          />
        </>
      ) : null}

      {/* The amber front pane, carrying the face. A single offset copy behind
          it gives the stack its depth - a hairline shadow, not a glass slab. */}
      <g>
        {variant === "full" ? (
          <path d={FRONT_PANE_PATH} fill="var(--rp-amber-edge)" opacity={dim ? 0.1 : 0.22} transform="translate(1.6 2)" />
        ) : null}
        <path
          d={FRONT_PANE_PATH}
          fill={dim ? "var(--rp-paper-chrome)" : `url(#${uid}-amber)`}
          stroke="var(--rp-amber-edge)"
          strokeWidth={state === "needs-decision" ? 2.2 : 1.1}
          strokeOpacity={state === "needs-decision" ? 0.95 : 0.7}
        />
        {state === "checking" ? (
          // One finite scan that has already settled: a static band at rest.
          // Reduced motion reaches this same end state because this IS the end
          // state - the band is drawn, not animated in place. It sits BELOW the
          // mouth: at PANE_H - 17 it landed on the mouth's own rows (70.8-78.4)
          // and read as a strike-through.
          <g clipPath={`url(#${uid}-front)`}>
            <rect x={PANE_X} y={PANE_Y + PANE_H - 8} width={PANE_W} height={4} fill="var(--rp-teal)" opacity={0.34} />
          </g>
        ) : null}
        <g color={dim ? "var(--rp-ink-muted)" : "#12303f"}>
          <Face state={state} />
        </g>
      </g>

      {/* Two tiny data marks at the right seam. They are decoration, never a
          second status source: no state is told by these squares alone. */}
      {variant === "full" ? (
        <>
          <rect x={118.3} y={50.3} width={6.8} height={6.8} rx={0.8} fill="var(--rp-mark-sage)" opacity={dim ? 0.4 : 1} />
          {state === "stopped" ? (
            <rect x={113} y={59.7} width={6.8} height={6.8} rx={0.8} fill="none" stroke="var(--rp-coral-line)" strokeWidth={2} />
          ) : state === "error" ? (
            <circle cx={116.4} cy={63.1} r={3.6} fill="none" stroke="var(--rp-coral-line)" strokeWidth={2} />
          ) : (
            <rect
              x={113}
              y={59.7}
              width={6.8}
              height={6.8}
              rx={0.8}
              fill={state === "working" ? "var(--rp-teal)" : "var(--rp-mark-amber)"}
              opacity={dim ? 0.4 : 1}
            />
          )}
        </>
      ) : null}
    </svg>
  );
}

/* ===================================================================== */
/* Board content - all synthetic                                          */
/* ===================================================================== */

type StateRow = {
  state: ProgramState;
  heading: string;
  truth: string;
  truthClass: string;
  glyph?: "stop" | "error" | "done";
  /**
   * The status word alone is not the whole written truth for every state. The
   * constitution requires STOPPED to carry its reason and next choice, and
   * ERROR to carry its plain-language effect and recovery. A board that showed
   * only the badge would be demonstrating a state Cairn is not allowed to ship.
   */
  consequence?: string;
  character: string;
  motion: string;
};

const STATE_ROWS: StateRow[] = [
  {
    state: "ready",
    heading: "Ready / idle",
    truth: "Ready",
    truthClass: "rp-truth-quiet",
    character: "Face D exactly as approved. Nothing is added at rest.",
    motion: "Static.",
  },
  {
    state: "thinking",
    heading: "Thinking / replying",
    truth: "Thinking",
    truthClass: "rp-truth-teal",
    character: "The closed eye opens to a small solid square; the smile relaxes to a short step. The rear panes separate by a hair.",
    motion: "One finite arrival, then still. Text is never held back for it.",
  },
  {
    state: "needs-decision",
    heading: "Needs owner / pushback",
    truth: "Needs decision",
    truthClass: "rp-truth-amber",
    character: "Two open outlined eyes with the right one lifted — the quizzical tilt of waiting for an answer — over a short mouth. Candid, not angry.",
    motion: "One finite amber emphasis on the front pane edge.",
  },
  {
    state: "working",
    heading: "Starting / working",
    truth: "Working · 1 approved task",
    truthClass: "rp-truth-teal",
    character: "Both eyes drop to level bars, looking down at the work. The lower data mark turns teal.",
    motion: "One dispatch pulse. No loop.",
  },
  {
    state: "checking",
    heading: "Checking",
    truth: "Checking",
    truthClass: "rp-truth-teal",
    character: "Two outlined eyes, the right one smaller, reading closely. One faint band rests low on the pane.",
    motion: "One finite scan that settles and stops.",
  },
  {
    state: "done",
    heading: "Done",
    truth: "Verified done",
    truthClass: "rp-truth-sage",
    glyph: "done",
    character: "Both eyes close into crescents; the approved stepped smile is unchanged. Contained satisfaction.",
    motion: "One settle. No confetti.",
  },
  {
    state: "stopped",
    heading: "Stopped",
    truth: "Stopped",
    truthClass: "rp-truth-coral",
    glyph: "stop",
    consequence: "I did not change anything. Work you had not saved was in the way. Save or set it aside and ask me again, or tell me to work somewhere else.",
    character: "Both eyes open and level, the mouth a full-width bar, a hollow square at the seam. Serious and attentive, never ashamed.",
    motion: "Static after one arrival.",
  },
  {
    state: "error",
    heading: "Error",
    truth: "Error",
    truthClass: "rp-truth-coral",
    glyph: "error",
    consequence: "Something broke on my side, so the task did not run and nothing was changed. Your project is exactly as you left it. Try again, and if it breaks the same way, tell me and I will stop rather than guess.",
    character: "Eyes narrow to upright bars and the stepped mouth inverts; the seam mark is a circle, not a square. Rueful, not menacing.",
    motion: "Static after one arrival.",
  },
  {
    state: "disconnected",
    heading: "Disconnected",
    truth: "Not connected",
    truthClass: "rp-truth-quiet",
    character: "Two level dashes and a short mouth on a drained pane. Dormant and available, not asleep.",
    motion: "Static.",
  },
];

const SWATCHES: { role: string; token: string; note: string; ink?: string }[] = [
  { role: "Dusty shell", token: "--rp-field", note: "one step darker than the mockup", ink: "--rp-ink" },
  { role: "Quiet chrome", token: "--rp-chrome", note: "measured #DBDCDD", ink: "--rp-ink" },
  { role: "Conversation paper", token: "--rp-paper", note: "measured #F6ECDC", ink: "--rp-ink" },
  { role: "Raised paper", token: "--rp-paper-raised", note: "measured #FBF4E7", ink: "--rp-ink" },
  { role: "Ink", token: "--rp-ink", note: "approved seed #15384B", ink: "--rp-paper" },
  { role: "Muted ink", token: "--rp-ink-muted", note: "derived for 4.5:1", ink: "--rp-paper" },
  // Each chip's specimen uses the SAME ink the system puts on that ground, not
  // a nearby paper token. Pointing them anywhere else made the teal chip
  // 4.31:1 in Light and the amber chip 1.48:1 in Dark - cream on light amber.
  { role: "Teal action", token: "--rp-teal", note: "approved seed #177F8C", ink: "--rp-on-teal" },
  { role: "Cairn amber", token: "--rp-amber", note: "approved seed #F0C65A", ink: "--rp-on-amber" },
  { role: "Owner apricot", token: "--rp-apricot", note: "measured #F7DBB9", ink: "--rp-apricot-ink" },
  { role: "Activity blue", token: "--rp-activity", note: "approved seed #D2E2E9", ink: "--rp-activity-ink" },
  { role: "Success sage", token: "--rp-sage", note: "approved seed #D9E4C9", ink: "--rp-sage-ink" },
  // The rule is #BF5F56, NOT the plan's seed #C86F67: the seed measured 3.03:1
  // and was replaced. Printing the rejected value here would show the owner a
  // colour the design does not use.
  { role: "Risk coral", token: "--rp-coral", note: "ink #9A453E, rule #BF5F56", ink: "--rp-coral-ink" },
];

function Swatch({ role, token, note, ink }: { role: string; token: string; note: string; ink?: string }) {
  return (
    <div className="rp-swatch">
      <div className="rp-swatch-chip" style={{ background: `var(${token})`, color: ink ? `var(${ink})` : undefined }}>
        Aa
      </div>
      <div className="rp-swatch-body">
        <div className="rp-swatch-role">{role}</div>
        <div className="rp-swatch-meta">{token}</div>
        <div className="rp-swatch-meta">{note}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- synthetic shell --- */

function ActivityCapsule({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rp-capsule">
      <span className="rp-capsule-mark" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
          <path d="M1 8h3l2-5 3 10 2-5h4" fill="none" stroke="var(--rp-teal-ink)" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
      <span className="rp-capsule-label">Working · 1 approved task</span>
      {compact ? null : <span className="rp-capsule-detail">Started 2 minutes ago</span>}
    </div>
  );
}

function SyntheticShell({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "rp-shell rp-comp-compact" : "rp-shell"}>
      {/* The rail carries navigation, not a second Cairn. There is exactly one
          Cairn mark in the chrome (the header) and one expressive presence in
          the conversation - never a third. */}
      <div className="rp-shell-rail">
        <svg className="rp-rail-glyph" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="12" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="1" y="12" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="12" y="12" width="7" height="7" rx="1.5" fill="currentColor" />
        </svg>
        <div className="rp-rail-chip">GL</div>
        <div className="rp-rail-spacer" />
        <svg className="rp-rail-glyph" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx="10" cy="10" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.6 3.2" />
        </svg>
      </div>
      <div className="rp-shell-main">
        <header className="rp-shell-header">
          <CairnProgram size={28} variant="mark" state="ready" />
          <span className="rp-wordmark">CAIRN</span>
          <span className="rp-header-rule" />
          <span className="rp-header-project">Garden Lab</span>
          <div className="rp-header-right">
            <span className="rp-pill">
              <span className="rp-pill-dot" />
              Connected · private
            </span>
          </div>
        </header>
        <div className="rp-shell-body">
          {/* The transcript scrolls; the activity capsule and the composer keep
              their natural size and never scroll out of sight, because what
              Cairn is doing right now must not be something you have to hunt
              for. */}
          <div className="rp-conversation rp-paper">
            <div className="rp-transcript">
              <p className="rp-owner-note">Can the workspace feel calmer?</p>
              <div className="rp-cairn-turn">
                <CairnProgram size={compact ? 64 : 78} state="working" />
                <p className="rp-cairn-prose">
                  Yes. I&rsquo;ll keep the conversation in front and bring the machinery forward only when it matters.
                </p>
              </div>
            </div>
            <ActivityCapsule compact={compact} />
          </div>
          <div className="rp-composer">
            <span className="rp-composer-placeholder">Talk with Cairn</span>
            <button type="button" className="rp-btn">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyntheticPhone() {
  return (
    <div className="rp-phone">
      <header className="rp-phone-header">
        <CairnProgram size={26} variant="mark" state="ready" />
        <span className="rp-wordmark" style={{ fontSize: 15 }}>
          CAIRN
        </span>
        <span className="rp-pill" style={{ marginLeft: "auto" }}>
          <span className="rp-pill-dot" />
          Live
        </span>
      </header>
      <div className="rp-phone-body">
        <p className="rp-owner-note" style={{ maxWidth: "100%" }}>
          Did the check pass?
        </p>
        <div className="rp-cairn-turn">
          <CairnProgram size={48} state="done" />
          <p className="rp-cairn-prose" style={{ fontSize: 16 }}>
            Yes — verified done. The contract mirror test is green again.
          </p>
        </div>
        <div className="rp-receipt">
          <div className="rp-card-head">
            <span className="rp-state-truth rp-truth-sage">
              <span className="rp-glyph rp-glyph-done" aria-hidden="true" />
              Verified done
            </span>
          </div>
          <p className="rp-small" style={{ margin: 0 }}>
            Cairn checked the commit and the test output itself.
          </p>
        </div>
      </div>
      <p className="rp-phone-foot">Read-only companion · on your home network · nothing leaves this house</p>
    </div>
  );
}

/* ===================================================================== */
/* The board                                                             */
/* ===================================================================== */

type ThemeChoice = "system" | "light" | "dark";

function ThemeControl({ value, onChange }: { value: ThemeChoice; onChange: (next: ThemeChoice) => void }) {
  return (
    <div className="rp-toggle" role="group" aria-label="Theme">
      {(["system", "light", "dark"] as ThemeChoice[]).map((choice) => (
        <button key={choice} type="button" aria-pressed={value === choice} onClick={() => onChange(choice)}>
          {choice === "system" ? "System" : choice === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}

function Board() {
  const [theme, setTheme] = React.useState<ThemeChoice>("system");
  // Remounting the program by key is what replays its one finite arrival.
  const [replays, setReplays] = React.useState(0);

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <main className="rp-board">
      <header style={{ marginBottom: 36 }}>
        <p className="rp-kicker">Cairn · visual constitution · Task 255</p>
        <h1>One small resident program, living in a calm desk</h1>
        <p className="rp-lede">
          Everything below is drawn in code from fixed synthetic text. There is no project, no connection, and no control
          that can apply, run, send, publish, or approve anything. This page is a proposal to look at, not a product to use.
        </p>
        <div className="rp-controls" style={{ marginTop: 18 }}>
          <ThemeControl value={theme} onChange={setTheme} />
          <span className="rp-small rp-muted">
            System follows your operating system. Light and Dark override it here only.
          </span>
        </div>
      </header>

      <section className="rp-section" aria-labelledby="rp-h-body">
        <header>
          <p className="rp-kicker">Already approved · judge fidelity only</p>
          <h2 id="rp-h-body">The resident program, at the sizes it will really be</h2>
          <p>
            Three offset rounded panes: two translucent teal panes fanned behind a warm amber front pane with its
            top-right corner clipped, a cyan seam pane at the lower left, and two tiny data marks at the right seam. The
            face is D — outlined square left eye, closed crescent right eye, lopsided stepped smile. One geometry draws
            every size below; nothing here is magnified, so this is exactly how big Cairn will be.
          </p>
        </header>
        <div className="rp-sizes">
          {[
            { size: 28, variant: "mark" as const, label: "28 px mark", note: "header and rail" },
            { size: 34, variant: "mark" as const, label: "34 px mark", note: "chrome" },
            { size: 64, variant: "full" as const, label: "64 px", note: "compact presence" },
            { size: 88, variant: "full" as const, label: "88 px", note: "conversational presence" },
          ].map((entry) => (
            <figure className="rp-size" key={entry.label} style={{ margin: 0 }}>
              <CairnProgram size={entry.size} variant={entry.variant} state="ready" />
              <figcaption>
                {entry.label}
                <span className="rp-size-note">{entry.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="rp-inline-note" style={{ marginTop: 16 }}>
          <b>Two implementation calls worth your eye.</b> First, the size number means the amber pane&rsquo;s height —
          how big Cairn actually looks — not the drawing&rsquo;s bounding box; measured against your mockup that is what
          makes 88 px the presence you approved. Second, below about 40 px the rear fan, the cyan seam pane and the data
          squares all turn to mud, so the small mark drops all three and keeps the pane, its clipped corner and the
          face. The two mark sizes above are that reduction.
        </div>
        <p className="rp-small rp-muted" style={{ marginTop: 14 }}>
          Cairn inhabits the surface that currently matters and is not stamped on every card. There is one expressive
          presence per screen; the header mark is chrome and never becomes a second status source.
        </p>
      </section>

      <section className="rp-section rp-decision" aria-labelledby="rp-h-states">
        <header>
          <span className="rp-decision-flag">Your decision</span>
          <h2 id="rp-h-states">Nine states, nine expressions — and the words that always carry the truth</h2>
          <p>
            These expressions have never been seen and are what Owner gate 1 is really for. Read each card as a pair: the
            written status is the truth, and the face only reinforces it. Cover the faces and every state still reads.
          </p>
        </header>
        <div className="rp-states">
          {STATE_ROWS.map((row) => (
            <article className="rp-state" key={row.state} data-rp-state={row.state}>
              <h3>{row.heading}</h3>
              <div className="rp-state-figure">
                <CairnProgram size={78} state={row.state} />
              </div>
              <span className={`rp-state-truth ${row.truthClass}`}>
                {row.glyph ? <span className={`rp-glyph rp-glyph-${row.glyph}`} aria-hidden="true" /> : null}
                {row.truth}
              </span>
              {row.consequence ? <p className="rp-state-consequence">{row.consequence}</p> : null}
              <p className="rp-state-rule">{row.character}</p>
              <p className="rp-state-rule">
                <b>Motion:</b> {row.motion}
              </p>
            </article>
          ))}
        </div>
        <div className="rp-inline-note" style={{ marginTop: 18 }}>
          Stopped and error never differ by colour alone. They differ by the word, by the mouth (level versus inverted),
          by the eyes (open squares versus upright bars), and by the seam mark (hollow square versus circle).
        </div>
      </section>

      <section className="rp-section" aria-labelledby="rp-h-palette">
        <header>
          <p className="rp-kicker">Already approved · judge fidelity only</p>
          <h2 id="rp-h-palette">The daylight palette</h2>
          <p>
            Measured from the approved mockup where the mockup had a value, and derived where the measured colour could
            not clear its contrast floor for the job it was doing. A test recomputes every ratio on this page from these
            same tokens, so this palette cannot quietly drift below the floor.
          </p>
        </header>
        <div className="rp-swatches">
          {SWATCHES.map((swatch) => (
            <Swatch key={swatch.token} {...swatch} />
          ))}
        </div>
      </section>

      <section className="rp-section" aria-labelledby="rp-h-type">
        <header>
          <h2 id="rp-h-type">Type, density, and controls</h2>
          <p>Bundled Quicksand only — 400 for prose, 600 for labels and controls, 700 kept for headings and decisive states.</p>
        </header>
        <div className="rp-type-sample rp-paper">
          <div className="rp-type-row">
            <span className="rp-type-tag">700 / 34px / 1.25</span>
            <span style={{ font: "700 34px/1.25 var(--rp-sans)" }}>One honest result</span>
          </div>
          <div className="rp-type-row">
            <span className="rp-type-tag">400 / 18px / 1.6 · 65–75ch</span>
            <p style={{ margin: 0, maxWidth: "68ch", font: "400 18px/1.6 var(--rp-sans)" }}>
              Long conversation prose sits at a comfortable regular weight and a measure you can read without losing your
              place, because most of what Cairn says is a paragraph and not a label.
            </p>
          </div>
          <div className="rp-type-row">
            <span className="rp-type-tag">600 / 15.5px — controls</span>
            <div className="rp-controls">
              <button type="button" className="rp-btn">
                Primary
              </button>
              <button type="button" className="rp-btn rp-btn-quiet">
                Quiet
              </button>
              <button type="button" className="rp-btn" aria-busy="true">
                Busy…
              </button>
              <button type="button" className="rp-btn" disabled>
                Disabled
              </button>
              <input className="rp-field-input" defaultValue="Editable field" aria-label="Sample field" />
            </div>
          </div>
          <div className="rp-type-row">
            <span className="rp-type-tag">mono — machine evidence only</span>
            <code className="rp-mono">docs/ai-work/tasks/255-brief.md · c4 · 8f3a19c</code>
          </div>
          <p className="rp-small rp-muted" style={{ margin: 0 }}>
            Every control above is at least 44×44 px. Tab through them to see the focus ring; it is drawn, not left to
            the browser.
          </p>
        </div>
      </section>

      <section className="rp-section" aria-labelledby="rp-h-sequence">
        <header>
          <h2 id="rp-h-sequence">One decision, carried to one result</h2>
          <p>
            A representative sequence in the new language: an owner note, a Cairn reply, a decision that needs the owner,
            the disclosure that must always precede a dispatch, live work, and the receipt at the end.
          </p>
        </header>
        <div className="rp-sequence rp-paper">
          <p className="rp-owner-note">Can you tidy the greeting file? It looks wrong on small screens.</p>

          <div className="rp-cairn-turn">
            <CairnProgram size={88} state="needs-decision" />
            <div>
              <p className="rp-cairn-prose">
                I can, but &ldquo;looks wrong&rdquo; could mean two different fixes and only one of them is safe to do
                without you. Before I dispatch anything I need you to pick.
              </p>
              <span className="rp-state-truth rp-truth-amber" style={{ marginTop: 8 }}>
                Needs decision
              </span>
            </div>
          </div>

          <div className="rp-decision-card">
            <div className="rp-card-head">
              <h3 className="rp-card-title">Send one task to a worker?</h3>
            </div>
            <dl className="rp-facts">
              <dt>Worker</dt>
              <dd>Synthetic worker (lab example — no real provider is contacted)</dd>
              <dt>Model</dt>
              <dd>example/none</dd>
              <dt>Data sent</dt>
              <dd>The task brief and the two files it names, from this project only</dd>
              <dt>Cost basis</dt>
              <dd>Example only — this page cannot spend anything</dd>
              <dt>If it goes wrong</dt>
              <dd>Nothing is applied without a commit you can undo; Cairn stops rather than guessing</dd>
            </dl>
            {/* Drawn to look like the real pair, but deliberately not controls:
                plain spans, no callback, no focus stop. A board must never
                offer an approval that could be mistaken for the real one. */}
            <div className="rp-controls">
              <span className="rp-btn rp-btn-inert">Approve · inert example</span>
              <span className="rp-btn rp-btn-quiet rp-btn-inert">Not now</span>
            </div>
          </div>

          <div className="rp-cairn-turn">
            <CairnProgram size={78} state="working" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="rp-cairn-prose" style={{ marginBottom: 12 }}>Dispatched. I&rsquo;ll check the result myself before I show it to you.</p>
              <ActivityCapsule />
            </div>
          </div>

          <div className="rp-receipt">
            <div className="rp-card-head">
              <span className="rp-state-truth rp-truth-sage">
                <span className="rp-glyph rp-glyph-done" aria-hidden="true" />
                Verified done
              </span>
              <h3 className="rp-card-title">The greeting file wraps at 390 px</h3>
            </div>
            <dl className="rp-facts">
              <dt>Cairn checked</dt>
              <dd>The commit exists, the named file changed, and the test the brief required passes.</dd>
              <dt>Worker claimed</dt>
              <dd>
                <span className="rp-claim">
                  <b>The worker&rsquo;s account, not verified by Cairn:</b> &ldquo;Rewrote the header grid and removed the
                  fixed width.&rdquo;
                </span>
              </dd>
              <dt>Milestone moved</dt>
              <dd>No — that stays your call.</dd>
            </dl>
            <div className="rp-cairn-turn" style={{ marginTop: 4 }}>
              <CairnProgram size={64} state="done" />
              <p className="rp-cairn-prose" style={{ fontSize: 16 }}>
                It holds at the size you complained about. I checked the commit and the test myself; the sentence about
                the header grid is the worker&rsquo;s word, not mine.
              </p>
            </div>
          </div>

          <div className="rp-receipt rp-receipt-stopped">
            <div className="rp-card-head">
              <span className="rp-state-truth rp-truth-coral">
                <span className="rp-glyph rp-glyph-stop" aria-hidden="true" />
                Stopped
              </span>
              <h3 className="rp-card-title">I did not change anything</h3>
            </div>
            <p className="rp-small" style={{ marginBottom: 10 }}>
              The same receipt in its other honest ending, so the two can be compared side by side.
            </p>
            <dl className="rp-facts">
              <dt>Why</dt>
              <dd>Work you had not saved was in the way, and moving it could have lost it.</dd>
              <dt>Your next choice</dt>
              <dd>Save or set aside that work, then ask me again — or tell me to work somewhere else.</dd>
            </dl>
          </div>
        </div>
      </section>

      <section className="rp-section rp-decision" aria-labelledby="rp-h-dark">
        <header>
          <span className="rp-decision-flag">Your decision</span>
          <h2 id="rp-h-dark">Dark: the same warm desk, after dusk</h2>
          <p>
            Not the retired night garden and not an inverted daylight theme. The paper is still the warmest, lightest
            thing in the frame — it is lit by a lamp, not switched off — and the shell recedes to a cool slate. Both
            islands below are shown at once so the two can be compared without switching anything.
          </p>
        </header>
        <div className="rp-pair">
          <div className="rp-island" data-rp-scheme="light">
            <h3>Light</h3>
            <div className="rp-cairn-turn" style={{ marginBottom: 14 }}>
              <CairnProgram size={78} state="ready" />
              <p className="rp-cairn-prose" style={{ fontSize: 16 }}>Ready when you are.</p>
            </div>
            <ActivityCapsule compact />
            <div className="rp-controls" style={{ marginTop: 14 }}>
              <button type="button" className="rp-btn">
                Send
              </button>
              <span className="rp-state-truth rp-truth-coral">
                <span className="rp-glyph rp-glyph-stop" aria-hidden="true" />
                Stopped
              </span>
            </div>
          </div>
          <div className="rp-island" data-rp-scheme="dark">
            <h3>Dark</h3>
            <div className="rp-cairn-turn" style={{ marginBottom: 14 }}>
              <CairnProgram size={78} state="ready" />
              <p className="rp-cairn-prose" style={{ fontSize: 16 }}>Ready when you are.</p>
            </div>
            <ActivityCapsule compact />
            <div className="rp-controls" style={{ marginTop: 14 }}>
              <button type="button" className="rp-btn">
                Send
              </button>
              <span className="rp-state-truth rp-truth-coral">
                <span className="rp-glyph rp-glyph-stop" aria-hidden="true" />
                Stopped
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rp-section rp-decision" aria-labelledby="rp-h-comps">
        <header>
          <span className="rp-decision-flag">Your decision</span>
          <h2 id="rp-h-comps">Wide, compact, and phone</h2>
          <p>
            The same components under less room — not a second design. Compact drops the project name and the activity
            detail, narrows the rail, and keeps Cairn present but smaller. The phone composition below is synthetic lab
            work; the shipped companion stays read-only and on your home network, and this page does not change it.
          </p>
        </header>
        <div className="rp-comps">
          <div className="rp-comp-frame">
            <p className="rp-comp-caption">Wide — the conversation is the whole object</p>
            {/* Held at its real wide width. On a narrow screen this frame
                scrolls; the page never does. */}
            <div className="rp-comp-scroll">
              <div style={{ height: 560, minWidth: 720 }}>
                <SyntheticShell />
              </div>
            </div>
          </div>
          <div className="rp-comp-frame" style={{ maxWidth: 760 }}>
            <p className="rp-comp-caption">Compact — supported minimum width</p>
            <div style={{ height: 480 }}>
              <SyntheticShell compact />
            </div>
          </div>
          <div className="rp-comp-frame" style={{ maxWidth: 390 }}>
            <p className="rp-comp-caption">Phone — synthetic composition, read-only</p>
            <div style={{ height: 520 }}>
              <SyntheticPhone />
            </div>
          </div>
        </div>
      </section>

      <section className="rp-section" aria-labelledby="rp-h-longcopy">
        <header>
          <h2 id="rp-h-longcopy">Long copy, machine evidence, and reduced motion</h2>
          <p>Nothing overflows its container, and nothing on this page needs motion to become readable.</p>
        </header>
        <div className="rp-longcopy">
          <p>
            A worker&rsquo;s account can be long, and a path can be longer than any column. Both stay inside the paper
            rather than pushing the page sideways, because a result you have to scroll horizontally to read is a result
            you will not read.
          </p>
          <code className="rp-mono">
            C:\Users\example\Desktop\WebApp Projects\AI Coding Workflow Framework\app\src\renderer\components\BuilderProposalReview.tsx
          </code>
        </div>
        <div className="rp-motion-demo">
          <div className="rp-motion-stage">
            <CairnProgram key={`arrive-${replays}`} size={78} state="done" animate />
            <span key={`settle-${replays}`} className="rp-state-truth rp-truth-sage rp-anim-settle">
              <span className="rp-glyph rp-glyph-done" aria-hidden="true" />
              Verified done
            </span>
          </div>
          <div>
            <h3>Nothing moves that you did not cause</h3>
            <p className="rp-small" style={{ marginBottom: 12 }}>
              The whole vocabulary is two finite primitives, both playing here: Cairn <b>arrives</b>, and the result
              <b> settles</b>. Every state&rsquo;s motion rule is one of those two, or nothing at all. There is no float,
              sheen, blink, ripple, or glitch loop anywhere, and text is never held back to be typed out.
            </p>
            <button type="button" className="rp-btn rp-btn-quiet" onClick={() => setReplays((n) => n + 1)}>
              Play the arrival once
            </button>
            <p className="rp-small rp-muted" style={{ marginTop: 12, marginBottom: 0 }}>
              With reduced motion on, that button lands Cairn in exactly the same place — it simply skips the travel.
              The end state is identical, never mid-flight, hidden, or waiting for an event that will not arrive.
            </p>
          </div>
        </div>
      </section>

      <footer className="rp-section" aria-labelledby="rp-h-gate">
        <h2 id="rp-h-gate">What Owner gate 1 is asking</h2>
        <ol className="rp-list">
          <li>
            <b>Fidelity</b> — is this the D body, the daylight palette, and the shell direction you already approved?
          </li>
          <li>
            <b>Expressions</b> — do the eight derived states read the way you want Cairn to read? These have never been
            seen before.
          </li>
          <li>
            <b>Dark</b> — is this the warm desk after dusk, or has it drifted?
          </li>
          <li>
            <b>Compact</b> — does Cairn stay present but small when the window narrows?
          </li>
        </ol>
        <p className="rp-small rp-muted" style={{ marginBottom: 0 }}>
          Nothing in the product has changed. This page is not reachable from the app, is absent from its bundles, and
          no production file was edited to build it.
        </p>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Board />
  </React.StrictMode>,
);
