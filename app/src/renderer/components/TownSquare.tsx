import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { ConductorStreamSnapshot, RunSessionSnapshot, TownPoint } from "../../shared/ipc";
import { computeTownLayout, TOWN_BOUNDS, TOWN_CENTER } from "../town/layout";
import { TOWN_FACES, faceForAdapter, type TownFaceDef, type TownFaceState } from "../town/faces";
import { townModelFromRuntime, type TownEntity, type TownRelationship } from "../town/model";
import { TownDetail } from "./TownDetail";

type SelectionKey = { kind: "entity" | "relationship"; id: string };

function pointStyle(point: TownPoint): CSSProperties {
  return { left: `${point.x * 100}%`, top: `${point.y * 100}%` };
}

function relationshipControlPoint(from: TownPoint, to: TownPoint): TownPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  return {
    x: Math.max(TOWN_BOUNDS.minX, Math.min(TOWN_BOUNDS.maxX, midpoint.x - (dy / distance) * 0.14)),
    y: Math.max(TOWN_BOUNDS.minY, Math.min(TOWN_BOUNDS.maxY, midpoint.y + (dx / distance) * 0.14)),
  };
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
  positions,
  onPositionsChange,
  onFocusChat,
  onOpenRun,
}: {
  projectName: string;
  task: RunSessionSnapshot | null;
  stream: ConductorStreamSnapshot | null;
  positions: Record<string, TownPoint>;
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
  const points = useMemo(() => ({ ...automaticPoints, ...dragPoints }), [automaticPoints, dragPoints]);
  const selection = selectedItem(selectedKey, model.entities, model.relationships);

  /* The done moment (Task 156): when a run closes with a result, Cairn's
     smile opens for a few seconds, then settles back to ready. Local to
     the square — the town model and its visibility rules are unchanged. */
  const [doneUntil, setDoneUntil] = useState(0);
  const prevPhaseRef = useRef<"running" | "closed" | null>(null);
  useEffect(() => {
    const phase = task?.phase ?? null;
    if (prevPhaseRef.current === "running" && phase === "closed" && task?.result) {
      setDoneUntil(Date.now() + 6000);
    }
    prevPhaseRef.current = phase;
  }, [task?.phase, task?.result]);
  useEffect(() => {
    if (!doneUntil) return;
    const remaining = doneUntil - Date.now();
    if (remaining <= 0) { setDoneUntil(0); return; }
    const timer = window.setTimeout(() => setDoneUntil(0), remaining);
    return () => window.clearTimeout(timer);
  }, [doneUntil]);

  useEffect(() => {
    if (selectedKey && !selection) setSelectedKey(null);
  }, [selectedKey, selection]);

  function selectEntity(event: MouseEvent<HTMLButtonElement>, entity: TownEntity): void {
    event.stopPropagation();
    setSelectedKey({ kind: "entity", id: entity.id });
    if (entity.kind === "cairn") onFocusChat();
  }

  function selectRelationship(event: MouseEvent<HTMLButtonElement>, relationship: TownRelationship): void {
    event.stopPropagation();
    setSelectedKey({ kind: "relationship", id: relationship.id });
  }

  function pointFromClient(clientX: number, clientY: number): TownPoint {
    const bounds = groundRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return TOWN_CENTER;
    return {
      x: Math.max(TOWN_BOUNDS.minX, Math.min(TOWN_BOUNDS.maxX, (clientX - bounds.left) / bounds.width)),
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

  return (
    <section className="town-square" aria-label={`${projectName} town square`} onClick={() => setSelectedKey(null)}>
      <header className="town-square-header">
        <div className="town-project-label"><span>Active project</span><strong>{projectName}</strong></div>
        <div className="town-header-actions">
          <p aria-live="polite">{hasWorker ? "One live worker in the square" : "No live worker in the square"}</p>
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
        <svg className="town-threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {model.relationships.map((relationship) => {
            const from = points[relationship.from] ?? TOWN_CENTER;
            const to = points[relationship.to] ?? TOWN_CENTER;
            return <line key={relationship.id} x1={from.x * 100} y1={from.y * 100} x2={to.x * 100} y2={to.y * 100} />;
          })}
        </svg>

        {model.relationships.map((relationship) => {
          const from = points[relationship.from] ?? TOWN_CENTER;
          const to = points[relationship.to] ?? TOWN_CENTER;
          const midpoint = relationshipControlPoint(from, to);
          return (
            <button key={relationship.id} type="button"
              className="town-thread-target" style={pointStyle(midpoint)}
              aria-label={`Task thread: ${relationship.task}`}
              aria-pressed={selectedKey?.id === relationship.id}
              onClick={(event) => selectRelationship(event, relationship)}>
              <span aria-hidden="true">↝</span>
              <small>task thread</small>
            </button>
          );
        })}

        {model.entities.map((entity) => {
          const point = points[entity.id] ?? TOWN_CENTER;
          const isSelected = selectedKey?.id === entity.id;
          if (entity.kind === "cairn") {
            const displayState: TownFaceState =
              entity.state === "ready" && doneUntil > Date.now() ? "done" : entity.state;
            return (
              <button key={entity.id} type="button"
                className={`town-node town-node-cairn town-node-${displayState}`}
                style={pointStyle(point)}
                aria-label={`Cairn, ${displayState}`}
                aria-pressed={isSelected}
                onClick={(event) => selectEntity(event, entity)}>
                <TownFace face={TOWN_FACES.cairn} state={displayState} />
                <strong>Cairn</strong>
                <span className="town-node-status">{displayState}</span>
              </button>
            );
          }
          if (entity.kind === "worker") {
            return (
              <button key={entity.id} type="button"
                className="town-node town-node-worker town-node-working"
                style={pointStyle(point)}
                aria-label={`${entity.name}, working on ${entity.currentTask}`}
                aria-pressed={isSelected}
                data-dragging={draggingId === entity.id || undefined}
                onPointerDown={(event) => beginDrag(event, entity)}
                onClick={(event) => selectEntity(event, entity)}>
                <span className="town-worker-pad" aria-hidden="true"><span /><span /></span>
                <TownFace face={faceForAdapter(entity.role)} state="working" />
                <strong>{entity.name}</strong>
                <span className="town-node-status"><i aria-hidden="true" /> working</span>
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
        <p className="town-empty-note">
          {hasWorker ? "Select a worker or its thread for live details." : "The square stays quiet until an approved worker run begins."}
        </p>
      )}
    </section>
  );
}
