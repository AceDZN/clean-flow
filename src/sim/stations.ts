// Separation stations as pure functions on packets. Mass is conserved:
// the sum of every output (including vapor) equals the input.
import { EPS, add, clean, dissolvedMass, hasLiquid, immiscibleLiquids, mass, total, undissolvedSolidMass, units, type Comp } from './mixture';

/** Share of iron a magnet still catches when the filings are wet and sunk in a slurry. Workbook
 * (separation-lab): wet iron sinks under the water and is very hard to collect with a magnet,
 * so the iron always comes out first. */
export const WET_MAGNET_CATCH = 0.5;
import { isVolatile, sub, type UnitId } from './substances';

export type StationType = 'magnet' | 'filter' | 'sieve' | 'funnel' | 'tank' | 'pan' | 'still' | 'chroma';

export interface PortDef {
  id: string;
  he: string; // outlet label on the machine
}

export interface StationDef {
  type: StationType;
  he: string;
  heShort: string;
  /** the property this machine exploits (Workbook step 2) */
  propertyHe: string;
  outputs: PortDef[];
  /** seconds to process one packet */
  procTime: number;
  /** accepts several incoming pipes (only the dissolving tank) */
  multiInput: boolean;
  blurb: string;
}

export const STATIONS: Record<StationType, StationDef> = {
  magnet: {
    type: 'magnet', he: 'תוף מגנטי', heShort: 'מגנט', propertyHe: 'מגנטיות',
    outputs: [{ id: 'magnetic', he: 'נמשך למגנט' }, { id: 'rest', he: 'השאר' }],
    procTime: 1.2, multiInput: false,
    blurb: 'מושך חלקיקים מגנטיים (ברזל) לצינור אחד, כל השאר ממשיך. ברזל רטוב שוקע בבוץ — המגנט תופס רק חלק ממנו.',
  },
  filter: {
    type: 'filter', he: 'מסנן', heShort: 'מסנן', propertyHe: 'גודל חלקיקים',
    outputs: [{ id: 'filtrate', he: 'נוזל מסונן' }, { id: 'residue', he: 'משקע' }],
    procTime: 1.2, multiInput: false,
    blurb: 'נוזל וכל מה שמומס בו עוברים דרך הנייר. מוצק שלא נמס נשאר על הנייר.',
  },
  sieve: {
    type: 'sieve', he: 'נפה', heShort: 'נפה', propertyHe: 'גודל חלקיקים',
    outputs: [{ id: 'coarse', he: 'גס' }, { id: 'fine', he: 'דק' }],
    procTime: 1.0, multiInput: false,
    blurb: 'רשת: גרגרים גדולים (חצץ) נשארים למעלה, כל השאר עובר.',
  },
  funnel: {
    type: 'funnel', he: 'משפך הפרדה', heShort: 'משפך', propertyHe: 'צפיפות',
    outputs: [{ id: 'top', he: 'שכבה עליונה' }, { id: 'bottom', he: 'שכבה תחתונה' }],
    procTime: 1.4, multiInput: false,
    blurb: 'נוזלים שלא מתערבבים נפרדים לשכבות: הקל צף למעלה, הכבד נשאר למטה.',
  },
  tank: {
    type: 'tank', he: 'מיכל המסה', heShort: 'המסה', propertyHe: 'מסיסות',
    outputs: [{ id: 'out', he: 'יציאה' }],
    procTime: 1.0, multiInput: true,
    blurb: 'מערבב את כל מה שנכנס. חברו אליו צינור מים — מוצק מסיס נמס, מוצק לא מסיס לא.',
  },
  pan: {
    type: 'pan', he: 'אגן אידוי', heShort: 'אידוי', propertyHe: 'נקודת רתיחה',
    outputs: [{ id: 'crystals', he: 'גבישים' }],
    procTime: 1.6, multiInput: false,
    blurb: 'מחמם עד שהנוזל מתאדה ועף כאדים. כל מה שלא מתאדה נשאר בתחתית.',
  },
  still: {
    type: 'still', he: 'מתקן זיקוק', heShort: 'זיקוק', propertyHe: 'נקודת רתיחה',
    outputs: [{ id: 'distillate', he: 'נוזל מזוקק' }, { id: 'remainder', he: 'נשאר בדוד' }],
    procTime: 1.6, multiInput: false,
    blurb: 'מרתיח לטמפרטורה שבחרתם. מה שרותח מתאדה, מתקרר במעבה ונאסף כנוזל מזוקק.',
  },
  chroma: {
    type: 'chroma', he: 'מגדל כרומטוגרפיה', heShort: 'כרומטוגרפיה', propertyHe: 'מהירות תנועה',
    outputs: [{ id: 'fast', he: 'פס מהיר' }, { id: 'slow', he: 'פס איטי' }],
    procTime: 1.4, multiInput: false,
    blurb: 'הממס מטפס על הנייר וגורר כל פיגמנט במהירות אחרת: הפיגמנטים נפרדים לפסים. (במעבדה זו שיטה לכמויות זעירות — בעמק בנינו מגדל ענק.)',
  },
};

export const STILL_TEMPS = [78, 100] as const;
export type StillTemp = (typeof STILL_TEMPS)[number];

export interface StationConfig {
  stillTemp?: StillTemp;
}

