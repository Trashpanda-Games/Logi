import { createNoise2D } from 'simplex-noise';
import {
  COAST_LEVEL,
  DEEP_WATER_LEVEL,
  ELEVATION_BIAS,
  NUM_RESOURCES,
  NUM_SETTLEMENTS,
  RESOURCE_MAX_START,
  RESOURCE_MIN_START,
  SHALLOW_WATER_LEVEL,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants';
import { createRng } from './random';
import {
  ResourceNode,
  Settlement,
  SettlementSize,
  Tile,
  TileType,
  WorldMap,
  isLandTileType,
} from './types';
import { choice, distanceSq, randInt, randRange } from './utils';

let settlementIdCounter = 1;
let resourceIdCounter = 1;

export function generateWorld(seed: number = Date.now()): WorldMap {
  const rng = createRng(seed);

  const elevationNoise = createNoise2D(rng);
  const moistureNoise = createNoise2D(rng);

  const tiles = generateTiles(rng, elevationNoise, moistureNoise);
  const settlements = generateSettlements(rng, tiles);
  const resources = generateResources(rng, tiles, settlements);

  return {
    seed,
    tiles,
    settlements,
    resources,
    roads: [],
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  };
}

function generateTiles(
  rng: () => number,
  elevationNoise: (x: number, y: number) => number,
  moistureNoise: (x: number, y: number) => number,
): Tile[] {
  const tiles: Tile[] = [];

  // Choose noise scales so that at WORLD_WIDTH ≈ 1000 you get a similar look
  const ELEVATION_NOISE_SCALE = 0.0036; // ≈ 3.6 / 1000
  const MOISTURE_NOISE_SCALE = 0.0044; // tweak to taste

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      // Normalised coords in [-1, 1] for masks/shaping
      const nx = (x / WORLD_WIDTH) * 2 - 1;
      const ny = (y / WORLD_HEIGHT) * 2 - 1;

      // --- Base elevation noise in *tile* space ---
      const e = elevationNoise(x * ELEVATION_NOISE_SCALE, y * ELEVATION_NOISE_SCALE) * 0.5 + 0.5; // 0..1

      // "Continent mask": land more likely away from edges (still uses nx/ny)
      const distanceFromCenter = Math.sqrt(nx * nx + ny * ny); // 0 at center, ~1.4 corners
      const continentMask = 1 - smoothstep(0.9, 1.4, distanceFromCenter); // 1 near center, 0 at far edges

      let elevation = e * 0.75 + continentMask * 0.3 + ELEVATION_BIAS;
      elevation = clamp01(elevation);

      // --- Moisture noise also in tile space ---
      let moisture =
        moistureNoise(x * MOISTURE_NOISE_SCALE + 100, y * MOISTURE_NOISE_SCALE + 100) * 0.5 + 0.5;
      moisture = clamp01(moisture);

      const type = classifyTile(elevation, moisture);

      tiles.push({ x, y, type, elevation, moisture });
    }
  }

  return tiles;
}

function carveRivers(rng: () => number, tiles: Tile[]): void {
  const width = WORLD_WIDTH;
  const height = WORLD_HEIGHT;

  const index = (x: number, y: number) => y * width + x;
  const getTile = (x: number, y: number): Tile | undefined =>
    x < 0 || y < 0 || x >= width || y >= height ? undefined : tiles[index(x, y)];

  // Precompute "distance to nearest water" (deep/shallow/coast) for every tile
  const distToWater = buildDistanceToWaterMap(tiles);

  // Potential river sources: high elevation, moist, on land
  const candidates = tiles.filter(
    (t) => t.elevation > 0.65 && t.moisture > 0.55 && isLandTileType(t.type),
  );

  const numRivers = Math.min(12, Math.max(4, Math.round((width * height) / 300)));

  for (let i = 0; i < numRivers && candidates.length > 0; i++) {
    const startIndex = randInt(rng, 0, candidates.length);
    const source = candidates.splice(startIndex, 1)[0];
    if (!source) break;

    let current = source;
    let safety = 0;

    // Track last direction to discourage long straight segments
    let prevDx = 0;
    let prevDy = 0;

    // Track visited tiles to avoid loops
    const visited = new Set<number>();

    while (safety++ < width * height) {
      // Stop only when we've actually entered the sea/lake (deep or shallow water).
      if (current.type === 'deep_water' || current.type === 'shallow_water') {
        break;
      }

      // Mark current tile as river (including coast tiles so rivers cut through beaches)
      if (isLandTileType(current.type) || current.type === 'coast') {
        current.type = 'river';
      }

      const curIdx = index(current.x, current.y);
      const curDist = distToWater[curIdx];
      visited.add(curIdx);

      if (!isFinite(curDist)) {
        break;
      }

      // 8-direction neighbours for more organic paths
      const neighbours: { tile: Tile; dx: number; dy: number }[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = current.x + dx;
          const ny = current.y + dy;
          const n = getTile(nx, ny);
          if (!n) continue;
          neighbours.push({ tile: n, dx, dy });
        }
      }

      if (neighbours.length === 0) break;

      // Build candidate moves with a cost function:
      //  - prefer tiles closer to water
      //  - prefer going downhill
      //  - add penalty for continuing in the exact same direction
      //  - add a bit of random noise to break perfect lines
      let best = null as null | { tile: Tile; dx: number; dy: number; score: number };

      for (const { tile: n, dx, dy } of neighbours) {
        const nIdx = index(n.x, n.y);
        if (visited.has(nIdx)) continue;

        const dWater = distToWater[nIdx];
        if (!isFinite(dWater)) continue;

        // Don't wander too far away from the sea: allow equal or slightly worse distance,
        // but cap how much worse it can be.
        if (dWater > curDist + 1) continue;

        const downhill = Math.max(0, current.elevation - n.elevation); // >0 means going downhill
        const sameDir = dx === prevDx && dy === prevDy;
        const sameDirPenalty = sameDir ? 0.6 : 0;

        const randomWobble = Math.random() * 0.4;

        // Lower score = better
        const score = dWater * 2 - downhill * 1 + sameDirPenalty + randomWobble;

        if (!best || score < best.score) {
          best = { tile: n, dx, dy, score };
        }
      }

      if (!best) {
        break;
      }

      prevDx = best.dx;
      prevDy = best.dy;
      current = best.tile;
    }
  }
}

