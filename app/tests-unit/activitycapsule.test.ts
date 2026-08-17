import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityCapsule } from "../src/renderer/components/ActivityCapsule.js";
import {
  CAIRN_PRESENCE_STATES,
  resolveCairnPresence,
  type CairnPresence,
  type CairnPresenceState,
} from "../src/renderer/activity/presence.js";
import { hydrateActivityPresentation } from "../src/renderer/activity/presentation.js";
import type { RunSessionSnapshot } from "../src/shared/ipc.js";

/* ------------------------------------------------------------------------ *
 * Task 259, `c1`, `c2` and `c6` — the written activity capsule.
 *
 * What Cairn is doing right now must never be something the owner has to hunt
 * for, so this capsule keeps its natural size and stays on screen. It is also
 * the one place the resident program appears at conversational size, and it
 * announces exactly one thing.
 *
 * The capsule REPLACES the narrow-width status line's live region and the
 * Town header's spoken status. Those two existed at different widths and were
 * mutually exclusive by media query; this one exists at every width, which is
 * why the tests below insist there is exactly one of it.
 * ------------------------------------------------------------------------ */

function session(overrides: Partial<RunSessionSnapshot> = {}): RunSessionSnapshot {
  return {
    dir: "C:\\project",
    outcome: "Make Cairn say what is happening",
    adapterId: "codex-exec",
    conversationId: "conversation-1",
    worker: true,
    startedAt: "2026-08-16T12:00:00.000Z",
    activities: [{ stage: "Run", state: "working", detail: "Codex Exec is working." }],
    phase: "running",
    result: null,
    error: null,
    ...overrides,
  };
}

const quiet = hydrateActivityPresentation(null, null);
const working = hydrateActivityPresentation(session(), null);

function presenceFor(state: CairnPresenceState): CairnPresence {
  const base = { activity: quiet, needsOwner: false, connected: true };
  if (state === "needs-decision") return resolveCairnPresence({ ...base, needsOwner: true });
  if (state === "disconnected") return resolveCairnPresence({ ...base, connected: false });
  if (state === "ready") return resolveCairnPresence(base);
  // Every remaining state is a runtime truth; drive it through the real
  // projection rather than hand-building a presence object, so the capsule is
  // tested against values production can actually produce.
  const activity = { ...working, truth: state === "starting" ? "starting" : state } as typeof working;
  return resolveCairnPresence({ ...base, activity });
}

function draw(presence: CairnPresence): string {
  return renderToStaticMarkup(createElement(ActivityCapsule, { presence }));
}

/** Strip the SVG so text assertions cannot accidentally match the drawing. */
function withoutArt(markup: string): string {
  return markup.replace(/<svg[\s\S]*?<\/svg>/gu, "");
}

test("c3: every presence state puts its own words on screen", () => {
  const seen = new Map<string, CairnPresenceState>();
  for (const state of CAIRN_PRESENCE_STATES) {
    const presence = presenceFor(state);
    const text = withoutArt(draw(presence));
    assert.ok(text.includes(presence.status),
      `the capsule did not print the status for '${state}'`);
    const clash = seen.get(presence.status);
    assert.equal(clash, undefined, `'${state}' and '${clash}' print the same words`);
    seen.set(presence.status, state);
  }
  assert.equal(seen.size, CAIRN_PRESENCE_STATES.length);
});

test("c2: the words and the face come from the same resolved value", () => {
  // Not a source read: two different resolved values must move BOTH. If the
  // capsule ever recomputed the expression from anything else, one of these
  // would stay put.
  const ready = draw(presenceFor("ready"));
  const stopped = draw(presenceFor("stopped"));
  assert.notEqual(ready, stopped);

  const readyArt = ready.match(/<svg[\s\S]*?<\/svg>/u)?.[0] ?? "";
  const stoppedArt = stopped.match(/<svg[\s\S]*?<\/svg>/u)?.[0] ?? "";
  assert.ok(readyArt.length > 0 && stoppedArt.length > 0, "the capsule drew no Cairn at all");
  assert.notEqual(readyArt, stoppedArt, "the face did not change when the state did");
  assert.notEqual(withoutArt(ready), withoutArt(stopped), "the words did not change when the state did");
});

