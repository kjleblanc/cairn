import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { RouteResult, WorkerDisclosure } from "@cairn/core";
import type { ConductorDelta, ConductorStatus, ConductorTurn, TaskBlock, TaskBlockConcern } from "../../shared/ipc";
import { cairn } from "../api";
import { BodyPill } from "../components/BodyPill";
import { ConnectCard } from "../components/ConnectCard";
import { DisclosureConfirm } from "../components/DisclosureConfirm";
import { Md } from "../components/Md";
import { Scene } from "../components/Scene";
import { TaskCard } from "../components/TaskCard";
import { Pill } from "../components/Ui";

/** Tracks one in-flight `send()`. `id` starts out as whatever conversation
 * it was sent against (possibly null, for a brand-new conversation whose id
 * isn't known yet) and is locked in the first time it's learned — from
 * whichever arrives first, the `conductor:send` response or a race-ahead
 * delta. Once locked, it never changes for this send. */
type InFlight = { id: string | null };

/** One dispatch the owner is deciding on, or has just started. `route` is
 * null until `taskRoute` answers (and stays null when it refuses, with the
 * plain reason in `error`); `disclosure` is null whenever the routed adapter
 * declares no real call to confirm — the offline demo, today. */
type Dispatch = {
  outcome: string;
  details: string;
  route: RouteResult | null;
  disclosure: WorkerDisclosure | null;
  phase: "confirm" | "running";
  error: string | null;
};

/** Layout A: the hillside is the room. The scene fills the window; the
 * conversation floats over it on solid (never translucent) cards.
 *
 * Dispatch happens here too. Once every concern chip on the proposed-task
 * card is answered or set aside, "Send to dispatch" opens a confirmation
 * panel in the conversation itself: the outcome and the owner's details,
 * verbatim, and — when the routed adapter declares a real call — the six
 * facts of that call with the same confirm box the task screen uses. Nothing
 * is retyped, nothing is re-derived from a sentence, and the request that
 * runs is the one the owner just read. */
