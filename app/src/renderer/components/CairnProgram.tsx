import { useId } from "react";

/**
 * Cairn, drawn.
 *
 * A small resident software program: three offset rounded panes seen slightly
 * from the side, as if a few windows were stacked on a desk. Not a humanoid, an
 * animal, an orb, a robot or a conventional assistant avatar, and not a mascot
 * who appears on everything — there is ONE expressive presence per screen.
 *
 * Every coordinate below was measured from the owner-approved reference at
 * `docs/visual-reference/cairn-face-d-approved-2026-08-13.png` by classifying
 * pixels and reading edges, then converted into a unit space where the front
 * pane is 76 × 63.5. The conversion and the measurements are recorded in
 * `docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md`
 * section 3, and `tests-unit/cairnprogram.test.ts` compares this file against
 * that table so the drawing and the constitution cannot drift apart.
 *
 * Code-native by design: no raster asset, no asset pipeline, no dependency, and
 * the same component stays sharp from a 28 px brand mark to an 88 px presence.
 *
 * THE ART ANNOUNCES NOTHING. The SVG is `aria-hidden` and unfocusable and
 * carries no name, role or live region. Written language is the sole announced
 * truth of every state — cover every face and the product still reads.
 *
 * Task 258 (Slice 3) moved this out of Task 255's lab board, which now imports
 * it, so the owner-approved geometry is drawn in exactly one place.
 */

const VIEW = { x: 0, y: 3, w: 128, h: 94 };
/** The compact mark drops the rear fan and the data squares; see `variant`. */
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

/**
 * The measured constitution, exported so a test can compare it with the design
 * spec's own table instead of re-reading this file's arithmetic.
 */
export const CAIRN_GEOMETRY = {
  view: VIEW,
  markView: MARK_VIEW,
  pane: { x: PANE_X, y: PANE_Y, w: PANE_W, h: PANE_H, r: PANE_R, chamfer: CHAMFER },
  eyeLeft: EYE_L,
  eyeRight: EYE_R,
  mouthLeft: MOUTH_LEFT,
  /** Two posts and a wider bar strictly between them — a staircase, not a U. */
  mouth: {
    leftPost: { x: 65.9, y: 70.8, w: 3.8, h: 3.8 },
    bar: { x: 69.7, y: 74.9, w: 10.1, h: 3.5 },
    rightPost: { x: 79.8, y: 70.8, w: 4.1, h: 3.8 },
  },
  dataMarks: { sage: { x: 118.3, y: 50.3, s: 6.8 }, amber: { x: 113, y: 59.7, s: 6.8 } },
} as const;

export type CairnProgramState =
  | "ready"
  | "thinking"
  | "needs-decision"
  | "working"
  | "checking"
  | "done"
  | "stopped"
  | "error"
  | "disconnected";

/** Every state Cairn can be drawn in, in the constitution's own order. */
export const CAIRN_PROGRAM_STATES: readonly CairnProgramState[] = [
  "ready", "thinking", "needs-decision", "working",
  "checking", "done", "stopped", "error", "disconnected",
];

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

/** Each state's face, described once so the drawing and the spec cannot drift. */
function Face({ state }: { state: CairnProgramState }) {
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
      // closely. The pane carries one finite scan; see the body below.
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
 * right seam.
 *
 * `size` means the AMBER FRONT PANE's height — how big Cairn actually looks —
 * not the SVG's bounding box. Measured against the approved mockup that is the
 * honest reading: Cairn's pane there is roughly 90 px tall in a 1320 px window
 * and roughly 28 px in the header, which is exactly the 28–88 range the plan
 * names. Sizing by the bounding box would ship a Cairn a third smaller than the
 * one the owner approved.
 */
export function CairnProgram({
  state = "ready",
  size = 88,
  variant = "full",
  className,
  animate = false,
}: {
  state?: CairnProgramState;
  /** Height of the amber front pane in CSS pixels — Cairn's apparent size. */
  size?: number;
  /** "mark" drops the rear fan and data squares; below ~40 px they turn to mud. */
  variant?: "full" | "mark";
  className?: string;
  /** Play the one finite arrival. Reduced motion lands on the same end state. */
  animate?: boolean;
}) {
  const uid = useId().replace(/:/gu, "");
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
        <g color={dim ? "var(--rp-ink-muted)" : "var(--rp-face-ink)"}>
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