/** Outputs keyed by port id, plus mass that left as vapor into the air. */
export interface StationResult {
  outputs: Record<string, Comp>;
  vapor: Comp;
  /** short machine-state note for feedback ("dry filter", "nothing magnetic", ...) */
  note?: string;
}

function split(c: Comp, pred: (u: UnitId, c: Comp) => number): [Comp, Comp] {
  // pred returns the mass of unit u that goes to the first output
  const a: Comp = {};
  const b: Comp = {};
  for (const u of units(c)) {
    const m = mass(c, u);
    const toA = Math.max(0, Math.min(m, pred(u, c)));
    a[u] = toA;
    b[u] = m - toA;
  }
  return [clean(a), clean(b)];
}

export function runStation(type: StationType, input: Comp, cfg: StationConfig = {}): StationResult {
  switch (type) {
    case 'magnet': {
      const wet = hasLiquid(input);
      const [magnetic, rest] = split(input, (u, c) => (sub(u).magnetic ? undissolvedSolidMass(c, u) * (wet ? WET_MAGNET_CATCH : 1) : 0));
      const note = total(magnetic) < EPS ? 'nothing-magnetic' : wet ? 'wet-magnet' : undefined;
      return { outputs: { magnetic, rest }, vapor: {}, note };
    }
    case 'filter': {
      if (!hasLiquid(input)) {
        // dry powder on filter paper: nothing flows through
        return { outputs: { filtrate: {}, residue: clean({ ...input }) }, vapor: {}, note: 'dry-filter' };
      }
      // liquids and dissolved matter pass; undissolved solids stay on the paper
      const [residue, filtrate] = split(input, (u, c) => (sub(u).phase === 'solid' ? undissolvedSolidMass(c, u) : 0));
      return { outputs: { filtrate, residue }, vapor: {}, note: total(residue) < EPS ? 'all-passed' : undefined };
    }
    case 'sieve': {
      const [coarse, fine] = split(input, (u, c) => (sub(u).phase === 'solid' && sub(u).grain >= 3 ? undissolvedSolidMass(c, u) : 0));
      return { outputs: { coarse, fine }, vapor: {}, note: total(coarse) < EPS ? 'all-passed' : undefined };
    }
    case 'funnel': {
      const oils = immiscibleLiquids(input);
      if (oils.length === 0) {
        return { outputs: { top: {}, bottom: clean({ ...input }) }, vapor: {}, note: 'one-layer' };
      }
      // the immiscible liquid layer is lighter than water for every liquid in this slice
      const lighter = oils.filter((u) => sub(u).density < 1);
      const [top, bottom] = split(input, (u) => (lighter.includes(u) ? mass(input, u) : 0));
      return { outputs: { top, bottom }, vapor: {} };
    }
    case 'tank':
      // mixing itself: dissolution is a property of the resulting packet
      return { outputs: { out: clean({ ...input }) }, vapor: {} };
    case 'pan': {
      const [vapor, crystals] = split(input, (u) => (isVolatile(u) ? mass(input, u) : 0));
      return { outputs: { crystals }, vapor, note: total(vapor) < EPS ? 'nothing-evaporates' : undefined };
    }
    case 'still': {
      const T = cfg.stillTemp ?? 100;
      const [distillate, remainder] = split(input, (u) => (isVolatile(u) && sub(u).boilingPoint <= T ? mass(input, u) : 0));
      return { outputs: { distillate, remainder }, vapor: {}, note: total(distillate) < EPS ? 'nothing-boils' : undefined };
    }
    case 'chroma': {
      const solvents = units(input).filter((u) => sub(u).phase === 'liquid');
      if (solvents.length === 0) {
        return { outputs: { fast: {}, slow: clean({ ...input }) }, vapor: {}, note: 'no-solvent' };
      }
      // dissolved substances travel with their own speed; undissolved solids stay at the start
      // line (slow band). The solvent goes with the solutes, shared so each band keeps them dissolved.
      const fast: Comp = {};
      const slow: Comp = {};
      let needFast = 0;
      let needSlow = 0;
      for (const u of units(input)) {
        const s = sub(u);
        const d = dissolvedMass(input, u);
        if (s.phase !== 'solid' || d <= 0) continue;
        if (s.chromaSpeed >= 0.5) needFast += d / s.solubility;
        else needSlow += d / s.solubility;
      }
      const fastShare = needFast + needSlow > 0 ? needFast / (needFast + needSlow) : 0.5;
      for (const u of units(input)) {
        const m = mass(input, u);
        const s = sub(u);
        if (s.phase === 'liquid') {
          fast[u] = m * fastShare;
          slow[u] = m * (1 - fastShare);
        } else {
          const d = dissolvedMass(input, u);
          if (s.chromaSpeed >= 0.5) fast[u] = d;
          else slow[u] = d;
          slow[u] = (slow[u] ?? 0) + (m - d);
        }
      }
      return { outputs: { fast: clean(fast), slow: clean(slow) }, vapor: {} };
    }
  }
}

/** For tests: total mass out (outputs + vapor). */
export function massOut(r: StationResult): number {
  let t = total(r.vapor);
  for (const k of Object.keys(r.outputs)) t += total(r.outputs[k]);
  return t;
}

export function mergeAll(cs: Comp[]): Comp {
  return cs.reduce((a, b) => add(a, b), {} as Comp);
}
