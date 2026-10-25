// Hebrew feedback texts shared by the game: machine notes and short worked explanations.
import type { UnitId } from '../sim/substances';
import { sub } from '../sim/substances';

export const NOTE_HE: Record<string, string> = {
  'dry-filter': 'סינון יבש: אין נוזל שיעבור — הכול נשאר על הנייר',
  'nothing-magnetic': 'אין פה שום דבר שנמשך למגנט',
  'all-passed': 'הכול עבר דרך המסנן!',
  'one-layer': 'יש רק שכבה אחת — אין מה להפריד',
  'nothing-evaporates': 'אין פה נוזל שמתאדה',
  'nothing-boils': 'בטמפרטורה הזו שום דבר לא רותח',
  'no-solvent': 'אין ממס — הפיגמנטים לא זזים על הנייר',
  'wet-magnet': 'הברזל רטוב ושקוע בבוץ — המגנט תופס רק חלק ממנו',
  'pure-compound': 'זו תרכובת — חומר אחד. שיטות הפרדה פיזיקליות לא מפרקות אותה',
  'pure-element': 'זה יסוד — חומר אחד. אין כאן מה להפריד',
};

/** A short worked explanation after a failure (weeks 1–5 only). */
export function workedExplanation(want: UnitId, impurity: UnitId | undefined, reason: string): string {
  if (reason.startsWith('missing')) return 'הגיע חומר אחר לגמרי. בדקו לאיזו יציאה חיברתם את הצינור.';
  const key = `${want}<${impurity}`;
  const m: Record<string, string> = {
    'salt<water': 'מלח מומס עובר דרך המסנן יחד עם המים. כדי לקבל מלח יבש מאדים את המים באגן אידוי.',
    'salt<sand': 'אידוי לפני סינון משאיר את החול עם המלח. קודם מסננים את החול, ורק אז מאדים.',
    'salt<iron': 'הברזל נשאר עם המלח. מגנט מוציא אותו כבר בהתחלה.',
    'water<salt': 'מי מלח נראים צלולים, אבל זו תערובת הומוגנית — מסנן לא עוצר מלח מומס. בזיקוק המים רותחים ומתעבים לחוד.',
    'water<sugar': 'צלול ≠ טהור: יש בו סוכר מומס. אידוי משאיר את הסוכר, וזיקוק נותן מים נקיים.',
    'water<oil': 'השמן והמים נפרדים לשכבות — משפך הפרדה מוציא כל שכבה לחוד.',
    'sand<iron': 'ברזל וחול הם שני מוצקים — מסנן לא מבדיל ביניהם. ברזל נמשך למגנט, חול לא.',
    'iron<sand': 'חול וברזל עדיין מעורבבים. התכונה שמבדילה ביניהם: מגנטיות.',
    'sand<salt': 'המלח לא נמס, אז נשאר על הנייר עם החול. חברו צינור מים למיכל ההמסה לפני הסינון.',
    'oil<water': 'שמן ומים שניהם נוזלים — שניהם עוברים במסנן. הם לא מתערבבים: משפך הפרדה.',
    'ethanol<water': 'ב-100°C גם המים רותחים. כוונו את מתקן הזיקוק ל-78°C — האתנול רותח ראשון.',
    'pigmentBlue<pigmentYellow': 'באידוי שני הפיגמנטים נשארים יחד. בכרומטוגרפיה כל פיגמנט זז במהירות אחרת על הנייר.',
    'sugar<water': 'הסוכר עדיין מומס במים. אידוי משאיר אותו יבש.',
  };
  return m[key] ?? `יש שם ${impurity ? sub(impurity).he : 'עוד משהו'}. איזו תכונה שונה בין ${sub(want).he} ל${impurity ? sub(impurity).he : 'שאר הרכיבים'}?`;
}
