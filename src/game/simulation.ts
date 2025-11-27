// game/simulation.ts
import type { WorldMap } from '../world/types';

const TICK_MS = 1000; // 1 second per game tick – tweak if you like

/**
 * Start a very lightweight simulation loop that only regenerates resources.
 * It does NOT touch the renderer or the DOM, so it won't impact panning/zooming.
 */
export function startSimulation(world: WorldMap): number {
  function step() {
    for (const r of world.resources) {
      if (r.current < r.capacity) {
        // You can scale this if you want "per second" instead of "per tick"
        r.current = Math.min(r.capacity, r.current + r.regenPerTick);
      }
    }
  }

  // Optionally run once immediately
  step();

  const intervalId = window.setInterval(step, TICK_MS);
  return intervalId;
}

export function stopSimulation(intervalId: number) {
  window.clearInterval(intervalId);
}
