// game/roadBuilder.ts
import { findRoadPath } from '../pathfinding/roadPathfinding';
import type { ResourceNode, RoadConnection, Settlement, WorldMap } from '../world/types';

export type RoadBuildSource =
  | { kind: 'settlement'; settlement: Settlement }
  | { kind: 'resource'; resource: ResourceNode };

export interface RoadBuildState {
  source: RoadBuildSource | null;
  roads: RoadConnection[];
  nextRoadId: number;
}

/**
 * Initialise road-building state from existing roads in the world.
 * nextRoadId is set to max(existing id) + 1 so we don't clash.
 */
export function createInitialRoadBuildState(initialRoads: RoadConnection[]): RoadBuildState {
  const maxId =
    initialRoads.length === 0 ? 0 : initialRoads.reduce((max, r) => (r.id > max ? r.id : max), 0);

  return {
    source: null,
    roads: initialRoads,
    nextRoadId: maxId + 1,
  };
}

export function setRoadSource(state: RoadBuildState, source: RoadBuildSource | null): void {
  state.source = source;
}

export function buildRoadBetween(
  state: RoadBuildState,
  world: WorldMap,
  from: RoadBuildSource,
  to: RoadBuildSource,
): void {
  // Convert UI-level "source" types into RoadConnection endpoints
  const fromEndpoint: RoadConnection['from'] =
    from.kind === 'settlement'
      ? { kind: 'settlement', x: from.settlement.x, y: from.settlement.y }
      : { kind: 'resource', x: from.resource.x, y: from.resource.y };

  const toEndpoint: RoadConnection['to'] =
    to.kind === 'settlement'
      ? { kind: 'settlement', x: to.settlement.x, y: to.settlement.y }
      : { kind: 'resource', x: to.resource.x, y: to.resource.y };

  // Pathfinding – uses coordinates from the endpoints
  const path = findRoadPath(
    world,
    { x: fromEndpoint.x, y: fromEndpoint.y },
    { x: toEndpoint.x, y: toEndpoint.y },
  );

  if (!path) {
    console.warn('No path found between sources');
    return;
  }

  const newRoad: RoadConnection = {
    id: state.nextRoadId++, // <- satisfy the required `id` property
    from: fromEndpoint,
    to: toEndpoint,
    path,
  };

  state.roads.push(newRoad);
}
