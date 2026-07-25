import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { RouteResult, WorkerDisclosure } from "@cairn/core";
import type { ConductorDelta, ConductorStatus, ConductorTurn, ResultCard, RunSessionSnapshot, TaskBlock, TaskBlockConcern } from "../../shared/ipc";
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

/** The run clock, as an owner would count it: m:ss since the run started. */
function elapsedSince(startedAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The one fixed sentence an ERROR card carries: the run threw, so nothing
 * about the workspace was verified and nothing may be claimed about it. */
const ERROR_SENTENCE = "Cairn could not verify the workspace. This run needs inspection before the next task.";

/**
 * The envelope's own turn in the conversation, rendered from the card's
 * structured fields and from nothing else. No sentence here comes from the
 * conversation model, and none is parsed back out of a written record.
 *
 * The split the whole card exists to hold: everything above "the worker's
 * account" is Cairn's own verification — Git's answer for what changed, the
 * real protected-work finding, the real commit result — and everything under
 * that heading is the WORKER's claim, labeled as one, never merged into the
 * verified lines.
 */
function ResultCardView({ card, onOpenRun }: { card: ResultCard; onOpenRun: () => void }) {
  const code = card.disposition === "ERROR" ? card.errorCode : card.stopReason;
  // A run with no task number wrote no records: the connection-required close
  // ends before a task number, a brief, or a log row exists. Such a card names
  // no files, no commit, and no route, because none were ever resolved.
  const wroteRecords = card.taskNumber !== null;
  const recordsPath = wroteRecords
    ? `docs/ai-work/tasks/${String(card.taskNumber).padStart(3, "0")}-report.md`
    : null;

  return (
    <div className="card result-card">
      <p className="card-title">result card — written by Cairn's runtime, not by the conversation</p>
      <p className="result-card-headline">
        <span className={`result-card-disposition result-card-${card.disposition.toLowerCase()}`}>{card.disposition}</span>
        {code ? <span className="result-card-code"> — {code}</span> : null}
        {wroteRecords ? <span className="result-card-task"> — Task {String(card.taskNumber).padStart(3, "0")}</span> : null}
      </p>

      {card.disposition === "ERROR" ? (
        <p className="result-card-sentence">{ERROR_SENTENCE}</p>
      ) : null}

      {card.disposition !== "ERROR" && !wroteRecords ? (
        <>
          {card.evidenceSummary ? <p className="result-card-sentence">{card.evidenceSummary}</p> : null}
          <p className="result-card-sentence">No task records or model call were created.</p>
        </>
      ) : null}

      {card.disposition !== "ERROR" && wroteRecords ? (
        <ul className="result-card-facts">
          {card.route ? <li>Route: {card.route.adapterLabel} — {card.route.provider} / {card.route.model}</li> : null}
          {card.protectedIntact !== null ? (
            <li>Protected starting work: {card.protectedIntact
              ? "byte-identical"
              : "CHANGED — the run stopped for this reason and the evidence was retained"}</li>
          ) : null}
          <li>
            Files changed (from Git, not from claims):
            {card.filesChanged.length === 0 ? " none" : (
              <ul className="result-card-files">
                {card.filesChanged.map((path) => <li key={path}><span className="mono">{path}</span></li>)}
              </ul>
            )}
          </li>
          <li>Commit: {card.commit ?? "none — stopped evidence is retained for inspection, never committed by Cairn"}</li>
          {/* Cairn's own disclosure that a worker touched Cairn's own owned
            * records and Cairn had to recover them. It is the loudest thing a
            * card can carry, so it is never abbreviated away. */}
          {card.recordRecovery ? <li className="result-card-recovery">{card.recordRecovery}</li> : null}
          {card.evidenceSummary ? <li>{card.evidenceSummary}</li> : null}
          {card.processFailure ? (
            <li>
              Process failure: <span className="mono">{card.processFailure.code}</span>. Raw run evidence stays on
              the owner&apos;s own disk at: {card.processFailure.debugPath
                ?? "unavailable (the local debug directory could not be created)"}. It is never committed to the
              repository.
            </li>
          ) : null}
        </ul>
      ) : null}

      {card.disposition !== "ERROR" && wroteRecords ? (
        <div className="result-card-claims">
          <p className="small muted result-card-claims-label">The worker&apos;s account (claims, not verified by Cairn)</p>
          {card.claims ? (
            <>
              <p className="result-card-claims-text">{card.claims.summary}</p>
              <p className="small muted">Milestone movement, as the worker claims it: {card.claims.milestone}</p>
            </>
          ) : (
            <p className="result-card-claims-text">The worker returned no readable claims block.</p>
          )}
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 12 }}>
        <Pill kind="quiet" onClick={onOpenRun}>Open the run screen</Pill>
      </div>
      <p className="small mono result-card-path">
        {recordsPath ?? "Any records this run retained are in this project's docs/ai-work."}
      </p>
    </div>
  );
}

/** Layout A: the hillside is the room. The scene fills the window; the
 * conversation floats over it on solid (never translucent) cards.
 *
 * Dispatch happens here too. Once every concern chip on the proposed-task
 * card is answered or set aside, "Send to dispatch" opens a confirmation
 * panel in the conversation itself: the outcome and the owner's details,
 * verbatim, and — when the routed adapter declares a real call — the six
 * facts of that call with the same confirm box the task screen uses. Nothing
 * is retyped, nothing is re-derived from a sentence, and the request that
 * runs is the one the owner just read.
 *
 * The run then stays visible here: a status strip carries its stage, its
 * clock, a stop control, and the way to the run screen, and the composer
 * says plainly that it is closed until the run finishes. */
export function Chat({ dir, onBack, onOpenRun }: {
  dir: string;
  onBack: () => void;
  onOpenRun: () => void;
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
  // The run this project has, if any: the same main-process session the run
  // screen reattaches to, read through the same two seams (`taskCurrent` and
  // `onTaskActivity`) — no new IPC, and a reload loses nothing.
  //
  // It is keyed to the PROJECT, not to the conversation that dispatched it,
  // because the gate it explains is keyed to the project too: main refuses
  // every send while any task runs for this dir (rungate's SERIAL_RUN_ACTIVE),
  // whichever conversation started it. A conversation-keyed strip would leave
  // a closed composer unexplained, with its stop control out of reach, after
  // "New conversation". Task 8's result cards stay conversation-keyed — those
  // post into the conversation whose id rode the run request.
  const [session, setSession] = useState<RunSessionSnapshot | null>(null);
  const [now, setNow] = useState(() => Date.now());
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

  const refreshSession = useCallback(async () => {
    setSession(await cairn.taskCurrent(dir));
  }, [dir]);

  // On mount, so a reload — or arriving from anywhere else — reattaches to a
  // run already in flight; and on every activity, so the strip moves with it.
  useEffect(() => { void refreshSession(); }, [refreshSession]);
  useEffect(() => cairn.onTaskActivity((event) => {
    if (event.dir !== dir) return;
    void refreshSession();
  }), [dir, refreshSession]);

  const runActive = session?.phase === "running";
  // While a run lives, the clock ticks and the snapshot is re-read once a
  // second. The re-read is what closes the run honestly for a renderer that
  // was reloaded mid-run and so holds no run promise of its own to await: a
  // thrown close (RECORD_VERIFICATION_FAILED) emits no Result activity at
  // all, and even an ordinary close is marked just AFTER the last activity
  // goes out. Without this, such a run would show as still running forever.
  useEffect(() => {
    if (!runActive) return;
    setNow(Date.now());
    const timer = setInterval(() => { setNow(Date.now()); void refreshSession(); }, 1000);
    return () => clearInterval(timer);
  }, [runActive, refreshSession]);

  useEffect(() => cairn.onConductorDelta((event: ConductorDelta) => {
    if (event.dir !== dir) return;

    // A result card is not part of any reply stream. It belongs to the ONE
    // conversation whose id rode the run request, so it is posted only while
    // that conversation is on screen — and it is handled before the in-flight
    // matching below so it can never adopt an id for a stream it has nothing
    // to do with. A card for another conversation is already on disk; opening
    // that conversation shows it.
    if (event.kind === "envelope") {
      if (event.turn && conversationIdRef.current === event.conversationId) {
        setTurns((t) => [...t, event.turn as ConductorTurn]);
      }
      return;
    }

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
  // (empty text, already streaming, or a task running, which main refuses at
  // the send gate). The proposed-task card uses this to decide whether a chip
  // may mark itself resolved: a chip must never look resolved for a message
  // that never left the composer.
  async function send(text: string): Promise<boolean> {
    const trimmed = text.trim();
    if (!trimmed || streaming || runActive) return false;
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
  //
  // The token is the same guard `onCardSend` uses, for the same reason: a run
  // takes a long time to answer, and a second dispatch opened meanwhile owns
  // the panel now. Without it, the first run's late answer would clear or
  // error-stamp a panel the owner is still reading.
  async function startDispatch(request: Dispatch, adapterId: string, worker: boolean) {
    if (worker && !realCallConfirmed) return;
    const token = dispatchToken.current + 1;
    dispatchToken.current = token;
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
    if (dispatchToken.current !== token) return; // a newer dispatch owns the panel now
    if (!response.ok) { setDispatch({ ...request, phase: "confirm", error: response.message }); return; }
    if (response.value.status === "connection-required") {
      setDispatch({ ...request, route: response.value.route, phase: "confirm", error: "Codex Exec readiness changed. No task records or model call were created." });
      void refreshSession(); // this close leaves a closed session too — the strip must not keep showing it as running
      return;
    }
    // The confirmation panel's work is done: the run's own records are on
    // disk, the status strip below carries its terminal state, and the
    // envelope posts its own result card into this conversation.
    setDispatch(null);
    setRealCallConfirmed(false);
    void refreshSession();
  }

  const lastReply = [...turns].reverse().find((t) => t.role === "cairn") ?? null;
  // The strip says only what the run itself said. While it runs, that is the
  // latest stage of the four (`Route | Run | Check | Result`) — "Starting"
  // until the first one arrives, which is a plainer truth than naming a stage
  // the run has not reached. When it closes, it is the run's own Result line
  // (`DONE — …` / `STOPPED — …`), or the thrown error when it never got one.
  //
  // The last resort claims NO facts about the filesystem. A close can happen
  // before any record exists: core returns connection-required from the route
  // itself (serial.ts:841), before a task number, a brief, or a log row, and
  // that session still stays closed-but-present for this strip to read. Saying
  // "its records are in docs/ai-work" there would invent three files and
  // contradict the panel above, which says none were created. The
  // readiness sentence is the one the run screen already uses for this close.
  const latestStage = session?.activities.at(-1)?.stage ?? null;
  const resultLine = session ? [...session.activities].reverse().find((a) => a.stage === "Result")?.detail ?? null : null;
  const terminalLine = session?.error
    ?? resultLine
    ?? (session?.result?.status === "connection-required"
      ? "Codex Exec readiness changed. No task records or model call were created."
      : "This task closed.");
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
              {turns.map((turn, i) => (turn.role === "envelope" ? (
                <ResultCardView key={i} card={turn.card} onOpenRun={onOpenRun} />
              ) : (
                <div key={i} className={`bubble ${turn.role === "owner" ? "bubble-owner" : "bubble-cairn"}`}>
                  {turn.role === "owner" ? turn.text : <Md text={turn.text} />}
                </div>
              )))}
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
            {session ? (
              <div className="run-strip">
                {/* ONE live region, mounted with the strip and never replaced:
                  * only its TEXT swaps, from the stage word to the terminal
                  * line. The announcement that matters most is how the run
                  * ended, and a region that appears already holding its
                  * message is the case screen readers announce least
                  * reliably — so this element outlives the change it carries.
                  * The clock stays outside it: a polite region wrapped around
                  * a value that changes every second would read itself aloud
                  * once a second. */}
                <span className={`run-strip-state ${session.phase === "running" ? "run-strip-stage" : "run-strip-terminal"}`} role="status">
                  {session.phase === "running" ? latestStage ?? "Starting" : terminalLine}
                </span>
                {session.phase === "running" ? (
                  <span className="run-strip-elapsed">{elapsedSince(session.startedAt, now)}</span>
                ) : null}
                <span className="run-strip-outcome">{session.outcome}</span>
                <span className="run-strip-controls">
                  {session.phase === "running" ? (
                    <Pill kind="quiet" onClick={() => void cairn.taskCancel(dir)}>Stop this task</Pill>
                  ) : null}
                  <Pill kind="quiet" onClick={onOpenRun}>Open the run screen</Pill>
                </span>
              </div>
            ) : null}
            {runActive ? (
              <p className="small muted composer-closed">A task is running. The composer reopens when it finishes.</p>
            ) : null}
            <div className="chat-composer">
              <textarea value={composer} onChange={(e) => setComposer(e.target.value)}
                onKeyDown={onComposerKeyDown} placeholder="Talk with Cairn" rows={2} disabled={streaming || runActive} />
              <Pill kind="primary" onClick={() => void send(composer)} disabled={streaming || runActive || !composer.trim()}>Send</Pill>
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
