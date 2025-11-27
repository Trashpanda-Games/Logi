export class TransformHandler {
  private scale = 0.5; // initial zoom
  private offsetX = 0;
  private offsetY = 0;
  private changed = true;

  handleTransform(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
  }

  resetChanged() {
    this.changed = false;
  }

  isChanged(): boolean {
    return this.changed;
  }

  pan(dx: number, dy: number) {
    this.offsetX += dx;
    this.offsetY += dy;
    this.changed = true;
  }

  zoom(factor: number, centerX: number, centerY: number) {
    const oldScale = this.scale;
    const newScale = Math.max(0.1, Math.min(4, oldScale * factor));

    const rectCenterX = (centerX - this.offsetX) / oldScale;
    const rectCenterY = (centerY - this.offsetY) / oldScale;

    this.scale = newScale;
    this.offsetX = centerX - rectCenterX * newScale;
    this.offsetY = centerY - rectCenterY * newScale;
    this.changed = true;
  }

  // NEW: convert screen (client) coords to world coords
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const x = (screenX - this.offsetX) / this.scale;
    const y = (screenY - this.offsetY) / this.scale;
    return { x, y };
  }

  fitToWorld(
    worldPixelWidth: number,
    worldPixelHeight: number,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    if (worldPixelWidth === 0 || worldPixelHeight === 0) return;

    const scaleX = canvasWidth / worldPixelWidth;
    const scaleY = canvasHeight / worldPixelHeight;

    // Use the smaller scale so the whole world fits; add a small margin
    this.scale = Math.min(scaleX, scaleY) * 0.95;

    // Centre the world in the canvas
    this.offsetX = (canvasWidth - worldPixelWidth * this.scale) / 2;
    this.offsetY = (canvasHeight - worldPixelHeight * this.scale) / 2;

    this.changed = true;
  }
}
