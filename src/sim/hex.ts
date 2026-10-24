// Axial hex grid (pointy-top) and the valley terrain. Pure and deterministic.

export interface Hex {
  q: number;
  r: number;
}

export const BOARD_RADIUS = 7;
export const HEX_SIZE = 1; // centre-to-corner, world units

export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function hexDistance(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function inBoard(h: Hex, radius = BOARD_RADIUS): boolean {
  return hexDistance(h, { q: 0, r: 0 }) <= radius;
}

export function hexToWorld(q: number, r: number): { x: number; z: number } {
  return { x: HEX_SIZE * Math.sqrt(3) * (q + r / 2), z: HEX_SIZE * 1.5 * r };
}

export function worldToHex(x: number, z: number): Hex {
  const qf = ((Math.sqrt(3) / 3) * x - (1 / 3) * z) / HEX_SIZE;
  const rf = ((2 / 3) * z) / HEX_SIZE;
  return hexRound(qf, rf);
}

export function hexRound(qf: number, rf: number): Hex {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q: q + 0, r: r + 0 };
}

export function allHexes(radius = BOARD_RADIUS): Hex[] {
  const out: Hex[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) out.push({ q, r });
  }
  return out;
}

export interface TerrainSpec {
  /** reservoir centre (water hexes around it) */
  lake: Hex;
  lakeRadius: number;
  seed: number;
}

export interface Tile {
  q: number;
  r: number;
  /** terrace level 0..3 (0 = lakeside flats) */
  level: number;
  water: boolean;
  /** decorative: palm / rocks / salt flat */
  deco: 'none' | 'palm' | 'rocks' | 'salt';
}

function hash(q: number, r: number, seed: number): number {
  let h = (q * 374761393 + r * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function buildTerrain(spec: TerrainSpec, radius = BOARD_RADIUS): Map<string, Tile> {
  const tiles = new Map<string, Tile>();
  for (const h of allHexes(radius)) {
    const d = hexDistance(h, spec.lake);
    const water = d <= spec.lakeRadius;
    // terraces climb away from the lake, with gentle noise
    const n = hash(h.q, h.r, spec.seed);
    const raw = (d - spec.lakeRadius) / 2.6 + (n - 0.5) * 0.5;
    const level = water ? 0 : Math.max(0, Math.min(3, Math.floor(raw + 0.6)));
    const n2 = hash(h.q + 31, h.r - 17, spec.seed + 7);
    let deco: Tile['deco'] = 'none';
    if (!water) {
      if (d === spec.lakeRadius + 1 && n2 < 0.45) deco = 'palm';
      else if (n2 < 0.07) deco = 'palm';
      else if (n2 > 0.93) deco = 'rocks';
      else if (level === 0 && n2 > 0.75) deco = 'salt';
    }
    tiles.set(hexKey(h.q, h.r), { q: h.q, r: h.r, level, water, deco });
  }
  return tiles;
}

export const TERRACE_HEIGHT = 0.45;
