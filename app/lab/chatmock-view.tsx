/**
 * Chat-in-the-scene mockup view (Task 136): the REAL town square (same
 * TownSquare the workspace ships, driven by the lab's mock bridge) with
 * three prototype conversation treatments floating over it. Everything here
 * is throwaway — whichever treatment the owner picks gets rebuilt properly
 * in the shell. Loaded by chatmock.tsx only after the mock bridge exists.
 *
 * Treatments:
 *   A — villager bubble: the conversation is a dialog anchored to Cairn's
 *       node, tail and all; tucked, it's a one-line chip floating by Cairn.
 *   B — rising drawer: the conversation rises from the bottom of the scene
 *       like an AC dialog box; tucked, it's a slim bar with Cairn's face.
 *   C — side companion: the conversation floats in from the left edge over
 *       a gently dimmed scene; tucked, Cairn peeks from a thin tab.
 */
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ConductorStreamSnapshot, RunSessionSnapshot, TownPoint } from "../src/shared/ipc";
import { cairn } from "../src/renderer/api";
import { TownSquare } from "../src/renderer/components/TownSquare";

const DIR = "C:\\lab\\garden-lab";

type Treatment = "bubble" | "drawer" | "companion";

const TREATMENTS: { id: Treatment; label: string; hint: string }[] = [
  { id: "bubble", label: "A · villager bubble", hint: "dialog anchored to Cairn, tail and all" },
  { id: "drawer", label: "B · rising drawer", hint: "conversation rises from the bottom like AC" },
  { id: "companion", label: "C · side companion", hint: "chat floats in from the left edge" },
];

/** The same three lines in every treatment, so only the frame changes. */
function SampleConversation() {
  return (
    <>
      <div className="bubble bubble-cairn">The recipe page lists all three now — want the search box next?</div>
      <div className="bubble bubble-owner">Yes — and make it forgive my typos.</div>
      <div className="bubble bubble-cairn">Typos forgiven. One question first: should search also read the notes field?</div>
    </>
  );
}

function SampleComposer() {
  return (
    <div className="chat-composer chatmock-composer">
      <textarea rows={1} placeholder="Talk to Cairn…" readOnly />
      <button type="button" className="pill pill-primary">Send</button>
    </div>
  );
}

function TreatmentLayer({ treatment, open, onTuck, onExpand }: {
  treatment: Treatment; open: boolean; onTuck: () => void; onExpand: () => void;
}) {
  if (treatment === "bubble") {
    return open ? (
      <div className="chatmock-bubble-dialog" role="dialog" aria-label="Conversation with Cairn">
        <div className="chatmock-dialog-head">
          <strong>Cairn</strong>
          <button type="button" onClick={onTuck} aria-label="Tuck the conversation away">tuck away ↘</button>
        </div>
        <div className="chatmock-dialog-body"><SampleConversation /></div>
        <SampleComposer />
      </div>
    ) : (
      <button type="button" className="chatmock-bubble-chip" onClick={onExpand}
        aria-label="Open the conversation with Cairn">
        <span className="chatmock-chip-text">…should search also read the notes field?</span>
      </button>
    );
  }
  if (treatment === "drawer") {
    return open ? (
      <div className="chatmock-drawer" role="dialog" aria-label="Conversation with Cairn">
        <div className="chatmock-dialog-head">
          <strong>Cairn</strong>
          <button type="button" onClick={onTuck} aria-label="Tuck the conversation away">settle down ↓</button>
        </div>
        <div className="chatmock-dialog-body chatmock-drawer-body"><SampleConversation /></div>
        <SampleComposer />
      </div>
    ) : (
      <button type="button" className="chatmock-drawer-bar" onClick={onExpand}
        aria-label="Open the conversation with Cairn">
        <span className="chatmock-mini-face" aria-hidden="true">◠</span>
        <span className="chatmock-chip-text">Cairn asked: should search also read the notes field?</span>
        <span aria-hidden="true">↑</span>
      </button>
    );
  }
  return (
    <>
      {open ? <div className="chatmock-companion-dim" aria-hidden="true" /> : null}
      {open ? (
        <div className="chatmock-companion" role="dialog" aria-label="Conversation with Cairn">
          <div className="chatmock-dialog-head">
            <strong>Cairn</strong>
            <button type="button" onClick={onTuck} aria-label="Tuck the conversation away">tuck away ←</button>
          </div>
          <div className="chatmock-dialog-body"><SampleConversation /></div>
          <SampleComposer />
        </div>
      ) : (
        <button type="button" className="chatmock-companion-tab" onClick={onExpand}
          aria-label="Open the conversation with Cairn">
          <span className="chatmock-mini-face" aria-hidden="true">◠</span>
          <span className="chatmock-tab-label">talk</span>
        </button>
      )}
    </>
  );
}

function ChatMock() {
  const [treatment, setTreatment] = useState<Treatment>("bubble");
  const [open, setOpen] = useState(true);
  const [task, setTask] = useState<RunSessionSnapshot | null>(null);
  const [stream, setStream] = useState<ConductorStreamSnapshot | null>(null);
  const [positions, setPositions] = useState<Record<string, TownPoint>>({});

  useEffect(() => {
    void cairn.taskCurrent(DIR).then(setTask);
    void cairn.conductorCurrent(DIR).then(setStream);
    void cairn.townLoad(DIR).then((response) => { if (response.ok) setPositions(response.value.positions); });
  }, []);

  return (
    <div className="chatmock-stage">
      <div className="chatmock-town">
        <TownSquare projectName="Garden Lab (mock)" task={task} stream={stream}
          positions={positions} onPositionsChange={setPositions}
          onFocusChat={() => setOpen(true)} onOpenRun={() => undefined} />
      </div>

      <TreatmentLayer treatment={treatment} open={open}
        onTuck={() => setOpen(false)} onExpand={() => setOpen(true)} />

      {/* Lab chrome — deliberately dashed and amber so it can never be
          mistaken for app UI. */}
      <div className="chatmock-chrome" role="group" aria-label="Mock controls">
        <span className="chatmock-chrome-tag">mock</span>
        {TREATMENTS.map((t) => (
          <button key={t.id} type="button" title={t.hint}
            className={treatment === t.id ? "active" : ""}
            onClick={() => { setTreatment(t.id); setOpen(true); }}>
            {t.label}
          </button>
        ))}
        <button type="button" className="chatmock-chrome-state" onClick={() => setOpen(!open)}>
          {open ? "tuck" : "talk"}
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<ChatMock />);
