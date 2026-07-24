import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ConductorDelta, ConductorStatus, ConductorTurn } from "../../shared/ipc";
import { cairn } from "../api";
import { BodyPill } from "../components/BodyPill";
import { ConnectCard } from "../components/ConnectCard";
import { Md } from "../components/Md";
import { Scene } from "../components/Scene";
import { Pill } from "../components/Ui";

/** Tracks one in-flight `send()`. `id` starts out as whatever conversation
 * it was sent against (possibly null, for a brand-new conversation whose id
 * isn't known yet) and is locked in the first time it's learned — from
 * whichever arrives first, the `conductor:send` response or a race-ahead
 * delta. Once locked, it never changes for this send. */
type InFlight = { id: string | null };

/** Layout A: the hillside is the room. The scene fills the window; the
 * conversation floats over it on solid (never translucent) cards.
 *
 * `onOpenTask` is part of this screen's contract for the proposed-task card
 * that a later task wires in (nothing in this screen calls it yet — no
 * `cairn-task` block is parsed or rendered here). */
export function Chat({ dir, onOpenTask: _onOpenTask, onBack }: {
  dir: string;
  onOpenTask: (prefill: string) => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<ConductorStatus | null>(null);
  const [stones, setStones] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConductorTurn[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [composer, setComposer] = useState("");
  const [lastOwnerText, setLastOwnerText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const streamingRef = useRef("");
  const endRef = useRef<HTMLDivElement | null>(null);
  // Mirrors `conversationId` for synchronous reads inside the delta handler
  // (a `useEffect` closure over React state can be stale between renders).
  const conversationIdRef = useRef<string | null>(null);
  // The conversation the currently in-flight send belongs to, or null when
  // nothing is in flight. Deltas that match neither this nor the displayed
  // conversation are from an abandoned stream and are ignored outright.
  const inFlightRef = useRef<InFlight | null>(null);

  const setConvId = useCallback((id: string | null) => {
    conversationIdRef.current = id;
    setConversationId(id);
  }, []);

  const refreshStatus = useCallback(async () => {
    setStatus(await cairn.conductorStatus());
  }, []);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);
  useEffect(() => {
    void cairn.projectStatus(dir).then((r) => { if (r.ok) setStones(r.value.stones); });
  }, [dir]);

  // Resume the newest conversation on mount (conversations sort oldest-first).
  useEffect(() => {
    if (!status?.connected) return;
    void cairn.conductorConversations(dir).then((list) => {
      const newest = list.at(-1);
      if (!newest) return;
      setConvId(newest.id);
      void cairn.conductorTurns(dir, newest.id).then(setTurns);
    });
  }, [status?.connected, dir, setConvId]);

  useEffect(() => cairn.onConductorDelta((event: ConductorDelta) => {
    if (event.dir !== dir) return;

    const inFlight = inFlightRef.current;
    const matchesCurrent = conversationIdRef.current !== null && event.conversationId === conversationIdRef.current;
    const matchesInFlightKnown = inFlight !== null && inFlight.id !== null && event.conversationId === inFlight.id;
    const matchesInFlightUnknown = inFlight !== null && inFlight.id === null;
    if (!matchesCurrent && !matchesInFlightKnown && !matchesInFlightUnknown) return; // an abandoned stream — ignore, never adopt its id

    if (matchesInFlightUnknown && inFlight) {
      // The first event for a brand-new conversation just revealed its real id.
      inFlight.id = event.conversationId;
      setConvId(event.conversationId);
    }

    if (event.kind === "delta") {
      streamingRef.current += event.text ?? "";
      setStreamingText(streamingRef.current);
      return;
    }
    if (event.kind === "done") {
      streamingRef.current = "";
      setStreamingText("");
      setStreaming(false);
      inFlightRef.current = null;
      if (event.turn) setTurns((t) => [...t, event.turn as ConductorTurn]);
      return;
    }
    // A provider error or a manual stop, both delivered as {kind:"error"}. Any
    // partial reply already captured is echoed as a stopped-early bubble —
    // matching what main persisted on abort — so nothing visible vanishes.
    setStreaming(false);
    inFlightRef.current = null;
    const partial = streamingRef.current;
    streamingRef.current = "";
    setStreamingText("");
    if (partial) {
      setTurns((t) => [...t, { role: "cairn", text: `${partial}\n\n(stopped early)`, ts: new Date().toISOString() }]);
    }
    setError(event.message ?? "Cairn had a problem answering.");
  }), [dir, setConvId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [turns, streamingText]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);
    setComposer("");
    setLastOwnerText(trimmed);
    setTurns((t) => [...t, { role: "owner", text: trimmed, ts: new Date().toISOString() }]);
    setStreaming(true);
    streamingRef.current = "";
    setStreamingText("");

    const startingId = conversationIdRef.current;
    const inFlight: InFlight = { id: startingId };
    inFlightRef.current = inFlight;

    const response = await cairn.conductorSend({ dir, conversationId: startingId, text: trimmed });
    if (inFlightRef.current !== inFlight) return; // superseded by "New conversation" or another send meanwhile
    if (!response.ok) { inFlightRef.current = null; setStreaming(false); setError(response.message); return; }
    if (inFlight.id === null) {
      // The response resolved before any delta raced ahead of it — adopt now.
      inFlight.id = response.value.conversationId;
      setConvId(response.value.conversationId);
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(composer);
    }
  }

  async function newConversation() {
    if (streaming) {
      // Stop the abandoned stream before clearing state, so it can't keep
      // running against a conversation the screen no longer shows.
      await cairn.conductorStop(dir);
    }
    inFlightRef.current = null;
    setConvId(null);
    setTurns([]);
    streamingRef.current = "";
    setStreamingText("");
    setStreaming(false);
    setError(null);
  }

  const lastReply = [...turns].reverse().find((t) => t.role === "cairn") ?? null;

  return (
    <div className="chat-screen">
      <div className="chat-scene"><Scene fill stones={stones} justAdded={false} /></div>
      <div className={`chat-column${status?.connected ? "" : " chat-column-static"}`}>
        <div className="row spread chat-topbar">
          <Pill kind="quiet" onClick={onBack}>← Project home</Pill>
          {status?.connected ? (
            <BodyPill status={status} lastReply={lastReply}
              onModelSaved={(model) => setStatus((s) => (s ? { ...s, model } : s))}
              onDisconnected={() => { void newConversation(); void refreshStatus(); }} />
          ) : null}
        </div>

        {status === null ? <p className="muted">Getting ready…</p> : null}
        {status && !status.connected ? <ConnectCard onConnected={() => void refreshStatus()} /> : null}

        {status?.connected ? (
          <>
            <div className="chat-messages">
              {turns.map((turn, i) => (
                <div key={i} className={`bubble ${turn.role === "owner" ? "bubble-owner" : "bubble-cairn"}`}>
                  {turn.role === "owner" ? turn.text : <Md text={turn.text} />}
                </div>
              ))}
              {streaming ? (
                <div className="bubble bubble-cairn">
                  <Md text={streamingText || "…"} />
                  <div className="row" style={{ marginTop: 8 }}>
                    <Pill kind="quiet" onClick={() => void cairn.conductorStop(dir)}>Stop</Pill>
                  </div>
                </div>
              ) : null}
              {error ? (
                <div className="bubble bubble-system">
                  <p>{error}</p>
                  <Pill kind="quiet" onClick={() => void send(lastOwnerText)}>Try again</Pill>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
            <div className="chat-composer">
              <textarea value={composer} onChange={(e) => setComposer(e.target.value)}
                onKeyDown={onComposerKeyDown} placeholder="Talk with Cairn" rows={2} disabled={streaming} />
              <Pill kind="primary" onClick={() => void send(composer)} disabled={streaming || !composer.trim()}>Send</Pill>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <Pill kind="quiet" onClick={() => void newConversation()}>New conversation</Pill>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
