// v2 level map: a big floating plateau with a winding path, brass level badges and chapter landmarks.
import * as THREE from 'three';
import { PUZZLES } from '../puzzle/levels';
import type { StationType } from '../sim/stations';
import { MAT } from '../render/materials';
import { instance } from '../render/models';
import { el, f } from '../ui/hud';
import { buildIsland, palms } from './board';
import type { PuzzleGame } from './PuzzleGame';

const CHAPTERS: { n: number; he: string; machine: StationType }[] = [
  { n: 1, he: 'מגנט', machine: 'magnet' },
  { n: 2, he: 'מסנן ואידוי', machine: 'filter' },
  { n: 3, he: 'שכבות', machine: 'funnel' },
  { n: 4, he: 'שלוש שיטות', machine: 'tank' },
  { n: 5, he: 'פיגמנטים ואתנול', machine: 'chroma' },
  { n: 6, he: 'יום השיטפון', machine: 'sieve' },
];
const MODEL: Record<StationType, Parameters<typeof instance>[0]> = { magnet: 'magnet-drum', filter: 'filter-press', funnel: 'funnel', tank: 'tank', chroma: 'chroma-tower', sieve: 'sieve', still: 'still', pan: 'evap-pan' };

export class MapScene {
  game: PuzzleGame;
  root = new THREE.Group();
  badges: THREE.Mesh[] = [];
  points: THREE.Vector3[] = [];
  private built = false;
  private labelEls: HTMLElement[] = [];

  constructor(game: PuzzleGame) {
    this.game = game;
    this.root.visible = false;
    game.scene.add(this.root);
  }

