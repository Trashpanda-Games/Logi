import { TILE_SIZE } from '../../world/constants';
import type { ResourceNode, WorldMap } from '../../world/types';
import type { Layer } from '../layer';

export class ResourceLayer implements Layer {
  constructor(private world: WorldMap) {}

  shouldTransform(): boolean {
    return true;
  }

  init() {}
  redraw() {}

  renderLayer(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;

    for (const res of this.world.resources) {
      this.drawResource(ctx, res);
    }
  }

  private drawResource(ctx: CanvasRenderingContext2D, r: ResourceNode) {
    // We’ll draw a 5x5 tile patch centred on the resource tile
    const sizeTiles = 5;
    const radiusTiles = Math.floor(sizeTiles / 2);

    ctx.fillStyle = this.resourceColour(r);
    ctx.globalAlpha = 0.9;

    for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
      for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
        const tileX = r.x + dx;
        const tileY = r.y + dy;

        // bounds check
        if (tileX < 0 || tileY < 0 || tileX >= this.world.width || tileY >= this.world.height) {
          continue;
        }

        const px = tileX * TILE_SIZE;
        const py = tileY * TILE_SIZE;

        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }

    ctx.globalAlpha = 1.0;
  }

  private resourceColour(r: ResourceNode): string {
    switch (r.type) {
      case 'wood':
        return '#3b6e3b'; // forests
      case 'coal':
        return '#222222'; // dark
      case 'iron':
        return '#8a8682'; // metallic
      case 'oil':
        return '#222844'; // deep blue/black
      case 'grain':
        return '#d8b85c'; // yellow
      default:
        return '#ffffff';
    }
  }
}
