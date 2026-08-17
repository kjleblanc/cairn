import { CairnProgram } from "./CairnProgram";
import type { CairnPresence } from "../activity/presence";

/**
 * What Cairn is doing right now, in words.
 *
 * Task 259 (Slice 4). One small resident program, one written status, one
 * optional detail. The capsule keeps its natural size and never scrolls out of
 * sight, because what Cairn is doing must not be something the owner has to
 * hunt for.
 *
 * It is NON-INTERACTIVE by design. Nothing here can be pressed, focused or
 * dragged. That is a truth decision before it is a layout one: this surface
 * replaces a status line that was also a button and a world you could drag
 * villagers around, and a status that cannot be operated cannot be mistaken for
 * an action. It also makes the motion rule trivially safe — no transform is
 * ever applied to a container holding a control, because there is no control.
 *
 * IT RESOLVES NOTHING. The presence arrives already resolved, so the words and
 * the face here are the same value the rest of the app is reading. If this
 * component could call the combiner itself, its caller's answer and its own
 * could drift apart, which is the exact failure the combiner exists to prevent.
 *
 * The live region is the only one on the desk. The two it replaces — the
 * narrow-width status line's and the Town header's — existed at different
 * widths and were mutually exclusive by media query. This one exists at every
 * width, so there must be exactly one.
 */
export function ActivityCapsule({ presence }: { presence: CairnPresence }) {
  return (
    <div className={`rp-activity rp-activity-${presence.tone}`}
      data-rp-state={presence.state} data-rp-tone={presence.tone}>
      {/*
        * 44 px is the AMBER PANE's height, which is what `size` means. Above the
        * roughly 40 px where the rear fan and the data marks turn to mud, so the
        * full silhouette is legible — this is the one canonical expressive
        * presence, and reducing it to the chrome mark would leave the resident
        * program nowhere on screen at all.
        */}
      <CairnProgram state={presence.expression} size={44} />
      {/* One region, mounted with the capsule and never replaced: only its TEXT
        * changes. A region that appears already holding its message is the case
        * screen readers announce least reliably. */}
      <span className="rp-activity-words" role="status" aria-live="polite" aria-atomic="true">
        <span className="rp-activity-status">{presence.status}</span>
        {/* A separate element because compact drops the DETAIL and never the
          * state. One element carrying both could not be reached by half. */}
        {presence.detail ? <span className="rp-activity-detail">{presence.detail}</span> : null}
      </span>
    </div>
  );
}
