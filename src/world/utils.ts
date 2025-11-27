export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randRange(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

export function choice<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length)];
}

export function distanceSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}