function buildDistanceToWaterMap(tiles: Tile[]): number[] {
  const width = WORLD_WIDTH;
  const height = WORLD_HEIGHT;
  const length = width * height;

  const dist = new Array<number>(length).fill(Infinity);
  const queue: { x: number; y: number }[] = [];

  const index = (x: number, y: number) => y * width + x;

  // Initialise queue with all water tiles
  for (const t of tiles) {
    if (t.type === 'deep_water' || t.type === 'shallow_water' || t.type === 'coast') {
      const idx = index(t.x, t.y);
      dist[idx] = 0;
      queue.push({ x: t.x, y: t.y });
    }
  }

  // Multi-source BFS to compute Manhattan distance to nearest water
  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const;

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    const curIdx = index(x, y);
    const curDist = dist[curIdx];

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

      const nIdx = index(nx, ny);
      const nd = dist[nIdx];

      if (nd > curDist + 1) {
        dist[nIdx] = curDist + 1;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return dist;
}

function classifyTile(elevation: number, moisture: number): TileType {
  // --- Water bands ---
  if (elevation < DEEP_WATER_LEVEL) return 'deep_water';
  if (elevation < SHALLOW_WATER_LEVEL) return 'shallow_water';
  if (elevation < COAST_LEVEL) return 'coast';

  // --- High land: mountains fairly rare now ---
  if (elevation > 0.86 && moisture < 0.75) {
    return 'mountains';
  }

  // High-ish land: hills/forest
  if (elevation > 0.68) {
    return moisture > 0.55 ? 'forest' : 'hills';
  }

  // Mid land
  if (elevation > 0.45) {
    if (moisture > 0.7) return 'forest';
    return 'plains';
  }

  // Low land above coast
  if (moisture > 0.65) return 'forest';
  return 'plains';
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function generateSettlements(rng: () => number, tiles: Tile[]): Settlement[] {
  const settlements: Settlement[] = [];

  const landTiles = tiles.filter((t) => isLandTileType(t.type));

  const prefixes = ['New', 'North', 'South', 'Port', 'Lake', 'Fort', 'High'];
  const roots = ['ford', 'ham', 'bury', 'field', 'bridge', 'ton', 'wick'];

  let attempts = 0;

  while (settlements.length < NUM_SETTLEMENTS && attempts < NUM_SETTLEMENTS * 40) {
    attempts++;

    const tile = choice(rng, landTiles);

    // avoid clustering too much
    const minDistSq = 5 * 5;
    const tooClose = settlements.some((s) => distanceSq(s.x, s.y, tile.x, tile.y) < minDistSq);
    if (tooClose) continue;

    const size = randomSettlementSize(rng);
    const population =
      size === 'city'
        ? randInt(rng, 80000, 200000)
        : size === 'town'
          ? randInt(rng, 15000, 80000)
          : randInt(rng, 2000, 15000);

    const name = `${choice(rng, prefixes)}${choice(rng, roots)}`;

    const demand = {
      pax: Math.round(population / 1000 + randRange(rng, 5, 25)),
      goods: Math.round(population / 1500 + randRange(rng, 3, 20)),
      fuel: Math.round(population / 2000 + randRange(rng, 2, 12)),
    };

    const supply = {
      goods: Math.round(population / 2000 + randRange(rng, 1, 8)),
      fuel: Math.round(population / 3000 + randRange(rng, 0, 4)),
    };

    settlements.push({
      id: settlementIdCounter++,
      name,
      x: tile.x,
      y: tile.y,
      size,
      population,
      demand,
      supply,
    });
  }

  return settlements;
}

function randomSettlementSize(rng: () => number): SettlementSize {
  const r = rng(); // use seeded RNG
  if (r < 0.15) return 'city'; // 15%
  if (r < 0.55) return 'town'; // 40%
  return 'village'; // 45%
}

function generateResources(
  rng: () => number,
  tiles: Tile[],
  settlements: Settlement[],
): ResourceNode[] {
  const resources: ResourceNode[] = [];
  const types: ResourceNode['type'][] = ['wood', 'coal', 'oil', 'iron', 'grain'];

  let attempts = 0;

  while (resources.length < NUM_RESOURCES && attempts < NUM_RESOURCES * 120) {
    attempts++;

    // Pick a random tile anywhere (land or water)
    const tile = choice(rng, tiles);

    // Don’t spawn on extreme map edges to avoid ugly clipping of 5x5 blobs
    if (tile.x < 2 || tile.y < 2 || tile.x > WORLD_WIDTH - 3 || tile.y > WORLD_HEIGHT - 3) {
      continue;
    }

    // Choose resource type based on biome
    const resType = pickResourceTypeForTile(tile);
    if (!resType) {
      continue; // this biome might not want a resource this time
    }

    // Keep some spacing from settlements
    const minDistToSettlementSq = 3 * 3;
    if (settlements.some((s) => distanceSq(s.x, s.y, tile.x, tile.y) < minDistToSettlementSq)) {
      continue;
    }

    // Keep some spacing from other resource nodes (centre → centre)
    const minDistToResourceSq = 5 * 5;
    if (resources.some((r) => distanceSq(r.x, r.y, tile.x, tile.y) < minDistToResourceSq)) {
      continue;
    }

    const richness = randRange(rng, 0.4, 1.0);
    const stats = computeResourceStats(resType, richness);
    let minStart = RESOURCE_MIN_START;
    let maxStart = RESOURCE_MAX_START;

    switch (resType) {
      case 'wood':
        minStart = 0.7;
        maxStart = 1.0;
        break;
      case 'grain':
        minStart = 0.4;
        maxStart = 0.8;
        break;
      case 'coal':
      case 'iron':
        minStart = 0.2;
        maxStart = 1.0;
        break;
      case 'oil':
        minStart = 0.1;
        maxStart = 0.6;
        break;
    }

    const startPercent = randRange(rng, minStart, maxStart);
    const current = Math.floor(stats.capacity * startPercent);

    resources.push({
      id: resourceIdCounter++,
      type: resType,
      x: tile.x,
      y: tile.y,
      richness,
      capacity: stats.capacity,
      current: current, // start full
      regenPerTick: stats.regenPerTick,
    });
  }

  return resources;
}

function computeResourceStats(
  type: ResourceNode['type'],
  richness: number,
): { capacity: number; regenPerTick: number } {
  // base numbers per type
  let baseCapacity: number;
  let baseRegen: number;

  switch (type) {
    case 'wood':
      baseCapacity = 1_000;
      baseRegen = 2; // per tick
      break;
    case 'grain':
      baseCapacity = 1_500;
      baseRegen = 3;
      break;
    case 'coal':
      baseCapacity = 3_000;
      baseRegen = 1;
      break;
    case 'iron':
      baseCapacity = 2_500;
      baseRegen = 1.5;
      break;
    case 'oil':
      baseCapacity = 5_000;
      baseRegen = 0.8;
      break;
    default:
      baseCapacity = 1_000;
      baseRegen = 1;
      break;
  }

  // Richness scales both capacity and regen a bit
  const capacity = Math.round(baseCapacity * (0.7 + richness * 0.6)); // ~0.7–1.3x
  const regenPerTick = +(baseRegen * (0.6 + richness * 0.8)).toFixed(2);

  return { capacity, regenPerTick };
}

function pickResourceTypeForTile(tile: Tile): ResourceNode['type'] | null {
  const r = Math.random();

  switch (tile.type) {
    // --- Forest: mostly wood, some grain/coal ---
    case 'forest':
      if (r < 0.75) return 'wood';
      if (r < 0.88) return 'grain';
      if (r < 0.96) return 'coal';
      return null; // sometimes no resource

    // --- Plains: mostly grain, occasional iron/wood ---
    case 'plains':
      if (r < 0.7) return 'grain';
      if (r < 0.82) return 'wood';
      if (r < 0.92) return 'iron';
      return null;

    // --- Hills: coal & iron deposits ---
    case 'hills':
      if (r < 0.45) return 'coal';
      if (r < 0.85) return 'iron';
      if (r < 0.92) return 'grain';
      return null;

    // --- Mountains: high chance of coal/iron, maybe oil shale ---
    case 'mountains':
      if (r < 0.5) return 'coal';
      if (r < 0.9) return 'iron';
      if (r < 0.96) return 'oil';
      return null;

    // --- Coasts & rivers: oil + some grain (fertile river valleys) ---
    case 'coast':
    case 'river':
      if (r < 0.55) return 'oil';
      if (r < 0.8) return 'grain';
      return null;

    // --- Open water: mostly oil, sometimes nothing ---
    case 'deep_water':
    case 'shallow_water':
      if (r < 0.65) return 'oil';
      return null;

    default:
      return null;
  }
}
