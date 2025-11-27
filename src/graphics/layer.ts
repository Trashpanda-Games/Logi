export interface Layer {
  init?(): void;
  redraw?(): void;
  renderLayer?(ctx: CanvasRenderingContext2D): void;
  tick?(): void;
  shouldTransform?(): boolean; // world-space vs screen-space
}
