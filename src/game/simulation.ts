// game/simulation.ts
import type { GameRenderer } from '../graphics/gameRenderer';
import type { ResourceNode, WorldMap } from '../world/types';

interface SimulationOptions {
  getSelectedResource: () => ResourceNode | null;
  onSelectedResourceUpdated: (resource: ResourceNode | null) => void;
}

/**
 * Start the main game loop.
 * - Owns requestAnimationFrame.
 * - Updates world state.
 * - Asks the renderer to draw one frame.
 * - Optionally notifies when the selected resource's values change.
 */
export function startSimulation(
  world: WorldMap,
  renderer: GameRenderer,
  options?: SimulationOptions,
): number {
  let lastTime = performance.now();

  // For throttling UI updates
  let uiAccumulator = 0;
  let lastSelectedCurrent: number | null = null;

  const frame = (now: number) => {
    const dtSeconds = (now - lastTime) / 1000;
    lastTime = now;

    // 1. Update world state
    updateWorld(world, dtSeconds);

    // 2. Optionally notify about selected resource changes (throttled)
    if (options) {
      uiAccumulator += dtSeconds;

      // Only refresh UI at most 4 times per second
      if (uiAccumulator >= 0.25) {
        const selected = options.getSelectedResource();
        const current = selected ? selected.current : null;

        if (current !== lastSelectedCurrent) {
          options.onSelectedResourceUpdated(selected ?? null);
          lastSelectedCurrent = current;
        }

        uiAccumulator = 0;
      }
    }

    // 3. Render a single frame
    renderer.renderFrame();

    // 4. Queue next frame
    requestAnimationFrame(frame);
  };

  const handle = requestAnimationFrame(frame);
  return handle;
}

export function stopSimulation(handle: number) {
  cancelAnimationFrame(handle);
}

function updateWorld(world: WorldMap, dtSeconds: number) {
  // Simple resource regeneration
  for (const r of world.resources) {
    if (r.current < r.capacity) {
      const amount = r.regenPerTick * dtSeconds; // tweak if needed
      r.current = Math.min(r.capacity, r.current + amount);
    }
  }
}
