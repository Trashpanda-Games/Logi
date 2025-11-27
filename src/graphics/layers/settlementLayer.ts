// src/graphics/layers/SettlementLayer.ts
import { TILE_SIZE } from '../../world/constants';
import type { Settlement, Tile, WorldMap } from '../../world/types';
import { isLandTileType } from '../../world/types';
import type { Layer } from '../layer';

export class SettlementLayer implements Layer {
  private tileByCoord: Map<string, Tile>;

  constructor(private world: WorldMap) {
    this.tileByCoord = new Map<string, Tile>(
      world.tiles.map((t) => [`${t.x},${t.y}`, t] as [string, Tile]),
    );
  }

  shouldTransform(): boolean {
    return true; // world-space
  }

  init() {
    // nothing cached yet
  }

  redraw() {
    // placeholder if we later cache this layer
  }

  renderLayer(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;

    // Draw settlements
    for (const s of this.world.settlements) {
      this.drawSettlement(ctx, s);
    }
  }

  // --- Settlement rendering (tile-based circle) ------------------------------

  private drawSettlement(ctx: CanvasRenderingContext2D, s: Settlement) {
    const centerTileX = s.x;
    const centerTileY = s.y;

    // Diameter in *tiles*, not pixels
    const diameterTiles = computeSettlementDiameterTiles(s.population);
    const radiusTiles = Math.floor(diameterTiles / 2);

    const colour = this.settlementColour(s);
    ctx.fillStyle = colour;

    // Circle formula in tile space: dx^2 + dy^2 <= r^2
    const rSq = radiusTiles * radiusTiles;

    for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
      for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
        if (dx * dx + dy * dy > rSq) continue;

        const tileX = centerTileX + dx;
        const tileY = centerTileY + dy;

        // Skip out-of-bounds tiles
        if (tileX < 0 || tileY < 0 || tileX >= this.world.width || tileY >= this.world.height) {
          continue;
        }

        // NEW: only draw on land tiles
        const tile = this.getTile(tileX, tileY);
        if (!tile || !isLandTileType(tile.type)) {
          continue;
        }

        const px = tileX * TILE_SIZE;
        const py = tileY * TILE_SIZE;

        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }

    // Label above the blob
    const centerPxX = centerTileX * TILE_SIZE + TILE_SIZE / 2;
    const centerPxY = centerTileY * TILE_SIZE + TILE_SIZE / 2;

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const labelY = centerPxY - radiusTiles * TILE_SIZE - 2; // 2px above the top-most tile
    ctx.fillText(s.name, Math.round(centerPxX) + 0.5, Math.round(labelY) + 0.5);
  }

  private settlementColour(s: Settlement): string {
    // You can still keep a size-based colour if you like
    switch (s.size) {
      case 'city':
        return '#ffc857';
      case 'town':
        return '#4ecdc4';
      case 'village':
        return '#a1c181';
      default:
        return '#ffffff';
    }
  }

  private getTile(x: number, y: number): Tile | undefined {
    return this.tileByCoord.get(`${x},${y}`);
  }
}

// --- Helpers -----------------------------------------------------------------

/**
 * Map population to a diameter measured in TILES.
 * This is your "5 → 25 pixels" idea, but expressed in tile units instead.
 * Adjust MIN/MAX_POP or MIN/MAX_DIAM_TILES to taste.
 */
function computeSettlementDiameterTiles(population: number): number {
  const MIN_POP = 2_000;
  const MAX_POP = 200_000;

  const MIN_DIAM_TILES = 5; // min 5 tiles across
  const MAX_DIAM_TILES = 25; // max 25 tiles across

  const clamped = Math.min(MAX_POP, Math.max(MIN_POP, population));
  const t = (clamped - MIN_POP) / (MAX_POP - MIN_POP); // 0..1

  let diameter = MIN_DIAM_TILES + t * (MAX_DIAM_TILES - MIN_DIAM_TILES);

  // Keep it an odd number so the centre tile is well-defined
  let rounded = Math.round(diameter);
  if (rounded % 2 === 0) rounded += 1;

  return rounded;
}
