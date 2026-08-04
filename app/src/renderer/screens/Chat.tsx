import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { RouteResult, WorkerDisclosure } from "@cairn/core";
import type { ConductorDelta, ConductorStatus, ConductorTurn, PushPreview, PushResult, ResultCard, RunSessionSnapshot, TaskBlock, TaskBlockConcern } from "../../shared/ipc";
import { codeInPlainWords } from "../../shared/stopwords";
import { cairn } from "../api";
import { BodyPill } from "../components/BodyPill";
import { ConnectCard } from "../components/ConnectCard";
import { DisclosureConfirm } from "../components/DisclosureConfirm";
import { ResultEvidence } from "../components/EvidenceAlbum";
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

/** One dispatch the owner is deciding on, has started, or is in the short
 * main-owned terminal-picture barrier. `route` is
 * null until `taskRoute` answers (and stays null when it refuses, with the
 * plain reason in `error`); `disclosure` is null whenever the routed adapter
 * declares no real call to confirm — the offline demo, today. */
type Dispatch = {
  outcome: string;
  details: string;
  route: RouteResult | null;
  disclosure: WorkerDisclosure | null;
  phase: "confirm" | "running" | "settling";
  error: string | null;
};

type TaskSessionRefreshDetail = { dir: string; session: RunSessionSnapshot | null };

/** Main dispatches this one local DOM event immediately before terminal
 * evidence capture. Treat its detail as unknown: only the project identity and
 * the small session spine Chat actually needs are accepted. */
function taskSessionRefreshDetail(event: Event): TaskSessionRefreshDetail | null {
  if (!(event instanceof CustomEvent) || typeof event.detail !== "object" || event.detail === null) return null;
  const detail = event.detail as { dir?: unknown; session?: unknown };
  if (typeof detail.dir !== "string") return null;
  if (detail.session === null) return { dir: detail.dir, session: null };
  if (typeof detail.session !== "object" || detail.session === null) return null;
  const session = detail.session as Partial<RunSessionSnapshot>;
  if (session.dir !== detail.dir || typeof session.outcome !== "string" || typeof session.startedAt !== "string" ||
      (session.phase !== "running" && session.phase !== "closed") || !Array.isArray(session.activities)) return null;
  return { dir: detail.dir, session: session as RunSessionSnapshot };
}

/**
 * The push flow — the one place in this screen that writes to the world
 * outside this machine.
 *
 * It is deliberately TWO presses, and the second one is not a formality. The
 * contract's concrete risk boundaries require that immediately before writing
 * to an external service, the owner is shown the exact target, effect, likely
 * exposure, and recovery plan, and approves that exact action. The chip is
 * only the nudge; the confirmation IS that pause; the press on the
 * confirmation is the approval. One press that both disclosed and published
 * would satisfy neither half of the rule.
 *
 * `preview` is refreshed from git when the chip is pressed, so the facts the
 * owner approves are the facts at the moment of approval — never a snapshot
 * taken when the card landed, which a commit made meanwhile would have
 * silently outgrown.
 */
type PushFlow = {
  preview: PushPreview;
  /** `opening` and `pushing` are the two awaits, held as states so neither
   * control can be pressed twice. `nothing` and `gone` are the two honest
   * answers when the press-time re-read finds no push left to make, and they
   * are separate because they know different things: `nothing` still has a
   * remote to name, `gone` has lost the upstream and may not claim otherwise. */
  phase: "chip" | "opening" | "confirm" | "pushing" | "settled" | "nothing" | "gone";
  result: PushResult | null;
};

/** The two sentences the confirmation must carry, fixed here because they are
 * the disclosure itself: what the write exposes, and what can and cannot be
 * undone afterward. */
const PUSH_PUBLICATION = "Pushing publishes these saved snapshots. If your project is public, anyone can see them.";
const PUSH_RECOVERY = "You can undo a pushed snapshot with a new one, but the publishing itself can't be taken back.";

/** A plain count of local commits, whatever their origin — the word "verified"
 * never appears near it, because the envelope has not verified the owner's own
 * commits and never claims to. Singular when one, since "1 commits" would be
 * Cairn miscounting out loud. */
function commitCount(n: number): string {
  return `${n} ${n === 1 ? "commit" : "commits"}`;
}

function aheadPhrase(ahead: number): string {
  return `${commitCount(ahead)} ahead`;
}

function sameTaskBlock(a: TaskBlock | null, b: TaskBlock | null): boolean {
  if (a === null || b === null) return a === b;
  return a.outcome === b.outcome && a.notes === b.notes && a.details === b.details &&
    a.concerns.length === b.concerns.length &&
    a.concerns.every((concern, i) => concern.kind === b.concerns[i].kind && concern.text === b.concerns[i].text);
}

/** Saved history may resolve after a live done/envelope event was already
 * appended. Merge the two ordered views without duplicating the exact turn
 * main both persisted and emitted. */
function mergeSavedTurns(saved: readonly ConductorTurn[], current: readonly ConductorTurn[]): ConductorTurn[] {
  const merged = [...saved];
  const present = new Set(saved.map((turn) => JSON.stringify(turn)));
  for (const turn of current) {
    const key = JSON.stringify(turn);
    if (present.has(key)) continue;
    present.add(key);
    merged.push(turn);
  }
  return merged;
}

function appendTurnOnce(turns: readonly ConductorTurn[], turn: ConductorTurn): ConductorTurn[] {
  const key = JSON.stringify(turn);
  return turns.some((current) => JSON.stringify(current) === key) ? [...turns] : [...turns, turn];
}

/**
 * The chip, the pause, and the outcome — one element at a time, under the
 * DONE card that prompted it. Nothing here is routed through the conductor:
 * the model is never told a chip exists, is never asked whether to push, and
 * never sees the result.
 */
/** What the flow has to say once the press has resolved, or null while it
 * still has nothing to announce. Kept out of the render body so the live
 * region below has exactly one source. */
