import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (file: string) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", file), "utf8");
const component = renderer(join("components", "EvidenceAlbum.tsx"));
const chat = renderer(join("screens", "Chat.tsx"));
const css = renderer("app.css");
const motion = renderer("motion.css");

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector} is missing`);
  return css.slice(start, css.indexOf("}", start));
}

test("checked pictures are the first content in an eligible result card", () => {
  const card = chat.indexOf('<div className="card result-card">');
  const evidence = chat.indexOf("<ResultEvidence", card);
  const title = chat.indexOf('<p className="card-title">result card', card);
  assert.ok(card !== -1 && evidence > card && title > evidence,
    "the result card does not lead with its checked pictures");
  assert.match(chat, /<ResultEvidence dir=\{dir\} runId=\{card\.evidenceRunId\} \/>/);
});

test("Chat accepts only a matching minimally valid terminal-paint refresh", () => {
  assert.match(chat, /window\.addEventListener\("cairn:task-session-refresh", onRefresh\)/);
  assert.match(chat, /detail\.dir !== dir/);
  assert.match(chat, /session\.dir !== detail\.dir/);
  assert.match(chat, /session\.phase !== "running" && session\.phase !== "closed"/);
  assert.match(chat, /!Array\.isArray\(session\.activities\)/);
  assert.match(chat, /detail\.session === null \|\| detail\.session\.phase !== "running"[\s\S]*?current\?\.phase === "running" \? \{ \.\.\.current, phase: "settling" \} : current/,
    "the terminal paint barrier does not retain a non-actionable busy sentinel");
  assert.match(chat, /const taskBusy = runActive \|\| dispatch\?\.phase === "running" \|\| captureSettling/);
  assert.match(chat, /dispatch && dispatch\.phase !== "settling"/,
    "the hidden settling sentinel still renders a dispatch panel");
  assert.match(chat, /disabled=\{taskBusy \|\| restoringConversation\}/,
    "the composer can reopen while terminal evidence is being captured");
  assert.match(chat, /disabled=\{restoringConversation \|\| captureSettling\}[\s\S]*?New conversation/,
    "New conversation can replace the stage during terminal evidence capture");
});

test("a card accepts only its exact trusted run and no empty evidence chrome", () => {
  assert.match(component, /result\.value\.selectedRunId !== runId/);
  assert.match(component, /candidate\.trusted && candidate\.runId === runId/);
  assert.match(component, /if \(!runId \|\| images\.length === 0\) return null;/);
  assert.match(component, /image\.trusted/);
  assert.match(component, /image\.role === "before"/);
  assert.match(component, /image\.role === "after"/);
  assert.match(component, /entry\.pair\?\.beforeId/);
  assert.match(component, /entry\.pair\?\.afterId/);
  assert.match(component, /Before the worker started/);
  assert.match(component, /After the task settled/);
});

test("all image bytes come through opaque evidenceImage IDs", () => {
  assert.match(component, /cairn\.evidenceImage\(dir, metadata\.id\)/);
  assert.match(component, /cairn\.evidenceImage\(dir, image\.id\)/);
  assert.match(component, /IntersectionObserver/,
    "album images no longer wait until they approach the viewport");
  assert.ok(!component.includes("file://"));
  assert.ok(!component.includes("shots/"));
  assert.ok(!component.includes(".path"));
  assert.ok(!/\bprovider\b/i.test(component));
  assert.ok(!/\bphone\b/i.test(component));
});

test("the card pair shares wide space, one image fills it, and narrow stacks", () => {
  assert.match(rule(".result-evidence-grid"), /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(rule(".result-evidence-grid-single"), /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 1260px\)[\s\S]*?\.result-evidence-grid,[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/,
    "the approved 1260px breakpoint does not stack the evidence pair");
});

test("the local album distinguishes current, earlier checked, and legacy review pictures", () => {
  assert.match(component, /title="This run"/);
  assert.match(component, /"Earlier checked pictures"/);
  assert.match(component, /"Other checked pictures"/);
  assert.match(component, /title="Past review shots"/);
  assert.match(component, /They are not checked evidence for this run\./);
  assert.match(component, /album\?\.selectedRunId === selectedRunId/);
  assert.match(component, /The pictures for this result are no longer available\./);
  assert.match(component, /aria-current=\{selected \? "true" : undefined\}/);
  assert.match(component, /<Overlay label="local picture album"/);
  assert.match(component, /createPortal\(/,
    "the fixed album would be clipped inside the transformed conversation without a portal");
  assert.match(component, /base\.setAttribute\("inert", ""\)/);
  assert.match(component, /base\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(component, /album\.nextCursor/);
  assert.match(component, /evidenceAlbum\(dir, selectedRunId, cursor\)/);
  assert.match(component, /Load older pictures/);
  assert.match(component, /aria-disabled=\{loadingOlder \|\| !album\.nextCursor\}/);
  assert.match(component, /All older pictures are open/);
  assert.match(css, /\.pill\[aria-disabled="true"\][\s\S]*?cursor:\s*default;[\s\S]*?transform:\s*none/);
  assert.match(component, /\.catch\(\(\) => setOlderError\(true\)\)/);
  assert.match(component, /role="status">Cairn couldn&apos;t open the older pictures/);
  assert.ok(!component.includes("Opening older picturesâ€¦"));
});

test("the evidence UI adds no travel and the reused overlay stops for reduced motion", () => {
  const evidenceCss = css.slice(css.indexOf("/* Task 173:"), css.indexOf("/* The push flow."));
  assert.ok(!/animation\s*:|transition\s*:/.test(evidenceCss));
  assert.match(motion, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.overlay-card, \.overlay-scrim[\s\S]*?animation: none/);
});
