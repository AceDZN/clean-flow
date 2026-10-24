// Substance (particle unit) data. Pure data, no rendering imports.
// Properties are the physical properties Workbook's separation-intro lists:
// particle size, solubility, boiling point, magnetism, density, travel speed.

export type Phase = 'solid' | 'liquid' | 'gas';

export type UnitId =
  | 'water'
  | 'salt'
  | 'sand'
  | 'iron'
  | 'oil'
  | 'sugar'
  | 'ethanol'
  | 'pigmentBlue'
  | 'pigmentYellow'
  | 'nitrogen'
  | 'oxygen'
  | 'argon'
  | 'carbonDioxide'
  | 'copperSulfate'
  | 'gravel'
  | 'aceticAcid'
  | 'sulfur'
  | 'ironSulfide';

export type Shape =
  | 'triad' // bent 3-atom molecule
  | 'cube'
  | 'rock'
  | 'spiky'
  | 'droplet'
  | 'hexagon'
  | 'rod'
  | 'star'
  | 'diamond'
  | 'dumbbell'
  | 'sphere'
  | 'linear'
  | 'crystal'
  | 'pebble'
  | 'flask'
  | 'puff'
  | 'nugget';

export interface Substance {
  id: UnitId;
  he: string; // Workbook Hebrew name
  formula: string; // display formula (Unicode subscripts)
  atoms: Record<string, number>; // atom composition of one unit
  phase: Phase; // phase at room temperature (25 °C)
  /** grams that dissolve per gram of water at ~20 °C; 0 = insoluble */
  solubility: number;
  /** boiling point °C at 1 atm; Infinity for substances that do not boil in our range */
  boilingPoint: number;
  magnetic: boolean;
  /** g/cm³, used for liquid layers and settling */
  density: number;
  /** liquids: does it mix with water in every ratio? */
  miscibleWithWater: boolean;
  /** solid grain size class: 1 = fine powder/crystals, 2 = sand, 3 = gravel */
  grain: number;
  /** relative travel speed on chromatography paper (0..1), for dissolved substances */
  chromaSpeed: number;
  shape: Shape;
  color: string; // particle colour (always paired with shape)
}

const S = (s: Substance) => s;

