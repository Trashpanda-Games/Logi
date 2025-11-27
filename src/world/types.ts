export type TileType =
  | 'deep_water'
  | 'shallow_water'
  | 'coast'
  | 'plains'
  | 'forest'
  | 'hills'
  | 'mountains'
  | 'river';

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  elevation: number; // 0..1
  moisture: number; // 0..1
}

export type SettlementSize = 'village' | 'town' | 'city';

export interface DemandProfile {
  pax: number;
  goods: number;
  fuel: number;
}

export interface SupplyProfile {
  goods: number;
  fuel: number;
}

export interface Settlement {
  id: number;
  name: string;
  x: number; // tile coords
  y: number;
  size: SettlementSize;
  population: number;
  demand: DemandProfile;
  supply: SupplyProfile;
}

export interface ResourceNode {
  id: number;
  type: 'wood' | 'coal' | 'oil' | 'iron' | 'grain';
  x: number;
  y: number;
  richness: number; // 0..1 – quality of the deposit
  capacity: number; // total capacity / max units
  current: number; // current available units
  regenPerTick: number; // how many units regenerate per tick
}

export interface RoadStep {
  x: number;
  y: number;
}

export interface RoadConnection {
  id: number;
  from: {
    kind: 'settlement' | 'resource';
    x: number;
    y: number;
  };
  to: {
    kind: 'settlement' | 'resource';
    x: number;
    y: number;
  };
  path: RoadStep[]; // sequence of tile coords from from → to
}

export interface WorldMap {
  seed: number;
  width: number;
  height: number;
  tiles: Tile[];
  settlements: Settlement[];
  resources: ResourceNode[];
  roads: RoadConnection[];
}

export function isLandTileType(type: TileType): boolean {
  return type === 'plains' || type === 'forest' || type === 'hills' || type === 'mountains';
}