function pushAnnouncement(flow: PushFlow): string | null {
  // The in-progress line belongs in the region too, not beside it: without it
  // there is silence between the press and the outcome of the one irreversible
  // action on this screen, which is the stretch a listener most needs narrated.
  if (flow.phase === "pushing") {
    return "Pushing now — one plain git push, no retries, no forcing.";
  }
  if (flow.phase === "settled" && flow.result) {
    return flow.result.ok ? flow.result.summary : flow.result.message;
  }
  if (flow.phase === "nothing") {
    return `This project is no longer ahead of ${flow.preview.remote}. Nothing was pushed.`;
  }
  // Deliberately says less than the sentence above: the re-read found no
  // upstream at all, so the previous preview's remote may no longer be this
  // branch's remote, and claiming "no longer ahead of origin" would assert
  // something Cairn just stopped being able to check.
  if (flow.phase === "gone") {
    return "This branch isn't linked to an online copy anymore, so nothing was pushed.";
  }
  return null;
}

function PushFlowView({ flow, onOpen, onApprove, onDecline }: {
  flow: PushFlow;
  onOpen: () => void;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const { preview, result } = flow;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const announcement = pushAnnouncement(flow);
  const gitsOwnWords = flow.phase === "settled" && result !== null && !result.ok && result.kind === "other";

  // Pressing the chip removes the focused button from the DOM. Without this,
  // focus falls to <body> and a keyboard owner has to tab from the top of the
  // document to reach the two controls of the pause — on the one surface whose
  // whole purpose is that the pause is reached before the write.
  useEffect(() => {
    if (flow.phase === "confirm") panelRef.current?.focus();
  }, [flow.phase]);

  return (
    <div className="push-flow">
      {flow.phase === "chip" || flow.phase === "opening" ? (
        <div className="push-chip">
          <Pill kind="soft" disabled={flow.phase === "opening"} onClick={onOpen}>
            This project is {aheadPhrase(preview.ahead)} of {preview.remote}. Push?
          </Pill>
        </div>
      ) : null}

      {flow.phase === "confirm" || flow.phase === "pushing" ? (
        // `tabIndex={-1}` makes the panel focusable by script without adding it
        // to the tab order; the heading is its accessible name.
        <div className="card push-confirm" ref={panelRef} tabIndex={-1} role="group" aria-labelledby="push-confirm-title">
          <p className="card-title" id="push-confirm-title">before this push</p>
          <ul className="push-confirm-facts">
            <li>Target: {preview.remote} — <span className="mono">{preview.url}</span></li>
            <li>Branch: <span className="mono">{preview.branch}</span></li>
            {/* The COUNT leads, and the subjects follow as git's own answer.
              * `pushPreview` drops empty lines from `log --format=%s`, so a
              * commit with an empty message leaves the list shorter than the
              * count — the count is what cannot understate the effect. */}
            <li>
              Effect: this push publishes {commitCount(preview.ahead)}. Their subjects, as git reports them:
              <ul className="push-confirm-subjects">
                {preview.subjects.map((subject, i) => <li key={i}>{subject}</li>)}
              </ul>
              {preview.subjects.length !== preview.ahead ? (
                <span className="small muted">Git reported {preview.subjects.length} of these {preview.ahead} subjects; a commit with an empty message has none to report.</span>
              ) : null}
            </li>
          </ul>
          <p className="push-confirm-sentence">{PUSH_PUBLICATION}</p>
          <p className="push-confirm-sentence">{PUSH_RECOVERY}</p>
          <div className="row" style={{ marginTop: 12 }}>
            <Pill kind="primary" disabled={flow.phase === "pushing"} onClick={onApprove}>Push</Pill>
            <Pill kind="quiet" disabled={flow.phase === "pushing"} onClick={onDecline}>Not now</Pill>
          </div>
        </div>
      ) : null}

      {/* ONE live region, mounted with the flow and never replaced: only its
        * CONTENT swaps, from empty to the outcome of the one irreversible
        * action this screen can take. Same reason as the run strip's region
        * (Task 065): a region that appears already holding its message is the
        * case screen readers announce least reliably, so this element outlives
        * the change it carries. It is empty and zero-height until there is
        * something true to say, and only then does it take the card styling. */}
      <div className={`push-outcome${announcement === null ? "" : " card"}`} role="status">
        {announcement === null ? null : (
          <>
            <p className="card-title">the push</p>
            <p className="push-outcome-text">{announcement}</p>
            {/* Task 073 carried this forward: the `other` bucket appends git's
              * own first stderr line, which can carry a local absolute path. It
              * is kept — a real error in git's own words beats a falsely
              * generic sentence — but it is labeled here, so nothing in it
              * reads as Cairn's own account of what happened. */}
            {gitsOwnWords ? (
              <p className="small muted">The line above ends with git&apos;s own error message, quoted exactly as git said it.</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/** The run clock, as an owner would count it: m:ss since the run started. */
function elapsedSince(startedAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The one fixed sentence an ERROR card carries: the run threw, so nothing
 * about the workspace was verified and nothing may be claimed about it. */
const ERROR_SENTENCE = "Cairn couldn't check your project, so nothing here is verified. Best to look at what happened before starting the next task.";

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
function ResultCardView({ card, dir, onOpenRun }: { card: ResultCard; dir: string; onOpenRun: () => void }) {
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
      <ResultEvidence dir={dir} runId={card.evidenceRunId} />
      <p className="card-title">result card — checked by Cairn, not written by the AI chat</p>
      <p className="result-card-headline">
        <span className={`result-card-disposition result-card-${card.disposition.toLowerCase()}`}>{card.disposition}</span>
        {code ? <span className="result-card-said"> — {codeInPlainWords(code)}</span> : null}
        {wroteRecords ? <span className="result-card-task"> — Task {String(card.taskNumber).padStart(3, "0")}</span> : null}
      </p>
      {/* The code is kept — it is real, and useful to anyone debugging — but it
          is no longer the first thing the owner meets. */}
      {code ? <p className="result-card-code">Code: {code}</p> : null}

      {card.disposition === "ERROR" ? (
        <p className="result-card-sentence">{ERROR_SENTENCE}</p>
      ) : null}

      {card.disposition !== "ERROR" && !wroteRecords ? (
        <>
          {card.evidenceSummary ? <p className="result-card-sentence">{card.evidenceSummary}</p> : null}
          <p className="result-card-sentence">No task was started, nothing was saved, and no AI was called.</p>
        </>
      ) : null}

      {card.disposition !== "ERROR" && wroteRecords ? (
        <ul className="result-card-facts">
          {card.route ? <li>Who did the work: {card.route.adapterLabel} — {card.route.provider} / {card.route.model}</li> : null}
          {card.protectedIntact !== null ? (
            <li>Your starting work: {card.protectedIntact
              ? "untouched"
              : "CHANGED — the task stopped because of this, and the evidence was kept"}</li>
          ) : null}
          <li>
            Files changed (checked with Git, not taken on faith):
            {card.filesChanged.length === 0 ? " none" : (
              <ul className="result-card-files">
                {card.filesChanged.map((path) => <li key={path}><span className="mono">{path}</span></li>)}
              </ul>
            )}
          </li>
          <li>Saved snapshot (commit): {card.commit ?? "none — when a task stops, Cairn keeps the evidence for you but never saves it into your project's history"}</li>
          {/* Cairn's own disclosure that a worker touched Cairn's own owned
            * records and Cairn had to recover them. It is the loudest thing a
            * card can carry, so it is never abbreviated away. */}
          {card.recordRecovery ? <li className="result-card-recovery">{card.recordRecovery}</li> : null}
          {card.evidenceSummary ? <li>{card.evidenceSummary}</li> : null}
          {card.processFailure ? (
            <li>
              The task process failed: <span className="mono">{card.processFailure.code}</span>. The raw evidence
              stays on your own computer at: {card.processFailure.debugPath
                ?? "unavailable (the folder for it could not be created)"}. It is never added to your project's
              saved history.
            </li>
          ) : null}
        </ul>
      ) : null}

      {card.disposition !== "ERROR" && wroteRecords ? (
        <div className="result-card-claims">
          <p className="small muted result-card-claims-label">Worker&apos;s account — Cairn checked the files above, but not these descriptions</p>
          {card.claims ? (
            <>
              <h3 className="result-card-section-title">What was done</h3>
              <p className="result-card-claims-text">{card.claims.summary}</p>
              {Array.isArray(card.claims.changes) && card.claims.changes.length > 0 ? (
                <ul className="result-card-detail-list">
                  {card.claims.changes.map((change, index) => <li key={`${index}-${change}`}>{change}</li>)}
                </ul>
              ) : null}
              <h3 className="result-card-section-title">What was checked</h3>
              {Array.isArray(card.claims.checks) && card.claims.checks.length > 0 ? (
                <ul className="result-card-detail-list">
                  {card.claims.checks.map((check, index) => <li key={`${index}-${check.name}`}><strong>{check.name}:</strong> {check.result}</li>)}
                </ul>
              ) : <p className="result-card-claims-text">No checks were reported.</p>}
              <h3 className="result-card-section-title">What to do next</h3>
              <p className="result-card-claims-text">{card.claims.howToTry || "No trial steps were reported."}</p>
              <h3 className="result-card-section-title">What still needs your judgment</h3>
              <p className="result-card-claims-text">{card.claims.limitations || "The worker reported no remaining limitations."}</p>
              <p className="small muted result-card-milestone">Milestone moved (worker&apos;s answer): {card.claims.milestone}</p>
            </>
          ) : (
            <p className="result-card-claims-text">The worker didn&apos;t leave a readable summary of what it did.</p>
          )}
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 12 }}>
        <Pill kind="quiet" onClick={onOpenRun}>Open the run screen</Pill>
      </div>
      <p className="small mono result-card-path">
        {recordsPath ?? "Anything this run kept is in your project's docs/ai-work folder."}
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
export function Chat({ dir, onBack, onOpenRun, embedded = false, focusSignal = 0, initialComposer = "", onNeedsYouChange }: {
  dir: string;
  onBack: () => void;
  onOpenRun: () => void;
  embedded?: boolean;
  focusSignal?: number;
  /** Task 160: words carried in once (a checkup suggestion) — read only at
   * mount, so later re-renders and project switches never re-seed them. */
  initialComposer?: string;
  /** Decision 9: the narrow window's status line turns amber when a decision
   * is waiting. That signal is Task 155's, computed below; this publishes it
   * rather than letting a second component work it out again. */
  onNeedsYouChange?: (needsYou: boolean) => void;
}) {
  const [status, setStatus] = useState<ConductorStatus | null>(null);
  const [stones, setStones] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [restoringConversation, setRestoringConversation] = useState(true);
  const [turns, setTurns] = useState<ConductorTurn[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);
  // The envelope's comment on a result card, while it streams (Task 153).
  // Main holds the stream lock for it exactly like an owner's reply, but the
  // renderer did not start it — so without this state it accumulated
  // invisibly: the composer looked ready while every send was refused.
  const [commentary, setCommentary] = useState(false);
  const [composer, setComposer] = useState(initialComposer);
  // Villager bubble (Task 146): tucked, the dialog collapses to a one-line
  // chip floating by Cairn's node.
  const [tucked, setTucked] = useState(false);
  // Queue instead of bounce (Task 155): messages sent while Cairn is
  // answering — or while the envelope's comment streams — wait here, each
  // visible with its own take-back, and flush in order the moment the stream
  // lock frees. Renderer-only and ephemeral, like the composer's text: a
  // reload or a screen change drops whatever was waiting.
  const [pending, setPending] = useState<string[]>([]);
  // Fold away the past (Task 155): every result card but the newest collapses
  // to a one-line chip. This set holds the turn indices the owner has opened;
  // the newest card is always expanded and never listed here.
  const [openedCards, setOpenedCards] = useState<ReadonlySet<number>>(new Set());
  const [lastOwnerText, setLastOwnerText] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The current proposed-task card, if the most recent reply with a task
  // block hasn't yet been replaced by a newer one. `taskBlockKey` changes
  // every time it's replaced, so `TaskCard` remounts with fresh chip state
  // instead of carrying over answers from the previous proposal.
  const [taskBlock, setTaskBlock] = useState<TaskBlock | null>(null);
  const [taskBlockKey, setTaskBlockKey] = useState(0);
  // Main's conversation/proposal reads are asynchronous. If a live proposal or
  // result arrives while they are in flight, that event is newer and must win
  // rather than being overwritten when the older snapshot resolves.
  const taskBlockVersionRef = useRef(0);
  const taskBlockRef = useRef<TaskBlock | null>(null);
  // Guards the whole asynchronous conversation restore, not just its proposal:
  // a send or accepted delta owns newer conversation/turn state and an older
  // mount snapshot may only merge history into that state, never replace it.
  const conversationVersionRef = useRef(0);
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
  // The push nudge under the newest DONE card, or null when there is nothing
  // to offer. One flow at a time, because one project has one branch to push.
  const [pushFlow, setPushFlow] = useState<PushFlow | null>(null);
  // Guards the one real write: a second press while `git push` is still
  // running would be a second push, and Cairn runs exactly the one the owner
  // approved. A ref, not state, so the guard is true the instant it is set.
  const pushRunning = useRef(false);
  // Names the dispatch a route lookup belongs to, so a slow answer for a
  // panel the owner already replaced can never land on the newer one.
  const dispatchToken = useRef(0);
  const streamingRef = useRef("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
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

  const applyTaskBlock = useCallback((next: TaskBlock | null) => {
    const changed = !sameTaskBlock(taskBlockRef.current, next);
    taskBlockRef.current = next;
    setTaskBlock(next);
    if (changed && next !== null) setTaskBlockKey((key) => key + 1);
  }, []);

  /** Re-read the proposal main still considers actionable. This is used after
   * a dispatch/result because that event may belong to an older card while a
   * newer proposal is already current. */
  const reconcileProposal = useCallback(async (id: string): Promise<void> => {
    const requestedAt = taskBlockVersionRef.current;
    const restored = await cairn.conductorProposal(dir, id);
    if (conversationIdRef.current !== id || taskBlockVersionRef.current !== requestedAt) return;
    taskBlockVersionRef.current += 1;
    applyTaskBlock(restored);
  }, [dir, applyTaskBlock]);

  // Villager bubble (Task 146): an explicit "talk" intent from the shell —
  // the rail, Cairn's node, or the dashboard's Talk button — untucks the
  // dialog and focuses the composer.
  useEffect(() => {
    if (!focusSignal) return;
    setTucked(false);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }, [focusSignal]);

  const refreshStatus = useCallback(async () => {
    setStatus(await cairn.conductorStatus());
  }, []);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);
  useEffect(() => {
    void cairn.projectStatus(dir).then((r) => { if (r.ok) setStones(r.value.stones); });
  }, [dir]);

  // Resume the live conversation when one exists, otherwise the newest saved
  // conversation. The stream belongs to main and to this project, not to this
  // component's mount lifetime: switching projects may unmount Chat without
  // cancelling a reply, and returning reattaches to its accumulated text.
  useEffect(() => {
    if (!status?.connected) { setRestoringConversation(false); return; }
    let live = true;
    const restoreVersion = conversationVersionRef.current;
    const proposalVersion = taskBlockVersionRef.current;
    setRestoringConversation(true);
    void (async () => {
      try {
        const [stream, list] = await Promise.all([
          cairn.conductorCurrent(dir),
          cairn.conductorConversations(dir),
        ]);
        if (!live || conversationVersionRef.current !== restoreVersion) return;
        const id = stream?.conversationId ?? list.at(-1)?.id ?? null;
        if (id === null) return;

        // Adopt the id before the slower history reads. A done delta that lands
        // during those reads now matches this conversation instead of falling
        // through an empty ref. The version guard above prevents this adoption
        // if newer local state already won meanwhile.
        setConvId(id);
        if (stream?.kind === "reply") {
          inFlightRef.current = { id };
          streamingRef.current = stream.text;
          setStreamingText(stream.text);
          setStreaming(true);
        } else if (stream?.kind === "commentary") {
          streamingRef.current = stream.text;
          setStreamingText(stream.text);
          setCommentary(true);
        }

        const [saved, restored] = await Promise.all([
          cairn.conductorTurns(dir, id),
          cairn.conductorProposal(dir, id),
        ]);
        // Close the small gap where the initial stream snapshot said "live"
        // but its done event reached the renderer before the id was adopted.
        const latestStream = await cairn.conductorCurrent(dir);
        if (!live || conversationIdRef.current !== id) return;
        if (conversationVersionRef.current !== restoreVersion) {
          // A live event already appended newer state. Bring the older saved
          // history in behind it without erasing or duplicating that event.
          setTurns((current) => mergeSavedTurns(saved, current));
          void reconcileProposal(id);
          return;
        }

        setTurns(saved);
        if (taskBlockVersionRef.current === proposalVersion) applyTaskBlock(restored);
        if (latestStream?.conversationId === id && latestStream.kind === "reply") {
          inFlightRef.current = { id };
          streamingRef.current = latestStream.text;
          setStreamingText(latestStream.text);
          setStreaming(true);
          setCommentary(false);
        } else if (latestStream?.conversationId === id && latestStream.kind === "commentary") {
          // A reload mid-comment reattaches the same way, minus the in-flight
          // bookkeeping: this stream was never this screen's send (Task 153).
          inFlightRef.current = null;
          streamingRef.current = latestStream.text;
          setStreamingText(latestStream.text);
          setStreaming(false);
          setCommentary(true);
        } else {
          inFlightRef.current = null;
          streamingRef.current = "";
          setStreamingText("");
          setStreaming(false);
          setCommentary(false);
        }
      } finally {
        if (live) setRestoringConversation(false);
      }
    })();
    return () => { live = false; };
  }, [status?.connected, dir, setConvId, applyTaskBlock, reconcileProposal]);

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
  useEffect(() => {
    const onRefresh = (event: Event) => {
      const detail = taskSessionRefreshDetail(event);
      if (!detail || detail.dir !== dir) return;
      setSession(detail.session);
      // Main sends this exact closed snapshot before its two-frame evidence
      // barrier. Hide the matching in-flight panel in the same event turn, but
      // retain a non-actionable busy sentinel until taskRun resolves. Otherwise
      // the spent proposal and enabled composer can reappear inside the very
      // terminal picture that is meant to show the settled result.
      if (detail.session === null || detail.session.phase !== "running") {
        setDispatch((current) => current?.phase === "running" ? { ...current, phase: "settling" } : current);
        setRealCallConfirmed(false);
      }
    };
    window.addEventListener("cairn:task-session-refresh", onRefresh);
    return () => window.removeEventListener("cairn:task-session-refresh", onRefresh);
  }, [dir]);

  const runActive = session?.phase === "running";
  // The dispatch panel knows synchronously that this Chat started a run;
  // main's shared session snapshot arrives a beat later. Treat both windows as
  // the same serial gate so no spent card or composer remains clickable.
  const captureSettling = dispatch?.phase === "settling";
  const taskBusy = runActive || dispatch?.phase === "running" || captureSettling;
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
        conversationVersionRef.current += 1;
        setTurns((turns) => appendTurnOnce(turns, event.turn as ConductorTurn));
        // Ask main what remains actionable instead of blindly clearing: this
        // result may belong to an older confirmation while a newer proposal is
        // already current in the same conversation.
        void reconcileProposal(event.conversationId);
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

    // Any accepted live event is newer than a mount-time conversation/history
    // snapshot still in flight. Restore may merge older saved history later,
    // but it may not replace this state.
    conversationVersionRef.current += 1;

    if (event.kind === "delta") {
      // A delta for this conversation that no send of ours started is the
      // envelope's comment: make it visible (Task 153). Main runs at most
      // one stream per project, so this never overlaps an owner's reply.
      if (event.turnKind === "commentary") setCommentary(true);
      streamingRef.current += event.text ?? "";
      setStreamingText(streamingRef.current);
      return;
    }
    if (event.kind === "done") {
      streamingRef.current = "";
      setStreamingText("");
      setStreaming(false);
      setCommentary(false);
      inFlightRef.current = null;
      if (event.turn) setTurns((turns) => appendTurnOnce(turns, event.turn as ConductorTurn));
      // Only a reply that carries a new task block replaces the card — a
      // plain reply (e.g. answering a question in ordinary prose) leaves
      // whatever card is already showing right where it is.
      if (event.taskBlock) {
        taskBlockVersionRef.current += 1;
        applyTaskBlock(event.taskBlock);
      } else void reconcileProposal(event.conversationId);
      return;
    }
    // A comment that ends without a done — failed, stopped, or too large —
    // is dropped by main with nothing persisted and nothing to say (see
    // service.ts). Release the indicator just as quietly: no error bubble,
    // and no stopped-early echo of a partial turn that was never saved
    // (Task 153).
    if (event.turnKind === "commentary") {
      streamingRef.current = "";
      setStreamingText("");
      setCommentary(false);
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
    if (event.turn) {
      setTurns((turns) => appendTurnOnce(turns, event.turn as ConductorTurn));
    } else if (partial) {
      setTurns((t) => [...t, { role: "cairn", text: `${partial}\n\n(stopped early)`, ts: new Date().toISOString() }]);
    }
    void reconcileProposal(event.conversationId);
    setError(event.message ?? "Cairn had a problem answering.");
  }), [dir, setConvId, applyTaskBlock, reconcileProposal]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [turns, streamingText]);

  // The newest card in view. Turn objects keep their identity when a turn is
  // appended, so this is referentially stable until a genuinely new card
  // arrives — which is what keeps the effect below from re-firing every time
  // the conductor's comment or the owner's next message lands.
  const latestCard = turns.reduce<ResultCard | null>(
    (found, turn) => (turn.role === "envelope" ? turn.card : found), null);

  // The chip's one trigger, and its only one: a DONE card. A STOPPED or ERROR
  // card clears the flow without asking git anything at all — a run that was
  // stopped verified nothing, and a run that threw left a workspace needing
  // inspection; neither is a moment to offer to publish. A null preview (no
  // upstream configured) offers nothing either, and neither does ahead 0.
  //
  // This runs whenever such a card is the newest one in view, including on a
  // reload that reads it back from disk: the count is a live git fact, and
  // suppressing a true nudge because the screen was rebuilt would lose it for
  // good.
  useEffect(() => {
    if (latestCard === null || latestCard.disposition !== "DONE") { setPushFlow(null); return; }
    let live = true;
    void cairn.pushPreview(dir).then((preview) => {
      if (!live) return;
      setPushFlow(preview !== null && preview.ahead > 0 ? { preview, phase: "chip", result: null } : null);
    });
    return () => { live = false; };
  }, [latestCard, dir]);

  // The chip's press is not the push. It re-reads git — locally, no network —
  // and opens the confirmation on facts that are true now, so the target and
  // the exact commit list the owner approves are the ones that would publish.
  async function openPushConfirm() {
    setPushFlow((f) => (f !== null && f.phase === "chip" ? { ...f, phase: "opening" } : f));
    const fresh = await cairn.pushPreview(dir);
    setPushFlow((f) => {
      if (f === null || f.phase !== "opening") return f; // a newer card replaced this flow meanwhile
      // Two different findings, kept apart: the upstream is gone, or it is
      // still there and there is nothing ahead of it. Saying the second when
      // only the first is known would name a remote Cairn can no longer check.
      if (fresh === null) return { ...f, phase: "gone", result: null };
      if (fresh.ahead < 1) return { preview: fresh, phase: "nothing", result: null };
      return { preview: fresh, phase: "confirm", result: null };
    });
  }

  // The owner's approval of that exact action, and the only path in this
  // screen that writes anything outside this machine. One press, one plain
  // `git push`, whatever it reports.
  //
  // `preview` is the panel's OWN preview object, handed in whole from the
  // render the owner read — not re-read here, and not taken apart. The push is
  // pinned to its remote, its branch and its head commit, so what executes is
  // what was disclosed; re-deriving any of them at this point would reopen
  // exactly the gap the pinning closes.
  async function approvePush(preview: PushPreview) {
    if (pushRunning.current) return;
    pushRunning.current = true;
    setPushFlow((f) => (f !== null && f.phase === "confirm" ? { ...f, phase: "pushing" } : f));
    try {
      const result = await cairn.pushExecute(dir, preview);
      setPushFlow((f) => (f !== null && f.phase === "pushing" ? { ...f, phase: "settled", result } : f));
    } finally {
      pushRunning.current = false;
    }
  }

  // Returns whether this call actually dispatched — appended the owner turn
  // and invoked `conductorSend` — as opposed to being refused outright
  // (empty text or a task running, which main refuses at the send gate). A
  // call made while a stream holds the lock QUEUES instead (Task 155) and
  // counts as dispatched: its message is accepted, visible, and will send.
  // The proposed-task card uses this to decide whether a chip may mark itself
  // resolved: a chip must never look resolved for a message that never left
  // the composer.
  //
  // `quiet` belongs to the queue's flush below: a flush can arrive a beat
  // before main frees its stream lock (released in a finally AFTER the done
  // delta), so the first attempt leaves no mark on a refusal and the caller
  // retries shortly. A loud refusal keeps the words in the composer with a
  // "Try again" (Task 153).
  async function send(text: string, quiet = false): Promise<boolean> {
    const trimmed = text.trim();
    if (!trimmed || taskBusy || restoringConversation) return false;
    setError(null);
    // Queue instead of bounce (Task 155): while a reply or the envelope's
    // comment streams, main holds the project's one stream lock and would
    // refuse. The message waits visibly in the pending row instead — never a
    // phantom turn, never lost words.
    if (streaming || commentary) {
      setPending((p) => [...p, trimmed]);
      setComposer("");
      return true;
    }
    conversationVersionRef.current += 1;
    setComposer("");
    setLastOwnerText(trimmed);
    // Shown at once so typing feels answered, and held by identity so a refusal
    // can take back this exact turn and no other.
    const optimistic: ConductorTurn = { role: "owner", text: trimmed, ts: new Date().toISOString() };
    setTurns((t) => [...t, optimistic]);
    setStreaming(true);
    streamingRef.current = "";
    setStreamingText("");

    const startingId = conversationIdRef.current;
    const inFlight: InFlight = { id: startingId };
    inFlightRef.current = inFlight;

    const response = await cairn.conductorSend({ dir, conversationId: startingId, text: trimmed });
    if (inFlightRef.current !== inFlight) return true; // superseded by "New conversation" or another send meanwhile — this call still dispatched
    if (!response.ok) {
      // Main refused before persisting anything, so this message is not in the
      // conversation on disk. Take it back out of the transcript: a bubble that
      // would vanish on the next reload is a message the screen is claiming was
      // sent when it never was. The text is not lost — the refusal bubble below
      // carries it as "Try again", which resends this exact string.
      //
      // Reachable in ordinary use since Task 070: while the envelope's comment
      // streams, main holds this project's stream lock and the renderer, which
      // did not start that stream, leaves the composer open.
      inFlightRef.current = null;
      setStreaming(false);
      setTurns((t) => t.filter((turn) => turn !== optimistic));
      // A quiet refusal (the queue's flush arriving a beat before main frees
      // its lock) leaves no mark — the caller retries. A loud one keeps the
      // words in the composer (Task 153): the text was cleared the moment
      // Send was pressed, so without this a refused send reads as "my
      // message vanished". "Try again" resends this exact string.
      if (!quiet) {
        setComposer(trimmed);
        setError(response.message);
      }
      return false;
    }
    if (inFlight.id === null) {
      // The response resolved before any delta raced ahead of it — adopt now.
      inFlight.id = response.value.conversationId;
      setConvId(response.value.conversationId);
    }
    return true;
  }

  // The queue's flush (Task 155): the moment nothing streams and no run
  // holds the gate, the oldest waiting message goes. The remaining ones
  // follow one at a time — each send re-raises `streaming`, which gates this
  // effect until that reply lands. If another stream has started meanwhile,
  // send() simply re-queues the message.
  useEffect(() => {
    if (pending.length === 0 || streaming || commentary || taskBusy) return;
    const [text, ...rest] = pending;
    setPending(rest);
    void (async () => {
      if (await send(text, true)) return;
      await new Promise((resolve) => { setTimeout(resolve, 300); });
      await send(text);
    })();
    // `send` is this render's closure over refs and setters only — safe.
  }, [pending, streaming, commentary, taskBusy]);

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(composer);
    }
  }

  async function newConversation() {
    if (captureSettling) return;
    if (streaming || commentary) {
      // Stop the abandoned stream before clearing state, so it can't keep
      // running against a conversation the screen no longer shows. A comment
      // is stopped the same way (Task 153): it belongs to the conversation
      // being left, and main drops the abort silently.
      await cairn.conductorStop(dir);
    }
    inFlightRef.current = null;
    setConvId(null);
    setTurns([]);
    streamingRef.current = "";
    setStreamingText("");
    setStreaming(false);
    setCommentary(false);
    setError(null);
    conversationVersionRef.current += 1;
    taskBlockVersionRef.current += 1;
    applyTaskBlock(null);
    setOpenedCards(new Set());
    // Queued messages belonged to the conversation being left: they will
    // never send now, so their words come back to the composer rather than
    // vanishing (Task 155).
    if (pending.length > 0) {
      const returned = pending.join("\n");
      setComposer((current) => (current.trim() ? `${current}\n${returned}` : returned));
      setPending([]);
    }
    // A running dispatch â€” including its short terminal-picture barrier â€”
    // belongs to the project, not to the conversation it was started from, so
    // it stays on screen; an undecided one goes with the proposal.
    setDispatch((current) => (current !== null
      && (current.phase === "running" || current.phase === "settling") ? current : null));
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
    const dispatchConversationId = conversationIdRef.current;
    const response = await cairn.taskRun({
      dir,
      outcome: request.outcome,
      details: request.details,
      adapterId,
      realCallConfirmed: worker && realCallConfirmed,
      disclosure: request.disclosure ?? undefined,
      conversationId: dispatchConversationId,
    });
    if (dispatchToken.current !== token) return; // a newer dispatch owns the panel now
    if (!response.ok) {
      if (dispatchConversationId) await reconcileProposal(dispatchConversationId);
      setDispatch({ ...request, phase: "confirm", error: response.message });
      return;
    }
    if (response.value.status === "connection-required") {
      if (dispatchConversationId) await reconcileProposal(dispatchConversationId);
      setDispatch({ ...request, route: response.value.route, phase: "confirm", error: "Codex's setup changed while you were deciding. Nothing was started or saved." });
      void refreshSession(); // this close leaves a closed session too — the strip must not keep showing it as running
      return;
    }
    // The confirmation panel's work is done: the run's own records are on
    // disk, the status strip below carries its terminal state, and the
    // envelope posts its own result card into this conversation.
    if (dispatchConversationId) await reconcileProposal(dispatchConversationId);
    setDispatch(null);
    setRealCallConfirmed(false);
    // Main's reconciliation removes only the proposal this dispatch spent:
    // its still-clickable "Send to dispatch" would otherwise
    // offer to re-run a task that is already running — and crowd the next
    // proposal out of the conversation's attention.
    void refreshSession();
  }

  const lastReply = [...turns].reverse().find((t) => t.role === "cairn") ?? null;
  // Fold away the past (Task 155): the turn index of the newest result card.
  // Every older card renders as a one-line chip that toggles its card back
  // into view; only this one stays expanded on its own.
  const latestCardIndex = turns.reduce((found, turn, i) => (turn.role === "envelope" ? i : found), -1);
  // Needs-you dot (Task 155): tucked away, the chip says when something
  // inside waits on the owner — a proposed task to decide, a dispatch to
  // confirm, or a push to approve.
  const proposalNeedsYou = taskBlock !== null && !taskBusy;
  const needsYou = proposalNeedsYou
    || dispatch?.phase === "confirm"
    || pushFlow?.phase === "chip"
    || pushFlow?.phase === "confirm";
  // The narrow window's status line lives outside this component, so the
  // needs-you signal is published rather than recomputed there. One answer,
  // one place.
  useEffect(() => { onNeedsYouChange?.(needsYou); }, [needsYou, onNeedsYouChange]);
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
      ? "No task was started, nothing was saved, and no AI was called."
      : "This task closed.");
  const dispatchRoute = dispatch?.route ?? null;
  const dispatchReady = dispatchRoute !== null && dispatchRoute.status === "ready" ? dispatchRoute : null;
  // A real worker lane is anything that is not the offline demo — a
  // capability check, never an adapter-id check, so a third adapter needs no
  // change here.
  const dispatchWorker = dispatchReady !== null && !dispatchReady.recommended.capabilities.includes("offline-demo");

  const column = (
      <div className={`chat-column${status?.connected ? "" : " chat-column-static"}${embedded ? " chat-column-villager" : ""}`}
        role={embedded ? "dialog" : undefined} aria-label={embedded ? "Conversation with Cairn" : undefined}>
        <div className="row spread chat-topbar">
          <Pill kind="quiet" onClick={onBack}>← Project home</Pill>
          {status?.connected ? (
            <BodyPill status={status} lastReply={lastReply}
              onModelSaved={(model) => setStatus((s) => (s ? { ...s, model } : s))}
              onDisconnected={() => { void newConversation(); void refreshStatus(); }} />
          ) : null}
          {embedded ? (
            <button type="button" className="chat-tuck" onClick={() => setTucked(true)}
              aria-label="Tuck the conversation away">tuck away ↘</button>
          ) : null}
        </div>

        {status === null ? <p className="muted">Getting ready…</p> : null}
        {status && !status.connected ? <ConnectCard status={status} onConnected={() => void refreshStatus()} /> : null}

        {status?.connected ? (
          <>
            <div className="chat-messages">
              {turns.map((turn, i) => (turn.role === "envelope" ? (
                <Fragment key={i}>
                  {/* Fold away the past (Task 155): an older card is this
                    * one-line chip; tapping toggles the full card in and out
                    * of view. The newest card keeps the moment on its own. */}
                  {i !== latestCardIndex ? (
                    <button type="button" className="result-card-folded"
                      aria-expanded={openedCards.has(i)}
                      onClick={() => setOpenedCards((open) => {
                        const next = new Set(open);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      })}>
                      <span className={`result-card-disposition result-card-${turn.card.disposition.toLowerCase()}`}>{turn.card.disposition}</span>
                      <span className="result-card-folded-label">
                        {turn.card.taskNumber !== null ? `Task ${String(turn.card.taskNumber).padStart(3, "0")}` : "A result with no records"}
                      </span>
                      <span className="result-card-folded-hint">{openedCards.has(i) ? "fold away" : "open"}</span>
                    </button>
                  ) : null}
                  {i === latestCardIndex || openedCards.has(i) ? (
                    <ResultCardView card={turn.card} dir={dir} onOpenRun={onOpenRun} />
                  ) : null}
                  {/* Under the card that prompted it, and under that card only
                    * — never under an older one, and never under a card whose
                    * disposition was not DONE. */}
                  {pushFlow !== null && turn.card === latestCard ? (
                    <PushFlowView flow={pushFlow}
                      onOpen={() => { if (pushFlow.phase === "chip") void openPushConfirm(); }}
                      onApprove={() => { if (pushFlow.phase === "confirm") void approvePush(pushFlow.preview); }}
                      onDecline={() => setPushFlow((f) => (f !== null && f.phase === "confirm" ? { ...f, phase: "chip", result: null } : f))} />
                  ) : null}
                </Fragment>
              ) : (
                <Fragment key={i}>
                  <div className={`bubble ${turn.role === "owner" ? "bubble-owner" : "bubble-cairn"}`}>
                    {turn.role === "owner" ? turn.text : <Md text={turn.text} />}
                  </div>
                  {/* Task 157: the commentary's follow-up suggestions, offered
                    * only while they are the conversation's latest word — once
                    * anything newer lands (a tap sends the suggestion itself,
                    * which appends the owner's turn), they step aside. A tap is
                    * an ordinary send(): it queues, refuses, and retries exactly
                    * like typed text, and it can never dispatch anything by
                    * itself — the proposal card and its gates still decide. */}
                  {turn.role === "cairn" && i === turns.length - 1 && turn.followups && turn.followups.length > 0 ? (
                    <div className="followups" role="group" aria-label="Cairn's suggestions for what to do next">
                      <p className="small muted followups-label">Where we could go next — tap one and it becomes your message to Cairn:</p>
                      <div className="followups-row">
                        {turn.followups.map((suggestion) => (
                          <button key={suggestion} type="button" className="followup-chip"
                            disabled={runActive}
                            onClick={() => void send(suggestion)}>{suggestion}</button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Fragment>
              )))}
              {taskBlock && !taskBusy ? (
                <TaskCard key={taskBlockKey} block={taskBlock} busy={streaming}
                  onAnswer={onCardAnswer} onSetAside={onCardSetAside} onSend={onCardSend} />
              ) : null}
              {dispatch && dispatch.phase !== "settling" ? (
                <div className="card dispatch-panel">
                  <p className="card-title">start this task</p>
                  <p className="dispatch-outcome">{dispatch.outcome}</p>
                  {dispatch.details ? (
                    <div className="task-card-details">
                      <p className="small muted task-card-details-label">Your details (sent word-for-word)</p>
                      <p className="task-card-details-text">{dispatch.details}</p>
                    </div>
                  ) : null}
                  {dispatch.phase === "running" ? (
                    <p className="small muted">Cairn is working on this. Its notes are saved in your project's docs/ai-work folder.</p>
                  ) : (
                    <>
                      {dispatch.error ? <p className="dispatch-error">{dispatch.error}</p> : null}
                      {dispatchRoute === null && !dispatch.error ? <p className="small muted">Choosing who will do the work…</p> : null}
                      {dispatchRoute?.status === "connection-required" ? (
                        <>
                          <p>{dispatchRoute.reason}</p>
                          <p className="small muted">Install or sign in to Codex yourself through Codex's own controls. Cairn never opens a login, reads passwords, or picks a different provider.</p>
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
              {/* The envelope's comment, visible while it streams (Task 153).
                * No Stop: it is the envelope's own call, and main's refusal
                * copy deliberately never points at a control for it. The
                * composer stays enabled by design (Task 070) — since Task 155
                * a send made now simply queues below instead of bouncing. */}
              {commentary ? (
                <div className="bubble bubble-cairn bubble-commentary">
                  <Md text={streamingText || "…"} />
                  <p className="small muted" style={{ margin: "8px 0 0" }}>A short comment on the result card above — not an answer to a message. Anything you send while this streams waits its turn below.</p>
                </div>
              ) : null}
              {/* The queue, made visible (Task 155): each message waiting for
                * the stream lock, in the order it will send, dimmed because
                * it has not gone yet — with a take-back that returns its
                * exact words to the composer. */}
              {pending.map((text, i) => (
                <div key={i} className="bubble bubble-owner bubble-pending">
                  {text}
                  <div className="row bubble-pending-controls">
                    <span className="small muted">Will send when Cairn finishes.</span>
                    <Pill kind="quiet" onClick={() => {
                      setPending((p) => p.filter((_, at) => at !== i));
                      setComposer((current) => (current.trim() ? `${current}\n${text}` : text));
                    }}>Take back</Pill>
                  </div>
                </div>
              ))}
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
            {runActive || captureSettling ? (
              <p className="small muted composer-closed">{captureSettling
                ? "Cairn is finishing this result. You can type again when it is ready."
                : "A task is running. You can type again when it finishes."}</p>
            ) : null}
            <div className="chat-composer">
              {/* Closed only while a task runs (its note above says why).
                * While Cairn answers or comments, a send queues instead of
                * bouncing (Task 155), so the composer stays open. */}
              <textarea ref={composerRef} value={composer} onChange={(e) => setComposer(e.target.value)}
                onKeyDown={onComposerKeyDown} placeholder="Talk with Cairn" rows={2} disabled={taskBusy || restoringConversation} />
              <Pill kind="primary" onClick={() => void send(composer)} disabled={taskBusy || restoringConversation || !composer.trim()}>Send</Pill>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <Pill kind="quiet" disabled={restoringConversation || captureSettling}
                onClick={() => void newConversation()}>New conversation</Pill>
            </div>
          </>
        ) : null}
      </div>
  );

  if (!embedded) {
    return (
      <div className="chat-screen">
        <div className="chat-scene"><Scene fill stones={stones} justAdded={false} /></div>
        {column}
      </div>
    );
  }

  /* The villager bubble (Task 146): the conversation is a tailed dialog
     anchored beside Cairn's node — or, tucked, a one-line chip floating by
     him carrying his last line. The overlay root is click-transparent so the
     town stays alive around the dialog. */
  return (
    <div className="chat-villager-root">
      {tucked ? (
        <button type="button" className="chat-villager-chip"
          onClick={() => { setTucked(false); window.requestAnimationFrame(() => composerRef.current?.focus()); }}
          aria-label={needsYou
            ? "Open the conversation with Cairn — a decision is waiting for you"
            : "Open the conversation with Cairn"}>
          {/* The needs-you dot (Task 155): a decision waits inside — the
            * owner learns it from the chip, without opening the dialog. */}
          {needsYou ? <span className="chat-villager-chip-dot" aria-hidden="true" /> : null}
          <span className="chat-villager-chip-text">{lastReply?.role === "cairn" ? lastReply.text : "Talk with Cairn"}</span>
        </button>
      ) : column}
    </div>
  );
}