export const SUBSTANCES: Record<UnitId, Substance> = {
  water: S({ id: 'water', he: 'מים', formula: 'H₂O', atoms: { H: 2, O: 1 }, phase: 'liquid', solubility: 0, boilingPoint: 100, magnetic: false, density: 1.0, miscibleWithWater: true, grain: 0, chromaSpeed: 1, shape: 'triad', color: '#5cc8ff' }),
  salt: S({ id: 'salt', he: 'מלח', formula: 'NaCl', atoms: { Na: 1, Cl: 1 }, phase: 'solid', solubility: 0.36, boilingPoint: Infinity, magnetic: false, density: 2.16, miscibleWithWater: false, grain: 1, chromaSpeed: 0.9, shape: 'cube', color: '#f4f4f0' }),
  sand: S({ id: 'sand', he: 'חול', formula: 'SiO₂', atoms: { Si: 1, O: 2 }, phase: 'solid', solubility: 0, boilingPoint: Infinity, magnetic: false, density: 2.65, miscibleWithWater: false, grain: 2, chromaSpeed: 0, shape: 'rock', color: '#d9a55b' }),
  iron: S({ id: 'iron', he: 'ברזל', formula: 'Fe', atoms: { Fe: 1 }, phase: 'solid', solubility: 0, boilingPoint: Infinity, magnetic: true, density: 7.87, miscibleWithWater: false, grain: 1, chromaSpeed: 0, shape: 'spiky', color: '#59606b' }),
  oil: S({ id: 'oil', he: 'שמן', formula: 'C₁₈H₃₄O₂', atoms: { C: 18, H: 34, O: 2 }, phase: 'liquid', solubility: 0, boilingPoint: Infinity, magnetic: false, density: 0.91, miscibleWithWater: false, grain: 0, chromaSpeed: 0, shape: 'droplet', color: '#f2b63a' }),
  sugar: S({ id: 'sugar', he: 'סוכר', formula: 'C₁₂H₂₂O₁₁', atoms: { C: 12, H: 22, O: 11 }, phase: 'solid', solubility: 2.0, boilingPoint: Infinity, magnetic: false, density: 1.59, miscibleWithWater: false, grain: 1, chromaSpeed: 0.85, shape: 'hexagon', color: '#ff8fc8' }),
  ethanol: S({ id: 'ethanol', he: 'כוהל (אתנול)', formula: 'C₂H₅OH', atoms: { C: 2, H: 6, O: 1 }, phase: 'liquid', solubility: 0, boilingPoint: 78, magnetic: false, density: 0.79, miscibleWithWater: true, grain: 0, chromaSpeed: 1, shape: 'rod', color: '#b69cff' }),
  pigmentBlue: S({ id: 'pigmentBlue', he: 'צבען כחול', formula: 'C₁₆H₁₈ClN₃S', atoms: { C: 16, H: 18, Cl: 1, N: 3, S: 1 }, phase: 'solid', solubility: 0.04, boilingPoint: Infinity, magnetic: false, density: 1.3, miscibleWithWater: false, grain: 1, chromaSpeed: 0.3, shape: 'diamond', color: '#2f6bff' }),
  pigmentYellow: S({ id: 'pigmentYellow', he: 'צבען צהוב', formula: 'C₁₆H₉N₄Na₃O₉S₂', atoms: { C: 16, H: 9, N: 4, Na: 3, O: 9, S: 2 }, phase: 'solid', solubility: 0.2, boilingPoint: Infinity, magnetic: false, density: 1.9, miscibleWithWater: false, grain: 1, chromaSpeed: 0.8, shape: 'star', color: '#ffd400' }),
  nitrogen: S({ id: 'nitrogen', he: 'חנקן', formula: 'N₂', atoms: { N: 2 }, phase: 'gas', solubility: 0, boilingPoint: -196, magnetic: false, density: 0.00125, miscibleWithWater: false, grain: 0, chromaSpeed: 0, shape: 'dumbbell', color: '#7fa7d9' }),
  oxygen: S({ id: 'oxygen', he: 'חמצן', formula: 'O₂', atoms: { O: 2 }, phase: 'gas', solubility: 0, boilingPoint: -183, magnetic: false, density: 0.00143, miscibleWithWater: false, grain: 0, chromaSpeed: 0, shape: 'dumbbell', color: '#ff6b5e' }),
  argon: S({ id: 'argon', he: 'ארגון', formula: 'Ar', atoms: { Ar: 1 }, phase: 'gas', solubility: 0, boilingPoint: -186, magnetic: false, density: 0.00178, miscibleWithWater: false, grain: 0, chromaSpeed: 0, shape: 'sphere', color: '#c9e86b' }),
  carbonDioxide: S({ id: 'carbonDioxide', he: 'פחמן דו-חמצני', formula: 'CO₂', atoms: { C: 1, O: 2 }, phase: 'gas', solubility: 0, boilingPoint: -78, magnetic: false, density: 0.00198, miscibleWithWater: false, grain: 0, chromaSpeed: 0, shape: 'linear', color: '#9aa0a6' }),
  copperSulfate: S({ id: 'copperSulfate', he: 'נחושת גופרתית', formula: 'CuSO₄', atoms: { Cu: 1, S: 1, O: 4 }, phase: 'solid', solubility: 0.32, boilingPoint: Infinity, magnetic: false, density: 3.6, miscibleWithWater: false, grain: 1, chromaSpeed: 0.6, shape: 'crystal', color: '#1e9bd7' }),
  gravel: S({ id: 'gravel', he: 'חצץ', formula: 'CaCO₃', atoms: { Ca: 1, C: 1, O: 3 }, phase: 'solid', solubility: 0, boilingPoint: Infinity, magnetic: false, density: 2.7, miscibleWithWater: false, grain: 3, chromaSpeed: 0, shape: 'pebble', color: '#c8c0b0' }),
  aceticAcid: S({ id: 'aceticAcid', he: 'חומצה אצטית', formula: 'CH₃COOH', atoms: { C: 2, H: 4, O: 2 }, phase: 'liquid', solubility: 0, boilingPoint: 118, magnetic: false, density: 1.05, miscibleWithWater: true, grain: 0, chromaSpeed: 1, shape: 'flask', color: '#e8e2a0' }),
  sulfur: S({ id: 'sulfur', he: 'גופרית', formula: 'S', atoms: { S: 1 }, phase: 'solid', solubility: 0, boilingPoint: Infinity, magnetic: false, density: 2.07, miscibleWithWater: false, grain: 1, chromaSpeed: 0, shape: 'puff', color: '#f5e23a' }),
  ironSulfide: S({ id: 'ironSulfide', he: 'ברזל גופריתי', formula: 'FeS', atoms: { Fe: 1, S: 1 }, phase: 'solid', solubility: 0, boilingPoint: Infinity, magnetic: false, density: 4.84, miscibleWithWater: false, grain: 1, chromaSpeed: 0, shape: 'nugget', color: '#2b2a33' }),
};

export const ALL_UNITS = Object.keys(SUBSTANCES) as UnitId[];

export function sub(id: UnitId): Substance {
  return SUBSTANCES[id];
}

/** Liquids that boil inside the game's temperature range evaporate in a pan. */
export function isVolatile(id: UnitId): boolean {
  const s = SUBSTANCES[id];
  return s.phase === 'liquid' && Number.isFinite(s.boilingPoint);
}

export const ATOM_HE: Record<string, string> = {
  H: 'מימן', O: 'חמצן', Na: 'נתרן', Cl: 'כלור', Si: 'צורן', Fe: 'ברזל', C: 'פחמן', N: 'חנקן', Ar: 'ארגון', S: 'גופרית', Cu: 'נחושת', Ca: 'סידן',
};
