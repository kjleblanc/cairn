import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (file: string) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", file), "utf8");
const component = renderer(join("components", "EvidenceAlbum.tsx"));
const questionCard = renderer(join("components", "QuestionCard.tsx"));
const intentList = renderer(join("components", "TaskIntentList.tsx"));
const taskCard = renderer(join("components", "TaskCard.tsx"));
const taskReview = renderer(join("components", "TaskReview.tsx"));
const chat = renderer(join("screens", "Chat.tsx"));
const css = renderer("app.css");
const motion = renderer("motion.css");
const sharedIpc = readFileSync(join(__dirname, "..", "..", "src", "shared", "ipc.ts"), "utf8");
const conductorService = readFileSync(join(__dirname, "..", "..", "src", "main", "conductor", "service.ts"), "utf8");

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector} is missing`);
  return css.slice(start, css.indexOf("}", start));
}

test("checked pictures are the first content in an eligible result card", () => {
  const card = chat.indexOf('<article className="card result-card"');
  const evidence = chat.indexOf("<ResultEvidence", card);
  const title = chat.indexOf('<p className="card-title">Cairn&apos;s receipt', card);
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
  assert.match(chat, /disabled=\{taskBusy \|\| restoringConversation \|\| correctionPending \|\| queueRetrying \|\| conversationResetting\}/,
    "the composer can reopen while terminal evidence is being captured");
  assert.match(chat, /disabled=\{restoringConversation \|\| captureSettling \|\| correctionPending[\s\S]{0,100}\|\| queueRetrying \|\| conversationResetting\}[\s\S]*?New conversation/,
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

test("the structured question keeps raw owner bytes behind a labelled keyboard control", () => {
  assert.match(questionCard, /useId\(\)/);
  assert.match(questionCard, /<h2[^>]*ref=\{headingRef\}[^>]*tabIndex=\{-1\}/);
  assert.match(questionCard, /<label htmlFor=\{answerId\}>Your answer<\/label>/);
  assert.match(questionCard, /const rawAnswer = draft;[\s\S]*?onAnswer\(rawAnswer\)/,
    "Answer must submit the untrimmed draft rather than a display projection");
  assert.match(questionCard, /const answerDisabled = disabled \|\| !draft\.trim\(\)/);
  assert.match(questionCard, /event\.key !== "Enter"[\s\S]*?submitAnswer/);
  assert.match(questionCard, /I'm not sure \u2014 you decide/);
  assert.ok(!/onAnswer\([^)]*trim\(\)/.test(questionCard));
});

test("one semantic intent list carries all three visible sources and keeps quotations separate", () => {
  assert.match(intentList, /"owner-stated": "You said so"/);
  assert.match(intentList, /"owner-unsure": "You weren\u2019t sure"/);
  assert.match(intentList, /"cairn-chosen": "Cairn chose"/);
  assert.match(intentList, /<h2/);
  assert.match(intentList, /<ul/);
  assert.match(intentList, /<li/);
  assert.match(intentList, /row\.text/);
  assert.match(intentList, /row\.ownerText !== null[\s\S]*?<blockquote/,
    "the exact owner quotation is a separate quoted value");
  assert.match(intentList, /context[\s\S]*?>Context kept with the task/);
});

test("the proposal is a pure current-action view with no renderer-authored resolution", () => {
  assert.match(taskCard, /<TaskIntentList/);
  assert.match(taskCard, /risk\.riskId/);
  assert.match(taskCard, /<button[^>]*className="pill pill-primary"[^>]*>[\s\S]*?Review<\/button>/);
  assert.doesNotMatch(taskCard, /aria-label="Review dispatch"/);
  assert.match(taskCard, /disabled=\{busy \|\| !current \|\| action\.risks\.length > 0\}/);
  assert.ok(!taskCard.includes("useState"));
  assert.ok(!/const \[resolved|setResolved|task-chip-strike/.test(taskCard));
});

test("the proposal shows one decision and keeps its full evidence behind Details", () => {
  const outcome = taskCard.indexOf("action.request.outcome.text");
  const risks = taskCard.indexOf('className="task-card-risks"');
  const actions = taskCard.indexOf('className="row task-card-actions"');
  const details = taskCard.indexOf('<details className="task-card-details">');
  const summary = taskCard.indexOf("<summary>Details</summary>", details);
  const attributed = taskCard.indexOf("<TaskIntentList", summary);
  assert.ok(outcome !== -1 && risks > outcome && actions > risks && details > actions
      && summary > details && attributed > summary,
    "the compact outcome, concern, action, and complete disclosure are not in decision order");
  assert.match(taskCard, /action\.risks\.length === 0[\s\S]*?"Ready to review"[\s\S]*?action\.risks\.length === 1[\s\S]*?"One thing needs your call"/);
  assert.match(taskCard, /heading="Task details"/);
  assert.doesNotMatch(taskCard, /Any response retires this proposal|fresh review before anything can start/);
  assert.match(css, /\.task-card-details > summary \{[^}]*cursor: pointer/);
  assert.match(css, /\.task-card-outcome \{[^}]*font-weight:/);
});

test("main owns one concise acknowledgement for every settled task proposal", () => {
  assert.match(conductorService, /const PROPOSAL_ACKNOWLEDGEMENT = "Here's the plan\."/);
  assert.match(conductorService, /const SET_ASIDE_PENDING_ACKNOWLEDGEMENT = "Updating the plan\.\.\."/);
  assert.match(conductorService, /const SET_ASIDE_ACKNOWLEDGEMENT = "I carried that concern forward\."/);
  assert.match(conductorService, /nextAction\?\.kind === "task"[\s\S]*?text = setAsideReplacement === undefined \? PROPOSAL_ACKNOWLEDGEMENT : SET_ASIDE_ACKNOWLEDGEMENT/);
  assert.match(conductorService, /setAsideReplacement !== undefined[\s\S]*?SET_ASIDE_PENDING_ACKNOWLEDGEMENT[\s\S]*?actionableTaskCandidate\(\s*streamedCandidate,\s*historySnapshot\.authenticatedSources,[\s\S]*?setAsideQualityProposal,\s*\)[\s\S]*?kind: "replace", text: publicFull/);
  assert.doesNotMatch(conductorService, /replyStreamingPreview|REPLY_STREAMING_PREVIEW_LIMIT/);
  assert.match(conductorService, /const nextPublic = followupSafeStreamingText\(controlSafeStreamingText\(full\)\)/,
    "ordinary replies and commentary must share the complete private-control-safe streaming projection");
  assert.match(chat, /event\.kind === "replace"[\s\S]*?streamingRef\.current = event\.text \?\? ""[\s\S]*?setStreamingText\(streamingRef\.current\)/);
});

test("Chat sends exact authenticated question, defer, risk, and correction replies", () => {
  assert.match(chat, /<QuestionCard[\s\S]*?question=\{action\.question\}/);
  assert.match(chat, /\{ kind: "answer", actionId: candidate\.actionId \}/);
  assert.match(chat, /\{ kind: "defer", actionId: candidate\.actionId \}/);
  assert.match(chat, /send\("I'm not sure \u2014 you decide", false, actionReply, false\)/);
  assert.match(chat, /\{ kind: "set-risk-aside", actionId: candidate\.actionId, riskId: risk\.riskId \}/);
  assert.match(chat, /\{ kind: "correction", actionId: current\.actionId \}/);
  assert.match(chat, /await discardOpenPreview\(\)[\s\S]*?return await send\(text, false, actionReply\)/,
    "an open final preview is discarded before its correction reaches the conductor");
  assert.match(chat, /actionReply !== undefined && inFlightRef\.current !== null/,
    "one-time replies need a synchronous latch before React can disable their controls");
  assert.match(chat, /retry\.actionReply && !actionReplyIsCurrent\(retry\.actionReply\)/,
    "a saved one-time reply must still target main's current action before retry");
  assert.match(chat, /actionReply\.actionId !== current\.actionId/,
    "a correction retry must not retarget a newer task action");
  assert.match(chat, /function actionReplyIsCurrent[\s\S]*?if \(reply\.kind === "correction"\)[\s\S]*?return current\.kind === "task" && current\.risks\.some\(\(risk\) => risk\.riskId === reply\.riskId\)/,
    "a risk retry must keep its exact live risk authority");
  assert.match(chat, /composerOwned = true[\s\S]*?if \(composerOwned\) setComposer\(\(current\) => \(current === text \? "" : current\)\)/,
    "a composer-originated send may clear only the exact draft it is sending");
  assert.match(chat, /if \(composerOwned\) setComposer\(\(current\) => \(current === "" \? text : current\)\)/,
    "a refusal may restore sent text only when no newer draft occupies the composer");
  assert.match(chat, /setPendingNow\(\(p\) => queueAtFront \? \[queued, \.\.\.p\] : \[\.\.\.p, queued\]\)/,
    "a new message queues at the end while a raced queue-head retry returns to the front");
  assert.match(chat, /const setPendingNow[\s\S]*?pendingRef\.current = next;[\s\S]*?setPending\(next\)/,
    "queue updates must publish one synchronous live value as well as React state");
  assert.match(chat, /\(!queueAtFront && queueRetryingRef\.current\) \|\| inFlightRef\.current !== null \|\| streaming \|\| commentary/,
    "new owner prose must queue behind the head's retry window");
  assert.match(chat, /send\(next\.text, next\.quiet, undefined, false, true\)/);
  assert.match(chat, /if \(next\.quiet\) setQueueRetryingNow\(true\)[\s\S]*?setPendingNow\(\(current\) => \[\{ text: next\.text, quiet: false \}, \.\.\.current\]\)[\s\S]*?setQueueRetryingNow\(false\)/,
    "a refused quiet attempt must return to the front through current gates before later messages");
  assert.match(chat, /captureSettling \|\| correctionPendingRef\.current \|\| queueRetryingRef\.current[\s\S]{0,80}conversationResettingRef\.current/,
    "a queued message in its retry window must not cross into a new conversation");
  assert.match(chat, /if \(stream\?\.kind === "reply"\)[\s\S]{0,300}text: null,[\s\S]{0,200}stream\.settlementKind/,
    "an initial restored assistant stream must keep main's output-only settlement kind without guessing owner retry text");
  assert.match(chat, /latestStream\?\.conversationId === id && latestStream\.kind === "reply"[\s\S]{0,350}latestStream\.settlementKind/,
    "the restore race recheck must keep the exact latest main snapshot's settlement kind");
  assert.match(chat, /restoredOwnerTurn = \[\.\.\.saved\]\.reverse\(\)\.find\(\(turn\) => turn\.role === "owner"\)[\s\S]*?restoredOwnerText = restoredOwnerTurn\?\.role === "owner" \? restoredOwnerTurn\.text : null/);
  assert.match(chat, /failedFlight\?\.text == null \? null/,
    "an error that beats owner-turn restoration must expose no guessed retry");
  assert.ok(!/inFlightRef\.current = \{ id, text: (?:stream|latestStream)\.text/.test(chat));
  const reset = chat.slice(chat.indexOf("async function newConversation"), chat.indexOf("function actionIsCurrent"));
  const resetGuard = reset.indexOf("conversationResettingRef.current) return");
  const resetClose = reset.indexOf("setConversationResettingNow(true)");
  const liveQueue = reset.indexOf("const returning = pendingRef.current");
  const queueDrain = reset.indexOf("setPendingNow([])", liveQueue);
  const firstAwait = reset.indexOf("await cairn.conductorStop(dir)");
  assert.ok(resetGuard !== -1 && resetClose > resetGuard && liveQueue > resetClose
      && queueDrain > liveQueue && firstAwait > queueDrain,
    "conversation replacement must synchronously close sends and return the captured queue before its first await");
  assert.match(reset, /inFlightRef\.current !== null \|\| streaming \|\| commentary/,
    "a same-turn live send must be stopped even before streaming state renders");
  assert.match(chat, /restoringConversation \|\| conversationResettingRef\.current/,
    "even a same-turn composer press must be refused while conversation replacement owns the transition");
  assert.ok(!/setComposer\(\(current\) => \(current\.trim\(\)/.test(chat),
    "returning queued text must preserve even a whitespace-only newer draft");
  assert.match(chat, /return send\(answer, false, actionReply, false\)/);
  assert.match(chat, /return send\("I'm not sure — you decide", false, actionReply, false\)/);
  assert.match(chat, /actionReply,\s+false,\s+\);/,
    "the risk-card reply must leave the global composer untouched");
  const retry = chat.slice(chat.indexOf("function retryLastSend"), chat.indexOf("// The queue's flush"));
  assert.ok(retry.indexOf("inFlightRef.current !== null") < retry.indexOf("setRetryRequest(null)"),
    "retry must check synchronous busy state before consuming its one-shot request");
});

test("stale main refusals reconcile authority and expose no looping retry", () => {
  assert.match(chat, /response\.message\.startsWith\("CONDUCTOR_ACTION_STALE:"\)[\s\S]*?setRetryRequest\(actionReplyCannotRetry \? null/);
  assert.match(chat, /if \(actionReply\) \{[\s\S]*?reconcileAction\(startingId\)/,
    "a targeted main refusal must re-read the action main still owns");
  assert.match(chat, /response\.message\.startsWith\("TASK_PROPOSAL_STALE:"\)[\s\S]*?setDispatch\(null\)[\s\S]*?reconcileAction\(candidate\.conversationId\)/,
    "a stale route must close its review and reconcile the task card");
  assert.match(chat, /\{retryRequest \? \([\s\S]*?<Pill[^>]*>Try again/,
    "Try again exists only when an explicit retry request exists");
});

test("proposal, final preview, and result reuse the attributed intent list", () => {
  assert.equal((chat.match(/<TaskIntentList/g) ?? []).length, 2,
    "Chat keeps only its legacy final-review fallback and result-card intent instance");
  assert.equal((taskReview.match(/<TaskIntentList/g) ?? []).length, 1,
    "the one shared Task Review component owns the reusable Quality Plan intent view");
  assert.match(chat, /<TaskIntentList request=\{dispatch\.request\} context=\{dispatch\.context\}/);
  assert.match(chat, /setDispatch\(\{ previewId: null, request: null, context: \[\]/);
  assert.ok(!/setDispatch\(\{[^}]*request: (?:action|candidate)\.request/.test(chat));
  assert.match(chat, /Starting accepts every displayed <strong>Cairn chose<\/strong> value/);
  assert.match(chat, /<TaskIntentList request=\{card\.acceptedRequest\} heading="What you asked for"/);
});

test("action settlements announce once and focus only their deliberate destination", () => {
  assert.equal((chat.match(/aria-live="polite"/g) ?? []).length, 1);
  assert.match(chat, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(chat, /type InFlight[\s\S]*?actionReply\?: ConductorActionReply/);
  assert.match(chat, /settledFlight\?\.actionReply\?\.kind \?\? settledFlight\?\.settlementKind[\s\S]*?settleTargetedReply/);
  assert.match(chat, /failedFlight\?\.actionReply\?\.kind \?\? failedFlight\?\.settlementKind[\s\S]*?settleTargetedReply/);
  const snapshot = sharedIpc.slice(
    sharedIpc.indexOf("export interface ConductorStreamSnapshot"),
    sharedIpc.indexOf("export interface ConductorStatus"),
  );
  assert.match(snapshot, /settlementKind\?: ConductorActionReply\["kind"\]/);
  assert.ok(!/actionId|riskId/.test(snapshot),
    "the live snapshot must carry no spent identity or resend authority");
  const acceptedSend = conductorService.slice(conductorService.indexOf("export function send("));
  const acceptedBoundary = acceptedSend.indexOf("if (!accepted || historySnapshot === null)");
  const liveStream = acceptedSend.indexOf("controllers.set(key", acceptedBoundary);
  const settlementField = acceptedSend.indexOf("settlementKind: request.actionReply.kind", liveStream);
  assert.ok(acceptedBoundary !== -1 && liveStream > acceptedBoundary && settlementField > liveStream,
    "main may expose settlement kind only after it validates, appends, and consumes the exact action reply");
  assert.match(conductorService, /export function current[\s\S]*?live\.settlementKind === undefined[\s\S]*?settlementKind: live\.settlementKind/);
  const commentaryStream = conductorService.slice(
    conductorService.indexOf("export function commentary("),
    conductorService.indexOf("function replyContextMessage"),
  );
  assert.ok(!commentaryStream.includes("settlementKind"),
    "envelope commentary must never masquerade as a targeted owner settlement");
  assert.match(chat, /replacementActionRef\.current\?\.focus\(\)/);
  assert.match(chat, /if \(settledReplyRef\.current\) settledReplyRef\.current\.focus\(\)/);
  assert.match(chat, /if \(errorRecoveryRef\.current\) errorRecoveryRef\.current\.focus\(\)[\s\S]*?else composerRef\.current\?\.focus\(\)/);
  assert.match(chat, /pending\.length === 0 \|\| queueRetrying \|\| conversationResettingRef\.current[\s\S]{0,100}streaming \|\| commentary \|\| taskBusy \|\| action !== null[\s\S]{0,80}error !== null \|\| settlementFocusPending/,
    "queued prose must not retire a replacement action or unmount error recovery before focus");
  assert.match(chat, /setSettlementFocusPending\(true\)[\s\S]*?requestAnimationFrame[\s\S]*?setSettlementFocusPending\(false\)/,
    "queued prose must wait until the scheduled settlement focus has actually run");
  assert.match(chat, /turn\.role === "cairn" && turn === lastReply/,
    "the settled-reply heading must survive a queued optimistic owner turn");
  assert.match(chat, /Waiting while Cairn needs your decision\./);
  assert.ok(!/streaming[\s\S]{0,200}aria-live/.test(chat),
    "token streaming must not become a live region");
});

test("the attribution styles are supplemental, wrap long text, and add no layout policy", () => {
  assert.match(rule(".task-intent-owner-stated"), /background:\s*var\(--garden-cyan\)/);
  assert.match(rule(".task-intent-owner-unsure"), /border[^;]*:\s*[^;]*dashed[^;]*var\(--amber\)/);
  assert.match(rule(".task-intent-cairn-chosen"), /background:\s*var\(--card-solid\)/);
  assert.match(css, /\.task-intent-row[\s\S]*?min-width:\s*0[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(css, /\.task-intent-interpretation[\s\S]*?white-space:\s*pre-wrap/);
  assert.match(css, /\.question-card-controls[\s\S]*?flex-wrap:\s*wrap/);
  const widths = [...css.matchAll(/@media\s+\((?:min|max)-width:\s*(\d+)px\)/g)].map((match) => Number(match[1]));
  assert.ok(widths.every((width) => width === 620 || width === 621 || width === 820 || width === 1260),
    "the only added layout policy is Task 231's compact inert Builder-review card");
  const attributionCss = css.slice(css.indexOf("/* Task 179:"), css.indexOf("/* Task 179 end. */"));
  assert.ok(attributionCss.length > 0);
  assert.ok(!/animation\s*:|transition\s*:|overflow-x\s*:/.test(attributionCss));
});
