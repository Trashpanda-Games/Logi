import { TILE_SIZE } from '../../world/constants';
import type { Tile, WorldMap } from '../../world/types';
import type { Layer } from '../layer';

export class TerrainLayer implements Layer {
  private terrainCanvas: HTMLCanvasElement;
  private terrainCtx: CanvasRenderingContext2D;

  constructor(private world: WorldMap) {
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCanvas.width = world.width * TILE_SIZE;
    this.terrainCanvas.height = world.height * TILE_SIZE;

    const ctx = this.terrainCanvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported for terrain');
    this.terrainCtx = ctx;
  }

  shouldTransform(): boolean {
    return true; // world-space layer
  }

  init() {
    this.redraw();
  }

  redraw() {
    const ctx = this.terrainCtx;
    ctx.imageSmoothingEnabled = false;

    // Base
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, this.terrainCanvas.width, this.terrainCanvas.height);

    // Tiles
    for (const tile of this.world.tiles) {
      this.drawTile(ctx, tile);
    }

    // Grid overlay
    //this.drawGrid(ctx);
  }

  private drawTile(ctx: CanvasRenderingContext2D, tile: Tile) {
    const x = tile.x * TILE_SIZE;
    const y = tile.y * TILE_SIZE;

    ctx.fillStyle = this.tileColour(tile);
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  }

  private tileColour(tile: Tile): string {
    switch (tile.type) {
      case 'deep_water':
        return '#0b1b3a'; // dark ocean
      case 'shallow_water':
        return '#15486b'; // lighter coastal water
      case 'coast':
        return '#c2b28f'; // sandy coast
      case 'plains':
        return '#4b7f3a'; // green plains
      case 'forest':
        return '#2f5b2f'; // darker forest green
      case 'hills':
        return '#6b7b48'; // brownish hills
      case 'mountains':
        return '#7f7f7f'; // rocky
      case 'river':
        return '#1b5f8a'; // river blue
      default:
        return '#ff00ff'; // debug magenta
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#26263a';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const widthPx = this.world.width * TILE_SIZE;
    const heightPx = this.world.height * TILE_SIZE;

    for (let x = 0; x <= this.world.width; x++) {
      const px = x * TILE_SIZE + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, heightPx);
    }

    for (let y = 0; y <= this.world.height; y++) {
      const py = y * TILE_SIZE + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(widthPx, py);
    }

    ctx.stroke();
  }

  renderLayer(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.terrainCanvas, 0, 0);
  }
}
