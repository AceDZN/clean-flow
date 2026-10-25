// DOM HUD (Hebrew, RTL). Pure view helpers; the Game wires the callbacks.
import { CLASS_HE, classify, dissolvedMass, isUniform, mass, undissolvedSolidMass, units, type Comp, type MatterClass } from '../sim/mixture';
import { STATIONS, type StationType } from '../sim/stations';
import { sub } from '../sim/substances';
import { shapeSvg } from '../render/particleGeo';

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector(sel) as T;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
}

/** formula / number in an isolated LTR span */
export const f = (s: string | number) => `<bdi class="f">${s}</bdi>`;

export const ICONS = {
  menu: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>',
  fast: '<svg viewBox="0 0 24 24"><text x="12" y="17" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor" font-family="Rubik, sans-serif">x2</text></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8c2 2 2 6 0 8M18.5 5.5c3.5 3.5 3.5 9.5 0 13" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2.2"/></svg>',
  motion: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2.2" fill="none"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 0 2-5" stroke="currentColor" stroke-width="2.4" fill="none"/><path d="M4 3v5h5" stroke="currentColor" stroke-width="2.4" fill="none"/></svg>',
  pipe: '<svg viewBox="0 0 48 48"><path d="M6 14h16a10 10 0 0 1 10 10v16" stroke="#8d97a0" stroke-width="10" fill="none"/><path d="M6 14h16a10 10 0 0 1 10 10v16" stroke="#cfd8de" stroke-width="5" fill="none"/><rect x="3" y="7" width="6" height="14" rx="2" fill="#b98a3c"/><rect x="25" y="37" width="14" height="6" rx="2" fill="#b98a3c"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" fill="currentColor"/></svg>',
  lens: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="2.4" fill="none"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
};

/** Class stamp icons: never colour only — each class has its own pictogram. */
export const CLASS_ICON: Record<MatterClass, string> = {
  element: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#dcecff" stroke="#3f6fe0" stroke-width="2.5"/><circle cx="20" cy="20" r="5" fill="#3f6fe0"/><ellipse cx="20" cy="20" rx="13" ry="5" stroke="#3f6fe0" stroke-width="1.6" fill="none"/><ellipse cx="20" cy="20" rx="13" ry="5" stroke="#3f6fe0" stroke-width="1.6" fill="none" transform="rotate(60 20 20)"/><ellipse cx="20" cy="20" rx="13" ry="5" stroke="#3f6fe0" stroke-width="1.6" fill="none" transform="rotate(-60 20 20)"/></svg>',
  compound: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#f1e2ff" stroke="#8a4fd0" stroke-width="2.5"/><path d="M20 13 L12 26 M20 13 L28 26" stroke="#555" stroke-width="2.5"/><circle cx="20" cy="13" r="5.5" fill="#e5322d"/><circle cx="12" cy="26" r="4" fill="#fff" stroke="#555"/><circle cx="28" cy="26" r="4" fill="#fff" stroke="#555"/></svg>',
  homogeneous: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#e3f6e6" stroke="#2f9e4f" stroke-width="2.5"/>' + [[12, 12], [20, 10], [28, 13], [11, 20], [19, 19], [28, 21], [13, 28], [21, 28], [28, 28]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${i % 2 ? '#2f9e4f' : '#5cc8ff'}"/>`).join('') + '</svg>',
  heterogeneous: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#fff0de" stroke="#e8792a" stroke-width="2.5"/>' + [[10, 15], [13, 11], [14, 17], [11, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.8" fill="#59606b"/>`).join('') + [[24, 24], [28, 27], [26, 30], [30, 22], [23, 29]].map(([x, y]) => `<rect x="${x - 2.5}" y="${y - 2.5}" width="5" height="5" fill="#d9a55b" stroke="#7a5128" stroke-width="0.6"/>`).join('') + '</svg>',
};

export function sundialSvg(frac: number): string {
  const a = -90 + Math.min(1, frac) * 300;
  const rad = (a * Math.PI) / 180;
  const x = 27 + Math.cos(rad) * 17;
  const y = 27 + Math.sin(rad) * 17;
  const dusk = frac > 0.75;
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const r = ((i * 30 - 90) * Math.PI) / 180;
    return `<line x1="${27 + Math.cos(r) * 20}" y1="${27 + Math.sin(r) * 20}" x2="${27 + Math.cos(r) * 23}" y2="${27 + Math.sin(r) * 23}" stroke="#7a5128" stroke-width="1.5"/>`;
  }).join('');
  const arcEnd = ((-90 + 300) * Math.PI) / 180;
  return `<svg id="sundial" viewBox="0 0 54 54" aria-label="שעון היום"><circle cx="27" cy="27" r="26" fill="#d9a548" stroke="#7a5128" stroke-width="2"/><circle cx="27" cy="27" r="22" fill="${dusk ? '#ffd2a8' : '#fff6dc'}"/>
  <path d="M27 27 L27 5 A22 22 0 1 1 ${27 + Math.cos(arcEnd) * 22} ${27 + Math.sin(arcEnd) * 22} Z" fill="${dusk ? 'rgba(232,121,42,0.25)' : 'rgba(27,141,147,0.12)'}"/>${ticks}
  <line x1="27" y1="27" x2="${x}" y2="${y}" stroke="#2b1b0e" stroke-width="3" stroke-linecap="round"/><circle cx="27" cy="27" r="3" fill="#2b1b0e"/></svg>`;
}