test("c2: the state and its tone are on the element, for the suites that read them", () => {
  for (const state of CAIRN_PRESENCE_STATES) {
    const presence = presenceFor(state);
    const markup = draw(presence);
    assert.match(markup, new RegExp(`data-rp-state="${presence.state}"`, "u"));
    assert.match(markup, new RegExp(`data-rp-tone="${presence.tone}"`, "u"));
  }
});

test("c6: exactly one live region, and it is not inside a button", () => {
  // `role="button"` has Children Presentational: True, so a live region nested
  // inside one has its role dropped and may never fire. The retired status line
  // put its region OUTSIDE the button for exactly this reason; the capsule has
  // no button at all, which settles it permanently.
  for (const state of CAIRN_PRESENCE_STATES) {
    const markup = draw(presenceFor(state));
    const regions = [...markup.matchAll(/aria-live="/gu)];
    assert.equal(regions.length, 1, `'${state}' rendered ${regions.length} live regions`);
    assert.match(markup, /aria-live="polite"/u);
    assert.match(markup, /aria-atomic="true"/u);
    assert.match(markup, /role="status"/u);
  }
});

test("c6: the capsule carries no control at all", () => {
  // The plan's words: a NON-INTERACTIVE written activity capsule. Nothing here
  // may be pressed, focused or dragged, which is also what makes it safe for
  // motion — no transform is ever applied to a container holding a control.
  for (const state of CAIRN_PRESENCE_STATES) {
    const markup = draw(presenceFor(state));
    for (const control of ["<button", "<a ", "<input", "<select", "<textarea",
      "tabindex", 'role="button"', "onclick"]) {
      assert.ok(!markup.toLowerCase().includes(control.toLowerCase()),
        `'${state}' rendered '${control}' inside a capsule that must not be interactive`);
    }
  }
});

test("c6: the art announces nothing, so covering it loses no truth", () => {
  for (const state of CAIRN_PRESENCE_STATES) {
    const art = draw(presenceFor(state)).match(/<svg[\s\S]*?<\/svg>/u)?.[0] ?? "";
    assert.match(art, /aria-hidden="true"/u, `'${state}' drew a Cairn the screen reader can reach`);
    assert.ok(!art.includes("aria-live"), `'${state}' put a live region inside the drawing`);
    assert.ok(!art.includes("<title"), `'${state}' gave the drawing a name`);
  }
});

test("c3: the detail is separable, because compact drops it", () => {
  // The activity DETAIL drops in compact; the activity STATE never does. That
  // is only safe if the two are different elements, so the media query can
  // reach one without the other.
  const withDetail = presenceFor("working");
  assert.notEqual(withDetail.detail, null);
  const markup = draw(withDetail);
  assert.match(markup, /class="rp-activity-detail"/u);
  assert.match(markup, /class="rp-activity-status"/u);
  assert.ok(withoutArt(markup).includes(String(withDetail.detail)));

  const noDetail = presenceFor("ready");
  assert.equal(noDetail.detail, null);
  assert.ok(!draw(noDetail).includes("rp-activity-detail"),
    "an empty detail element was rendered anyway, so compact would hide nothing");
});

test("c1: the capsule carries no Town, pond or villager vocabulary", () => {
  for (const state of CAIRN_PRESENCE_STATES) {
    const markup = draw(presenceFor(state)).toLowerCase();
    for (const retired of ["town", "pond", "villager", "tuck"]) {
      assert.ok(!markup.includes(retired),
        `'${state}' still says '${retired}' on a surface that retired it`);
    }
  }
});

const SOURCE = readFileSync(
  join(__dirname, "..", "..", "src", "renderer", "components", "ActivityCapsule.tsx"), "utf8");

test("c2: the capsule is handed a resolved presence and never resolves one itself", () => {
  // If the capsule could call the combiner, a caller could hand it one value
  // and let it compute another. It takes the answer; it does not ask again.
  assert.ok(!SOURCE.includes("resolveCairnPresence"),
    "the capsule resolves its own presence, so its caller's value and its own could differ");
  assert.ok(!/\bneedsOwner\b/u.test(SOURCE),
    "the capsule reads the needs-owner seam directly instead of the resolved state");
  assert.ok(!/\bconnected\b/u.test(SOURCE),
    "the capsule reads the connection directly instead of the resolved state");
});

test("c8: the capsule declares no perpetual motion", () => {
  assert.ok(!/infinite/u.test(SOURCE));
  assert.ok(!/setInterval|setTimeout|requestAnimationFrame/u.test(SOURCE),
    "the capsule drives its own clock, which is motion nobody caused");
});
