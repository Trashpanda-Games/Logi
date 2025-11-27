// pathfinding/roadPathfinding.ts
import type { WorldMap } from '../world/types';

export function findRoadPath(
  world: WorldMap,
  start: { x: number; y: number },
  goal: { x: number; y: number },
): { x: number; y: number }[] | null {
  const { width, height, tiles, roads } = world;

  const index = (x: number, y: number) => y * width + x;
  const getTile = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? undefined : tiles[index(x, y)];

  const startIdx = index(start.x, start.y);
  const goalIdx = index(goal.x, goal.y);

  // Build a quick lookup of tiles that already have a road
  const roadTiles = new Set<number>();
  for (const road of roads) {
    for (const step of road.path) {
      roadTiles.add(index(step.x, step.y));
    }
  }

  // Dijkstra-style search (weighted BFS)
  const dist = new Array<number>(width * height).fill(Infinity);
  const cameFrom = new Map<number, number>();
  const inQueue = new Array<boolean>(width * height).fill(false);

  dist[startIdx] = 0;

  const queue: { idx: number; x: number; y: number }[] = [
    { idx: startIdx, x: start.x, y: start.y },
  ];
  inQueue[startIdx] = true;

  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const;

  while (queue.length > 0) {
    // Pick node with lowest dist (tiny maps so linear scan is fine)
    let bestI = 0;
    for (let i = 1; i < queue.length; i++) {
      if (dist[queue[i].idx] < dist[queue[bestI].idx]) {
        bestI = i;
      }
    }
    const current = queue.splice(bestI, 1)[0];
    inQueue[current.idx] = false;

    if (current.idx === goalIdx) {
      break;
    }

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const tile = getTile(nx, ny);
      if (!tile) continue;

      // Disallow roads over deep/shallow water (tune as you like)
      if (tile.type === 'deep_water' || tile.type === 'shallow_water') {
        continue;
      }

      const nIdx = index(nx, ny);

      // Base cost for moving into this tile
      let stepCost = 1;

      // Moving along an existing road is cheaper → encourages reuse
      if (roadTiles.has(nIdx)) {
        stepCost *= 0.2;
      }

      // Optional: slightly penalise mountains/forest, favour plains/coast
      if (tile.type === 'mountains') stepCost *= 3;
      if (tile.type === 'hills') stepCost *= 1.5;
      if (tile.type === 'forest') stepCost *= 1.2;

      const newDist = dist[current.idx] + stepCost;

      if (newDist < dist[nIdx]) {
        dist[nIdx] = newDist;
        cameFrom.set(nIdx, current.idx);

        if (!inQueue[nIdx]) {
          queue.push({ idx: nIdx, x: nx, y: ny });
          inQueue[nIdx] = true;
        }
      }
    }
  }

  if (!cameFrom.has(goalIdx) && goalIdx !== startIdx) {
    return null;
  }

  // Reconstruct path
  const path: { x: number; y: number }[] = [];
  let currentIdx = goalIdx;

  while (true) {
    const x = currentIdx % width;
    const y = Math.floor(currentIdx / width);
    path.push({ x, y });

    if (currentIdx === startIdx) break;

    const prev = cameFrom.get(currentIdx);
    if (prev === undefined) break;
    currentIdx = prev;
  }

  path.reverse();
  return path;
}
