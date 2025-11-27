// world/selection.ts
import type { ResourceNode, Settlement } from './types';

export function computeSettlementDiameterTiles(population: number): number {
  const MIN_POP = 2_000;
  const MAX_POP = 200_000;

  const MIN_DIAM_TILES = 5;
  const MAX_DIAM_TILES = 25;

  const clamped = Math.min(MAX_POP, Math.max(MIN_POP, population));
  const t = (clamped - MIN_POP) / (MAX_POP - MIN_POP);

  let diameter = MIN_DIAM_TILES + t * (MAX_DIAM_TILES - MIN_DIAM_TILES);

  let rounded = Math.round(diameter);
  if (rounded % 2 === 0) rounded += 1;

  return rounded;
}

export function findSettlementAtTile(
  settlements: Settlement[],
  tileX: number,
  tileY: number,
): Settlement | null {
  for (const s of settlements) {
    const diameterTiles = computeSettlementDiameterTiles(s.population);
    const radiusTiles = Math.floor(diameterTiles / 2);

    const dx = tileX - s.x;
    const dy = tileY - s.y;
    if (dx * dx + dy * dy <= radiusTiles * radiusTiles) {
      return s;
    }
  }
  return null;
}

export function findResourceAtTile(
  resources: ResourceNode[],
  tileX: number,
  tileY: number,
): ResourceNode | null {
  // Must match the 5x5 drawing logic in ResourceLayer
  const sizeTiles = 5;
  const radiusTiles = Math.floor(sizeTiles / 2);

  for (const r of resources) {
    const dx = tileX - r.x;
    const dy = tileY - r.y;

    if (dx >= -radiusTiles && dx <= radiusTiles && dy >= -radiusTiles && dy <= radiusTiles) {
      return r;
    }
  }
  return null;
}
