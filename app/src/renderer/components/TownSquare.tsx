import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { ConductorStreamSnapshot, RunSessionSnapshot, TownPoint } from "../../shared/ipc";
import { computeTownLayout, townShore, TOWN_BOUNDS, TOWN_CENTER, TOWN_SHORE_BESIDE_CHAT } from "../town/layout";
import { TOWN_FACES, faceForAdapter, type TownFaceDef, type TownFaceState } from "../town/faces";
import { townModelFromRuntime, type TownEntity, type TownRelationship } from "../town/model";
import { townPresentationStatus, type TownRuntimePresentation, type TownTruth } from "../town/presentation";
import { TownDetail } from "./TownDetail";

type SelectionKey = { kind: "entity" | "relationship"; id: string };

function pointStyle(point: TownPoint): CSSProperties {
  return { left: `${point.x * 100}%`, top: `${point.y * 100}%` };
}

function relationshipControlPoint(from: TownPoint, to: TownPoint, bend = 0.14): TownPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  return {
    x: Math.max(TOWN_BOUNDS.minX, Math.min(TOWN_BOUNDS.maxX, midpoint.x - (dy / distance) * bend)),
    y: Math.max(TOWN_BOUNDS.minY, Math.min(TOWN_BOUNDS.maxY, midpoint.y + (dx / distance) * bend)),
  };
}

function relationshipMidpoint(from: TownPoint, control: TownPoint, to: TownPoint): TownPoint {
  return {
    x: from.x * 0.25 + control.x * 0.5 + to.x * 0.25,
    y: from.y * 0.25 + control.y * 0.5 + to.y * 0.25,
  };
}

function cairnFaceState(truth: TownTruth): TownFaceState {
  if (truth === "thinking" || truth === "starting") return "thinking";
  if (truth === "working" || truth === "checking") return "working";
  if (truth === "done") return "done";
  if (truth === "stopped" || truth === "error") return "thinking";
  return "ready";
}

function cairnStateLabel(truth: TownTruth): string {
  return truth === "quiet" ? "ready" : truth;
}

function visualTruth(presentation: TownRuntimePresentation): TownTruth {
  if (presentation.truth === "thinking") return "thinking";
  const cue = presentation.activeCue;
  if (cue?.kind === "dispatch" && (presentation.truth === "starting" || presentation.truth === "working")) return "working";
  if (cue?.kind === "return") return "checking";
  if (cue?.kind === "done" || cue?.kind === "stopped" || cue?.kind === "error") return cue.kind;
  return presentation.truth;
}

function townGroundNote(hasWorker: boolean, truth: TownTruth): string {
  if (hasWorker) return "Select a worker or its thread for live details.";
  if (truth === "thinking") return "Cairn is replying in the conversation.";
  if (truth === "starting") return "Cairn is preparing the approved handoff.";
  if (truth === "working") return "Cairn is working without a model handoff.";
  if (truth === "checking") return "The result is with Cairn for checking.";
  if (truth === "done") return "Verified work has settled back with Cairn.";
  if (truth === "stopped") return "The task stopped; check the result card.";
  if (truth === "error") return "This run needs inspection; check the result card.";
  return "The pond stays quiet until approved work moves.";
}