  private build(): void {
    if (this.built) return;
    this.built = true;
    const island = buildIsland(-11, 11, -6.5, 6.5, 77);
    this.root.add(island.group);
    // serpentine path: starts bottom-right (the mine), climbs to the top-left
    const n = PUZZLES.length;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 5);
      const k = i % 5;
      const dir = row % 2 === 0 ? -1 : 1;
      const x = (row % 2 === 0 ? 8 : -8) + dir * k * 4;
      const z = 4.2 - row * 4;
      this.points.push(new THREE.Vector3(x + Math.sin(i * 1.7) * 0.5, 0.15, z + Math.cos(i * 1.3) * 0.5));
    }
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(11, 0.12, 5), ...this.points], false, 'centripetal');
    const path = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.55, 8, false), new THREE.MeshStandardMaterial({ color: '#f3dcae', roughness: 1 }));
    path.scale.y = 0.18;
    path.receiveShadow = true;
    this.root.add(path);
    // badges
    const coin = new THREE.CylinderGeometry(0.85, 0.92, 0.32, 32);
    this.points.forEach((p, i) => {
      const m = new THREE.Mesh(coin, MAT.brass.clone());
      m.position.copy(p).setY(0.3);
      m.castShadow = true;
      m.userData.level = i;
      this.root.add(m);
      this.badges.push(m);
    });
    // landmarks: the mine at the start, each chapter's machine beside its first level, an oasis
    const mine = instance('mine', 3.2);
    if (mine) {
      mine.position.set(11.2, 0.1, 4.6);
      mine.rotation.y = -Math.PI / 2;
      this.root.add(mine);
    }
    CHAPTERS.forEach((ch) => {
      const first = PUZZLES.findIndex((p) => p.chapter === ch.n);
      const p = this.points[first];
      const m = instance(MODEL[ch.machine], 1.8);
      if (m) {
        m.position.copy(p).add(this.landmarkOffset(first));
        this.root.add(m);
      }
    });
    const oasis = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2fc1c4', roughness: 0.1, metalness: 0.1, emissive: '#0b5e66', emissiveIntensity: 0.3 }));
    oasis.position.set(1.5, 0.16, 2.0);
    this.root.add(oasis);
    this.root.add(palms([new THREE.Vector3(-0.2, 0.1, 1.2), new THREE.Vector3(3.6, 0.1, 1.6), new THREE.Vector3(2.4, 0.1, 3.0), new THREE.Vector3(-10, 0.1, -4.5), new THREE.Vector3(9.5, 0.1, -5), new THREE.Vector3(-10.2, 0.1, 5.2), new THREE.Vector3(6, 0.1, -1.9), new THREE.Vector3(-5.5, 0.1, 2.1)], 9));
  }

  /** row of a level on the serpentine path (0 = front row) */
  row(i: number): number {
    return Math.floor(i / 5);
  }

  landmarkOffset(i: number): THREE.Vector3 {
    return new THREE.Vector3(i % 5 === 0 ? 0 : 2.0, 0.1, this.row(i) === 2 ? -2.1 : 2.0);
  }

  bannerOffset(i: number): THREE.Vector3 {
    // front row: banner in front of the badge; other rows: behind it
    if (this.row(i) === 0) return new THREE.Vector3(-0.8, 0.6, 2.6);
    if (this.row(i) === 1) return new THREE.Vector3(-1.6, 0.4, 2.0);
    return new THREE.Vector3(-0.6, 2.4, -2.3);
  }

  show(): void {
    this.build();
    this.root.visible = true;
    this.frame();
    this.refreshBadges();
  }

  hide(): void {
    this.root.visible = false;
    for (const e of this.labelEls) e.remove();
    this.labelEls = [];
  }

  refreshBadges(): void {
    const g = this.game;
    const current = PUZZLES.findIndex((p, i) => g.unlocked(i) && !(g.progress[p.id] > 0));
    this.badges.forEach((b, i) => {
      const mat = b.material as THREE.MeshStandardMaterial;
      const done = (g.progress[PUZZLES[i].id] ?? 0) > 0;
      if (i === current) {
        mat.color.set('#1f9e8f');
        mat.emissive.set('#2fd1c4');
        mat.emissiveIntensity = 0.5;
      } else if (done) {
        mat.color.set('#e0b24c');
        mat.emissive.set('#000');
      } else if (!g.unlocked(i)) {
        mat.color.set('#9aa0a6');
        mat.emissive.set('#000');
        mat.metalness = 0.4;
      }
      b.userData.current = i === current;
    });
  }

  buildLabels(): void {
    const g = this.game;
    for (const e of this.labelEls) e.remove();
    this.labelEls = [];
    const wl = document.getElementById('world-labels')!;
    PUZZLES.forEach((p, i) => {
      const stars = g.progress[p.id] ?? 0;
      const locked = !g.unlocked(i);
      const b = el('button', { class: `badge ${locked ? 'locked' : ''} ${this.badges[i].userData.current ? 'current' : ''}`, 'aria-label': `שלב ${i + 1}: ${p.he}${locked ? ' (נעול)' : ''}`, 'data-level': String(i) }, `<b>${f(i + 1)}</b>${locked ? '<i>🔒</i>' : `<span class="st">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`}`);
      b.addEventListener('click', () => {
        if (!locked) g.startLevel(i);
      });
      wl.append(b);
      b.style.pointerEvents = 'auto';
      this.labelEls.push(b);
    });
    CHAPTERS.forEach((ch) => {
      const first = PUZZLES.findIndex((p) => p.chapter === ch.n);
      const icon = g.icons[ch.machine];
      const s = el('div', { class: 'chap', 'data-first': String(first) }, `${icon ? `<img alt="" src="${icon}">` : ''}<div><small>פרק ${f(ch.n)}</small><b>${ch.he}</b></div>`);
      wl.append(s);
      this.labelEls.push(s);
    });
  }

  frame(): void {
    const cam = this.game.camera;
    const aspect = cam.aspect;
    const d = aspect < 0.9 ? 54 : aspect < 1.4 ? 34 : 27.5;
    cam.position.set(0, d * 0.78, d * 0.62);
    cam.lookAt(0, 0, 0.5);
    this.game.camBase = { pos: cam.position.clone(), target: new THREE.Vector3(0, 0, 0.5) };
  }

  pick(ray: THREE.Raycaster): number | undefined {
    const h = ray.intersectObjects(this.badges, false)[0];
    return h ? (h.object.userData.level as number) : undefined;
  }

  screenOf(i: number): { x: number; y: number } | null {
    const b = this.badges[i];
    return b ? this.game.project(b.position.clone().add(new THREE.Vector3(0, 0.2, 0))) : null;
  }

  update(dt: number, t: number): void {
    void dt;
    const g = this.game;
    this.badges.forEach((b) => {
      b.position.y = b.userData.current ? 0.3 + Math.abs(Math.sin(t * 3)) * 0.25 : 0.3;
    });
    // gentle drift
    const k = g.reduced ? 0 : 1;
    g.camera.position.copy(g.camBase.pos).add(new THREE.Vector3(Math.sin(t * 0.15) * 0.8 * k, 0, 0));
    g.camera.lookAt(g.camBase.target);
    for (const e of this.labelEls) {
      if (e.classList.contains('badge')) {
        const s = this.screenOf(Number(e.dataset.level));
        if (s) {
          e.style.left = `${s.x}px`;
          e.style.top = `${s.y}px`;
        }
      } else {
        const first = Number(e.dataset.first);
        const p = this.points[first];
        const s = g.project(p.clone().add(this.bannerOffset(first)));
        e.style.left = `${s.x}px`;
        e.style.top = `${s.y}px`;
      }
    }
  }
}
