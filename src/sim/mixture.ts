// Packets of matter and their classification. Pure logic.
import { ALL_UNITS, SUBSTANCES, sub, type UnitId } from './substances';

/** A packet is a set of components with mass (abstract mass units). */
export type Comp = Partial<Record<UnitId, number>>;

export const EPS = 1e-6;

export function clean(c: Comp): Comp {
  const out: Comp = {};
  for (const k of Object.keys(c) as UnitId[]) {
    const v = c[k] ?? 0;
    if (v > EPS) out[k] = v;
  }
  return out;
}

export function total(c: Comp): number {
  let t = 0;
  for (const k of Object.keys(c) as UnitId[]) t += c[k] ?? 0;
  return t;
}

export function add(a: Comp, b: Comp): Comp {
  const out: Comp = { ...a };
  for (const k of Object.keys(b) as UnitId[]) out[k] = (out[k] ?? 0) + (b[k] ?? 0);
  return clean(out);
}

export function scale(a: Comp, f: number): Comp {
  const out: Comp = {};
  for (const k of Object.keys(a) as UnitId[]) out[k] = (a[k] ?? 0) * f;
  return clean(out);
}

export function units(c: Comp): UnitId[] {
  // stable order: substance table order
  return ALL_UNITS.filter((u) => (c[u] ?? 0) > EPS);
}

export function mass(c: Comp, u: UnitId): number {
  return c[u] ?? 0;
}

/**
 * Which soluble solids are dissolved. Water is the only solvent in this slice.
 * Solids dissolve in order of the substance table until the water's capacity for
 * each is used (each solute has its own solubility; we treat them independently,
 * a reasonable approximation for the small amounts used here).
 */
export function dissolvedMass(c: Comp, u: UnitId): number {
  const s = sub(u);
  if (s.phase !== 'solid' || s.solubility <= 0) return 0;
  const w = mass(c, 'water');
  return Math.min(mass(c, u), w * s.solubility);
}

export function undissolvedSolidMass(c: Comp, u: UnitId): number {
  const s = sub(u);
  if (s.phase !== 'solid') return 0;
  return mass(c, u) - dissolvedMass(c, u);
}

export function hasLiquid(c: Comp): boolean {
  return units(c).some((u) => sub(u).phase === 'liquid');
}

/** Liquids that do not mix with water form their own layer. */
export function immiscibleLiquids(c: Comp): UnitId[] {
  return units(c).filter((u) => sub(u).phase === 'liquid' && !sub(u).miscibleWithWater);
}

export type MatterClass = 'element' | 'compound' | 'homogeneous' | 'heterogeneous';

export const CLASS_HE: Record<MatterClass, string> = {
  element: 'יסוד',
  compound: 'תרכובת',
  homogeneous: 'תערובת הומוגנית',
  heterogeneous: 'תערובת הטרוגנית',
};

/**
 * Distribution: is the packet one uniform phase? A mixture is homogeneous when every
 * particle is spread evenly in a single phase: all gases, or one liquid phase (water with
 * miscible liquids and fully dissolved solids). Any undissolved solid next to something
 * else, any immiscible liquid layer, or two different solids → regions → heterogeneous.
 */
export function isUniform(c: Comp): boolean {
  const us = units(c);
  if (us.length <= 1) return true;
  const phases = new Set(us.map((u) => sub(u).phase));
  if (phases.size === 1 && phases.has('gas')) return true;
  // liquid phase(s)
  if (immiscibleLiquids(c).length > 0) {
    // an oil next to anything else is a separate layer
    return false;
  }
  if (!hasLiquid(c)) return false; // two or more solids (powders) side by side
  for (const u of us) {
    if (sub(u).phase === 'gas') return false;
    if (sub(u).phase === 'solid' && undissolvedSolidMass(c, u) > EPS) return false;
  }
  return true;
}

/** Workbook's classification, derived only from the particle data. */
export function classify(c: Comp): MatterClass {
  const us = units(c);
  if (us.length === 1) {
    const atoms = Object.keys(SUBSTANCES[us[0]].atoms);
    return atoms.length === 1 ? 'element' : 'compound';
  }
  return isUniform(c) ? 'homogeneous' : 'heterogeneous';
}

export function isPure(c: Comp): boolean {
  return units(c).length === 1;
}

/** short Hebrew description like "ברזל + חול" */
export function describe(c: Comp): string {
  return units(c)
    .map((u) => sub(u).he)
    .join(' + ');
}
