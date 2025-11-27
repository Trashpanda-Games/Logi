import { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../world/constants';
import type { Layer } from './layer';
import { TransformHandler } from './transformHandler';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private needsRedraw = true;

  constructor(
    private canvas: HTMLCanvasElement,
    public transformHandler: TransformHandler,
    private layers: Layer[],
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas not supported');
    this.ctx = context;
  }

  initialize() {
    this.layers.forEach((l) => l.init?.());
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const worldPixelWidth = WORLD_WIDTH * TILE_SIZE;
    const worldPixelHeight = WORLD_HEIGHT * TILE_SIZE;

    this.transformHandler.fitToWorld(
      worldPixelWidth,
      worldPixelHeight,
      this.canvas.width,
      this.canvas.height,
    );
  }

  markDirty() {
    this.needsRedraw = true;
  }

  /** Call when world data changes significantly and cached layers should rebuild */
  redraw() {
    this.layers.forEach((l) => l.redraw?.());
  }

  private renderGame() {
    const ctx = this.ctx;

    // clear background
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const handleTransformState = (applyTransform: boolean, isTransformActive: boolean): boolean => {
      if (applyTransform && !isTransformActive) {
        ctx.save();
        this.transformHandler.handleTransform(ctx);
        return true;
      } else if (!applyTransform && isTransformActive) {
        ctx.restore();
        return false;
      }
      return isTransformActive;
    };

    let isTransformActive = false;

    for (const layer of this.layers) {
      const shouldTransform = layer.shouldTransform?.() ?? false;
      isTransformActive = handleTransformState(shouldTransform, isTransformActive);
      layer.renderLayer?.(ctx);
    }

    handleTransformState(false, isTransformActive);
    this.transformHandler.resetChanged();
  }

  renderFrame() {
    if (!this.transformHandler.isChanged() && !this.needsRedraw) {
      // Still let layers tick(), but skip expensive drawing
      this.layers.forEach((l) => l.tick?.());
      return;
    }

    this.renderGame();
    this.layers.forEach((l) => l.tick?.());

    this.needsRedraw = false;
  }

  dispose() {}
}
