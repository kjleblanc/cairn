import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { RouteResult, WorkerDisclosure } from "@cairn/core";
import type {
  CandidateCritiqueAction,
  CandidateCritiqueProjectionV1, ConductorAction, ConductorActionReply, ConductorChatTurn, ConductorDelta, ConductorStatus, ConductorTurn, CriticCallActionV1, CriticCallDisclosureV1, PushPreview, PushResult, Q9HarnessRevisionDecisionRequest, RepairCallDecisionRequest, ResultCard, RunSessionSnapshot, TaskReviewProjectionV1, TaskSpecProposalPreviewV1, UnsealedCandidateChoice, UnsealedCandidateOwnerAnswer, UnsealedCandidateProjectionV1 } from "../../shared/ipc";
import { codeInPlainWords } from "../../shared/stopwords";
import { cairn } from "../api";
import { BodyPill } from "../components/BodyPill";
import { BuilderProposalReview } from "../components/BuilderProposalReview";
import { ConnectCard } from "../components/ConnectCard";
import { DisclosureConfirm } from "../components/DisclosureConfirm";
import { ResultEvidence } from "../components/EvidenceAlbum";
import { Md } from "../components/Md";
import { QuestionCard } from "../components/QuestionCard";
import { Scene } from "../components/Scene";
import { TaskCard } from "../components/TaskCard";
import { TaskIntentList } from "../components/TaskIntentList";
import { TaskReviewView, TaskSpecProposalPreviewView, type TaskReviewActionChoice } from "../components/TaskReview";
import { CriticCallCard } from "../components/CriticCall";
import { RepairCallCard } from "../components/RepairCall";
import { HarnessRevisionCard } from "../components/HarnessRevision";
import { CandidateCritiqueCard } from "../components/CandidateCritique";
import { UnsealedCandidateCard } from "../components/UnsealedCandidate";
import {
  UNSEALED_CANDIDATE_REPAIR_CHOICE,
  unsealedCandidateOpenRowIds,
} from "../../shared/unsealed-candidate";
import { OWNER_OBSERVATION, TaskPromiseCard, taskCardRows } from "../components/TaskPromiseCard";
import { Pill } from "../components/Ui";

/** Tracks one in-flight `send()`. `id` starts out as whatever conversation
 * it was sent against (possibly null, for a brand-new conversation whose id
 * isn't known yet) and is locked in the first time it's learned — from
 * whichever arrives first, the `conductor:send` response or a race-ahead
 * delta. Once locked, it never changes for this send. */
type InFlight = {
  id: string | null;
  /** Exact owner input for retry, or null while a restored live reply's saved
   * owner turn has not finished loading. Never substitute assistant output. */
  text: string | null;
  composerOwned: boolean;
  actionReply?: ConductorActionReply;
  /** Output-only reattachment hint. Unlike `actionReply`, this can announce
   * and focus a restored settlement but is never sufficient to resend one. */
  settlementKind?: ConductorActionReply["kind"];
};

/** A send main refused before append, or an interrupted ordinary reply, that
 * the owner may retry without guessing at words or one-time authority. */
type RetryRequest = {
  text: string;
  composerOwned: boolean;
  actionReply?: ConductorActionReply;
};

type PendingMessage = {
  text: string;
  /** The first post-stream attempt is quiet because main releases its stream
   * lock just after the done event. A refused retry returns through current
   * render gates once with this false, then surfaces its real error. */
  quiet: boolean;
};

type PendingFocus =
  | { kind: "action"; actionId: string }
  | { kind: "reply" }
  | { kind: "recovery" };

/** One dispatch the owner is deciding on, has started, or is in the short
 * main-owned terminal-picture barrier. `route` is
 * null until `taskRoute` answers (and stays null when it refuses, with the
 * plain reason in `error`); `disclosure` is null whenever the routed adapter
 * declares no real call to confirm — the offline demo, today. */
