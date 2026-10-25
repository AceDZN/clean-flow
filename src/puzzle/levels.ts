// Clean Flow v2 puzzles. Board units: x 0 (left, customers) … 12 (right, sources), z 0 (back) … 6 (front).
// Flow runs right → left. Fork outlet 'a' is the upper (back) branch, 'b' the lower (front) one.
import type { PCustomer, PDrain, PSocket, PSource, Puzzle } from './engine';

const src = (id: string, he: string, look: PSource['look'], x: number, z: number, packet: PSource['packet']): PSource => ({ id, kind: 'source', he, look, x, z, packet });
const fork = (id: string, x: number, z: number): PSocket => ({ id, kind: 'socket', shape: 'fork', x, z });
const inline = (id: string, x: number, z: number): PSocket => ({ id, kind: 'socket', shape: 'inline', x, z });
const cust = (id: string, he: string, look: PCustomer['look'], x: number, z: number, required: PCustomer['required'], wantHe: string, extra: Partial<PCustomer> = {}): PCustomer => ({ id, kind: 'customer', he, look, x, z, required, wantHe, ...extra });
const drain = (id: string, x: number, z: number): PDrain => ({ id, kind: 'drain', he: 'בריכת שפכים', x, z });
const WATER = { purity: 0.99 };

export const PUZZLES: Puzzle[] = [
  // ---------------- chapter 1: magnet ----------------
  {
    id: 'p1', chapter: 1, index: 1, he: 'ברזל וחול', subtitle: 'פרק 1 · מגנט',
    intro: 'המכרה פולט ברזל וחול מעורבבים. בית היציקה רוצה ברזל, הקבלן רוצה חול.',
    tutorial: true, newMachines: ['magnet'], tray: ['magnet'],
    nodes: [
      src('mine', 'מכרה הברזל', 'mine', 11, 3, { iron: 4, sand: 6 }),
      fork('f1', 6, 3),
      cust('foundry', 'בית היציקה', 'foundry', 1, 1, ['iron'], 'ברזל'),
      cust('builder', 'הקבלן', 'builder', 1, 5, ['sand'], 'חול'),
    ],
    pipes: [
      { from: 'mine', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'foundry' },
      { from: 'f1', outlet: 'b', to: 'builder' },
    ],
    hints: [
      'הקישו על המכרה: יש בו שני סוגי מוצקים, בגושים נפרדים.',
      'ברזל נמשך למגנט — חול לא.',
      'גררו את התוף המגנטי לשקע. "נמשך למגנט" צריך לצאת לכיוון בית היציקה.',
    ],
  },
  {
    id: 'p2', chapter: 1, index: 2, he: 'מים שלא צריכים כלום', subtitle: 'פרק 1 · מגנט',
    intro: 'עוד מכרה, ומאגר של מים מזוקקים. לכל שקע יש צורה — לא כל מכונה נכנסת לכל שקע.',
    newMachines: ['pan'], tray: ['magnet', 'pan'],
    nodes: [
      src('mine', 'מכרה הברזל', 'mine', 11, 1.5, { iron: 4, sand: 6 }),
      src('res', 'מאגר המים המזוקקים', 'spring', 11, 5, { water: 10 }),
      fork('f1', 6.5, 1.5),
      inline('i1', 6.5, 5),
      cust('builder', 'הקבלן', 'builder', 1, 0.3, ['sand'], 'חול'),
      cust('foundry', 'בית היציקה', 'foundry', 1, 2.8, ['iron'], 'ברזל'),
      cust('village', 'הכפר', 'village', 1, 5, ['water'], 'מים', WATER),
    ],
    pipes: [
      { from: 'mine', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'builder' },
      { from: 'f1', outlet: 'b', to: 'foundry' },
      { from: 'res', outlet: 'out', to: 'i1' },
      { from: 'i1', outlet: 'out', to: 'village' },
    ],
    hints: [
      'במאגר יש חומר אחד בלבד — מים (תרכובת). אין מה להפריד.',
      'אגן אידוי מאדה את המים — הכפר לא יקבל כלום. השאירו את השקע של המים ריק.',
      'מגנט בשקע של המכרה; הקישו עליו כדי להפוך — הברזל צריך לרדת לבית היציקה.',
    ],
  },
  // ---------------- chapter 2: filter, evaporate, distil ----------------
  {
    id: 'p3', chapter: 2, index: 3, he: 'בוץ מלוח', subtitle: 'פרק 2 · מסנן ואידוי',
    intro: 'מביצת המלח זורם בוץ: חול ומי מלח. הקבלן רוצה חול, המאפייה רוצה מלח יבש.',
    newMachines: ['filter'], tray: ['filter', 'pan'],
    nodes: [
      src('marsh', 'ביצת המלח', 'marsh', 11, 3, { sand: 3, salt: 2, water: 7 }),
      fork('f1', 7.5, 3),
      inline('i1', 4, 4.6),
      cust('builder', 'הקבלן', 'builder', 1, 1, ['sand'], 'חול'),
      cust('bakery', 'המאפייה', 'bakery', 1, 4.6, ['salt'], 'מלח יבש'),
    ],
    pipes: [
      { from: 'marsh', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'builder' },
      { from: 'f1', outlet: 'b', to: 'i1' },
      { from: 'i1', outlet: 'out', to: 'bakery' },
    ],
    hints: [
      'חול לא נמס — הוא תקוע בגושים. המלח נמס במים: תערובת הומוגנית בתוך תערובת הטרוגנית.',
      'המסנן תופס את החול (משקע). המלח המומס עובר עם המים (נוזל מסונן).',
      'מסנן בשקע הראשון: "משקע" לקבלן. אגן אידוי בדרך למאפייה.',
    ],
  },
  {
    id: 'p4', chapter: 2, index: 4, he: 'מים למרפאה', subtitle: 'פרק 2 · מסנן ואידוי',
    intro: 'בריכת מי מלח. המרפאה צריכה מים טהורים, המאפייה צריכה מלח. מים צלולים זה עוד לא מים טהורים.',
    newMachines: ['still'], tray: ['filter', 'still'],
    nodes: [
      src('pond', 'בריכת מי המלח', 'pond', 11, 3, { salt: 2, water: 8 }),
      fork('f1', 6, 3),
      cust('clinic', 'המרפאה', 'clinic', 1, 1, ['water'], 'מים טהורים', WATER),
      cust('bakery', 'המאפייה', 'bakery', 1, 5, ['salt'], 'מלח יבש'),
    ],
    pipes: [
      { from: 'pond', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'clinic' },
      { from: 'f1', outlet: 'b', to: 'bakery' },
    ],
    hints: [
      'מי מלח: שני סוגי חלקיקים, מפוזרים באחידות — תערובת הומוגנית.',
      'מסנן לא עוצר מלח מומס. מים רותחים ב-100°C, מלח לא.',
      'מתקן זיקוק: "נוזל מזוקק" למרפאה, "נשאר בדוד" למאפייה.',
    ],
  },
  {
    id: 'p5', chapter: 2, index: 5, he: 'יום עמוס', subtitle: 'פרק 2 · מסנן ואידוי',
    intro: 'שני מקורות, שלוש הזמנות. מכונה אחת לכל עבודה.',
    newMachines: [], tray: ['filter', 'pan', 'still'],
    nodes: [
      src('marsh', 'ביצת המלח', 'marsh', 11, 1.4, { sand: 3, salt: 2, water: 7 }),
      src('pond', 'בריכת מי המלח', 'pond', 11, 5, { salt: 2, water: 8 }),
      fork('f1', 8, 1.4),
      inline('i1', 4.5, 2.6),
      fork('f2', 7, 5),
      cust('builder', 'הקבלן', 'builder', 1, 0.2, ['sand'], 'חול'),
      cust('bakery', 'המאפייה', 'bakery', 1, 2.6, ['salt'], 'מלח יבש'),
      cust('clinic', 'המרפאה', 'clinic', 1, 4.6, ['water'], 'מים טהורים', WATER),
      drain('drain', 3.5, 6),
    ],
    pipes: [
      { from: 'marsh', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'builder' },
      { from: 'f1', outlet: 'b', to: 'i1' },
      { from: 'i1', outlet: 'out', to: 'bakery' },
      { from: 'pond', outlet: 'out', to: 'f2' },
      { from: 'f2', outlet: 'a', to: 'clinic' },
      { from: 'f2', outlet: 'b', to: 'drain' },
    ],
    hints: [
      'למעלה: בוץ (חול + מי מלח). למטה: מי מלח בלבד.',
      'החול נתפס במסנן; את המלח מקבלים באידוי; מים טהורים מקבלים בזיקוק.',
      'מסנן למעלה + אגן אידוי אחריו; מתקן זיקוק למטה: "נוזל מזוקק" למרפאה.',
    ],
  },
  // ---------------- chapter 3: layers, clear ≠ pure ----------------
  {
    id: 'p6', chapter: 3, index: 6, he: 'דליפה', subtitle: 'פרק 3 · שכבות',
    intro: 'מכלית דלפה: שמן ומים זורמים יחד. מפעל הסבון רוצה שמן, הכפר רוצה מים.',
    newMachines: ['funnel'], tray: ['filter', 'funnel'],
    nodes: [
      src('spill', 'הדליפה', 'spill', 11, 3, { oil: 4, water: 6 }),
      fork('f1', 6, 3),
      cust('village', 'הכפר', 'village', 1, 1, ['water'], 'מים', WATER),
      cust('soap', 'מפעל הסבון', 'soap', 1, 5, ['oil'], 'שמן'),
    ],
    pipes: [
      { from: 'spill', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'village' },
      { from: 'f1', outlet: 'b', to: 'soap' },
    ],
    hints: [
      'שמן ומים הם שני נוזלים שלא מתערבבים: שתי שכבות.',
      'שני הנוזלים עוברים דרך מסנן. השמן קל יותר וצף למעלה.',
      'משפך הפרדה; הפכו אותו כך ש"השכבה העליונה" (שמן) תרד למפעל הסבון.',
    ],
  },
  {
    id: 'p7', chapter: 3, index: 7, he: 'צלול ≠ טהור', subtitle: 'פרק 3 · שכבות',
    intro: 'המעיין המתוק נראה צלול לגמרי. הממתקייה רוצה סוכר, והכפר רוצה מים — מים טהורים.',
    newMachines: [], tray: ['funnel', 'filter', 'still'],
    nodes: [
      src('sweet', 'המעיין המתוק', 'well', 11, 3, { sugar: 3, water: 7 }),
      fork('f1', 6, 3),
      cust('village', 'הכפר', 'village', 1, 1, ['water'], 'מים', WATER),
      cust('candy', 'הממתקייה', 'candy', 1, 5, ['sugar'], 'סוכר'),
    ],
    pipes: [
      { from: 'sweet', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'village' },
      { from: 'f1', outlet: 'b', to: 'candy' },
    ],
    hints: [
      'סרקו את המעיין: שני סוגי חלקיקים, מפוזרים באחידות. הסוכר מומס.',
      'מסנן ומשפך לא מפרידים חומר מומס. המים רותחים, הסוכר לא.',
      'מתקן זיקוק: "נוזל מזוקק" לכפר, "נשאר בדוד" לממתקייה.',
    ],
  },
  // ---------------- chapter 4: the classic ----------------
  {
    id: 'p8', chapter: 4, index: 8, he: 'הקלאסיקה', subtitle: 'פרק 4 · שלוש שיטות',
    intro: 'מכרה המלח הישן פולט אבקה יבשה: מלח, חול ושבבי ברזל. שלושה לקוחות, ארבע מכונות.',
    newMachines: ['tank'], tray: ['magnet', 'tank', 'filter', 'pan'],
    nodes: [
      src('mine', 'מכרה המלח', 'mine', 11.5, 3, { salt: 3, sand: 4, iron: 3 }),
      fork('f1', 9, 3),
      inline('i1', 7, 4.2),
      fork('f2', 5, 4.2),
      inline('i2', 3.2, 5.4),
      cust('foundry', 'בית היציקה', 'foundry', 1, 0.6, ['iron'], 'ברזל'),
      cust('builder', 'הקבלן', 'builder', 1, 3, ['sand'], 'חול'),
      cust('bakery', 'המאפייה', 'bakery', 1, 5.4, ['salt'], 'מלח יבש'),
    ],
    pipes: [
      { from: 'mine', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'foundry' },
      { from: 'f1', outlet: 'b', to: 'i1' },
      { from: 'i1', outlet: 'out', to: 'f2' },
      { from: 'f2', outlet: 'a', to: 'builder' },
      { from: 'f2', outlet: 'b', to: 'i2' },
      { from: 'i2', outlet: 'out', to: 'bakery' },
    ],
    hints: [
      'שלושה מוצקים יבשים: ברזל (מגנטי), חול (לא נמס), מלח (נמס במים).',
      'קודם מוציאים את הברזל כשהכול יבש. מסנן עובד רק כשיש נוזל — צריך להמיס את המלח קודם.',
      'מגנט ← מיכל המסה ← מסנן ← אגן אידוי.',
    ],
  },
  {
    id: 'p9', chapter: 4, index: 9, he: 'הסדר משנה', subtitle: 'פרק 4 · שלוש שיטות',
    intro: 'אותה אבקה, יותר שקעים. ברזל רטוב שוקע בבוץ וקשה לאסוף אותו במגנט.',
    newMachines: [], tray: ['magnet', 'tank', 'filter', 'pan'],
    nodes: [
      src('mine', 'מכרה המלח', 'mine', 11.5, 3, { salt: 3, sand: 4, iron: 3 }),
      inline('i0', 9.8, 3),
      fork('f1', 8.2, 3),
      inline('i1', 6.6, 4.2),
      fork('f2', 5, 4.2),
      inline('i2', 3.2, 5.4),
      cust('foundry', 'בית היציקה', 'foundry', 1, 0.6, ['iron'], 'ברזל'),
      cust('builder', 'הקבלן', 'builder', 1, 3, ['sand'], 'חול'),
      cust('bakery', 'המאפייה', 'bakery', 1, 5.4, ['salt'], 'מלח יבש'),
    ],
    pipes: [
      { from: 'mine', outlet: 'out', to: 'i0' },
      { from: 'i0', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'foundry' },
      { from: 'f1', outlet: 'b', to: 'i1' },
      { from: 'i1', outlet: 'out', to: 'f2' },
      { from: 'f2', outlet: 'a', to: 'builder' },
      { from: 'f2', outlet: 'b', to: 'i2' },
      { from: 'i2', outlet: 'out', to: 'bakery' },
    ],
    hints: [
      'יש שלושה שקעים עגולים ורק שתי מכונות עגולות — אחד נשאר ריק.',
      'אם ממיסים לפני המגנט, הברזל נרטב ושוקע — המגנט תופס רק חלק ממנו.',
      'השאירו את השקע הראשון ריק: מגנט ← מיכל המסה ← מסנן ← אגן אידוי.',
    ],
  },
  // ---------------- chapter 5: ink & ethanol ----------------
  {
    id: 'p10', chapter: 5, index: 10, he: 'דיו ירוק', subtitle: 'פרק 5 · פיגמנטים ואתנול',
    intro: 'בית הדפוס רוצה רק את הצבע הכחול מתוך הדיו הירוק.',
    newMachines: ['chroma'], tray: ['filter', 'chroma'],
    nodes: [
      src('ink', 'חבית הדיו הירוק', 'ink', 11, 3, { pigmentBlue: 0.3, pigmentYellow: 0.3, water: 9.4 }),
      fork('f1', 6, 3),
      drain('drain', 1.5, 1),
      cust('print', 'בית הדפוס', 'print', 1, 5, ['pigmentBlue'], 'דיו כחול', { allowed: ['water'] }),
    ],
    pipes: [
      { from: 'ink', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'drain' },
      { from: 'f1', outlet: 'b', to: 'print' },
    ],
    hints: [
      'הדיו נראה ירוק אחיד — אבל בסריקה רואים שני פיגמנטים.',
      'בכרומטוגרפיה כל פיגמנט זז על הנייר במהירות אחרת. הכחול איטי.',
      'מגדל כרומטוגרפיה: "פס איטי" לבית הדפוס.',
    ],
  },
  {
    id: 'p11', chapter: 5, index: 11, he: 'בושם', subtitle: 'פרק 5 · פיגמנטים ואתנול',
    intro: 'בית הבשמים רוצה אתנול מרוכז מתוך חבית התסיסה. הכפר ייקח את המים.',
    newMachines: [], tray: ['filter', 'still'],
    nodes: [
      src('ferment', 'חבית התסיסה', 'vat', 11, 3, { ethanol: 3, water: 7 }),
      fork('f1', 6, 3),
      cust('perfume', 'בית הבשמים', 'perfume', 1, 1, ['ethanol'], 'אתנול מרוכז'),
      cust('village', 'הכפר', 'village', 1, 5, ['water'], 'מים', WATER),
    ],
    pipes: [
      { from: 'ferment', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'perfume' },
      { from: 'f1', outlet: 'b', to: 'village' },
    ],
    hints: [
      'אתנול ומים מתערבבים לגמרי — תערובת הומוגנית.',
      'אתנול רותח ב-78°C, מים ב-100°C.',
      'מתקן זיקוק, הקישו עליו וכוונו את המדחום ל-78°C.',
    ],
  },
  // ---------------- chapter 6: transfer (no hints) ----------------
  {
    id: 't1', chapter: 6, index: 12, he: 'הנחל הכחול', subtitle: 'יום השיטפון · בלי רמזים',
    intro: 'השיטפון הביא זרמים שלא ראיתם מעולם. בלי רמזים — רק אתם והסורק.',
    noHints: true, newMachines: ['sieve'], tray: ['magnet', 'sieve', 'pan', 'funnel'],
    nodes: [
      src('creek', 'הנחל הכחול', 'creek', 11, 3, { copperSulfate: 1.5, water: 8.5, gravel: 4 }),
      fork('f1', 7.5, 3),
      inline('i1', 4, 4.6),
      cust('builder', 'הקבלן', 'builder', 1, 1, ['gravel'], 'חצץ'),
      cust('dye', 'הצבעייה', 'dye', 1, 4.6, ['copperSulfate'], 'גבישי נחושת גופרתית'),
    ],
    pipes: [
      { from: 'creek', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'builder' },
      { from: 'f1', outlet: 'b', to: 'i1' },
      { from: 'i1', outlet: 'out', to: 'dye' },
    ],
    hints: [],
  },
  {
    id: 't2', chapter: 6, index: 13, he: 'רוטב ואבקה', subtitle: 'יום השיטפון · בלי רמזים',
    intro: 'רוטב שנשפך ומחסן אבקות. ארבעה לקוחות.',
    noHints: true, newMachines: [], tray: ['magnet', 'funnel', 'filter'],
    nodes: [
      src('dressing', 'רוטב שנשפך', 'spill', 11, 1.5, { oil: 4, aceticAcid: 0.5, water: 5.5 }),
      src('powder', 'מחסן האבקות', 'crate', 11, 4.8, { iron: 4, sulfur: 4 }),
      fork('f1', 6.5, 1.5),
      fork('f2', 6.5, 4.8),
      cust('soap', 'מפעל הסבון', 'soap', 1, 0.3, ['oil'], 'שמן'),
      cust('pickle', 'המחמצה', 'pickle', 1, 2.6, ['aceticAcid'], 'חומץ', { allowed: ['water'] }),
      cust('fertilizer', 'מפעל הדשנים', 'fertilizer', 1, 4.0, ['sulfur'], 'גופרית'),
      cust('foundry', 'בית היציקה', 'foundry', 1, 5.8, ['iron'], 'ברזל'),
    ],
    pipes: [
      { from: 'dressing', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'soap' },
      { from: 'f1', outlet: 'b', to: 'pickle' },
      { from: 'powder', outlet: 'out', to: 'f2' },
      { from: 'f2', outlet: 'a', to: 'fertilizer' },
      { from: 'f2', outlet: 'b', to: 'foundry' },
    ],
    hints: [],
  },
  {
    id: 't3', chapter: 6, index: 14, he: 'המכרה השחור', subtitle: 'יום השיטפון · בלי רמזים',
    intro: 'המים חשפו מכרה שחור, והמעבדה רוצה את מה שיוצא ממנו. במחסן עדיין יש אבקה.',
    noHints: true, newMachines: [], tray: ['magnet', 'filter'],
    nodes: [
      src('black', 'המכרה השחור', 'blackmine', 11, 1.5, { ironSulfide: 8 }),
      src('powder', 'מחסן האבקות', 'crate', 11, 4.8, { iron: 4, sulfur: 4 }),
      fork('f1', 6.5, 1.5),
      fork('f2', 6.5, 4.8),
      cust('lab', 'המעבדה', 'lab', 1, 0.6, ['ironSulfide'], 'ברזל גופרי'),
      drain('drain', 2.6, 2.6),
      cust('foundry', 'בית היציקה', 'foundry', 1, 4.0, ['iron'], 'ברזל'),
      cust('fertilizer', 'מפעל הדשנים', 'fertilizer', 1, 5.8, ['sulfur'], 'גופרית'),
    ],
    pipes: [
      { from: 'black', outlet: 'out', to: 'f1' },
      { from: 'f1', outlet: 'a', to: 'lab' },
      { from: 'f1', outlet: 'b', to: 'drain' },
      { from: 'powder', outlet: 'out', to: 'f2' },
      { from: 'f2', outlet: 'a', to: 'foundry' },
      { from: 'f2', outlet: 'b', to: 'fertilizer' },
    ],
    hints: [],
  },
];
