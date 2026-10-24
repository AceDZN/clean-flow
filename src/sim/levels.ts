// Authored weeks. Pure data. Each week is a self-contained valley level.
import type { Comp } from './mixture';
import type { TerrainSpec } from './hex';
import type { StationType } from './stations';
import type { UnitId } from './substances';

export type SourceLook = 'mine' | 'spring' | 'marsh' | 'pond' | 'spill' | 'well' | 'vat' | 'ink' | 'intake' | 'creek' | 'crate' | 'blackmine';
export type CustomerLook = 'foundry' | 'builder' | 'village' | 'bakery' | 'clinic' | 'soap' | 'candy' | 'print' | 'perfume' | 'dye' | 'pickle' | 'fertilizer' | 'lab';

export interface NodeSpec {
  id: string;
  kind: 'source' | 'customer' | 'waste' | 'lens';
  he: string;
  q: number;
  r: number;
  look?: SourceLook | CustomerLook | 'waste';
  hidden?: boolean;
  // sources and lens-only intakes
  packet?: Comp;
  period?: number;
  offset?: number;
  ramp?: { at: number; period: number }[];
  // customers
  required?: UnitId[];
  allowed?: UnitId[];
  quota?: number;
  purity?: number;
  /** what the customer says it wants, e.g. "מלח יבש" */
  wantHe?: string;
}

export interface LevelEvent {
  at: number;
  reveal: string[];
  he: string;
}

export interface LevelSpec {
  id: string;
  index: number;
  he: string;
  subtitle: string;
  intro: string;
  terrain: TerrainSpec;
  dayLength: number;
  inventory: Partial<Record<StationType, number>>;
  pipeBudget: number;
  par: { stations: number };
  nodes: NodeSpec[];
  events?: LevelEvent[];
  hints: string[];
  noHints?: boolean;
  /** machines introduced this week (tray "new" badge) */
  newMachines: StationType[];
  /** tutorial coach marks */
  tutorial?: boolean;
}

const waste = (q: number, r: number): NodeSpec => ({ id: 'waste', kind: 'waste', he: 'בריכת שפכים', q, r, look: 'waste' });

