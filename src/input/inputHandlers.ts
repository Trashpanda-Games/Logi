// input/inputHandlers.ts
import type { TransformHandler } from '../graphics/transformHandler';

export function initInputHandlers(
  canvasElement: HTMLCanvasElement,
  transform: TransformHandler,
  onClick: (screenX: number, screenY: number) => void,
): void {
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  canvasElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mouseup', (e) => {
    const wasDragging = isDragging;
    isDragging = false;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const distSq = dx * dx + dy * dy;

    // If mouseup happened over the canvas and we didn't move much → treat as click
    const rect = canvasElement.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (inside && wasDragging && distSq < 4) {
      onClick(e.clientX, e.clientY);
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    transform.pan(dx, dy);
  });

  canvasElement.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      transform.zoom(factor, e.clientX, e.clientY);
    },
    { passive: false },
  );
}
