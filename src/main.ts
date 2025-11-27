import { GameRenderer } from './graphics/gameRenderer';
import { ResourceLayer } from './graphics/layers/resourceLayer';
import { RoadLayer } from './graphics/layers/roadLayer';
import { SettlementLayer } from './graphics/layers/settlementLayer';
import { TerrainLayer } from './graphics/layers/terrainLayer';
import { TransformHandler } from './graphics/transformHandler';
import { TILE_SIZE } from './world/constants';
import { generateWorld } from './world/generateWorld';
import type { ResourceNode, Settlement } from './world/types';

import {
  buildRoadBetween,
  createInitialRoadBuildState,
  RoadBuildSource,
  setRoadSource,
} from './game/roadBuilder';
import { startSimulation } from './game/simulation';
import { initInputHandlers } from './input/inputHandlers';
import { updateResourcePanel } from './ui/resourcePanel';
import { updateSettlementPanel } from './ui/settlementPanel';
import { findResourceAtTile, findSettlementAtTile } from './world/selection';

const loadingOverlay = document.getElementById('loading-overlay') as HTMLDivElement;

async function bootstrap() {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('Canvas element #game not found');

  loadingOverlay && (loadingOverlay.style.display = 'flex');
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  const world = generateWorld(123456);
  const transform = new TransformHandler();
  const renderer = new GameRenderer(canvas, transform, [
    new TerrainLayer(world),
    new RoadLayer(world),
    new ResourceLayer(world),
    new SettlementLayer(world),
  ]);

  const roadState = createInitialRoadBuildState(world.roads ?? []);

  let selectedSettlement: Settlement | null = null;
  let selectedResource: ResourceNode | null = null;

  function onCanvasClick(screenX: number, screenY: number) {
    const worldPos = transform.screenToWorld(screenX, screenY);
    const tileX = Math.floor(worldPos.x / TILE_SIZE);
    const tileY = Math.floor(worldPos.y / TILE_SIZE);

    const settlement = findSettlementAtTile(world.settlements, tileX, tileY);
    const resource = settlement ? null : findResourceAtTile(world.resources, tileX, tileY);

    if (roadState.source && (settlement || resource)) {
      const target: RoadBuildSource | null = settlement
        ? { kind: 'settlement', settlement }
        : resource
          ? { kind: 'resource', resource }
          : null;

      if (target) {
        // avoid connecting to exactly the same node
        const sameNode =
          (roadState.source.kind === 'settlement' &&
            target.kind === 'settlement' &&
            roadState.source.settlement === target.settlement) ||
          (roadState.source.kind === 'resource' &&
            target.kind === 'resource' &&
            roadState.source.resource === target.resource);

        if (!sameNode) {
          buildRoadBetween(roadState, world, roadState.source, target);
          renderer.markDirty();
        }

        // clear road source after building (or keep it if you want chains)
        setRoadSource(roadState, null);
      }
    }

    selectedSettlement = settlement;
    selectedResource = resource;

    updateSettlementPanel(settlement, (s) =>
      setRoadSource(roadState, { kind: 'settlement', settlement: s }),
    );
    updateResourcePanel(resource, (r) =>
      setRoadSource(roadState, { kind: 'resource', resource: r }),
    );
  }

  initInputHandlers(canvas, transform, onCanvasClick);

  renderer.initialize();
  startSimulation(world, renderer, {
    getSelectedResource: () => selectedResource,
    onSelectedResourceUpdated: (resource) => {
      updateResourcePanel(resource, (r) =>
        setRoadSource(roadState, { kind: 'resource', resource: r }),
      );
    },
  });

  loadingOverlay && (loadingOverlay.style.display = 'none');
}

bootstrap().catch(console.error);
