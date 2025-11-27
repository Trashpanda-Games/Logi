import { WORLD_HEIGHT, WORLD_WIDTH } from '../world/constants';
import type { Layer } from './layer';
import { TransformHandler } from './transformHandler';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
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

  markDirty() {
    this.needsRedraw = true;
  }

  initialize() {
    this.layers.forEach((l) => l.init?.());
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
    this.loop();
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const worldPixelWidth = WORLD_WIDTH;
    const worldPixelHeight = WORLD_HEIGHT;
    this.transformHandler.fitToWorld(
      worldPixelWidth,
      worldPixelHeight,
      this.canvas.width,
      this.canvas.height,
    );
  }

  /** Call when world data changes significantly and cached layers should rebuild */
  redraw() {
    this.layers.forEach((l) => l.redraw?.());
  }

  private loop = () => {
    // Only render if camera moved or something marked itself dirty
    if (this.transformHandler.isChanged() || this.needsRedraw) {
      this.renderGame();
      this.needsRedraw = false;
    }

    this.layers.forEach((l) => l.tick?.());
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

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

  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