type Dispatch = {
  previewId: string | null;
  request: Extract<ConductorAction, { kind: "task" }>["request"] | null;
  context: readonly string[];
  /** Main's optional display projection from this exact route response. The
   * proposal card's copy is deliberately never promoted into dispatch state. */
  taskSpecPreview: TaskSpecProposalPreviewV1 | null;
  taskReview: TaskReviewProjectionV1 | null;
  /** Main's Independent-critic card for the one call awaiting a decision.
   * Output only: pressing sends back the id and this exact card, and main
   * re-derives it before deciding. */
  criticCall: CriticCallDisclosureV1 | null;
  route: RouteResult | null;
  disclosure: WorkerDisclosure | null;
  /** Task 238: the checks this project can answer, from the route response. */
  checkMenu: readonly Readonly<{ id: string; label: string; command: string }>[];
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

/** Saved history may resolve after a live done/envelope event was already
 * appended. Merge the two ordered views without duplicating the exact turn
 * main both persisted and emitted. */
function mergeSavedTurns(saved: readonly ConductorTurn[], current: readonly ConductorTurn[]): ConductorTurn[] {
  const merged = [...saved];
  for (const turn of current) {
    if (merged.some((candidate) => sameConversationTurn(candidate, turn))) continue;
    merged.push(turn);
  }
  return merged;
}

function sameConversationTurn(left: ConductorTurn, right: ConductorTurn): boolean {
  if (left.role === "builder-review" || right.role === "builder-review") {
    return left.role === "builder-review" && right.role === "builder-review"
      && left.displayTurnId === right.displayTurnId;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

function appendTurnOnce(turns: readonly ConductorTurn[], turn: ConductorTurn): ConductorTurn[] {
  return turns.some((current) => sameConversationTurn(current, turn)) ? [...turns] : [...turns, turn];
}

/** Runtime counterpart to the shared discriminated union. IPC originates in
 * Main, but a role/kind mismatch must still be rejected before any renderer
 * state change if an old or malformed process payload reaches this bundle. */
function conductorDeltaRoleIsSafe(event: ConductorDelta): boolean {
  const turn = (event as { turn?: ConductorTurn }).turn;
  if (event.kind === "turn") return turn?.role === "builder-review";
  if (event.kind === "envelope") return turn?.role === "envelope";
  if (event.kind === "done") return turn?.role === "cairn";
  if (event.kind === "error") return turn === undefined || turn.role === "cairn";
  if (event.kind === "delta" || event.kind === "replace") return turn === undefined;
  return false;
}

/** Main keeps the exact question in the Cairn turn so it survives after its
 * one-time action retires. While that same question is current, its adjacent
 * answer field already repeats it as the visible heading. Remove exact display
 * occurrences wherever the model placed them; never mutate the saved turn.
 * A question-only turn returns an empty display lead, whose prose row is hidden
 * while the adjacent active heading carries the same accessible words. */
function activeQuestionLead(text: string, question: string): string {
  if (!text.includes(question)) return text;
  return text.split(question).map((fragment) => fragment.trim()).filter(Boolean).join("\n\n");
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
  const pushChipRef = useRef<HTMLDivElement | null>(null);
  const restorePushChipFocus = useRef(false);
  const announcement = pushAnnouncement(flow);
  const outcomeTone = flow.phase === "pushing" ? "running"
    : flow.phase === "settled" && result !== null && result.ok ? "success"
      : announcement === null ? "quiet" : "refusal";
  const gitsOwnWords = flow.phase === "settled" && result !== null && !result.ok && result.kind === "other";

  // Pressing the chip removes the focused button from the DOM. Without this,
  // focus falls to <body> and a keyboard owner has to tab from the top of the
  // document to reach the two controls of the pause — on the one surface whose
  // whole purpose is that the pause is reached before the write.
  useEffect(() => {
    if (flow.phase === "confirm") panelRef.current?.focus();
  }, [flow.phase]);

  // Not now remounts the nudge that opened this pause. Return the keyboard
  // owner to that exact decision, but never focus a nudge merely because a
  // DONE card caused it to appear for the first time.
  useEffect(() => {
    if (flow.phase === "chip" && restorePushChipFocus.current) {
      restorePushChipFocus.current = false;
      pushChipRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }, [flow.phase]);

  function declinePush() {
    restorePushChipFocus.current = true;
    onDecline();
  }

  return (
    <div className="push-flow" data-push-phase={flow.phase}>
      {flow.phase === "chip" || flow.phase === "opening" ? (
        <div className="push-chip" ref={pushChipRef}>
          <Pill kind="soft" disabled={flow.phase === "opening"} onClick={onOpen}>
            This project is {aheadPhrase(preview.ahead)} of {preview.remote}. Push?
          </Pill>
        </div>
      ) : null}

      {flow.phase === "confirm" || flow.phase === "pushing" ? (
        // `tabIndex={-1}` makes the panel focusable by script without adding it
        // to the tab order; the heading is its accessible name.
        <div className="card push-confirm" ref={panelRef} tabIndex={-1} role="group" aria-labelledby="push-confirm-title">
          <p className="card-title push-confirm-title" id="push-confirm-title">before this push</p>
          <ul className="push-confirm-facts">
            <li className="push-confirm-fact">Target: {preview.remote} — <span className="mono">{preview.url}</span></li>
            <li className="push-confirm-fact">Branch: <span className="mono">{preview.branch}</span></li>
            {/* The COUNT leads, and the subjects follow as git's own answer.
              * `pushPreview` drops empty lines from `log --format=%s`, so a
              * commit with an empty message leaves the list shorter than the
              * count — the count is what cannot understate the effect. */}
            <li className="push-confirm-fact push-confirm-effect">
              Effect: this push publishes {commitCount(preview.ahead)}. Their subjects, as git reports them:
              <ul className="push-confirm-subjects">
                {preview.subjects.map((subject, i) => <li key={i}>{subject}</li>)}
              </ul>
              {preview.subjects.length !== preview.ahead ? (
                <span className="small muted">Git reported {preview.subjects.length} of these {preview.ahead} subjects; a commit with an empty message has none to report.</span>
              ) : null}
            </li>
          </ul>
          <p className="push-confirm-sentence push-confirm-publication">{PUSH_PUBLICATION}</p>
          <p className="push-confirm-sentence push-confirm-recovery">{PUSH_RECOVERY}</p>
          <div className="row push-confirm-actions">
            <Pill kind="primary" disabled={flow.phase === "pushing"} onClick={onApprove}>Push</Pill>
            <Pill kind="quiet" disabled={flow.phase === "pushing"} onClick={declinePush}>Not now</Pill>
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
      <div className={`push-outcome${announcement === null ? "" : " card"}`} data-push-state={outcomeTone} role="status">
        {announcement === null ? null : (
          <>
            <p className="card-title push-outcome-title">the push</p>
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
  const provenanceLine = card.disposition === "ERROR"
    ? "Cairn could not complete verification"
    : !wroteRecords
      ? "Closed by Cairn before a task started"
      : card.disposition === "DONE"
        ? "Checked by Cairn after the builder finished"
        : "Closed by Cairn when the task stopped";

  return (
    <article className="card result-card"
      aria-label={`${card.disposition} result receipt${wroteRecords ? ` for Task ${String(card.taskNumber).padStart(3, "0")}` : ""}`}>
      <ResultEvidence dir={dir} runId={card.evidenceRunId} />
      <p className="card-title">Cairn&apos;s receipt</p>
      <p className="result-card-provenance">{provenanceLine}</p>
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

      {/* Task 238: the same rows the Task Card promised and the candidate
        * answered, so the result cannot quietly disagree with either. The three
        * voices stay on their own lines here too. */}
      {(card.promises ?? []).length === 0 ? null : (
        <section className="result-card-promises" aria-label="What this task promised">
          <h2 className="result-card-facts-title">What this task promised</h2>
          <ol className="result-card-promise-list">
            {(card.promises ?? []).map((row) => (
              <li key={row.id} className="result-card-promise" data-row={row.id}>
                <p className="result-card-promise-text">
                  <span className="mono">{row.id}</span> {row.text}
                </p>
                {row.answeredBy === "cairn" ? (
                  <p className="result-card-promise-cairn" data-status={row.cairn?.status ?? "none"}>
                    {row.cairn === null
                      ? "Cairn had no result for this check."
                      : row.cairn.status === "unfinished"
                        ? `Cairn ran ${row.cairn.command} but it did not finish in time.`
                        : `Cairn ran ${row.cairn.command} and it ${row.cairn.status}.`}
                  </p>
                ) : (
                  <p className="result-card-promise-owner">
                    {row.owner === "met"
                      ? "You confirmed this yourself."
                      : row.owner === "not-met"
                        ? "You said this is not done."
                        : "You did not judge this."}
                  </p>
                )}
                <p className="result-card-promise-worker">
                  {row.worker === null
                    ? `${card.route?.adapterLabel ?? "The worker"} did not answer this.`
                    : `${card.route?.adapterLabel ?? "The worker"} says: ${row.worker}`}
                  <span className="result-card-promise-provenance"> (reported, not checked)</span>
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {card.disposition !== "ERROR" && wroteRecords ? (
        <section className="result-card-verification">
          <h2 className="result-card-facts-title">What Cairn checked</h2>
          <ul className="result-card-facts">
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
            {card.processFailure ? (
              <li>
                The task process failed: <span className="mono">{card.processFailure.code}</span>. The raw evidence
                stays on your own computer at: {card.processFailure.debugPath
                  ?? "unavailable (the folder for it could not be created)"}. It is never added to your project's
                saved history.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {card.disposition !== "ERROR" && wroteRecords && (card.route || card.evidenceSummary) ? (
        <details className="result-card-run-details">
          <summary>
            <span className="result-card-disclosure-heading">
              <span className="result-card-disclosure-title">Run details</span>
              <span className="result-card-disclosure-provenance">checked by Cairn</span>
            </span>
          </summary>
          <ul className="result-card-run-facts">
            {card.route ? <li>Who did the work: {card.route.adapterLabel} — {card.route.provider} / {card.route.model}</li> : null}
            {card.evidenceSummary ? <li>{card.evidenceSummary}</li> : null}
          </ul>
        </details>
      ) : null}

      {card.taskReview ? (
        <TaskReviewView review={card.taskReview} heading="Accepted Task Spec" />
      ) : null}

      {card.disposition !== "ERROR" && wroteRecords ? (
        <details className="result-card-claims">
          <summary>
            <span className="result-card-disclosure-heading">
              <span className="result-card-disclosure-title">Builder&apos;s account</span>
              <span className="result-card-disclosure-provenance">reported, not checked</span>
            </span>
            {card.claims ? (
              <span className="result-card-claims-preview">{card.claims.summary}</span>
            ) : (
              <span className="result-card-claims-preview">No readable summary was reported.</span>
            )}
          </summary>
          <div className="result-card-claims-body">
            <p className="small muted result-card-claims-label">Cairn checked the files above, but not the builder&apos;s descriptions below.</p>
            {card.claims ? (
              <>
                <h3 className="result-card-section-title">What the builder says it did</h3>
                <p className="result-card-claims-text">{card.claims.summary}</p>
                {Array.isArray(card.claims.changes) && card.claims.changes.length > 0 ? (
                  <ul className="result-card-detail-list">
                    {card.claims.changes.map((change, index) => <li key={`${index}-${change}`}>{change}</li>)}
                  </ul>
                ) : null}
                <h3 className="result-card-section-title">Checks the builder reported</h3>
                {Array.isArray(card.claims.checks) && card.claims.checks.length > 0 ? (
                  <ul className="result-card-detail-list">
                    {card.claims.checks.map((check, index) => <li key={`${index}-${check.name}`}><strong>{check.name}:</strong> {check.result}</li>)}
                  </ul>
                ) : <p className="result-card-claims-text">No checks were reported.</p>}
                <h3 className="result-card-section-title">Builder&apos;s suggested next step</h3>
                <p className="result-card-claims-text">{card.claims.howToTry || "No trial steps were reported."}</p>
                <h3 className="result-card-section-title">Builder&apos;s remaining limitations</h3>
                <p className="result-card-claims-text">{card.claims.limitations || "The worker reported no remaining limitations."}</p>
                <p className="small muted result-card-milestone">Milestone moved (worker&apos;s answer): {card.claims.milestone}</p>
              </>
            ) : (
              <p className="result-card-claims-text">The worker didn&apos;t leave a readable summary of what it did.</p>
            )}
          </div>
        </details>
      ) : null}

      {card.acceptedRequest === undefined && wroteRecords ? (
        <details className="result-card-request-context">
          <summary>
            <span className="result-card-disclosure-heading">
              <span className="result-card-disclosure-title">Original request</span>
              <span className="result-card-disclosure-provenance">reference, not a verified result</span>
            </span>
          </summary>
          <div className="result-card-request-body">
            <h2>What you asked for</h2>
            <p>This older result did not record where its requirements came from.</p>
          </div>
        </details>
      ) : null}
      {card.acceptedRequest !== undefined && card.acceptedRequest !== null ? (
        <details className="result-card-request-context">
          <summary>
            <span className="result-card-disclosure-heading">
              <span className="result-card-disclosure-title">Original request</span>
              <span className="result-card-disclosure-provenance">reference, not a verified result</span>
            </span>
          </summary>
          <div className="result-card-request-body">
            <TaskIntentList request={card.acceptedRequest} heading="What you asked for" />
          </div>
        </details>
      ) : null}

      <footer className="result-card-footer">
        <div className="row result-card-actions">
          <Pill kind="quiet" onClick={onOpenRun}>Open the run screen</Pill>
        </div>
        <p className="small mono result-card-path">
          {recordsPath ?? "Anything this run kept is in your project's docs/ai-work folder."}
        </p>
      </footer>
    </article>
  );
}

/** Layout A: the hillside is the room. The scene fills the window; the
 * conversation floats over it on solid (never translucent) cards.
 *
 * Dispatch happens here too. A current risk-free task action opens a
 * confirmation panel in the conversation itself: main's attributed request
 * preview and — when the routed adapter declares a real call — the six
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
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [queueRetrying, setQueueRetrying] = useState(false);
  // A conversation replacement crosses an awaited main-process stop/discard.
  // Close every composer/action entrance for that whole interval so nothing
  // can be accepted into the conversation being retired and then cleared.
  const [conversationResetting, setConversationResetting] = useState(false);
  // Fold away the past (Task 155): every result card but the newest collapses
  // to a one-line chip. This set holds the turn indices the owner has opened;
  // the newest card is always expanded and never listed here.
  const [openedCards, setOpenedCards] = useState<ReadonlySet<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [retryRequest, setRetryRequestState] = useState<RetryRequest | null>(null);
  // Main owns exactly one current structured action. Its opaque identity and
  // output-only display view arrive together; no renderer projection can
  // create, resolve, or revive it.
  const [action, setAction] = useState<ConductorAction | null>(null);
  const actionVersionRef = useRef(0);
  const actionRef = useRef<ConductorAction | null>(null);
  // One stable action-settlement announcement and one deliberate post-render
  // focus request. Ordinary replies, restore, and reconciliation never arm
  // either mechanism.
  const [settledAnnouncement, setSettledAnnouncement] = useState<{ sequence: number; text: string } | null>(null);
  const announcementSequenceRef = useRef(0);
  const pendingFocusRef = useRef<PendingFocus | null>(null);
  const [focusEpoch, setFocusEpoch] = useState(0);
  const [settlementFocusPending, setSettlementFocusPending] = useState(false);
  const [correctionPending, setCorrectionPending] = useState(false);
  const correctionPendingRef = useRef(false);
  // Guards the whole asynchronous conversation restore, not just its proposal:
  // a send or accepted delta owns newer conversation/turn state and an older
  // mount snapshot may only merge history into that state, never replace it.
  const conversationVersionRef = useRef(0);
  // Builder reviews are append-only display evidence. Track their restore
  // races separately so preserving the card can never enter the ordinary
  // delta branch that reconciles actions, streams, retries, or task state.
  const builderTurnVersionRef = useRef(0);
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [criticCallBusy, setCriticCallBusy] = useState(false);
  const [repairCallBusy, setRepairCallBusy] = useState(false);
  const [harnessRevisionBusy, setHarnessRevisionBusy] = useState(false);
  const [unsealedCandidateBusy, setUnsealedCandidateBusy] = useState(false);
  const [candidateCritiqueBusy, setCandidateCritiqueBusy] = useState(false);
  // Task 238: how each Task Card row will be checked, keyed by row id.
  const [checkSelections, setCheckSelections] = useState<Record<string, string>>({});
  const [calibrationCall, setCalibrationCall] = useState<CriticCallDisclosureV1 | null>(null);
  const [realCallConfirmed, setRealCallConfirmed] = useState(false);
  const dispatchHeadingId = useId();
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
  const pendingTaskReviewAction = useRef<{ token: number; actionId: string } | null>(null);
  const streamingRef = useRef("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const followupsRef = useRef<HTMLDivElement | null>(null);
  const replacementActionRef = useRef<HTMLHeadingElement | null>(null);
  const dispatchHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const dispatchFocusReturnPendingRef = useRef(false);
  const settledReplyRef = useRef<HTMLHeadingElement | null>(null);
  const errorRecoveryRef = useRef<HTMLDivElement | null>(null);
  // Mirrors `conversationId` for synchronous reads inside the delta handler
  // (a `useEffect` closure over React state can be stale between renders).
  const conversationIdRef = useRef<string | null>(null);
  const pendingRef = useRef<PendingMessage[]>([]);
  // The conversation the currently in-flight send belongs to, or null when
  // nothing is in flight. Deltas that match neither this nor the displayed
  // conversation are from an abandoned stream and are ignored outright.
  const inFlightRef = useRef<InFlight | null>(null);
  // Retry is optional authority, not a side effect of showing an error. Mirror
  // it in a ref so a double press consumes the one retry synchronously.
  const retryRequestRef = useRef<RetryRequest | null>(null);
  const queueRetryingRef = useRef(false);
  const conversationResettingRef = useRef(false);

  const setConvId = useCallback((id: string | null) => {
    conversationIdRef.current = id;
    setConversationId(id);
  }, []);

  const setRetryRequest = useCallback((next: RetryRequest | null) => {
    retryRequestRef.current = next;
    setRetryRequestState(next);
  }, []);

  const setQueueRetryingNow = useCallback((next: boolean) => {
    queueRetryingRef.current = next;
    setQueueRetrying(next);
  }, []);

  const setPendingNow = useCallback((update: PendingMessage[] | ((current: PendingMessage[]) => PendingMessage[])) => {
    const next = typeof update === "function" ? update(pendingRef.current) : update;
    pendingRef.current = next;
    setPending(next);
  }, []);

  const setConversationResettingNow = useCallback((next: boolean) => {
    conversationResettingRef.current = next;
    setConversationResetting(next);
  }, []);

  const applyAction = useCallback((next: ConductorAction | null) => {
    actionRef.current = next;
    setAction(next);
  }, []);

  /** Re-read the action main still considers actionable. This is used after
   * a dispatch/result because that event may belong to an older card while a
   * newer one is already current. */
  const reconcileAction = useCallback(async (id: string): Promise<void> => {
    const requestedAt = actionVersionRef.current;
    const restoredAction = await cairn.conductorAction(dir, id);
    if (conversationIdRef.current !== id || actionVersionRef.current !== requestedAt) return;
    actionVersionRef.current += 1;
    applyAction(restoredAction);
  }, [dir, applyAction]);

  const focusRecovery = useCallback((text: string) => {
    const sequence = announcementSequenceRef.current + 1;
    announcementSequenceRef.current = sequence;
    setSettledAnnouncement({ sequence, text });
    pendingFocusRef.current = { kind: "recovery" };
    setSettlementFocusPending(true);
    setTucked(false);
    setFocusEpoch((epoch) => epoch + 1);
  }, []);

  const settleTargetedReply = useCallback((kind: ConductorActionReply["kind"], next: ConductorAction | null, failed = false) => {
    const subject = kind === "defer" ? "choice" : kind === "correction" ? "correction" : kind === "set-risk-aside" ? "risk decision" : "answer";
    if (failed) {
      focusRecovery(`Cairn could not settle that ${subject}. The recovery choice is ready.`);
      return;
    }
    const sequence = announcementSequenceRef.current + 1;
    announcementSequenceRef.current = sequence;
    setSettledAnnouncement({
      sequence,
      text: next === null
        ? `Cairn settled that ${subject}. No new decision is waiting.`
        : `Cairn settled that ${subject}. A new decision is ready.`,
    });
    pendingFocusRef.current = next === null
      ? { kind: "reply" }
      : { kind: "action", actionId: next.actionId };
    setSettlementFocusPending(true);
    setTucked(false);
    setFocusEpoch((epoch) => epoch + 1);
  }, [focusRecovery]);

  // Villager bubble (Task 146): an explicit "talk" intent from the shell —
  // the rail, Cairn's node, or the dashboard's Talk button — untucks the
  // dialog and focuses the composer.
  useEffect(() => {
    if (!focusSignal) return;
    setTucked(false);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }, [focusSignal]);

  useEffect(() => {
    if (focusEpoch === 0) return;
    const frame = window.requestAnimationFrame(() => {
      const pendingFocus = pendingFocusRef.current;
      if (pendingFocus === null) {
        setSettlementFocusPending(false);
        return;
      }
      pendingFocusRef.current = null;
      setSettlementFocusPending(false);
      if (pendingFocus.kind === "action" && actionRef.current?.actionId === pendingFocus.actionId) {
        replacementActionRef.current?.focus();
        return;
      }
      if (pendingFocus.kind === "reply") {
        if (settledReplyRef.current) settledReplyRef.current.focus();
        else composerRef.current?.focus();
        return;
      }
      if (errorRecoveryRef.current) errorRecoveryRef.current.focus();
      else composerRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusEpoch]);

  // Review replaces the focused proposal control, so give its visible heading
  // the focus that would otherwise fall back to the document. Cancel reverses
  // that exchange only after React has put the same proposal heading back.
  useEffect(() => {
    if (dispatch?.phase === "confirm") {
      dispatchHeadingRef.current?.focus();
      return;
    }
    if (dispatch !== null || !dispatchFocusReturnPendingRef.current) return;
    dispatchFocusReturnPendingRef.current = false;
    replacementActionRef.current?.focus();
  }, [dispatch?.phase]);

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
    // Status resolves asynchronously. Keep restoration pending until one of
    // the connected/disconnected branches below has completed its real saved
    // history read; a transient null-status render is not a restored state.
    if (status === null) { setRestoringConversation(true); return; }
    if (!status.connected) {
      let live = true;
      const restoreVersion = conversationVersionRef.current;
      const restoreBuilderTurnVersion = builderTurnVersionRef.current;
      setRestoringConversation(true);
      // A disconnected conductor grants no prose, action, stream, or composer
      // authority. Read-only history remains available, however, and Main's
      // store has already discarded every unauthenticated envelope line. Keep
      // only those authenticated local result receipts visible.
      actionVersionRef.current += 1;
      applyAction(null);
      inFlightRef.current = null;
      streamingRef.current = "";
      setStreamingText("");
      setStreaming(false);
      setCommentary(false);
      void (async () => {
        try {
          const list = await cairn.conductorConversations(dir);
          if (!live || conversationVersionRef.current !== restoreVersion) return;
          const builderDeltaWon = builderTurnVersionRef.current !== restoreBuilderTurnVersion;
          const id = (builderDeltaWon ? conversationIdRef.current : null)
            ?? session?.conversationId ?? list.at(-1)?.id ?? null;
          if (id === null) {
            setConvId(null);
            setTurns([]);
            return;
          }
          // Adopt the exact local conversation before reading it, so an
          // authenticated terminal delta racing this read can merge forward.
          setConvId(id);
          const saved = (await cairn.conductorTurns(dir, id))
            .filter((turn): turn is Extract<ConductorTurn, { role: "envelope" | "builder-review" }> =>
              turn.role === "envelope" || turn.role === "builder-review");
          if (!live || conversationIdRef.current !== id) return;
          if (conversationVersionRef.current !== restoreVersion
            || builderTurnVersionRef.current !== restoreBuilderTurnVersion) {
            setTurns((current) => mergeSavedTurns(
              saved,
              current.filter((turn): turn is Extract<ConductorTurn, { role: "envelope" | "builder-review" }> =>
                turn.role === "envelope" || turn.role === "builder-review"),
            ));
          } else {
            setTurns(saved);
          }
        } finally {
          if (live) setRestoringConversation(false);
        }
      })();
      return () => { live = false; };
    }
    let live = true;
    const restoreVersion = conversationVersionRef.current;
    const restoreBuilderTurnVersion = builderTurnVersionRef.current;
    const restoredActionVersion = actionVersionRef.current;
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
          inFlightRef.current = {
            id,
            text: null,
            composerOwned: false,
            ...(stream.settlementKind === undefined ? {} : { settlementKind: stream.settlementKind }),
          };
          streamingRef.current = stream.text;
          setStreamingText(stream.text);
          setStreaming(true);
        } else if (stream?.kind === "commentary") {
          streamingRef.current = stream.text;
          setStreamingText(stream.text);
          setCommentary(true);
        }

        const [saved, restoredAction] = await Promise.all([
          cairn.conductorTurns(dir, id),
          cairn.conductorAction(dir, id),
        ]);
        // Close the small gap where the initial stream snapshot said "live"
        // but its done event reached the renderer before the id was adopted.
        const latestStream = await cairn.conductorCurrent(dir);
        if (!live || conversationIdRef.current !== id) return;
        const restoredOwnerTurn = [...saved].reverse().find((turn) => turn.role === "owner");
        const restoredOwnerText = restoredOwnerTurn?.role === "owner" ? restoredOwnerTurn.text : null;
        const attachedFlight = inFlightRef.current;
        if (attachedFlight?.id === id && attachedFlight.text === null) attachedFlight.text = restoredOwnerText;
        if (conversationVersionRef.current !== restoreVersion) {
          // A live event already appended newer state. Bring the older saved
          // history in behind it without erasing or duplicating that event.
          setTurns((current) => mergeSavedTurns(saved, current));
          void reconcileAction(id);
          return;
        }

        if (builderTurnVersionRef.current !== restoreBuilderTurnVersion) {
          setTurns((current) => mergeSavedTurns(saved, current));
        } else {
          setTurns(saved);
        }
        if (actionVersionRef.current === restoredActionVersion) {
          applyAction(restoredAction);
        }
        if (latestStream?.conversationId === id && latestStream.kind === "reply") {
          inFlightRef.current = {
            id,
            text: restoredOwnerText,
            composerOwned: false,
            ...(latestStream.settlementKind === undefined ? {} : { settlementKind: latestStream.settlementKind }),
          };
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
  }, [status?.connected, dir, session?.conversationId, setConvId, applyAction, reconcileAction]);

  const refreshSession = useCallback(async () => {
    const [current, calibration] = await Promise.all([
      cairn.taskCurrent(dir),
      cairn.criticCalibrationCurrent(dir),
    ]);
    setSession(current);
    setCalibrationCall(calibration?.disclosure ?? null);
  }, [dir]);

  // On mount, so a reload — or arriving from anywhere else — reattaches to a
  // run already in flight; and on every activity, so the strip moves with it.
  useEffect(() => { void refreshSession(); }, [refreshSession]);
  useEffect(() => cairn.onTaskActivity((event) => {
    if (event.dir !== dir) return;
    void refreshSession();
  }), [dir, refreshSession]);
  useEffect(() => cairn.onCriticCalibrationChanged(() => {
    void cairn.criticCalibrationCurrent(dir)
      .then((calibration) => setCalibrationCall(calibration?.disclosure ?? null));
  }), [dir]);
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
    if (!conductorDeltaRoleIsSafe(event)) return;

    // Authenticated Builder review evidence is a complete append-only turn,
    // never part of a reply stream or terminal envelope. It changes only the
    // visible turn list: no action reconciliation, stream, retry, task, push,
    // composer, dispatch or status state follows from its arrival.
    if (event.kind === "turn") {
      if (event.turn?.role !== "builder-review") return;
      const disconnectedLocalEvidence = status?.connected === false;
      if (conversationIdRef.current !== event.conversationId && !disconnectedLocalEvidence) return;
      const adoptsDifferentConversation = disconnectedLocalEvidence && conversationIdRef.current !== event.conversationId;
      if (adoptsDifferentConversation) setConvId(event.conversationId);
      builderTurnVersionRef.current += 1;
      setTurns((turns) => adoptsDifferentConversation ? [event.turn as ConductorTurn] : appendTurnOnce(turns, event.turn as ConductorTurn));
      return;
    }

    // A result card is not part of any reply stream. It belongs to the ONE
    // conversation whose id rode the run request, so it is posted only while
    // that conversation is on screen — and it is handled before the in-flight
    // matching below so it can never adopt an id for a stream it has nothing
    // to do with. A card for another conversation is already on disk; opening
    // that conversation shows it.
    if (event.kind === "envelope") {
      const disconnectedLocalReceipt = status?.connected === false && event.turn?.role === "envelope";
      if (event.turn && (conversationIdRef.current === event.conversationId || disconnectedLocalReceipt)) {
        if (disconnectedLocalReceipt && conversationIdRef.current !== event.conversationId) {
          setConvId(event.conversationId);
        }
        conversationVersionRef.current += 1;
        setTurns((turns) => appendTurnOnce(turns, event.turn as ConductorTurn));
        // Ask main what remains actionable instead of blindly clearing: this
        // result may belong to an older confirmation while a newer proposal is
        // already current in the same conversation.
        if (!disconnectedLocalReceipt) void reconcileAction(event.conversationId);
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
    if (event.kind === "replace") {
      streamingRef.current = event.text ?? "";
      setStreamingText(streamingRef.current);
      return;
    }
    if (event.kind === "done") {
      const settledFlight = inFlightRef.current;
      streamingRef.current = "";
      setStreamingText("");
      setStreaming(false);
      setCommentary(false);
      inFlightRef.current = null;
      if (event.turn) setTurns((turns) => appendTurnOnce(turns, event.turn as ConductorTurn));
      // An authenticated action field is authoritative even when it clears
      // the stage. Without one, reconcile the current main-owned projection.
      if (event.action !== undefined) {
        actionVersionRef.current += 1;
        applyAction(event.action);
      } else void reconcileAction(event.conversationId);
      const settlementKind = settledFlight?.actionReply?.kind ?? settledFlight?.settlementKind;
      if (settlementKind) settleTargetedReply(settlementKind, event.action ?? null);
      return;
    }
    // A comment that ends without a done — failed, stopped, or too large —
    // is dropped by main with nothing persisted and nothing to say (see
    // service.ts). Release the indicator just as quietly: no error bubble,
    // and no stopped-early echo of a partial turn that was never saved
    // (Task 153).
    // A terminal stream failure can be the first observation of corrupted or
    // replaced connection authority. Refresh main-owned status immediately so
    // its recovery/reauthorization card never waits for a reload.
    void refreshStatus();
    if (event.turnKind === "commentary") {
      streamingRef.current = "";
      setStreamingText("");
      setCommentary(false);
      return;
    }
    // A provider error or a manual stop, both delivered as {kind:"error"}. Any
    // partial reply already captured is echoed as a stopped-early bubble —
    // matching what main persisted on abort — so nothing visible vanishes.
    const failedFlight = inFlightRef.current;
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
    actionVersionRef.current += 1;
    applyAction(null);
    void reconcileAction(event.conversationId);
    setRetryRequest(failedFlight?.text == null ? null : {
      text: failedFlight.text,
      composerOwned: failedFlight.composerOwned,
    });
    setError(event.message ?? "Cairn had a problem answering.");
    const settlementKind = failedFlight?.actionReply?.kind ?? failedFlight?.settlementKind;
    if (settlementKind) settleTargetedReply(settlementKind, null, true);
  }), [dir, status?.connected, setConvId, setRetryRequest, applyAction, reconcileAction, settleTargetedReply, refreshStatus]);

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
  // Card callers use the result to retain their own unsent draft on refusal.
  //
  // `quiet` belongs to the queue's flush below: a flush can arrive a beat
  // before main frees its stream lock (released in a finally AFTER the done
  // delta), so the first attempt leaves no mark on a refusal and the caller
  // retries shortly. A loud refusal keeps the words in the composer with a
  // "Try again" (Task 153).
  async function send(
    text: string,
    quiet = false,
    actionReply?: ConductorActionReply,
    composerOwned = true,
    queueAtFront = false,
  ): Promise<boolean> {
    if (!text.trim() || taskBusy || restoringConversation || conversationResettingRef.current) return false;
    // React does not commit `streaming` synchronously. Use the live flight as
    // the one-shot latch so two Answer/Defer/Set-aside presses in the same
    // event turn cannot replace each other's authenticated IDs or owner turn.
    if (actionReply !== undefined && inFlightRef.current !== null) return false;
    setError(null);
    setRetryRequest(null);
    // Queue instead of bounce (Task 155): while a reply or the envelope's
    // comment streams, main holds the project's one stream lock and would
    // refuse. The message waits visibly in the pending row instead — never a
    // phantom turn, never lost words.
    if ((!queueAtFront && queueRetryingRef.current) || inFlightRef.current !== null || streaming || commentary) {
      // A one-time action reply cannot be downgraded into an ordinary queued
      // message: its IDs are the authority. TaskCard is disabled while busy,
      // and this closes the race if a stream begins between render and click.
      if (actionReply !== undefined) return false;
      const queued = { text, quiet: true };
      setPendingNow((p) => queueAtFront ? [queued, ...p] : [...p, queued]);
      if (composerOwned) setComposer((current) => (current === text ? "" : current));
      return true;
    }
    conversationVersionRef.current += 1;
    if (composerOwned) setComposer((current) => (current === text ? "" : current));
    // Shown at once so typing feels answered, and held by identity so a refusal
    // can take back this exact turn and no other.
    const optimistic: ConductorTurn = { role: "owner", text, ts: new Date().toISOString() };
    setTurns((t) => [...t, optimistic]);
    setStreaming(true);
    streamingRef.current = "";
    setStreamingText("");

    const startingId = conversationIdRef.current;
    const inFlight: InFlight = { id: startingId, text, composerOwned, ...(actionReply ? { actionReply } : {}) };
    inFlightRef.current = inFlight;

    const response = await cairn.conductorSend({ dir, conversationId: startingId, text, ...(actionReply ? { actionReply } : {}) });
    if (inFlightRef.current !== inFlight) return true; // superseded by "New conversation" or another send meanwhile — this call still dispatched
    if (!response.ok) {
      // A refusal may be the first observation of corrupt connection state or
      // a changed project identity. Refresh even for a quiet queued refusal.
      void refreshStatus();
      const actionReplyCannotRetry = actionReply !== undefined
        && (response.message.startsWith("CONDUCTOR_ACTION_STALE:")
          || response.message.startsWith("CONDUCTOR_ACTION_REPLY_INVALID:")
          || response.message.startsWith("CONDUCTOR_SEND_INVALID:"));
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
      // explicit recovery (Task 153). A composer-originated send restores its
      // words only into the still-empty composer; card drafts and newer owner
      // edits remain in their own controls. "Try again" retains the exact text.
      if (!quiet) {
        if (composerOwned) setComposer((current) => (current === "" ? text : current));
        setRetryRequest(actionReplyCannotRetry ? null : { text, composerOwned, ...(actionReply ? { actionReply } : {}) });
        setError(response.message);
        if (actionReply) {
          if (startingId !== null) void reconcileAction(startingId);
          settleTargetedReply(actionReply.kind, actionRef.current, true);
        }
      }
      return false;
    }
    if (inFlight.id === null) {
      // The response resolved before any delta raced ahead of it — adopt now.
      inFlight.id = response.value.conversationId;
      setConvId(response.value.conversationId);
    }
    // Main retires every current action/preview at the accepted owner append.
    // Advance the async-reconciliation guard and clear both projections as one
    // local boundary: a proposal read that began before this append must never
    // resurrect its retired action while the replacement reply is pending.
    actionVersionRef.current += 1;
    applyAction(null);
    if (dispatch?.phase === "confirm") {
      dispatchToken.current += 1;
      setDispatch(null);
      setRealCallConfirmed(false);
    }
    return true;
  }

  /** A suggested next step is still the owner's ordinary message. Keep its
   * draft out of the composer on a refusal so the pressed note remains the
   * recovery control; once main accepts the send and that note steps aside,
   * return the owner to the shared writing field. */
  async function sendFollowup(suggestion: string): Promise<void> {
    const sent = await send(suggestion, false, undefined, false);
    if (!sent) {
      window.requestAnimationFrame(() => {
        const notes = followupsRef.current?.querySelectorAll<HTMLButtonElement>(".followup-note") ?? [];
        [...notes].find((note) => note.textContent === suggestion)?.focus();
      });
      return;
    }
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  /** Retire the exact main-owned final review before a typed correction can
   * become an owner turn. Clearing the local panel first closes duplicate
   * presses; awaiting main closes the authority boundary before send(). */
  async function discardOpenPreview(): Promise<string | null> {
    const open = dispatch?.phase === "confirm" ? dispatch : null;
    if (open === null) return null;
    dispatchToken.current += 1;
    setDispatch(null);
    setRealCallConfirmed(false);
    try {
      const discarded = await cairn.taskPreviewDiscard(dir, open.previewId ?? undefined);
      if (discarded.ok) return null;
      setDispatch({ ...open, error: discarded.message });
      return discarded.message;
    } catch {
      const message = "Cairn couldn't close that review. Your correction was not sent.";
      setDispatch({ ...open, error: message });
      return message;
    }
  }

  async function sendComposer(
    text: string,
    expectedCorrection?: Extract<ConductorActionReply, { kind: "correction" }>,
  ): Promise<boolean> {
    if (!text.trim() || correctionPendingRef.current || queueRetryingRef.current
        || conversationResettingRef.current) return false;
    const current = actionRef.current;
    if (current?.kind !== "task" || current.conversationId !== conversationIdRef.current) {
      if (expectedCorrection) {
        setRetryRequest(null);
        setError("That task is no longer current. Your correction was not sent.");
        settleTargetedReply(expectedCorrection.kind, current, true);
        return false;
      }
      return send(text);
    }
    const actionReply: Extract<ConductorActionReply, { kind: "correction" }> = expectedCorrection
      ?? { kind: "correction", actionId: current.actionId };
    if (actionReply.actionId !== current.actionId) {
      setRetryRequest(null);
      setError("That task is no longer current. Your correction was not sent.");
      settleTargetedReply(actionReply.kind, current, true);
      return false;
    }
    correctionPendingRef.current = true;
    setCorrectionPending(true);
    try {
      const discardError = await discardOpenPreview();
      if (discardError !== null) {
        setRetryRequest({ text, composerOwned: true, actionReply });
        setError(discardError);
        settleTargetedReply(actionReply.kind, current, true);
        return false;
      }
      return await send(text, false, actionReply);
    } finally {
      correctionPendingRef.current = false;
      setCorrectionPending(false);
    }
  }

  function retryLastSend(): void {
    const retry = retryRequestRef.current;
    if (retry === null) return;
    if (taskBusy || restoringConversation || streaming || commentary
        || correctionPendingRef.current || conversationResettingRef.current
        || inFlightRef.current !== null) return;
    setRetryRequest(null);
    if (retry.actionReply && !actionReplyIsCurrent(retry.actionReply)) {
      setError("That question or task is no longer current. Nothing was resent.");
      settleTargetedReply(retry.actionReply.kind, actionRef.current, true);
      const id = conversationIdRef.current;
      if (id !== null) void reconcileAction(id);
      return;
    }
    if (retry.actionReply?.kind === "correction") void sendComposer(retry.text, retry.actionReply);
    else void send(retry.text, false, retry.actionReply, retry.composerOwned);
  }

  // The queue's flush (Task 155): the moment nothing streams and no run
  // holds the gate, the oldest waiting message goes. The remaining ones
  // follow one at a time — each send re-raises `streaming`, which gates this
  // effect until that reply lands. If another stream has started meanwhile,
  // send() simply re-queues the message.
  useEffect(() => {
    // A fresh structured action must be reviewed before an older queued
    // ordinary message can retire it. An error must likewise keep its recovery
    // target mounted long enough to receive focus. The waiting bubble remains
    // visible and offers Take back in both cases.
    if (pending.length === 0 || queueRetrying || conversationResettingRef.current
        || streaming || commentary || taskBusy || action !== null
        || error !== null || settlementFocusPending) return;
    const [next, ...rest] = pending;
    setPendingNow(rest);
    void (async () => {
      if (next.quiet) setQueueRetryingNow(true);
      try {
        if (await send(next.text, next.quiet, undefined, false, true)) return;
        if (!next.quiet) return;
        await new Promise((resolve) => { setTimeout(resolve, 300); });
        // Re-enter through a fresh render instead of calling this effect's stale
        // send closure. Any newer action, error, run, or stream gates it first.
        setPendingNow((current) => [{ text: next.text, quiet: false }, ...current]);
      } catch {
        setRetryRequest({ text: next.text, composerOwned: false });
        setError("Cairn couldn't send that waiting message. Try again.");
      } finally {
        if (next.quiet) setQueueRetryingNow(false);
      }
    })();
    // `send` is this render's closure over refs and setters only — safe.
  }, [pending, queueRetrying, streaming, commentary, taskBusy, action, error, settlementFocusPending, setQueueRetryingNow, setPendingNow]);

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendComposer(composer);
    }
  }

  async function newConversation() {
    if (captureSettling || correctionPendingRef.current || queueRetryingRef.current
        || conversationResettingRef.current) return;
    setConversationResettingNow(true);
    // Freeze and return the old queue before the first await. The synchronous
    // ref above closes sends immediately; the state closes visible controls on
    // the next render. No later message can enter this snapshot and be erased.
    const returning = pendingRef.current;
    setPendingNow([]);
    if (returning.length > 0) {
      const returned = returning.map((message) => message.text).join("\n");
      setComposer((current) => (current === "" ? returned : `${current}\n${returned}`));
    }
    try {
      if (inFlightRef.current !== null || streaming || commentary) {
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
      setQueueRetryingNow(false);
      setError(null);
      setRetryRequest(null);
      setSettledAnnouncement(null);
      pendingFocusRef.current = null;
      setSettlementFocusPending(false);
      conversationVersionRef.current += 1;
      actionVersionRef.current += 1;
      applyAction(null);
      setOpenedCards(new Set());
      if (dispatch?.phase === "confirm") {
        dispatchToken.current += 1;
        await cairn.taskPreviewDiscard(dir, dispatch.previewId ?? undefined);
      }
      // A running dispatch — including its short terminal-picture barrier —
      // belongs to the project, not to the conversation it was started from,
      // so it stays on screen; an undecided one goes with the proposal.
      setDispatch((current) => (current !== null
        && (current.phase === "running" || current.phase === "settling") ? current : null));
      setRealCallConfirmed(false);
    } finally {
      setConversationResettingNow(false);
    }
  }

  function actionIsCurrent(candidate: ConductorAction): boolean {
    return actionRef.current?.actionId === candidate.actionId
      && candidate.conversationId === conversationIdRef.current;
  }

  function actionReplyIsCurrent(reply: ConductorActionReply): boolean {
    const current = actionRef.current;
    if (current === null || current.actionId !== reply.actionId || current.conversationId !== conversationIdRef.current) return false;
    if (reply.kind === "answer" || reply.kind === "defer") return current.kind === "question";
    if (reply.kind === "correction") return current.kind === "task";
    return current.kind === "task" && current.risks.some((risk) => risk.riskId === reply.riskId);
  }

  function onQuestionAnswer(candidate: Extract<ConductorAction, { kind: "question" }>, answer: string): Promise<boolean> {
    const actionReply: ConductorActionReply = { kind: "answer", actionId: candidate.actionId };
    if (!actionIsCurrent(candidate)) {
      setRetryRequest(null);
      setError("That question is no longer current. Wait for Cairn's latest reply.");
      settleTargetedReply(actionReply.kind, actionRef.current, true);
      return Promise.resolve(false);
    }
    return send(answer, false, actionReply, false);
  }

  function onQuestionDefer(candidate: Extract<ConductorAction, { kind: "question" }>): Promise<boolean> {
    const actionReply: ConductorActionReply = { kind: "defer", actionId: candidate.actionId };
    if (!actionIsCurrent(candidate)) {
      setRetryRequest(null);
      setError("That question is no longer current. Wait for Cairn's latest reply.");
      settleTargetedReply(actionReply.kind, actionRef.current, true);
      return Promise.resolve(false);
    }
    return send("I'm not sure — you decide", false, actionReply, false);
  }

  function onCardSetAside(candidate: Extract<ConductorAction, { kind: "task" }>, risk: Extract<ConductorAction, { kind: "task" }>["risks"][number]): Promise<boolean> {
    const current = actionRef.current;
    const exactRisk = current?.kind === "task" && current.actionId === candidate.actionId
      ? current.risks.find((item) => item.riskId === risk.riskId && item.text === risk.text)
      : undefined;
    const actionReply: ConductorActionReply = { kind: "set-risk-aside", actionId: candidate.actionId, riskId: risk.riskId };
    if (!actionIsCurrent(candidate) || exactRisk === undefined) {
      setRetryRequest(null);
      setError("That risk is no longer current. Wait for Cairn's latest proposal.");
      settleTargetedReply(actionReply.kind, actionRef.current, true);
      return Promise.resolve(false);
    }
    return send(
      "I understand the risk you raised — set it aside and keep the task as proposed.",
      false,
      actionReply,
      false,
    );
  }

  // "Send to dispatch": open the confirmation panel for BOTH parts of the
  // request at once, then ask main which adapter would take it and what it
  // would disclose. The panel shows immediately so the press is never
  /**
   * The renderer presses only what the card offered and echoes the card it was
   * shown. Main re-derives that card before deciding, so a card this panel has
   * been holding while something changed approves nothing.
   *
   * The token is the same guard the other dispatch actions use: a second
   * dispatch opened meanwhile owns the panel now.
   */
  async function decideCriticCall(call: CriticCallDisclosureV1, action: CriticCallActionV1): Promise<void> {
    const token = dispatchToken.current;
    if (criticCallBusy || !call.actions.includes(action)) return;
    setCriticCallBusy(true);
    try {
      const response = await cairn.criticCallDecide({
        dir,
        approvalId: call.approvalId,
        action,
        disclosure: call,
      });
      if (dispatchToken.current !== token) return;
      if (response.ok) {
        setError(null);
        setSession((current) => current === null ? null : { ...current, criticCall: undefined });
        setCalibrationCall(null);
      } else {
        setError(response.message);
      }
      setDispatch((current) => current === null ? null : {
        ...current,
        // A refusal leaves the approval standing in main, so the card stays
        // pressable here; only a decision that succeeded removes it.
        criticCall: response.ok ? null : current.criticCall,
        error: response.ok ? current.error : response.message,
      });
    } catch {
      if (dispatchToken.current !== token) return;
      setError("Cairn could not record that critic-call decision.");
      setDispatch((current) => current === null ? null : {
        ...current,
        error: "Cairn could not record that critic-call decision.",
      });
    } finally {
      // Unconditional, for the same reason as the run screen: a cancel or a
      // second dispatch bumps the token, and a guarded reset would disable the
      // card permanently for the life of the window.
      setCriticCallBusy(false);
    }
  }

  async function applyTaskReviewChoice(actionId: string, action: TaskReviewActionChoice): Promise<void> {
    const token = dispatchToken.current;
    const expectedPreviewId = dispatch?.previewId ?? null;
    if (expectedPreviewId === null || dispatch === null || dispatch.taskReview === null
      || !dispatch.taskReview.criteria.some((criterion) => criterion.ownerChecks.some((check) => check.action?.actionId === actionId))
      || pendingTaskReviewAction.current?.token === token) return;
    const pending = { token, actionId };
    pendingTaskReviewAction.current = pending;
    const request = action.kind === "observe"
      ? { dir, actionId, action: { kind: "observe" as const, decision: action.decision } }
      : action.kind === "resolve"
        ? { dir, actionId, action: { kind: "resolve" as const, decision: action.decision } }
        : { dir, actionId, action: { kind: "review-cairn-failure" as const, decision: action.decision } };
    let response: Awaited<ReturnType<typeof cairn.taskReviewAction>>;
    try {
      response = await cairn.taskReviewAction(request);
    } catch {
      if (pendingTaskReviewAction.current === pending) pendingTaskReviewAction.current = null;
      if (dispatchToken.current !== token) return;
      setDispatch((current) => current === null || current.previewId !== expectedPreviewId ? current : {
        ...current, error: "Cairn could not apply that owner-check choice. Review the current task again.",
      });
      return;
    }
    if (pendingTaskReviewAction.current === pending) pendingTaskReviewAction.current = null;
    if (dispatchToken.current !== token) return;
    setDispatch((current) => current === null || current.previewId !== expectedPreviewId || current.taskReview === null
      || !current.taskReview.criteria.some((criterion) => criterion.ownerChecks.some((check) => check.action?.actionId === actionId))
      ? current
      : response.ok
        ? { ...current, taskReview: response.value, error: null }
        : { ...current, error: response.message });
  }

  /** A reloaded running session has no live dispatch preview. Its opaque
   * Main-owned action id remains the only authority this renderer returns. */
  async function applyRunningTaskReviewChoice(actionId: string, action: TaskReviewActionChoice): Promise<void> {
    const held = session;
    const token = dispatchToken.current;
    if (held?.phase !== "running" || held.taskReview === undefined
      || !held.taskReview.criteria.some((criterion) => criterion.ownerChecks.some((check) => check.action?.actionId === actionId))
      || pendingTaskReviewAction.current?.token === token) return;
    const pending = { token, actionId };
    pendingTaskReviewAction.current = pending;
    const request = action.kind === "observe"
      ? { dir, actionId, action: { kind: "observe" as const, decision: action.decision } }
      : action.kind === "resolve"
        ? { dir, actionId, action: { kind: "resolve" as const, decision: action.decision } }
        : { dir, actionId, action: { kind: "review-cairn-failure" as const, decision: action.decision } };
    let applied = false;
    try {
      const response = await cairn.taskReviewAction(request);
      if (pendingTaskReviewAction.current !== pending || dispatchToken.current !== token) return;
      pendingTaskReviewAction.current = null;
      if (!response.ok) { setError(response.message); return; }
      applied = true;
      setError(null);
      setSession((current) => current?.phase === "running" && current.startedAt === held.startedAt
        && current.acceptedPreviewId === held.acceptedPreviewId
        ? { ...current, taskReview: response.value }
        : current);
      await refreshSession();
    } catch {
      if (pendingTaskReviewAction.current === pending) pendingTaskReviewAction.current = null;
      if (dispatchToken.current !== token) return;
      setError(applied
        ? "That owner-check choice was recorded, but Cairn could not refresh the running session."
        : "Cairn could not apply that owner-check choice. Review the accepted task again.");
    }
  }

  async function decideRepairCall(request: RepairCallDecisionRequest): Promise<void> {
    const held = session;
    if (repairCallBusy || held?.phase !== "running" || held.repairCall === undefined
      || request.dir !== dir || request.disclosure !== held.repairCall
      || request.approvalId !== held.repairCall.approvalId
      || !held.repairCall.actions.includes(request.action)) return;
    setRepairCallBusy(true);
    let recorded = false;
    try {
      const response = await cairn.repairCallDecide(request);
      if (!response.ok) { setError(response.message); return; }
      recorded = true;
      setError(null);
      setSession((current) => current?.phase === "running" && current.startedAt === held.startedAt
        && current.repairCall?.approvalId === request.approvalId
        ? { ...current, repairCall: undefined }
        : current);
      await refreshSession();
    } catch {
      setError(recorded
        ? "The repair-call decision was recorded, but Cairn could not refresh the running session."
        : "Cairn could not record that repair-call decision.");
    } finally {
      setRepairCallBusy(false);
    }
  }

  /** Answer the one unsealed candidate this project is paused on. The renderer
   * returns only the pause's own id and one of the choices that pause listed;
   * it reconstructs nothing and decides nothing about the result. */
  /* The critic offer beside the pause. This press settles nothing: it either
   * spends the one disclosed request or declines it, and the pause's own
   * choices stay exactly where they were. It echoes back only the checkpoint
   * id the offer carried. */
  async function decideCandidateCritique(
    critique: CandidateCritiqueProjectionV1,
    action: CandidateCritiqueAction,
  ): Promise<void> {
    const held = session;
    if (candidateCritiqueBusy || held?.phase !== "running"
      || held.unsealedCandidateCritique?.checkpointId !== critique.checkpointId) return;
    setCandidateCritiqueBusy(true);
    try {
      const response = await cairn.candidateCritiqueDecide({
        dir,
        checkpointId: critique.checkpointId,
        action,
      });
      if (!response.ok) { setError(response.message); return; }
      setError(null);
      await refreshSession();
    } catch {
      setError("Cairn could not reach that inspection.");
    } finally {
      setCandidateCritiqueBusy(false);
    }
  }

  async function chooseUnsealedCandidate(
    candidate: UnsealedCandidateProjectionV1,
    choice: UnsealedCandidateChoice,
    ownerAnswers: Readonly<Record<string, UnsealedCandidateOwnerAnswer>> = {},
  ): Promise<void> {
    const held = session;
    if (unsealedCandidateBusy || held?.phase !== "running" || held.unsealedCandidate !== candidate
      || !candidate.choices.includes(choice)) return;
    setUnsealedCandidateBusy(true);
    let recorded = false;
    try {
      const response = await cairn.unsealedCandidateDecide({
        dir,
        checkpointId: candidate.checkpointId,
        choice,
        // Only rows the owner actually answered. An omission stays unanswered,
        // and main decides what that means — it is never read as approval here.
        ownerAnswers: choice === "continue" ? ownerAnswers : {},
      });
      if (!response.ok) { setError(response.message); return; }
      recorded = true;
      setError(null);
      setSession((current) => current?.phase === "running" && current.startedAt === held.startedAt
        && current.unsealedCandidate?.checkpointId === candidate.checkpointId
        ? { ...current, unsealedCandidate: undefined }
        : current);
      await refreshSession();
    } catch {
      setError(recorded
        ? "That choice was recorded, but Cairn could not refresh the running session."
        : "Cairn could not record that choice about the unsealed candidate.");
    } finally {
      setUnsealedCandidateBusy(false);
    }
  }

  /**
   * Task 244. The owner confirmed one allegation and pressed for the one
   * correction it named.
   *
   * Same channel, same pause. Main re-checks that these words really came from
   * a critic for this checkpoint, and Core re-checks the row and the correction
   * again before it dispatches anything, so nothing here is trusted.
   */
  async function askUnsealedCandidateRepair(
    candidate: UnsealedCandidateProjectionV1,
    checkId: string,
    correction: string,
  ): Promise<void> {
    const held = session;
    if (unsealedCandidateBusy || held?.phase !== "running" || held.unsealedCandidate !== candidate
      || !candidate.repairAvailable) return;
    setUnsealedCandidateBusy(true);
    let recorded = false;
    try {
      const response = await cairn.unsealedCandidateDecide({
        dir,
        checkpointId: candidate.checkpointId,
        choice: UNSEALED_CANDIDATE_REPAIR_CHOICE,
        // A repair spends the owner's row judgments rather than carrying them:
        // the code they judged is about to change under them.
        ownerAnswers: {},
        repair: { checkId, correction },
      });
      if (!response.ok) { setError(response.message); return; }
      recorded = true;
      setError(null);
      setSession((current) => current?.phase === "running" && current.startedAt === held.startedAt
        && current.unsealedCandidate?.checkpointId === candidate.checkpointId
        ? { ...current, unsealedCandidate: undefined, unsealedCandidateCritique: undefined }
        : current);
      await refreshSession();
    } catch {
      setError(recorded
        ? "That correction was requested, but Cairn could not refresh the running session."
        : "Cairn could not ask for that correction.");
    } finally {
      setUnsealedCandidateBusy(false);
    }
  }

  async function decideHarnessRevision(request: Q9HarnessRevisionDecisionRequest): Promise<void> {
    const held = session;
    if (harnessRevisionBusy || held?.phase !== "running" || held.harnessRevision === undefined
      || request.dir !== dir || request.disclosure !== held.harnessRevision
      || request.approvalId !== held.harnessRevision.approvalId
      || !held.harnessRevision.actions.includes(request.action)) return;
    setHarnessRevisionBusy(true);
    let recorded = false;
    try {
      const response = await cairn.harnessRevisionDecide(request);
      if (!response.ok) { setError(response.message); return; }
      recorded = true;
      setError(null);
      setSession((current) => current?.phase === "running" && current.startedAt === held.startedAt
        && current.harnessRevision?.approvalId === request.approvalId
        ? { ...current, harnessRevision: undefined }
        : current);
      await refreshSession();
    } catch {
      setError(recorded
        ? "The harness decision was recorded, but Cairn could not refresh the running session."
        : "Cairn could not record that harness decision.");
    } finally {
      setHarnessRevisionBusy(false);
    }
  }

  function onCardSend(candidate: Extract<ConductorAction, { kind: "task" }>): void {
    if (conversationResettingRef.current) return;
    if (!actionIsCurrent(candidate) || candidate.risks.length > 0) {
      setRetryRequest(null);
      setError("That proposed task is no longer current. Ask Cairn to propose it again.");
      return;
    }
    const token = dispatchToken.current + 1;
    dispatchToken.current = token;
    setError(null);
    setRetryRequest(null);
    setRealCallConfirmed(false);
    setDispatch({ previewId: null, request: null, context: [], taskSpecPreview: null, taskReview: null, criticCall: null, route: null, disclosure: null, checkMenu: [], phase: "confirm", error: null });
    void cairn.taskRoute({
      dir,
      source: { kind: "proposal", proposalId: candidate.actionId, conversationId: candidate.conversationId },
    }).then((response) => {
      if (dispatchToken.current !== token) return; // a newer dispatch replaced this one
      if (!response.ok && response.message.startsWith("TASK_PROPOSAL_STALE:")) {
        setDispatch(null);
        setRealCallConfirmed(false);
        setRetryRequest(null);
        setError(response.message);
        focusRecovery("Cairn could not open that review. The recovery choice is ready.");
        void reconcileAction(candidate.conversationId);
        return;
      }
      setDispatch((current) => (current === null ? null : {
        ...current,
        previewId: response.ok ? response.value.previewId : null,
        request: response.ok ? response.value.request : current.request,
        context: response.ok ? response.value.context : current.context,
        taskSpecPreview: response.ok ? response.value.taskSpecPreview ?? null : current.taskSpecPreview,
        taskReview: response.ok ? response.value.taskReview ?? null : current.taskReview,
        criticCall: response.ok ? response.value.criticCall ?? null : null,
        route: response.ok ? response.value.route : null,
        checkMenu: response.ok ? response.value.checkMenu : [],
        disclosure: response.ok ? response.value.disclosure ?? null : null,
        error: response.ok ? null : response.message,
      }));
    });
  }

  // The paid-call pause ends here. Everything the run receives — the frozen
  // intent and confirmed disclosure — is the panel's own state, so what
  // starts is what was on screen.
  //
  // The token is the same guard `onCardSend` uses, for the same reason: a run
  // takes a long time to answer, and a second dispatch opened meanwhile owns
  // the panel now. Without it, the first run's late answer would clear or
  // error-stamp a panel the owner is still reading.
  async function startDispatch(request: Dispatch, worker: boolean) {
    if (conversationResettingRef.current) return;
    if (worker && !realCallConfirmed) return;
    if (request.previewId === null) return;
    const token = dispatchToken.current + 1;
    dispatchToken.current = token;
    setDispatch({ ...request, phase: "running", error: null });
    const response = await cairn.taskRun({
      dir,
      previewId: request.previewId,
      realCallConfirmed: worker && realCallConfirmed,
      disclosure: request.disclosure ?? undefined,
      // Every displayed row, with who answers it. Sent only when the owner
      // actually chose: an EMPTY object means "opted in but chose nothing",
      // which main rightly refuses as incomplete. Choosing none at all is
      // declining the card, and that run carries no promises — exactly the run
      // Cairn made before this card existed. Partial choices still refuse.
      checkSelections: Object.keys(checkSelections).length === 0 ? undefined : checkSelections,
    });
    if (dispatchToken.current !== token) return; // a newer dispatch owns the panel now
    if (!response.ok) {
      const accepted = await cairn.taskCurrent(dir);
      if (accepted?.acceptedPreviewId === request.previewId && accepted.phase === "closed" && accepted.error) {
        if (accepted.conversationId) await reconcileAction(accepted.conversationId);
        setDispatch(null);
        setRealCallConfirmed(false);
        void refreshSession();
        return;
      }
      setDispatch({ ...request, phase: "confirm", error: response.message });
      return;
    }
    if (response.value.status === "connection-required") {
      setDispatch(null);
      setRealCallConfirmed(false);
      setRetryRequest(null);
      setError("The reviewed worker is no longer available. Nothing was started; review the proposal again.");
      void refreshSession(); // this close leaves a closed session too — the strip must not keep showing it as running
      return;
    }
    // The confirmation panel's work is done: the run's own records are on
    // disk, the status strip below carries its terminal state, and the
    // envelope posts its own result card into this conversation.
    if (conversationIdRef.current) await reconcileAction(conversationIdRef.current);
    setDispatch(null);
    setRealCallConfirmed(false);
    // Main's reconciliation removes only the proposal this dispatch spent:
    // its still-clickable "Send to dispatch" would otherwise
    // offer to re-run a task that is already running — and crowd the next
    // proposal out of the conversation's attention.
    void refreshSession();
  }

  function cancelDispatch(request: Dispatch): void {
    if (conversationResettingRef.current) return;
    dispatchToken.current += 1;
    dispatchFocusReturnPendingRef.current = true;
    setDispatch(null);
    setRealCallConfirmed(false);
    void cairn.taskPreviewDiscard(dir, request.previewId ?? undefined);
  }

  const lastReply = [...turns].reverse().find(
    (turn): turn is ConductorChatTurn & { role: "cairn" } => turn.role === "cairn",
  ) ?? null;
  // Fold away the past (Task 155): the turn index of the newest result card.
  // Every older card renders as a one-line chip that toggles its card back
  // into view; only this one stays expanded on its own.
  const latestCardIndex = turns.reduce((found, turn, i) => (turn.role === "envelope" ? i : found), -1);
  // Builder evidence is not a new interactive word. It must not retire the
  // latest Cairn follow-ups, while an owner message or result card still does.
  const latestNonBuilderTurnIndex = turns.reduce(
    (found, turn, i) => (turn.role === "builder-review" ? found : i), -1,
  );
  // Needs-you dot (Task 155): tucked away, the chip says when something
  // inside waits on the owner — a proposed task to decide, a dispatch to
  // confirm, or a push to approve.
  const actionCurrent = action !== null
    && actionRef.current?.actionId === action.actionId
    && action.conversationId === conversationId;
  const proposalNeedsYou = actionCurrent && !taskBusy;
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
  // Presentation state comes only from the main-owned session. It adds no
  // words and owns no behavior; CSS uses it for a supplemental non-color mark
  // beside the real live-region text below.
  const runThreadState = session?.phase === "running"
    ? "running"
    : session?.error
      ? "error"
      : session?.result?.status === "done"
        ? "done"
        : session?.result?.status === "stopped"
          ? "stopped"
          : "closed";
  const dispatchRoute = dispatch?.route ?? null;
  const dispatchReady = dispatchRoute !== null && dispatchRoute.status === "ready" ? dispatchRoute : null;
  // A real worker lane is anything that is not the offline demo — a
  // capability check, never an adapter-id check, so a third adapter needs no
  // change here.
  const dispatchWorker = dispatchReady !== null && !dispatchReady.recommended.capabilities.includes("offline-demo");
  const runStrip = session ? (
    <div className="run-strip" data-run-state={runThreadState}>
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
  ) : null;

  const column = (
      <div className={`chat-column${status?.connected ? "" : " chat-column-static"}${embedded ? " chat-column-villager" : ""}`}
        role={embedded ? "dialog" : undefined} aria-label={embedded ? "Conversation with Cairn" : undefined}
        data-conversation-restore={restoringConversation ? "pending" : "settled"}>
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
        {calibrationCall ? (
          <CriticCallCard
            call={calibrationCall}
            busy={criticCallBusy}
            onDecide={(action) => void decideCriticCall(calibrationCall, action)}
          />
        ) : null}
        {status && !status.connected ? <ConnectCard status={status} onConnected={() => void refreshStatus()} /> : null}
        {status && !status.connected && turns.some((turn) => turn.role === "envelope" || turn.role === "builder-review") ? (
          <div className="chat-messages chat-local-results" aria-label="Saved conversation evidence">
            {/* Main authenticates both local evidence roles before returning
              * them. Disconnected mode still excludes owner/Cairn prose,
              * actions, streams, push controls and composer authority. */}
            {turns.map((turn, i) => turn.role === "envelope" ? (
              <ResultCardView key={i} card={turn.card} dir={dir} onOpenRun={onOpenRun} />
            ) : turn.role === "builder-review" ? (
              <BuilderProposalReview key={turn.displayTurnId} review={turn.review} />
            ) : null)}
            <div ref={endRef} />
          </div>
        ) : null}
        {status && !status.connected ? runStrip : null}

        {status?.connected ? (
          <>
            <p className="sr-only action-settled-status" role="status" aria-live="polite" aria-atomic="true">
              {settledAnnouncement ? <span key={settledAnnouncement.sequence}>{settledAnnouncement.text}</span> : null}
            </p>
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
              ) : turn.role === "builder-review" ? (
                <BuilderProposalReview key={turn.displayTurnId} review={turn.review} />
              ) : (
                <Fragment key={i}>
                  <div className={`bubble ${turn.role === "owner" ? "bubble-owner" : "bubble-cairn"}${
                    turn.role === "cairn" && turn === lastReply && action?.kind === "question" && actionCurrent
                      && activeQuestionLead(turn.text, action.question) === "" ? " bubble-active-question-only" : ""
                  }`}>
                    {turn.role === "cairn" && turn === lastReply ? (
                      <h2 className="sr-only settled-reply-heading" ref={settledReplyRef} tabIndex={-1}>Cairn replied</h2>
                    ) : null}
                    {turn.role === "owner" ? turn.text : (
                      <Md text={turn === lastReply && action?.kind === "question" && actionCurrent
                        ? activeQuestionLead(turn.text, action.question)
                        : turn.text} />
                    )}
                  </div>
                  {/* Task 157: the commentary's follow-up suggestions, offered
                    * only while they are the conversation's latest word — once
                    * anything newer lands (a tap sends the suggestion itself,
                    * which appends the owner's turn), they step aside. A tap is
                    * an ordinary send(): it queues, refuses, and retries exactly
                    * like typed text, and it can never dispatch anything by
                    * itself — the proposal card and its gates still decide. */}
                  {turn.role === "cairn" && i === latestNonBuilderTurnIndex && turn.followups && turn.followups.length > 0 ? (
                    <div className="followups" ref={followupsRef} data-followups-state="ready" role="group" aria-label="Cairn's suggestions for what to do next">
                      <div className="followups-heading">
                        <p className="followups-label">Where we could go next</p>
                        <p className="small muted followups-hint">Tap one to send it as your message.</p>
                      </div>
                      <div className="followups-list">
                        {turn.followups.map((suggestion) => (
                          <button key={suggestion} type="button" className="followup-note"
                            disabled={runActive || conversationResetting}
                            onClick={() => void sendFollowup(suggestion)}>{suggestion}</button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Fragment>
              )))}
              {action?.kind === "question" && actionCurrent && !taskBusy ? (
                <QuestionCard key={action.actionId} question={action.question}
                  busy={streaming || commentary || correctionPending || queueRetrying || conversationResetting}
                  headingRef={replacementActionRef}
                  onAnswer={(answer) => onQuestionAnswer(action, answer)}
                  onDefer={() => onQuestionDefer(action)} />
              ) : null}
              {action?.kind === "task" && actionCurrent && !taskBusy && dispatch?.phase !== "confirm" ? (
                <>
                  <TaskCard key={action.actionId} action={action}
                    busy={streaming || commentary || correctionPending || queueRetrying || conversationResetting}
                    current={actionCurrent} headingRef={replacementActionRef}
                    onSetAside={(risk) => onCardSetAside(action, risk)}
                    onSend={() => onCardSend(action)} />
                  {action.taskSpecPreview ? (
                    <TaskSpecProposalPreviewView preview={action.taskSpecPreview} heading="Quality plan for this proposal" />
                  ) : null}
                </>
              ) : null}
              {session?.phase === "running" && session.taskReview ? (
                <TaskReviewView review={session.taskReview} heading="Accepted Task Spec"
                  onAction={(actionId, choice) => void applyRunningTaskReviewChoice(actionId, choice)} />
              ) : null}
              {session?.phase === "running" && session.criticCall ? (
                <CriticCallCard
                  call={session.criticCall}
                  busy={criticCallBusy}
                  onDecide={(action) => void decideCriticCall(session.criticCall!, action)}
                />
              ) : null}
              {session?.phase === "running" && session.repairCall ? (
                <RepairCallCard
                  dir={dir}
                  call={session.repairCall}
                  busy={repairCallBusy}
                  onDecide={(request) => void decideRepairCall(request)}
                />
              ) : null}
              {session?.phase === "running" && session.harnessRevision ? (
                <HarnessRevisionCard
                  dir={dir}
                  revision={session.harnessRevision}
                  busy={harnessRevisionBusy}
                  onDecide={(request) => void decideHarnessRevision(request)}
                />
              ) : null}
              {session?.phase === "running" && session.unsealedCandidate ? (
                <UnsealedCandidateCard
                  candidate={session.unsealedCandidate}
                  busy={unsealedCandidateBusy}
                  onChoose={(choice, ownerAnswers) =>
                    void chooseUnsealedCandidate(session.unsealedCandidate!, choice, ownerAnswers)}
                  critique={session.unsealedCandidateCritique
                    && session.unsealedCandidateCritique.checkpointId === session.unsealedCandidate.checkpointId
                    ? (
                      <CandidateCritiqueCard
                        critique={session.unsealedCandidateCritique}
                        busy={candidateCritiqueBusy || unsealedCandidateBusy}
                        onDecide={(action) =>
                          void decideCandidateCritique(session.unsealedCandidateCritique!, action)}
                        openRowIds={unsealedCandidateOpenRowIds(session.unsealedCandidate.promises)}
                        repairAvailable={session.unsealedCandidate.repairAvailable}
                        adapterLabel={session.unsealedCandidate.adapterLabel}
                        onRepair={(checkId, correction) =>
                          void askUnsealedCandidateRepair(session.unsealedCandidate!, checkId, correction)}
                      />
                    )
                    : undefined}
                />
              ) : null}
              {dispatch && dispatch.phase !== "settling" ? (
                <section className="card dispatch-panel" data-dispatch-phase={dispatch.phase}
                  aria-labelledby={dispatch.phase === "confirm" ? dispatchHeadingId : undefined}
                  aria-label={dispatch.phase === "running" ? "Task handoff" : undefined}>
                  {dispatch.phase === "running" ? (
                    <>
                      <p className="small muted dispatch-running" role="status">Cairn is working on this. Its notes are saved in your project's docs/ai-work folder.</p>
                    </>
                  ) : (
                    <>
                      <h2 id={dispatchHeadingId} className="card-title dispatch-heading"
                        ref={dispatchHeadingRef} tabIndex={-1}>Start this task</h2>
                      {dispatch.taskReview !== null ? (
                        <>
                          <TaskReviewView review={dispatch.taskReview} heading="Final Task Spec" onAction={(actionId, choice) => void applyTaskReviewChoice(actionId, choice)} />
                          <p className="small muted dispatch-acceptance">
                            Starting does not turn a Cairn-chosen value or something you were unsure about into a required promise.
                            Only rows marked <strong>required promise</strong> are task-specific DONE gates; preferences stay advisory.
                          </p>
                        </>
                      ) : dispatch.taskSpecPreview !== null ? (
                        <>
                          <TaskSpecProposalPreviewView preview={dispatch.taskSpecPreview} heading="Final quality plan" />
                          <p className="small muted dispatch-acceptance">
                            Starting does not turn a Cairn-chosen value or something you were unsure about into a required promise.
                            Only rows marked <strong>required promise</strong> are task-specific DONE gates; safety, evidence,
                            critic policy, risk, data-sharing, cost, and provider approvals still keep their own controls.
                          </p>
                        </>
                      ) : dispatch.request !== null ? (
                        <>
                          <TaskIntentList request={dispatch.request} context={dispatch.context} heading="Final review" />
                          <TaskPromiseCard
                            request={dispatch.request}
                            menu={dispatch.checkMenu}
                            selections={checkSelections}
                            disabled={conversationResetting}
                            onSelect={(rowId, choice) =>
                              setCheckSelections((current) => ({ ...current, [rowId]: choice }))}
                          />
                          <p className="small muted dispatch-acceptance">
                            Starting accepts every displayed <strong>Cairn chose</strong> value as part of this task.
                            Separate risk, data-sharing, cost, and provider approvals still use their own controls below.
                          </p>
                        </>
                      ) : null}
                      {dispatch.criticCall !== null ? (
                        <CriticCallCard
                          call={dispatch.criticCall}
                          busy={criticCallBusy}
                          onDecide={(action) => void decideCriticCall(dispatch.criticCall!, action)}
                        />
                      ) : null}
                      {dispatch.error ? <p className="dispatch-error">{dispatch.error}</p> : null}
                      {dispatchRoute === null && !dispatch.error ? <p className="small muted dispatch-routing">Choosing who will do the work…</p> : null}
                      {dispatchRoute?.status === "connection-required" ? (
                        <div className="dispatch-connection">
                          <p>{dispatchRoute.reason}</p>
                          <p className="small muted">Install or sign in to Codex yourself through Codex's own controls. Cairn never opens a login, reads passwords, or picks a different provider.</p>
                        </div>
                      ) : null}
                      {dispatchReady && dispatch.disclosure ? (
                        <DisclosureConfirm
                          disclosure={dispatch.disclosure}
                          label={dispatchReady.recommended.label}
                          confirmed={realCallConfirmed}
                          onConfirmedChange={setRealCallConfirmed}
                        />
                      ) : null}
                      <div className="row dispatch-actions">
                        {dispatchReady ? (
                          <Pill kind="primary" disabled={conversationResetting || (dispatchWorker && !realCallConfirmed)}
                            onClick={() => void startDispatch(dispatch, dispatchWorker)}>
                            {dispatchWorker ? `Start one real ${dispatchReady.recommended.label} call` : "Run offline demonstration"}
                          </Pill>
                        ) : null}
                        <Pill kind="quiet" disabled={conversationResetting}
                          onClick={() => cancelDispatch(dispatch)}>Cancel</Pill>
                      </div>
                    </>
                  )}
                </section>
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
                  <p className="small muted commentary-stream-note">Commenting on the result above. Messages sent now wait below.</p>
                </div>
              ) : null}
              {/* The queue, made visible (Task 155): each message waiting for
                * the stream lock, in the order it will send, dimmed because
                * it has not gone yet — with a take-back that returns its
                * exact words to the composer. */}
              {pending.map((message, i) => (
                <div key={i} className="bubble bubble-owner bubble-pending">
                  {message.text}
                  <div className="row bubble-pending-controls">
                    <span className="small muted">{actionCurrent
                      ? "Waiting while Cairn needs your decision."
                      : error
                        ? "Waiting while you choose a recovery."
                        : "Will send when Cairn finishes."}</span>
                    <Pill kind="quiet" disabled={conversationResetting} onClick={() => {
                      setPendingNow((p) => p.filter((_, at) => at !== i));
                      setComposer((current) => (current === "" ? message.text : `${current}\n${message.text}`));
                    }}>Take back</Pill>
                  </div>
                </div>
              ))}
              {error ? (
                <div className="bubble bubble-system" ref={errorRecoveryRef} tabIndex={-1}>
                  <p>{error}</p>
                  {retryRequest ? (
                    <Pill kind="quiet" onClick={retryLastSend}
                      disabled={taskBusy || restoringConversation || streaming || commentary || correctionPending
                        || conversationResetting}>Try again</Pill>
                  ) : null}
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
            {runStrip}
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
                onKeyDown={onComposerKeyDown} placeholder="Talk with Cairn" rows={2}
                disabled={taskBusy || restoringConversation || correctionPending || queueRetrying || conversationResetting} />
              <div className="chat-composer-actions">
                <button type="button" className="pill pill-quiet"
                  disabled={restoringConversation || captureSettling || correctionPending
                    || queueRetrying || conversationResetting}
                  aria-label="New conversation"
                  onClick={() => void newConversation()}>New</button>
                <Pill kind="primary" onClick={() => void sendComposer(composer)}
                  disabled={taskBusy || restoringConversation || correctionPending || queueRetrying
                    || conversationResetting || !composer.trim()}>Send</Pill>
              </div>
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