export function unitStateHe(c: Comp, u: ReturnType<typeof units>[number]): string {
  const s = sub(u);
  if (s.phase === 'gas') return 'גז';
  if (s.phase === 'liquid') return 'נוזל';
  if (dissolvedMass(c, u) > 0 && undissolvedSolidMass(c, u) <= 1e-6) return 'מומס';
  if (dissolvedMass(c, u) > 0) return 'חלקו מומס';
  return 'מוצק';
}

export function legendHtml(c: Comp): string {
  return units(c)
    .map((u) => {
      const s = sub(u);
      return `<div>${shapeSvg(s.shape, s.color)}<span>${s.he} ${f(s.formula)} <small>· ${unitStateHe(c, u)}</small></span></div>`;
    })
    .join('');
}

export function distributionHe(c: Comp): string {
  const n = units(c).length;
  if (n === 0) return 'ריק';
  if (n === 1) return 'סוג אחד של חלקיקים בלבד.';
  return isUniform(c) ? `${n} סוגי חלקיקים, מפוזרים באחידות בכל מקום.` : `${n} סוגי חלקיקים, בגושים / בשכבות נפרדות.`;
}

export interface LensPanelOpts {
  title: string;
  kindHe: string;
  comp: Comp;
  taggable: boolean;
  tagged?: MatterClass;
  onTag?: (c: MatterClass) => void;
  onClose: () => void;
  extra?: string;
}

export function lensPanel(o: LensPanelOpts): HTMLElement {
  const p = el('div', { id: 'lens', role: 'dialog', 'aria-label': 'עדשת חלקיקים' });
  p.innerHTML = `
    <div class="sec"><header><div><h3>עדשת חלקיקים · ${o.title}</h3><div class="kind">${o.kindHe}</div></div>
      <button class="iconbtn" data-close aria-label="סגירת העדשה" style="width:36px;height:36px;font-size:16px">✕</button></header></div>
    <div class="view-wrap"><div id="lens-view" role="img" aria-label="חלקיקים בזרם: ${units(o.comp).map((u) => sub(u).he).join(', ')}"></div></div>
    <div class="sec"><div class="legend">${legendHtml(o.comp)}</div><div class="dist">${distributionHe(o.comp)}</div>${o.extra ?? ''}</div>
    ${o.taggable ? `<div class="sec"><div style="font-size:13px;font-weight:700;margin-bottom:4px">החתימו את הזרם:</div><div class="stamps">${(['element', 'compound', 'homogeneous', 'heterogeneous'] as MatterClass[])
      .map((c) => `<button class="stamp ${o.tagged === c ? 'right' : ''}" data-tag="${c}">${CLASS_ICON[c]}${CLASS_HE[c]}</button>`)
      .join('')}</div><div class="stamp-note" aria-live="polite">${o.tagged ? '✓ ' + CLASS_HE[o.tagged] : ''}</div></div>` : ''}
  `;
  p.querySelector('[data-close]')!.addEventListener('click', o.onClose);
  p.querySelectorAll<HTMLButtonElement>('[data-tag]').forEach((b) => b.addEventListener('click', () => o.onTag?.(b.dataset.tag as MatterClass)));
  return p;
}

export function stampFeedback(panel: HTMLElement, cls: MatterClass, correct: boolean, comp: Comp): void {
  const b = panel.querySelector<HTMLButtonElement>(`[data-tag="${cls}"]`);
  const note = panel.querySelector('.stamp-note')!;
  panel.querySelectorAll('.stamp').forEach((x) => x.classList.remove('wrong'));
  if (correct) {
    panel.querySelectorAll('.stamp').forEach((x) => x.classList.remove('right'));
    b?.classList.add('right');
    note.innerHTML = `✓ ${CLASS_HE[cls]}! <b>+⭐</b>`;
  } else {
    b?.classList.add('wrong');
    const n = units(comp).length;
    note.innerHTML = n === 1 ? 'החותמת החליקה… כמה סוגי חלקיקים יש כאן? ומכמה סוגי אטומים בנוי כל חלקיק?' : 'החותמת החליקה… הסתכלו: החלקיקים מפוזרים באחידות, או בגושים ושכבות?';
  }
}

export function stationIconFallback(type: StationType): string {
  return `<svg viewBox="0 0 64 52" class="icon"><rect x="8" y="34" width="48" height="12" rx="3" fill="#d6a84c"/><circle cx="32" cy="22" r="16" fill="#c8703f"/><text x="32" y="27" text-anchor="middle" font-size="12" fill="#fff" font-family="Rubik">${STATIONS[type].heShort}</text></svg>`;
}

export function classOf(c: Comp): MatterClass {
  return classify(c);
}

export function massPct(c: Comp, u: Parameters<typeof mass>[1]): number {
  return mass(c, u);
}
