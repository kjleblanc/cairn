export type TownPoint = { x: number; y: number };

export type TownLayoutNode = {
  id: string;
  radius?: number;
  fixed?: TownPoint;
};

export type TownLayoutLink = {
  source: string;
  target: string;
};

export type TownLayoutOptions = {
  iterations?: number;
};

export const TOWN_CENTER: TownPoint = { x: 0.5, y: 0.43 };
export const TOWN_BOUNDS = { minX: 0.13, maxX: 0.87, minY: 0.14, maxY: 0.78 } as const;

/**
 * The x a villager may not pass. Beside the conversation that is the shore of
 * the pond; with the pond WHOLE (the narrow window, opened) there is no
 * conversation to stay clear of, so the layout's own bound applies.
 */
export const TOWN_SHORE_BESIDE_CHAT = 0.52;

export function townShore(wholePond: boolean): number {
  return wholePond ? TOWN_BOUNDS.maxX : TOWN_SHORE_BESIDE_CHAT;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampPoint(point: TownPoint): TownPoint {
  return {
    x: clamp(point.x, TOWN_BOUNDS.minX, TOWN_BOUNDS.maxX),
    y: clamp(point.y, TOWN_BOUNDS.minY, TOWN_BOUNDS.maxY),
  };
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seed(id: string): TownPoint {
  const value = hash(id);
  const angle = (value / 0xffffffff) * Math.PI * 2;
  const radius = 0.28 + ((value >>> 24) / 255) * 0.035;
  return clampPoint({
    x: TOWN_CENTER.x + Math.cos(angle) * radius,
    y: TOWN_CENTER.y + Math.sin(angle) * radius * 0.82,
  });
}

function unitForPair(a: string, b: string): TownPoint {
  const angle = (hash(`${a}|${b}`) / 0xffffffff) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** A small, deterministic force solver for the approved visible cap. It has no
 * timer and no random source: normal motion is only the CSS transition from a
 * previous final position; reduced motion uses this same final result. */
export function computeTownLayout(
  nodes: TownLayoutNode[],
  links: TownLayoutLink[],
  options: TownLayoutOptions = {},
): Record<string, TownPoint> {
  const positions = new Map<string, TownPoint>();
  const velocities = new Map<string, TownPoint>();
  const byId = new Map(nodes.map((node) => [node.id, node]));

  for (const node of nodes) {
    positions.set(node.id, node.fixed ? clampPoint(node.fixed) : node.id === "cairn" ? TOWN_CENTER : seed(node.id));
    velocities.set(node.id, { x: 0, y: 0 });
  }

  const iterations = options.iterations ?? 180;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const node of nodes) {
      if (node.fixed || node.id === "cairn") continue;
      const point = positions.get(node.id)!;
      const velocity = velocities.get(node.id)!;
      velocity.x += (TOWN_CENTER.x - point.x) * 0.0015;
      velocity.y += (TOWN_CENTER.y - point.y) * 0.0015;
    }

    for (const link of links) {
      const sourceNode = byId.get(link.source);
      const targetNode = byId.get(link.target);
      const source = positions.get(link.source);
      const target = positions.get(link.target);
      if (!sourceNode || !targetNode || !source || !target) continue;
      let dx = target.x - source.x;
      let dy = target.y - source.y;
      let distance = Math.hypot(dx, dy);
      if (distance < 0.0001) {
        const direction = unitForPair(link.source, link.target);
        dx = direction.x;
        dy = direction.y;
        distance = 1;
      }
      const force = (distance - 0.31) * 0.018;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      if (!sourceNode.fixed && sourceNode.id !== "cairn") {
        const velocity = velocities.get(sourceNode.id)!;
        velocity.x += fx;
        velocity.y += fy;
      }
      if (!targetNode.fixed && targetNode.id !== "cairn") {
        const velocity = velocities.get(targetNode.id)!;
        velocity.x -= fx;
        velocity.y -= fy;
      }
    }

    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
        const leftNode = nodes[leftIndex]!;
        const rightNode = nodes[rightIndex]!;
        const left = positions.get(leftNode.id)!;
        const right = positions.get(rightNode.id)!;
        let dx = right.x - left.x;
        let dy = right.y - left.y;
        let distance = Math.hypot(dx, dy);
        if (distance < 0.0001) {
          const direction = unitForPair(leftNode.id, rightNode.id);
          dx = direction.x;
          dy = direction.y;
          distance = 1;
        }
        const minimum = (leftNode.radius ?? 0.105) + (rightNode.radius ?? 0.105);
        if (distance >= minimum) continue;
        const push = (minimum - distance) * 0.045;
        const fx = (dx / distance) * push;
        const fy = (dy / distance) * push;
        if (!leftNode.fixed && leftNode.id !== "cairn") {
          const velocity = velocities.get(leftNode.id)!;
          velocity.x -= fx;
          velocity.y -= fy;
        }
        if (!rightNode.fixed && rightNode.id !== "cairn") {
          const velocity = velocities.get(rightNode.id)!;
          velocity.x += fx;
          velocity.y += fy;
        }
      }
    }

    for (const node of nodes) {
      if (node.fixed || node.id === "cairn") {
        positions.set(node.id, node.id === "cairn" ? TOWN_CENTER : clampPoint(node.fixed!));
        continue;
      }
      const velocity = velocities.get(node.id)!;
      velocity.x *= 0.78;
      velocity.y *= 0.78;
      const point = positions.get(node.id)!;
      positions.set(node.id, clampPoint({ x: point.x + velocity.x, y: point.y + velocity.y }));
    }
  }

  return Object.fromEntries(nodes.map((node) => [node.id, positions.get(node.id)!]));
}