export const LEVELS: LevelSpec[] = [
  {
    id: 'w1-iron',
    index: 1,
    he: 'שבוע 1 · שבוע הברזל',
    subtitle: 'מגנט, ומעיין שלא צריך כלום',
    intro: 'המכרה פולט ברזל וחול מעורבבים. בית היציקה צריך ברזל, הקבלן צריך חול — והכפר רק רוצה לשתות.',
    terrain: { lake: { q: 2, r: -6 }, lakeRadius: 1, seed: 11 },
    dayLength: 80,
    inventory: { magnet: 1, filter: 1 },
    pipeBudget: 28,
    par: { stations: 1 },
    newMachines: ['magnet', 'filter'],
    tutorial: true,
    nodes: [
      { id: 'mine', kind: 'source', he: 'מכרה הברזל', q: -5, r: 1, look: 'mine', packet: { iron: 4, sand: 6 }, period: 2 },
      { id: 'spring', kind: 'source', he: 'המעיין', q: -2, r: -4, look: 'spring', packet: { water: 10 }, period: 2, offset: 1 },
      { id: 'foundry', kind: 'customer', he: 'בית היציקה', q: 5, r: -2, look: 'foundry', required: ['iron'], quota: 32, wantHe: 'ברזל' },
      { id: 'builder', kind: 'customer', he: 'הקבלן', q: 4, r: 3, look: 'builder', required: ['sand'], quota: 48, wantHe: 'חול' },
      { id: 'village', kind: 'customer', he: 'הכפר', q: 3, r: -5, look: 'village', required: ['water'], quota: 50, wantHe: 'מים' },
    ],
    hints: [
      'שלב 1: הציצו בעדשה על כל מקור. כמה סוגי חלקיקים יש בו? הם מפוזרים באחידות או בגושים?',
      'שלב 2: במכרה יש שני מוצקים. איזו תכונה שונה ביניהם? ברזל נמשך למגנט — חול לא.',
      'שלב 3: מכרה ← תוף מגנטי. "נמשך למגנט" ← בית היציקה, "השאר" ← הקבלן. המעיין הוא כבר חומר אחד: צינור ישר לכפר.',
    ],
  },
  {
    id: 'w2-salt',
    index: 2,
    he: 'שבוע 2 · שבוע המלח',
    subtitle: 'מסננים, מאדים, מזקקים',
    intro: 'מביצת המלח זורם בוץ של חול ומי מלח. המאפייה צריכה מלח יבש והקבלן חול. ומשהו מבעבע בצפון…',
    terrain: { lake: { q: 5, r: -6 }, lakeRadius: 1, seed: 23 },
    dayLength: 95,
    inventory: { filter: 1, pan: 1, still: 1 },
    pipeBudget: 32,
    par: { stations: 3 },
    newMachines: ['pan', 'still'],
    nodes: [
      { id: 'marsh', kind: 'source', he: 'ביצת המלח', q: -5, r: 2, look: 'marsh', packet: { sand: 3, salt: 2, water: 7 }, period: 2 },
      { id: 'bakery', kind: 'customer', he: 'המאפייה', q: 5, r: -1, look: 'bakery', required: ['salt'], quota: 16, wantHe: 'מלח יבש' },
      { id: 'builder', kind: 'customer', he: 'הקבלן', q: 3, r: 3, look: 'builder', required: ['sand'], quota: 24, wantHe: 'חול' },
      { id: 'saltpond', kind: 'source', he: 'בריכת מי המלח', q: -4, r: -3, look: 'pond', packet: { salt: 2, water: 8 }, period: 2, hidden: true },
      { id: 'clinic', kind: 'customer', he: 'המרפאה', q: 2, r: -5, look: 'clinic', required: ['water'], quota: 40, wantHe: 'מים טהורים', hidden: true },
      waste(-3, 0),
    ],
    events: [{ at: 10, reveal: ['saltpond', 'clinic'], he: 'בריכת מי מלח נפתחה בצפון — והמרפאה צריכה מים טהורים!' }],
    hints: [
      'שלב 1: בביצה יש חול שלא נמס, ומלח שנמס במים. במי המלח החלקיקים מפוזרים באחידות — זו תערובת הומוגנית.',
      'שלב 2: חול גדול מחורי הנייר — מסנן תופס אותו. מלח מומס עובר דרך כל מסנן! צריך תכונה אחרת: נקודת רתיחה.',
      'שלב 3: ביצה ← מסנן. שארית ← קבלן, תסנין ← אגן אידוי ← מאפייה. מי מלח ← מתקן זיקוק: תזקיק ← מרפאה. באגן אידוי המים עפים כקיטור — הוא לא יכול לתת מים.',
    ],
  },
  {
    id: 'w3-oil',
    index: 3,
    he: 'שבוע 3 · שבוע השמן',
    subtitle: 'שכבות, ומים שקופים מדי',
    intro: 'מכלית דלפה: שמן ומים זורמים יחד. ובמעיין החדש המים נראים צלולים לגמרי… אבל טעמו אותם?',
    terrain: { lake: { q: 1, r: -2 }, lakeRadius: 1, seed: 37 },
    dayLength: 95,
    inventory: { funnel: 1, filter: 1, pan: 1 },
    pipeBudget: 42,
    par: { stations: 2 },
    newMachines: ['funnel'],
    nodes: [
      { id: 'spill', kind: 'source', he: 'הדליפה', q: -5, r: 3, look: 'spill', packet: { oil: 4, water: 6 }, period: 2 },
      { id: 'sweet', kind: 'source', he: 'המעיין המתוק', q: -4, r: -2, look: 'well', packet: { sugar: 3, water: 7 }, period: 2.2, offset: 0.7 },
      { id: 'spring', kind: 'source', he: 'המעיין', q: 0, r: -6, look: 'spring', packet: { water: 10 }, period: 2.2, offset: 1.3 },
      { id: 'soap', kind: 'customer', he: 'מפעל הסבון', q: 4, r: 2, look: 'soap', required: ['oil'], quota: 24, wantHe: 'שמן' },
      { id: 'village', kind: 'customer', he: 'הכפר', q: 5, r: -3, look: 'village', required: ['water'], quota: 50, wantHe: 'מים' },
      { id: 'candy', kind: 'customer', he: 'הממתקייה', q: 1, r: 5, look: 'candy', required: ['sugar'], quota: 18, wantHe: 'סוכר' },
      waste(-3, 6),
    ],
    hints: [
      'שלב 1: הציצו במעיין המתוק: יש שם שני סוגי חלקיקים, מפוזרים באחידות. צלול ≠ טהור.',
      'שלב 2: שמן ומים לא מתערבבים ונפרדים לשכבות — השמן קל יותר וצף. סוכר לא מתאדה, מים כן.',
      'שלב 3: דליפה ← משפך הפרדה: עליונה ← סבון, תחתונה ← כפר. מעיין מתוק ← אגן אידוי ← ממתקייה. המעיין ← כפר.',
    ],
  },
  {
    id: 'w4-classic',
    index: 4,
    he: 'שבוע 4 · הקלאסיקה',
    subtitle: 'מלח, חול וברזל — שלוש תכונות, שלוש שיטות',
    intro: 'מכרה המלח הישן פולט אבקה יבשה: מלח, חול ושבבי ברזל. שלושה לקוחות, כל אחד רוצה רק דבר אחד. הסדר הוא הכול.',
    terrain: { lake: { q: 1, r: 6 }, lakeRadius: 1, seed: 41 },
    dayLength: 110,
    inventory: { magnet: 1, tank: 1, filter: 1, pan: 1 },
    pipeBudget: 40,
    par: { stations: 4 },
    newMachines: ['tank'],
    nodes: [
      { id: 'mine', kind: 'source', he: 'מכרה המלח', q: -6, r: 2, look: 'mine', packet: { salt: 3, sand: 4, iron: 3 }, period: 2.2 },
      { id: 'spring', kind: 'source', he: 'המעיין', q: -3, r: -4, look: 'spring', packet: { water: 10 }, period: 2.2, offset: 0.4 },
      { id: 'foundry', kind: 'customer', he: 'בית היציקה', q: 5, r: -4, look: 'foundry', required: ['iron'], quota: 18, wantHe: 'ברזל' },
      { id: 'builder', kind: 'customer', he: 'הקבלן', q: 6, r: 0, look: 'builder', required: ['sand'], quota: 24, wantHe: 'חול' },
      { id: 'bakery', kind: 'customer', he: 'המאפייה', q: 4, r: 3, look: 'bakery', required: ['salt'], quota: 18, wantHe: 'מלח יבש' },
      waste(-5, 6),
    ],
    hints: [
      'שלב 1: שלושה מוצקים יבשים, כל אחד בגושים משלו — תערובת הטרוגנית.',
      'שלב 2: ברזל — מגנטי. מלח — מסיס במים, חול — לא. ומלח מומס לא מתאדה כמו המים.',
      'שלב 3: מגנט ← מיכל המסה (עם צינור מהמעיין) ← מסנן ← אגן אידוי. כל יציאה ללקוח שלה.',
    ],
  },
  {
    id: 'w5-ink',
    index: 5,
    he: 'שבוע 5 · דיו וכוהל',
    subtitle: 'פסים על נייר, ומדחום על הדוד',
    intro: 'בית הדפוס רוצה רק את הצבע הכחול מתוך הדיו הירוק. בית הבשמים רוצה כוהל — מתוך חבית תסיסה של כוהל ומים.',
    terrain: { lake: { q: -1, r: 1 }, lakeRadius: 1, seed: 53 },
    dayLength: 100,
    inventory: { chroma: 1, still: 1, filter: 1, pan: 1 },
    pipeBudget: 30,
    par: { stations: 2 },
    newMachines: ['chroma'],
    nodes: [
      { id: 'ink', kind: 'source', he: 'חבית הדיו הירוק', q: -5, r: 0, look: 'ink', packet: { pigmentBlue: 0.3, pigmentYellow: 0.3, water: 9.4 }, period: 2 },
      { id: 'ferment', kind: 'source', he: 'חבית התסיסה', q: -3, r: 5, look: 'vat', packet: { ethanol: 3, water: 7 }, period: 2.2, offset: 0.8 },
      { id: 'air', kind: 'lens', he: 'פתח האוויר', q: -2, r: -5, look: 'intake', packet: { nitrogen: 7.8, oxygen: 2.1, argon: 0.09, carbonDioxide: 0.01 } },
      { id: 'print', kind: 'customer', he: 'בית הדפוס', q: 5, r: -3, look: 'print', required: ['pigmentBlue'], allowed: ['water'], quota: 2.4, wantHe: 'דיו כחול' },
      { id: 'perfume', kind: 'customer', he: 'בית הבשמים', q: 4, r: 2, look: 'perfume', required: ['ethanol'], quota: 18, wantHe: 'כוהל' },
      { id: 'village', kind: 'customer', he: 'הכפר', q: 2, r: 5, look: 'village', required: ['water'], quota: 35, wantHe: 'מים' },
      waste(1, -5),
    ],
    hints: [
      'שלב 1: הדיו הירוק אחיד לגמרי — אבל בעדשה רואים שני צבענים שונים. גם כוהל ומים: תערובת הומוגנית.',
      'שלב 2: כל צבען נגרר על הנייר במהירות אחרת. כוהל רותח ב-78°C, מים ב-100°C.',
      'שלב 3: דיו ← כרומטוגרפיה: פס איטי (כחול) ← דפוס, פס מהיר ← שפכים. תסיסה ← זיקוק, כוונו ל-78°C: תזקיק ← בשמים, נשאר בדוד ← כפר.',
    ],
  },
  {
    id: 'w6-flood',
    index: 6,
    he: 'יום השיטפון',
    subtitle: 'מבחן העברה · בלי רמזים',
    intro: 'השיטפון סחף הכול לעמק חדש. ארבעה זרמים שלא ראיתם מעולם, שבעה לקוחות, ושום רמז. רק אתם, העדשה והמכונות.',
    terrain: { lake: { q: 3, r: 0 }, lakeRadius: 1, seed: 71 },
    dayLength: 150,
    inventory: { magnet: 1, filter: 1, sieve: 1, funnel: 1, pan: 1, still: 1 },
    pipeBudget: 58,
    par: { stations: 4 },
    newMachines: ['sieve'],
    noHints: true,
    nodes: [
      { id: 'creek', kind: 'source', he: 'הנחל הכחול', q: -6, r: 1, look: 'creek', packet: { copperSulfate: 2, water: 8, gravel: 4 }, period: 2.4, ramp: [{ at: 40, period: 2 }] },
      { id: 'dressing', kind: 'source', he: 'רוטב שנשפך', q: -4, r: -3, look: 'spill', packet: { oil: 4, aceticAcid: 0.5, water: 5.5 }, period: 2.4, offset: 0.6 },
      { id: 'powder', kind: 'source', he: 'מחסן האבקות', q: -5, r: 6, look: 'crate', packet: { iron: 4, sulfur: 4 }, period: 2.4, offset: 1.2 },
      { id: 'blackmine', kind: 'source', he: 'המכרה השחור', q: 0, r: -6, look: 'blackmine', packet: { ironSulfide: 8 }, period: 2.4, offset: 1.8, hidden: true },
      { id: 'dye', kind: 'customer', he: 'הצבעייה', q: 2, r: -3, look: 'dye', required: ['copperSulfate'], quota: 12, wantHe: 'גבישי נחושת גופרתית' },
      { id: 'builder', kind: 'customer', he: 'הקבלן', q: -1, r: 3, look: 'builder', required: ['gravel'], quota: 24, wantHe: 'חצץ' },
      { id: 'soap', kind: 'customer', he: 'מפעל הסבון', q: 6, r: -4, look: 'soap', required: ['oil'], quota: 24, wantHe: 'שמן' },
      { id: 'pickle', kind: 'customer', he: 'המחמצה', q: 1, r: -6 + 1, look: 'pickle', required: ['aceticAcid'], allowed: ['water'], quota: 3, wantHe: 'חומץ' },
      { id: 'foundry', kind: 'customer', he: 'בית היציקה', q: 3, r: 4, look: 'foundry', required: ['iron'], quota: 24, wantHe: 'ברזל' },
      { id: 'fertilizer', kind: 'customer', he: 'מפעל הדשנים', q: 0, r: 6, look: 'fertilizer', required: ['sulfur'], quota: 24, wantHe: 'גופרית' },
      { id: 'lab', kind: 'customer', he: 'המעבדה', q: 5, r: -1, look: 'lab', required: ['ironSulfide'], quota: 32, wantHe: 'ברזל גופריתי', hidden: true },
      waste(-7, 4),
    ],
    events: [{ at: 14, reveal: ['blackmine', 'lab'], he: 'המים חשפו מכרה שחור — המעבדה קונה את מה שיוצא ממנו, כמו שהוא.' }],
    hints: [],
  },
];

export function levelById(id: string): LevelSpec | undefined {
  return LEVELS.find((l) => l.id === id);
}