export function Chat({ dir, onBack }: {
  dir: string;
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
  // The current proposed-task card, if the most recent reply with a task
  // block hasn't yet been replaced by a newer one. `taskBlockKey` changes
  // every time it's replaced, so `TaskCard` remounts with fresh chip state
  // instead of carrying over answers from the previous proposal.
  const [taskBlock, setTaskBlock] = useState<TaskBlock | null>(null);
  const [taskBlockKey, setTaskBlockKey] = useState(0);
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [realCallConfirmed, setRealCallConfirmed] = useState(false);
  // Names the dispatch a route lookup belongs to, so a slow answer for a
  // panel the owner already replaced can never land on the newer one.
  const dispatchToken = useRef(0);
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
      // Only a reply that carries a new task block replaces the card — a
      // plain reply (e.g. answering a question in ordinary prose) leaves
      // whatever card is already showing right where it is.
      if (event.taskBlock) {
        setTaskBlock(event.taskBlock);
        setTaskBlockKey((k) => k + 1);
      }
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

  // Unmounting mid-stream (e.g. navigating back to the dashboard) doesn't
  // stop the reply on its own — main keeps running it and holds the per-dir
  // lock until the reply finishes. `inFlightRef` is a ref, so this cleanup
  // always reads whatever was true at the moment of unmount, never a stale
  // render's value; stopping it here means the next screen's first send
  // never finds the lock still held.
  useEffect(() => () => {
    if (inFlightRef.current) void cairn.conductorStop(dir);
  }, [dir]);

  // Returns whether this call actually dispatched — appended the owner turn
  // and invoked `conductorSend` — as opposed to being refused outright
  // (empty text, or already streaming). The proposed-task card uses this to
  // decide whether a chip may mark itself resolved: a chip must never look
  // resolved for a message that never left the composer.
  async function send(text: string): Promise<boolean> {
    const trimmed = text.trim();
    if (!trimmed || streaming) return false;
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
    if (inFlightRef.current !== inFlight) return true; // superseded by "New conversation" or another send meanwhile — this call still dispatched
    if (!response.ok) { inFlightRef.current = null; setStreaming(false); setError(response.message); return false; } // main refused before persisting the owner turn — never reached the conductor
    if (inFlight.id === null) {
      // The response resolved before any delta raced ahead of it — adopt now.
      inFlight.id = response.value.conversationId;
      setConvId(response.value.conversationId);
    }
    return true;
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
    setTaskBlock(null);
    // A running dispatch belongs to the project, not to the conversation it
    // was started from, so it stays on screen; an undecided one goes with the
    // conversation that proposed it.
    setDispatch((current) => (current !== null && current.phase === "running" ? current : null));
    setRealCallConfirmed(false);
  }

  function onCardAnswer(_concern: TaskBlockConcern, answer: string): Promise<boolean> {
    return send(`About your question — ${answer}`);
  }

  function onCardSetAside(_concern: TaskBlockConcern): Promise<boolean> {
    return send("I understand the risk you raised — set it aside and keep the task as proposed.");
  }

  // "Send to dispatch": open the confirmation panel for BOTH parts of the
  // request at once, then ask main which adapter would take it and what it
  // would disclose. The panel shows immediately so the press is never
  // silent; the route fills in when it answers.
  function onCardSend(outcome: string, details: string): void {
    const token = dispatchToken.current + 1;
    dispatchToken.current = token;
    setRealCallConfirmed(false);
    setDispatch({ outcome, details, route: null, disclosure: null, phase: "confirm", error: null });
    void cairn.taskRoute(dir, outcome, details).then((response) => {
      if (dispatchToken.current !== token) return; // a newer dispatch replaced this one
      setDispatch((current) => (current === null ? null : {
        ...current,
        route: response.ok ? response.value.route : null,
        disclosure: response.ok ? response.value.disclosure ?? null : null,
        error: response.ok ? null : response.message,
      }));
    });
  }

  // The paid-call pause ends here. Everything the run receives — outcome,
  // details, the confirmed disclosure — is the panel's own state, so what
  // starts is what was on screen.
  async function startDispatch(request: Dispatch, adapterId: string, worker: boolean) {
    if (worker && !realCallConfirmed) return;
    setDispatch({ ...request, phase: "running", error: null });
    const response = await cairn.taskRun({
      dir,
      outcome: request.outcome,
      details: request.details,
      adapterId,
      realCallConfirmed: worker && realCallConfirmed,
      disclosure: request.disclosure ?? undefined,
      conversationId: conversationIdRef.current,
    });
    if (!response.ok) { setDispatch({ ...request, phase: "confirm", error: response.message }); return; }
    if (response.value.status === "connection-required") {
      setDispatch({ ...request, route: response.value.route, phase: "confirm", error: "Codex Exec readiness changed. No task records or model call were created." });
      return;
    }
    // The run's own records are on disk and its session stays readable on the
    // task screen until it is acknowledged there; the conversation-side
    // result relay is the next task's work.
    setDispatch(null);
    setRealCallConfirmed(false);
  }

  const lastReply = [...turns].reverse().find((t) => t.role === "cairn") ?? null;
  const dispatchRoute = dispatch?.route ?? null;
  const dispatchReady = dispatchRoute !== null && dispatchRoute.status === "ready" ? dispatchRoute : null;
  // A real worker lane is anything that is not the offline demo — a
  // capability check, never an adapter-id check, so a third adapter needs no
  // change here.
  const dispatchWorker = dispatchReady !== null && !dispatchReady.recommended.capabilities.includes("offline-demo");

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
              {taskBlock ? (
                <TaskCard key={taskBlockKey} block={taskBlock} busy={streaming}
                  onAnswer={onCardAnswer} onSetAside={onCardSetAside} onSend={onCardSend} />
              ) : null}
              {dispatch ? (
                <div className="card dispatch-panel">
                  <p className="card-title">dispatch this task</p>
                  <p className="dispatch-outcome">{dispatch.outcome}</p>
                  {dispatch.details ? (
                    <div className="task-card-details">
                      <p className="small muted task-card-details-label">Details (sent verbatim)</p>
                      <p className="task-card-details-text">{dispatch.details}</p>
                    </div>
                  ) : null}
                  {dispatch.phase === "running" ? (
                    <p className="small muted">Cairn is running this task. Its records land in this project's docs/ai-work.</p>
                  ) : (
                    <>
                      {dispatch.error ? <p className="dispatch-error">{dispatch.error}</p> : null}
                      {dispatchRoute === null && !dispatch.error ? <p className="small muted">Finding a route…</p> : null}
                      {dispatchRoute?.status === "connection-required" ? (
                        <>
                          <p>{dispatchRoute.reason}</p>
                          <p className="small muted">Install or connect Codex yourself through official Codex controls. Cairn does not open login, read credential files, or choose another provider.</p>
                        </>
                      ) : null}
                      {dispatchReady && dispatch.disclosure ? (
                        <DisclosureConfirm
                          disclosure={dispatch.disclosure}
                          label={dispatchReady.recommended.label}
                          confirmed={realCallConfirmed}
                          onConfirmedChange={setRealCallConfirmed}
                        />
                      ) : null}
                      <div className="row" style={{ marginTop: 12 }}>
                        {dispatchReady ? (
                          <Pill kind="primary" disabled={dispatchWorker && !realCallConfirmed}
                            onClick={() => void startDispatch(dispatch, dispatchReady.recommended.id, dispatchWorker)}>
                            {dispatchWorker ? `Start one real ${dispatchReady.recommended.label} call` : "Run offline demonstration"}
                          </Pill>
                        ) : null}
                        <Pill kind="quiet" onClick={() => { setDispatch(null); setRealCallConfirmed(false); }}>Cancel</Pill>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
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