function TownThreadTarget({
  relationship,
  point,
  selected,
  transferActive,
  onSelect,
  onFocusedUnmount,
}: {
  relationship: TownRelationship;
  point: TownPoint;
  selected: boolean;
  transferActive: boolean;
  onSelect: (event: MouseEvent<HTMLButtonElement>, relationship: TownRelationship) => void;
  onFocusedUnmount: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const unmountRef = useRef(onFocusedUnmount);
  unmountRef.current = onFocusedUnmount;

  // The same keyed control stays mounted through the whole handoff. When the
  // relationship truly leaves, layout cleanup still runs before React removes
  // its button, so Cairn can take focus synchronously without a body-focus gap
  // or a delayed callback stealing a later user choice.
  useLayoutEffect(() => () => {
    if (buttonRef.current !== document.activeElement) return;
    unmountRef.current();
  }, [relationship.id]);

  return (
    <button ref={buttonRef} type="button"
      className={`town-thread-target${transferActive ? " town-thread-target-transfer" : ""}`}
      style={pointStyle(point)}
      aria-label={`Task thread: ${relationship.task}`}
      aria-pressed={selected}
      data-thread-id={relationship.id}
      onClick={(event) => onSelect(event, relationship)}>
      <span aria-hidden="true">↝</span>
      <small>task thread</small>
    </button>
  );
}

function selectedItem(
  key: SelectionKey | null,
  entities: TownEntity[],
  relationships: TownRelationship[],
): TownEntity | TownRelationship | null {
  if (!key) return null;
  return key.kind === "entity"
    ? entities.find((entity) => entity.id === key.id) ?? null
    : relationships.find((relationship) => relationship.id === key.id) ?? null;
}

/**
 * One cast face (Task 156): geometry from town/faces.tsx, colored by the
 * face's own tokens, with its tilt, signature mark, and blink rhythm. Eye
 * strokes sit in nested groups so per-eye blink animations compose; the
 * mouth and any mark are plain strokes. Cairn keeps the thought bubbles.
 */
function TownFace({ face, state }: { face: TownFaceDef; state: TownFaceState }) {
  const strokes = face.states[state];
  const part = (name: "eyeL" | "eyeR" | "mouth") => strokes.filter((s) => s.part === name);
  const draw = (list: typeof strokes) => list.map((s, i) => (
    <path key={i} d={s.d} strokeWidth={s.w} opacity={s.o ?? 1} />
  ));
  /* town-face-worker stays as a compatibility class: lane C's in-flight
     conductor.spec (Task 155) asserts the pre-cast class. Remove once 155
     lands and the spec names the cast classes. */
  const compat = face.id === "cairn" ? "" : " town-face-worker";
  return (
    <span className={`town-face town-face-${face.id}${compat}`} aria-hidden="true"
      style={{ "--face-color": face.color, "--face-glow": face.glow } as CSSProperties}>
      <span className="town-face-holo">
        <span className="town-face-tilt" style={{ transform: face.tilt ? `rotate(${face.tilt}deg)` : undefined }}>
          {face.mark.length > 0 && (
            <svg className={`town-face-mark town-face-mark-${face.id}`} viewBox="0 0 100 100" focusable="false">
              {draw(face.mark)}
            </svg>
          )}
          <svg className={`town-face-svg town-face-blink-${face.blink}`} viewBox="0 0 100 100" focusable="false">
            <g className="town-face-eye town-face-eye-l">{draw(part("eyeL"))}</g>
            <g className="town-face-eye town-face-eye-r">{draw(part("eyeR"))}</g>
            {draw(part("mouth"))}
            {face.id === "cairn" && (
              <g className="town-face-thought">
                <circle cx="78" cy="26" r="2.2" />
                <circle cx="85" cy="18" r="1.7" />
                <circle cx="91" cy="10" r="1.3" />
              </g>
            )}
          </svg>
        </span>
      </span>
    </span>
  );
}

export function TownSquare({
  projectName,
  task,
  stream,
  presentation,
  positions,
  wholePond,
  onPositionsChange,
  onFocusChat,
  onOpenRun,
}: {
  projectName: string;
  task: RunSessionSnapshot | null;
  stream: ConductorStreamSnapshot | null;
  presentation: TownRuntimePresentation;
  positions: Record<string, TownPoint>;
  /** True only while the narrow window is showing the pond whole, over the
   *  conversation. There is then no shore to keep the cast behind. */
  wholePond: boolean;
  onPositionsChange: (positions: Record<string, TownPoint>) => void;
  onFocusChat: () => void;
  onOpenRun: () => void;
}) {
  const model = useMemo(() => townModelFromRuntime(task, stream), [task, stream]);
  const automaticPoints = useMemo(() => computeTownLayout(
    model.entities.map((entity) => ({
      id: entity.id,
      radius: entity.kind === "cairn" ? 0.12 : 0.105,
      fixed: entity.kind === "cairn" ? TOWN_CENTER : positions[entity.id],
    })),
    model.relationships.map((relationship) => ({ source: relationship.from, target: relationship.to })),
  ), [model.entities, model.relationships, positions]);
  const [selectedKey, setSelectedKey] = useState<SelectionKey | null>(null);
  const [dragPoints, setDragPoints] = useState<Record<string, TownPoint>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const cairnButtonRef = useRef<HTMLButtonElement>(null);
  // Chat is part of this same Town at every desktop width, so villagers stay
  // on the pond side of its shore — including at the 1260/1261 rail
  // breakpoint. When the narrow window shows the pond WHOLE there is no
  // conversation beside it, so the cast uses the layout's own full bound.
  // Stored coordinates are never rewritten either way.
  const shore = townShore(wholePond);
  const points = useMemo(() => Object.fromEntries(
    Object.entries({ ...automaticPoints, ...dragPoints }).map(([id, point]) => [
      id,
      { ...point, x: Math.min(point.x, shore) },
    ]),
  ), [automaticPoints, dragPoints, shore]);
  const lastWorkerPointsRef = useRef<{ runKey: string | null; points: Record<string, TownPoint> }>({
    runKey: presentation.runKey,
    points: {},
  });
  if (lastWorkerPointsRef.current.runKey !== presentation.runKey) {
    lastWorkerPointsRef.current = { runKey: presentation.runKey, points: {} };
  }
  const cue = presentation.activeCue;
  const virtualCuePoints = useMemo(() => {
    if (!cue?.workerId) return {};
    return computeTownLayout([
      { id: "cairn", radius: 0.12, fixed: TOWN_CENTER },
      { id: cue.workerId, radius: 0.105, fixed: positions[cue.workerId] },
    ], [{ source: "cairn", target: cue.workerId }]);
  }, [cue?.workerId, positions]);

  useEffect(() => {
    for (const entity of model.entities) {
      if (entity.kind !== "worker") continue;
      const point = points[entity.id];
      if (point) lastWorkerPointsRef.current.points[entity.id] = point;
    }
  }, [model.entities, points]);

  const cueWorkerPoint = cue?.workerId
    ? points[cue.workerId] ?? lastWorkerPointsRef.current.points[cue.workerId] ?? virtualCuePoints[cue.workerId] ?? TOWN_CENTER
    : TOWN_CENTER;
  const visibleRelationships = useMemo(() => {
    if ((cue?.kind !== "dispatch" && cue?.kind !== "return") || !cue.workerId
      || model.relationships.some((relationship) => relationship.to === cue.workerId)) return model.relationships;
    // Keep the real task's focus target for exactly as long as a keyed handoff
    // cue. A very fast worker can close while the preceding dispatch is still
    // settling; the queued return must not create a keyboard-focus hole. This
    // is event decoration, not a retained worker villager: the closed worker
    // itself remains absent from the runtime model.
    return [...model.relationships, {
      id: `thread:${cue.workerId}`,
      kind: "task" as const,
      from: "cairn" as const,
      to: cue.workerId,
      task: task?.outcome ?? presentation.outcome ?? "Current task",
      summary: "The real worker result is returning to Cairn for checking",
    }];
  }, [cue?.kind, cue?.workerId, model.relationships, presentation.outcome, task?.outcome]);
  const selection = selectedItem(selectedKey, model.entities, visibleRelationships);
  const cueFrom = cue?.kind === "dispatch" ? TOWN_CENTER : cueWorkerPoint;
  const cueTo = cue?.kind === "dispatch" ? cueWorkerPoint : TOWN_CENTER;
  // The handoff arcs a little farther from the static thread than the thread
  // itself. That keeps its TASK/RESULT label clear of the two face labels at
  // Cairn's minimum window while still returning to the same receiver bed.
  // Both directions share one pond-side curve. Recomputing the normal from the
  // reversed return vector would flip RESULT toward (and at desktop widths,
  // partly beneath) Chat.
  const cueControl = relationshipControlPoint(TOWN_CENTER, cueWorkerPoint, 0.22);
  const cueMid = relationshipMidpoint(cueFrom, cueControl, cueTo);
  const cueFace = faceForAdapter(cue?.adapterId);
  const receiverColor = cue?.kind === "dispatch"
    ? cueFace.color
    : cue?.kind === "done"
      ? "var(--pond-done)"
      : cue?.kind === "stopped" || cue?.kind === "error"
        ? "var(--pond-stop)"
        : TOWN_FACES.cairn.color;
  const motionStyle = {
    "--town-from-x": `${cueFrom.x * 100}%`,
    "--town-from-y": `${cueFrom.y * 100}%`,
    "--town-mid-x": `${cueMid.x * 100}%`,
    "--town-mid-y": `${cueMid.y * 100}%`,
    "--town-to-x": `${cueTo.x * 100}%`,
    "--town-to-y": `${cueTo.y * 100}%`,
    "--town-receiver-color": receiverColor,
  } as CSSProperties;

  useEffect(() => {
    if (selectedKey && !selection) setSelectedKey(null);
  }, [selectedKey, selection]);

  function selectEntity(event: MouseEvent<HTMLButtonElement>, entity: TownEntity): void {
    event.stopPropagation();
    if (entity.kind === "cairn") {
      setSelectedKey(null);
      onFocusChat();
      return;
    }
    setSelectedKey({ kind: "entity", id: entity.id });
  }

  function selectRelationship(event: MouseEvent<HTMLButtonElement>, relationship: TownRelationship): void {
    event.stopPropagation();
    setSelectedKey({ kind: "relationship", id: relationship.id });
  }

  function pointFromClient(clientX: number, clientY: number): TownPoint {
    const bounds = groundRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return TOWN_CENTER;
    return {
      // The RENDER clamp relaxes with the whole pond so the cast can spread;
      // what a drag SAVES does not. A pointer must not place a villager where
      // the wide layout will clamp it back invisibly — the "Reset layout"
      // control lives in the town header, which is hidden below 1260px.
      x: Math.max(TOWN_BOUNDS.minX, Math.min(TOWN_SHORE_BESIDE_CHAT, (clientX - bounds.left) / bounds.width)),
      y: Math.max(TOWN_BOUNDS.minY, Math.min(TOWN_BOUNDS.maxY, (clientY - bounds.top) / bounds.height)),
    };
  }

  function beginDrag(event: PointerEvent<HTMLButtonElement>, entity: TownEntity): void {
    if (entity.kind !== "worker" || event.button !== 0) return;
    event.stopPropagation();
    const drag = { id: entity.id, startX: event.clientX, startY: event.clientY, moved: false };
    dragRef.current = drag;
    setDraggingId(entity.id);
    const move = (next: globalThis.PointerEvent) => {
      if (!drag.moved && Math.hypot(next.clientX - drag.startX, next.clientY - drag.startY) < 4) return;
      drag.moved = true;
      const point = pointFromClient(next.clientX, next.clientY);
      setDragPoints((current) => ({ ...current, [drag.id]: point }));
    };
    const finish = (next: globalThis.PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      dragRef.current = null;
      setDraggingId(null);
      if (!drag.moved) return;
      const point = pointFromClient(next.clientX, next.clientY);
      setDragPoints({});
      onPositionsChange({ ...positions, [drag.id]: point });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
  }

  const hasWorker = model.entities.some((entity) => entity.kind === "worker");
  const hasSavedPosition = Object.keys(positions).length > 0;
  const status = townPresentationStatus(presentation);
  const visibleTruth = visualTruth(presentation);
  const cairnState = cairnStateLabel(visibleTruth);
  const cairnAccessibleState = cairnStateLabel(presentation.truth);
  const cairnFace = cairnFaceState(visibleTruth);
  const receiverName = cue?.kind === "dispatch" ? cueFace.id : cue?.kind === "return" ? "cairn" : cue?.kind;

  return (
    <section className="town-square" aria-label={`${projectName} town square`}
      data-town-truth={presentation.truth}
      data-town-motion={cue ? `${cue.kind}-${cue.phase}` : "none"}
      data-town-outcome={presentation.settledOutcome ?? "none"}
      onClick={() => setSelectedKey(null)}>
      <header className="town-square-header">
        <div className="town-project-label"><span>Active project</span><strong>{projectName}</strong></div>
        <div className="town-header-actions">
          <p role="status" aria-live="polite" aria-atomic="true">{status}</p>
          <button type="button" disabled={!hasSavedPosition}
            onClick={(event) => {
              event.stopPropagation();
              setDragPoints({});
              onPositionsChange({});
            }}>Reset layout</button>
        </div>
      </header>
      <div className="town-skyglow" aria-hidden="true" />

      <div ref={groundRef} className="town-square-ground" aria-label="Town ground">
        {/* Still water (Decision 9, rule 4). Three drawn contour rings used to
            live here — ripples that never happened, drawn forever. At rest the
            pond is now one continuous blend, and this layer carries only the
            colour a settled outcome washes over it. A real ripple exists only
            inside the keyed cue below. */}
        <div className={`town-pond-layer town-pond-${presentation.settledOutcome ?? "quiet"}`} aria-hidden="true" />
        <svg className="town-threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {visibleRelationships.map((relationship) => {
            const from = points[relationship.from] ?? TOWN_CENTER;
            const to = points[relationship.to]
              ?? (cue?.workerId === relationship.to ? cueWorkerPoint : TOWN_CENTER);
            const midpoint = relationshipControlPoint(from, to);
            return <path key={relationship.id}
              d={`M ${from.x * 100} ${from.y * 100} Q ${midpoint.x * 100} ${midpoint.y * 100} ${to.x * 100} ${to.y * 100}`} />;
          })}
        </svg>

        {cue ? (
          <div className={`town-transfer-layer town-transfer-${cue.kind} town-transfer-${cue.phase}`}
            style={motionStyle} aria-hidden="true"
            data-cue-key={cue.key} data-cue-kind={cue.kind} data-cue-phase={cue.phase}
            data-receiver={receiverName ?? undefined}>
            {(cue.kind === "dispatch" || cue.kind === "return") && cue.phase === "flight" ? (
              <span className="town-transfer-packet"><i />{cue.kind === "dispatch" ? "Task" : "Result"}</span>
            ) : null}
            {(cue.kind === "dispatch" || cue.kind === "return") && cue.phase === "landing" ? (
              <span className="town-transfer-ripple"><i /><i /></span>
            ) : null}
            {cue.kind === "done" || cue.kind === "stopped" || cue.kind === "error" ? (
              <span className="town-terminal-ripple"><i /><i /></span>
            ) : null}
          </div>
        ) : null}

        {visibleRelationships.map((relationship) => {
          const from = points[relationship.from] ?? TOWN_CENTER;
          const to = points[relationship.to]
            ?? (cue?.workerId === relationship.to ? cueWorkerPoint : TOWN_CENTER);
          const transferActive = (cue?.kind === "dispatch" || cue?.kind === "return")
            && cue.workerId === relationship.to;
          // During a transfer the compact, keyboard-focusable thread marker
          // sits farther pond-side than the packet's quadratic midpoint. Its
          // visible focus ring therefore cannot cover TASK/RESULT at 760px.
          const midpoint = relationshipControlPoint(from, to, transferActive ? 0.22 : 0.14);
          return (
            <TownThreadTarget key={relationship.id}
              relationship={relationship}
              point={midpoint}
              selected={selectedKey?.id === relationship.id}
              transferActive={transferActive}
              onSelect={selectRelationship}
              onFocusedUnmount={() => cairnButtonRef.current?.focus()} />
          );
        })}

        {model.entities.map((entity) => {
          const point = points[entity.id] ?? TOWN_CENTER;
          const isSelected = selectedKey?.id === entity.id;
          if (entity.kind === "cairn") {
            return (
              <button ref={cairnButtonRef} key={entity.id} type="button"
                className={`town-node town-node-cairn town-node-${cairnState}`}
                style={{ ...pointStyle(point), "--agent-color": TOWN_FACES.cairn.color, "--agent-glow": TOWN_FACES.cairn.glow } as CSSProperties}
                aria-label={`Cairn, ${cairnAccessibleState}`}
                aria-pressed={isSelected}
                data-face-state={cairnFace}
                onClick={(event) => selectEntity(event, entity)}>
                <span className="town-node-bed" aria-hidden="true"><span /></span>
                <TownFace face={TOWN_FACES.cairn} state={cairnFace} />
                <strong>Cairn</strong>
                <span className="town-node-status">{cairnState}</span>
              </button>
            );
          }
          if (entity.kind === "worker") {
            const face = faceForAdapter(entity.role);
            const returned = entity.state === "returned";
            const workerFaceState: TownFaceState = "working";
            return (
              <button key={entity.id} type="button"
                className={`town-node town-node-worker town-node-${returned ? "returned" : "working"}`}
                style={{ ...pointStyle(point), "--agent-color": face.color, "--agent-glow": face.glow } as CSSProperties}
                aria-label={returned
                  ? `${entity.name}, result returned to Cairn for checking`
                  : `${entity.name}, working on ${entity.currentTask}`}
                aria-pressed={isSelected}
                data-face-id={face.id}
                data-dragging={draggingId === entity.id || undefined}
                onPointerDown={(event) => beginDrag(event, entity)}
                onClick={(event) => selectEntity(event, entity)}>
                <span className="town-worker-pad town-node-bed" aria-hidden="true"><span /></span>
                <TownFace face={face} state={workerFaceState} />
                <strong>{entity.name}</strong>
                <span className="town-node-status"><i aria-hidden="true" />{returned ? "result sent" : "working"}</span>
              </button>
            );
          }
          return (
            <button key={entity.id} type="button"
              className="town-node town-node-overflow"
              style={pointStyle(point)}
              aria-label={`${entity.name}, open list`}
              aria-pressed={isSelected}
              onClick={(event) => selectEntity(event, entity)}>
              <span className="town-overflow-shape" aria-hidden="true">+{entity.count}</span>
              <strong>More workers</strong>
              <span className="town-node-status">{entity.count} beyond the ring</span>
            </button>
          );
        })}
      </div>

      {selection ? <TownDetail selection={selection} onOpenRun={onOpenRun} /> : (
        <p className="town-empty-note">{townGroundNote(hasWorker, presentation.truth)}</p>
      )}
    </section>
  );
}
