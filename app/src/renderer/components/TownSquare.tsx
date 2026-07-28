import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import type { ConductorStreamSnapshot, RunSessionSnapshot } from "../../shared/ipc";
import { townModelFromRuntime, type TownEntity, type TownRelationship } from "../town/model";
import { TownDetail } from "./TownDetail";

type Point = { x: number; y: number };
type SelectionKey = { kind: "entity" | "relationship"; id: string };

const CAIRN_POINT: Point = { x: 50, y: 43 };

function entityPoints(entities: TownEntity[]): Map<string, Point> {
  const workers = entities.filter((entity) => entity.kind === "worker");
  const result = new Map<string, Point>([["cairn", CAIRN_POINT]]);
  workers.forEach((worker, index) => {
    const angle = workers.length === 1 ? 0.18 : -Math.PI / 2 + (index / workers.length) * Math.PI * 2;
    result.set(worker.id, { x: 50 + Math.cos(angle) * 31, y: 43 + Math.sin(angle) * 26 });
  });
  if (entities.some((entity) => entity.kind === "overflow")) result.set("worker-overflow", { x: 20, y: 67 });
  return result;
}

function pointStyle(point: Point): CSSProperties {
  return { left: `${point.x}%`, top: `${point.y}%` };
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

export function TownSquare({
  projectName,
  task,
  stream,
  onFocusChat,
  onOpenRun,
}: {
  projectName: string;
  task: RunSessionSnapshot | null;
  stream: ConductorStreamSnapshot | null;
  onFocusChat: () => void;
  onOpenRun: () => void;
}) {
  const model = useMemo(() => townModelFromRuntime(task, stream), [task, stream]);
  const points = useMemo(() => entityPoints(model.entities), [model.entities]);
  const [selectedKey, setSelectedKey] = useState<SelectionKey | null>(null);
  const selection = selectedItem(selectedKey, model.entities, model.relationships);

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

  const hasWorker = model.entities.some((entity) => entity.kind === "worker");

  return (
    <section className="town-square" aria-label={`${projectName} town square`} onClick={() => setSelectedKey(null)}>
      <header className="town-square-header">
        <div><span>Active project</span><strong>{projectName}</strong></div>
        <p aria-live="polite">{hasWorker ? "One live worker in the square" : "No live worker in the square"}</p>
      </header>
      <div className="town-skyglow" aria-hidden="true" />
      <div className="town-grid" aria-hidden="true" />

      <div className="town-square-ground" aria-label="Town ground">
        <svg className="town-threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {model.relationships.map((relationship) => {
            const from = points.get(relationship.from) ?? CAIRN_POINT;
            const to = points.get(relationship.to) ?? CAIRN_POINT;
            return <line key={relationship.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
          })}
        </svg>

        {model.relationships.map((relationship) => {
          const from = points.get(relationship.from) ?? CAIRN_POINT;
          const to = points.get(relationship.to) ?? CAIRN_POINT;
          const midpoint = { x: (from.x + to.x) / 2, y: Math.min(86, (from.y + to.y) / 2 + 16) };
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
          const point = points.get(entity.id) ?? CAIRN_POINT;
          const isSelected = selectedKey?.id === entity.id;
          if (entity.kind === "cairn") {
            return (
              <button key={entity.id} type="button"
                className={`town-node town-node-cairn town-node-${entity.state}`}
                style={pointStyle(point)}
                aria-label={`Cairn, ${entity.state}`}
                aria-pressed={isSelected}
                onClick={(event) => selectEntity(event, entity)}>
                <span className="town-cairn-orbit" aria-hidden="true" />
                <span className="town-cairn-core" aria-hidden="true">C</span>
                <strong>Cairn</strong>
                <span className="town-node-status">{entity.state}</span>
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
                onClick={(event) => selectEntity(event, entity)}>
                <span className="town-villager-shape" aria-hidden="true">W</span>
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
