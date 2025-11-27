import { TILE_SIZE } from '../../world/constants';
import type { RoadConnection, WorldMap } from '../../world/types';
import type { Layer } from '../layer';

export class RoadLayer implements Layer {
  constructor(private world: WorldMap) {}

  shouldTransform(): boolean {
    return true; // world-space
  }

  init() {}
  redraw() {}

  renderLayer(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;

    const roadWidth = TILE_SIZE * 0.3;
    const halfGap = (TILE_SIZE - roadWidth) / 2;

    ctx.fillStyle = '#d0d0aa'; // soft beige road

    for (const road of this.world.roads) {
      this.drawRoad(ctx, road, roadWidth, halfGap);
    }
  }

  private drawRoad(
    ctx: CanvasRenderingContext2D,
    road: RoadConnection,
    roadWidth: number,
    halfGap: number,
  ) {
    for (const step of road.path) {
      const px = step.x * TILE_SIZE + halfGap;
      const py = step.y * TILE_SIZE + halfGap;

      ctx.fillRect(px, py, roadWidth, roadWidth);
    }
  }
}
