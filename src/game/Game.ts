// Clean Flow — the game shell: 3D scene, input, HUD, feedback. The sim (src/sim) is authoritative.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { hexKey, hexToWorld, worldToHex, BOARD_RADIUS, type Hex } from '../sim/hex';
import { LEVELS, type CustomerLook, type LevelSpec, type SourceLook } from '../sim/levels';
import { CLASS_HE, classify, total, units, type Comp, type MatterClass } from '../sim/mixture';
import { STATIONS, type StationType, type StillTemp } from '../sim/stations';
import { sub, type UnitId } from '../sim/substances';
import { World, rejectionHe, type NodeRT, type SimEvent } from '../sim/world';
import { Fx } from '../render/fx';
import { Lens } from '../render/lens';
import { buildCustomer, buildSource, buildStation, buildWaste, type NodeView } from '../render/machines';
import { MAT } from '../render/materials';
import { clips, instance, loadModels, type ModelName } from '../render/models';
import { shapeSvg } from '../render/particleGeo';
import { ParticleField, buildPipeMesh, drawPipePackets, glassPipeMaterial, pipeCurve, type PipeView } from '../render/pipes';
import { buildEnvironment, buildTerrainView, tileTop, type Environment, type TerrainView } from '../render/terrain';
import { $, CLASS_ICON, ICONS, el, f, lensPanel, stampFeedback, stationIconFallback, sundialSvg } from '../ui/hud';
import { audio } from './audio';
import { loadProgress, logEvent, saveProgress, sessionLog } from './log';

type Mode =
  | { kind: 'idle' }
  | { kind: 'place'; type: StationType }
  | { kind: 'connect'; from: string; port: string; armed: boolean }
  | { kind: 'move'; id: string };

type Sel = { kind: 'node' | 'pipe'; id: string } | null;

interface Label {
  root: HTMLElement;
  sign: HTMLElement;
  meter?: HTMLElement;
  gauge?: HTMLElement;
  ports: Record<string, HTMLElement>;
}

interface Bubble {
  el: HTMLElement;
  pos: THREE.Vector3;
  until: number;
}

const SOURCE_TINT: Partial<Record<SourceLook, string>> = { spring: '#4fc3e8', pond: '#9fe3ff', marsh: '#a59a72', well: '#ffc1dc', creek: '#3aa7e0', spill: '#f2b63a', ink: '#3f9a52', vat: '#c9b6ff', mine: '#59606b', blackmine: '#2b2a33' };
const STATION_MODEL: Partial<Record<StationType, [ModelName, number]>> = { magnet: ['magnet-drum', 1.55], filter: ['filter-press', 1.05], still: ['still', 1.7], pan: ['evap-pan', 1.55] };

const NODE_SCALE = 1.6;

const NOTE_HE: Record<string, string> = {
  'dry-filter': 'סינון יבש: אין נוזל שיעבור — הכול נשאר על הנייר',
  'nothing-magnetic': 'אין פה שום דבר שנמשך למגנט',
  'all-passed': 'הכול עבר דרך המסנן!',
  'one-layer': 'יש רק שכבה אחת — אין מה להפריד',
  'nothing-evaporates': 'אין פה נוזל שמתאדה',
  'nothing-boils': 'בטמפרטורה הזו שום דבר לא רותח',
  'no-solvent': 'אין ממס — הצבענים לא זזים על הנייר',
};

export class Game {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  controls: OrbitControls;
  env: Environment;
  field: ParticleField;
  fx: Fx;
  lens = new Lens();
  levelRoot = new THREE.Group();
  terrain: TerrainView | null = null;
  world!: World;
  levelIdx = 0;
  nodeViews = new Map<string, NodeView>();
  pipeViews = new Map<string, PipeView>();
  labels = new Map<string, Label>();
  bubbles: Bubble[] = [];
  mode: Mode = { kind: 'idle' };
  sel: Sel = null;
  lensTarget: Sel = null;
  lensEl: HTMLElement | null = null;
  inspectorEl: HTMLElement | null = null;
  screen: 'loading' | 'title' | 'intro' | 'play' | 'result' = 'loading';
  visualT = 0;
  testMode = false;
  reduced = false;
  shake = 0;
  hintsUsed = 0;
  hintIdx = 0;
  tutorialStep = 0;
  firstDecision = new Set<string>();
  perk: { pipe: number; overflow: number } = { pipe: 0, overflow: 1 };
  progress = loadProgress();
  icons: Partial<Record<StationType, string>> = {};
  lastAccepted = new Map<string, number>();
  noteShown = new Set<string>();
  stallShown = new Set<string>();
  mascot: { root: THREE.Object3D; mixer: THREE.AnimationMixer; cheer?: THREE.AnimationAction; bones: Record<string, THREE.Bone>; react: number; mood: 'idle' | 'cheer' | 'facepalm' } | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private down: { x: number; y: number; t: number; hit: Hit | null; moved: boolean; button: number } | null = null;
  private ghost: { group: THREE.Group; type: StationType } | null = null;
  private hexMarker: THREE.Mesh;
  private targetRings = new Map<string, THREE.Mesh>();
  private previewPipe: THREE.Mesh | null = null;
  private hover: Hit | null = null;
  private preDive: { target: THREE.Vector3; pos: THREE.Vector3 } | null = null;
  private camTween: { from: THREE.Vector3; to: THREE.Vector3; fromPos: THREE.Vector3; toPos: THREE.Vector3; t: number; dur: number } | null = null;
  private lastFrame = performance.now();
  private fpsAcc = { frames: 0, time: 0, fps: 0 };
  private ui = $('#ui');
  private wl = $('#world-labels');

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.env = buildEnvironment(this.scene);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.28;
    this.scene.add(this.levelRoot);
    this.field = new ParticleField(this.scene, 2.9);
    this.fx = new Fx(this.scene);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minPolarAngle = 0.45;
    this.controls.maxPolarAngle = 1.12;
    this.controls.minDistance = 9;
    this.controls.maxDistance = 34;
    this.controls.screenSpacePanning = false;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.hexMarker = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.95, 6).rotateX(-Math.PI / 2).rotateY(Math.PI / 6), new THREE.MeshBasicMaterial({ color: '#6fd3cf', transparent: true, opacity: 0.85, depthWrite: false }));
    this.hexMarker.visible = false;
    this.scene.add(this.hexMarker);
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.toast('הגרפיקה נעצרה — טוענים מחדש…', 4000);
    });
    canvas.addEventListener('webglcontextrestored', () => location.reload());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.autoPause();
    });
    window.addEventListener('blur', () => this.autoPause());
    this.exposeTestApi();
    requestAnimationFrame(() => this.frame());
  }

  // ======================= boot / screens =======================

  async boot(): Promise<void> {
    this.ui.innerHTML = `<div id="title"><h1>זרם נקי</h1><div class="en">CLEAN FLOW</div><div class="panel tag">טוענים את העמק… <span id="loadp"></span></div></div>`;
    this.loadLevel(0, false);
    this.cameraHome(true);
    await loadModels((d, t) => {
      const p = document.getElementById('loadp');
      if (p) p.textContent = `${d}/${t}`;
    });
    this.makeIcons();
    this.loadLevel(0, false);
    this.addMascot();
    this.showTitle();
  }

  showTitle(): void {
    this.screen = 'title';
    this.closeLens();
    this.closeInspector();
    const unlocked = this.unlockedCount();
    this.ui.innerHTML = `
      <div id="title">
        <h1>זרם נקי</h1>
        <div class="en">CLEAN FLOW</div>
        <div class="panel tag">זרמים מעורבבים יוצאים מהמכרות, מהמעיינות ומהדליפות. העיירות רוצות חומרים טהורים. בנו צינורות זכוכית ומכונות הפרדה — בסדר הנכון.</div>
        <button class="btn big" id="start">${unlocked > 1 ? 'המשך' : 'יוצאים לעמק'} ▶</button>
        <div class="weeks">${LEVELS.map((l, i) => `<button class="weekbtn" data-l="${i}" ${i < unlocked ? '' : 'disabled'}><span>${l.he.split('·')[0]}</span><span style="font-size:12px;font-weight:400">${l.he.split('·')[1] ?? l.subtitle}</span><span class="s">${'★'.repeat(this.progress[l.id] ?? 0)}${'☆'.repeat(3 - (this.progress[l.id] ?? 0))}</span></button>`).join('')}</div>
        <div class="settings-row"><button class="iconbtn" id="t-mute" aria-label="צליל">${audio.muted ? ICONS.mute : ICONS.sound}</button><button class="iconbtn ${this.reduced ? 'on' : ''}" id="t-red" aria-label="הפחתת תנועה">${ICONS.motion}</button></div>
        <div style="font-size:13px;opacity:.85;text-align:center;max-width:520px;text-shadow:0 1px 3px #000">גרירה: הזזת המצלמה · קליק ימני / שתי אצבעות: סיבוב · גלגלת: זום · רווח: הפעלה/עצירה</div>
      </div>`;
    $('#start').addEventListener('click', () => {
      audio.unlock();
      this.startLevel(Math.max(0, Math.min(unlocked - 1, LEVELS.length - 1)));
    });
    this.ui.querySelectorAll<HTMLButtonElement>('.weekbtn').forEach((b) =>
      b.addEventListener('click', () => {
        audio.unlock();
        this.startLevel(Number(b.dataset.l));
      }),
    );
    $('#t-mute').addEventListener('click', () => {
      audio.unlock();
      audio.setMuted(!audio.muted);
      this.showTitle();
    });
    $('#t-red').addEventListener('click', () => {
      this.setReduced(!this.reduced);
      this.showTitle();
    });
  }

  unlockedCount(): number {
    let n = 1;
    for (let i = 0; i < LEVELS.length - 1; i++) if ((this.progress[LEVELS[i].id] ?? 0) > 0) n = i + 2;
    return Math.min(n, LEVELS.length);
  }

  setReduced(r: boolean): void {
    this.reduced = r;
    this.fx.reduced = r;
    this.lens.reduced = r;
    document.body.classList.toggle('reduced', r);
  }

  startLevel(i: number): void {
    this.loadLevel(i, true);
    this.screen = 'intro';
    const L = this.world.level;
    this.buildHud();
    const nm = L.newMachines.map((t) => this.cardHtml(t, false)).join('');
    this.modal(`
      <h2>${L.he}</h2>
      <h4>${L.subtitle}</h4>
      <p>${L.intro}</p>
      ${L.noHints ? '<p class="explain"><b>מבחן העברה:</b> אין רמזים ואין מדריך. כל מה שלמדתם בשבועות 1–5 — עכשיו על זרמים חדשים.</p>' : ''}
      ${nm ? `<div style="font-size:14px;font-weight:700">${L.noHints ? 'מכונה חדשה:' : 'מכונות חדשות השבוע:'}</div><div class="newmachines">${nm}</div>` : ''}
      <p style="font-size:14px;opacity:.85">הזמן עוצר עד שתפתחו את הברזים ▶. אפשר לעצור ולשנות את הרשת בכל רגע.</p>
      <div class="actions"><button class="btn big" data-go>בונים! 🔧</button></div>`, (m) => {
      m.querySelector('[data-go]')!.addEventListener('click', () => {
        this.closeModal();
        this.screen = 'play';
        this.focusIntro();
      });
    });
  }

  /** first seconds of a week: fly over the sources */
  focusIntro(): void {
    // swoop down from high above the canyon to the strategic view
    const { dist } = this.homePose();
    this.controls.target.set(0, 0, 0.6);
    this.camera.position.set(0, dist * 1.25, dist * 0.35);
    this.controls.update();
    if (this.reduced) this.cameraHome(true);
    else this.cameraHome(false, 1.6);
    this.updateCoach();
  }

  // ======================= level build =======================

  loadLevel(i: number, withPerk: boolean): void {
    this.levelIdx = i;
    const base = LEVELS[i];
    const spec: LevelSpec = withPerk ? { ...base, pipeBudget: base.pipeBudget + this.perk.pipe } : base;
    this.world = new World(spec);
    if (withPerk) this.world.overflowTime *= this.perk.overflow;
    if (withPerk) this.perk = { pipe: 0, overflow: 1 };
    this.hintsUsed = 0;
    this.hintIdx = 0;
    this.tutorialStep = spec.tutorial ? 1 : 0;
    this.firstDecision.clear();
    this.mode = { kind: 'idle' };
    this.sel = null;
    this.closeLens();
    this.closeInspector();
    this.noteShown.clear();
    this.stallShown.clear();
    // clear old
    for (const v of this.nodeViews.values()) this.levelRoot.remove(v.group);
    for (const p of this.pipeViews.values()) {
      this.levelRoot.remove(p.mesh);
      p.mesh.geometry.dispose();
    }
    this.nodeViews.clear();
    this.pipeViews.clear();
    for (const r of this.targetRings.values()) this.levelRoot.remove(r);
    this.targetRings.clear();
    if (this.terrain) this.levelRoot.remove(this.terrain.group);
    this.terrain = buildTerrainView(this.world.tiles, spec.terrain.seed);
    this.levelRoot.add(this.terrain.group);
    this.wl.innerHTML = '';
    this.labels.clear();
    this.bubbles = [];
    this.syncViews();
    this.env.setDayFraction(0);
    if (this.mascot) this.placeMascot();
  }

  nodePos(n: { q: number; r: number }): THREE.Vector3 {
    const { x, z } = hexToWorld(n.q, n.r);
    return new THREE.Vector3(x, tileTop(this.world.tileAt(n)), z);
  }

  private makeNodeView(n: NodeRT): NodeView {
    if (n.kind === 'station') {
      const v = buildStation(n.station!, this.world.outputsOf(n));
      const m = STATION_MODEL[n.station!];
      const inst = m ? instance(m[0], m[1]) : null;
      if (inst) {
        v.body.visible = false;
        inst.position.y += 0.05;
        v.group.add(inst);
      }
      return v;
    }
    if (n.kind === 'customer') {
      const v = buildCustomer(n.spec!.look as CustomerLook);
      const inst = instance('customer-house', 1.3);
      if (inst) {
        const house = v.body.children.find((c) => c.userData.isHouse);
        if (house) house.visible = false;
        inst.rotation.y = 0;
        v.body.add(inst);
      }
      return v;
    }
    if (n.kind === 'waste') return buildWaste();
    const look = (n.spec?.look ?? 'spring') as SourceLook;
    return buildSource(look, SOURCE_TINT[look] ?? '#888');
  }

  /** create / remove 3D views to match the sim (after any build action) */
  syncViews(): void {
    const w = this.world;
    for (const [id, v] of this.nodeViews) {
      const n = w.nodes.get(id);
      if (!n) {
        this.levelRoot.remove(v.group);
        this.nodeViews.delete(id);
        this.labels.get(id)?.root.remove();
        this.labels.delete(id);
      }
    }
    for (const n of w.nodes.values()) {
      let v = this.nodeViews.get(n.id);
      if (!v) {
        v = this.makeNodeView(n);
        v.group.userData.nodeId = n.id;
        v.hit.userData.nodeId = n.id;
        for (const h of Object.values(v.portHits)) h.userData.nodeId = n.id;
        this.nodeViews.set(n.id, v);
        this.levelRoot.add(v.group);
        this.makeLabel(n, v);
        v.group.scale.setScalar(n.kind === 'station' && this.screen === 'play' ? 0.01 : NODE_SCALE);
      }
      v.group.position.copy(this.nodePos(n));
      // face the camera side
      v.group.rotation.y = 0;
      v.group.visible = n.visible;
      v.group.updateMatrixWorld(true);
    }
    // pipes
    for (const [id, pv] of this.pipeViews) {
      const p = w.pipes.get(id);
      if (!p || pv.key !== this.pipeKey(id)) {
        this.levelRoot.remove(pv.mesh);
        pv.mesh.geometry.dispose();
        this.pipeViews.delete(id);
      }
    }
    for (const p of w.pipes.values()) {
      if (this.pipeViews.has(p.id)) continue;
      const fromV = this.nodeViews.get(p.from)!;
      const toV = this.nodeViews.get(p.to)!;
      // measure ports at full size (a fresh station may still be popping in)
      const sa = fromV.group.scale.x;
      const sb = toV.group.scale.x;
      fromV.group.scale.setScalar(NODE_SCALE);
      toV.group.scale.setScalar(NODE_SCALE);
      fromV.group.updateMatrixWorld(true);
      toV.group.updateMatrixWorld(true);
      const a = fromV.ports[p.fromPort].getWorldPosition(new THREE.Vector3());
      const dir = a.clone().sub(fromV.group.position).setY(0).normalize();
      const b = toV.inlet.getWorldPosition(new THREE.Vector3());
      fromV.group.scale.setScalar(sa);
      toV.group.scale.setScalar(sb);
      const curve = pipeCurve(a, dir, b);
      const mat = glassPipeMaterial();
      const mesh = buildPipeMesh(curve, mat);
      mesh.userData.pipeId = p.id;
      this.levelRoot.add(mesh);
      // brass couplers along the pipe
      const couplers = new THREE.Group();
      const len = curve.getLength();
      const n = Math.max(2, Math.floor(len / 1.6));
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const pt = curve.getPointAt(u);
        const tan = curve.getTangentAt(u);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 16), MAT.brass);
        ring.position.copy(pt);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
        couplers.add(ring);
        if (i > 0 && i < n) {
          const ground = tileTop(w.tileAt(worldToHex(pt.x, pt.z))) ;
          const hpost = pt.y - ground;
          if (hpost > 0.2) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, hpost, 0.08), MAT.wood);
            post.position.set(pt.x, ground + hpost / 2, pt.z);
            post.castShadow = true;
            couplers.add(post);
          }
        }
      }
      mesh.add(couplers);
      couplers.position.set(0, 0, 0);
      this.pipeViews.set(p.id, { id: p.id, curve, mesh, mat, key: this.pipeKey(p.id) });
    }
    this.updatePortTags();
  }

  pipeKey(id: string): string {
    const p = this.world.pipes.get(id)!;
    const a = this.world.nodes.get(p.from)!;
    const b = this.world.nodes.get(p.to)!;
    return `${p.from}.${p.fromPort}>${p.to}@${a.q},${a.r}>${b.q},${b.r}`;
  }

  // ======================= labels =======================

  private makeLabel(n: NodeRT, v: NodeView): void {
    const root = el('div', { class: 'wl' });
    const sign = el('div', { class: n.kind === 'station' ? 'wl-node' : 'wl-sign' }, n.he);
    const lab: Label = { root, sign, ports: {} };
    if (n.kind === 'customer') {
      const want = (n.spec?.required ?? [])[0];
      const s = want ? sub(want) : null;
      lab.meter = el('div', { class: 'meter', style: 'position:relative' }, `<div class="ico">${s ? shapeSvg(s.shape, s.color) : ''}</div><div>ביקוש: ${n.spec?.wantHe ?? ''}</div><div><div class="bar"><i style="width:0%"></i></div><div class="num"></div></div>`);
      root.append(lab.meter);
    }
    if (n.kind === 'source') {
      lab.gauge = el('div', { class: 'gauge hidden' }, `<span>⚠</span><div class="bar"><i></i></div><span class="txt">עומס</span>`);
      root.append(lab.gauge);
    }
    if (n.kind === 'waste') sign.textContent = '🗑 ' + n.he;
    root.append(sign);
    this.wl.append(root);
    for (const port of Object.keys(v.ports)) {
      if (n.kind !== 'station') continue;
      const def = STATIONS[n.station!].outputs.find((o) => o.id === port)!;
      const t = el('div', { class: 'wl port-tag' }, def.he);
      this.wl.append(t);
      lab.ports[port] = t;
    }
    this.labels.set(n.id, lab);
  }

  private updatePortTags(): void {
    for (const [id, lab] of this.labels) {
      for (const [port, t] of Object.entries(lab.ports)) {
        const free = !this.world.pipeFrom(id, port);
        t.classList.toggle('free', free);
      }
    }
  }

  private project(p: THREE.Vector3): { x: number; y: number; vis: boolean } {
    const v = p.clone().project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * this.canvas.clientHeight, vis: v.z < 1 };
  }

  private updateLabels(): void {
    const w = this.world;
    for (const [id, lab] of this.labels) {
      const n = w.nodes.get(id);
      const v = this.nodeViews.get(id);
      if (!n || !v) continue;
      const pos = v.group.position.clone();
      pos.y += v.labelY * NODE_SCALE * 0.8;
      const s = this.project(pos);
      const show = n.visible && s.vis && this.screen !== 'title';
      lab.root.style.display = show ? '' : 'none';
      lab.root.style.left = `${s.x}px`;
      lab.root.style.top = `${s.y}px`;
      if (lab.meter && n.spec?.quota) {
        const fr = Math.min(1, n.delivered / n.spec.quota);
        (lab.meter.querySelector('.bar > i') as HTMLElement).style.width = `${fr * 100}%`;
        const fmt = (x: number) => (n.spec!.quota! < 5 ? x.toFixed(1) : Math.floor(x + 1e-6).toString());
        lab.meter.querySelector('.num')!.textContent = `${fmt(Math.min(n.delivered, n.spec.quota))} / ${fmt(n.spec.quota)}`;
        lab.meter.classList.toggle('done', fr >= 1);
        const recentReject = n.rejected > 0 && this.visualT - (this.lastAccepted.get('rej:' + id) ?? -99) < 4;
        lab.meter.classList.toggle('warn', recentReject);
        let alert = lab.meter.querySelector('.alert');
        if (recentReject && !alert) {
          alert = el('div', { class: 'alert' }, '!');
          lab.meter.append(alert);
        } else if (!recentReject && alert) alert.remove();
      }
      if (lab.gauge) {
        const busy = n.buffer.length >= 3 || n.overflow > 0.02;
        lab.gauge.classList.toggle('hidden', !busy || w.state === 'planning');
        (lab.gauge.querySelector('.bar > i') as HTMLElement).style.width = `${Math.min(100, n.overflow * 100 + (n.buffer.length / 5) * 20)}%`;
        lab.gauge.classList.toggle('warn', n.overflow > 0.05 && n.overflow < 0.5);
        lab.gauge.classList.toggle('crit', n.overflow >= 0.5);
        lab.gauge.querySelector('.txt')!.textContent = n.overflow >= 0.5 ? 'עומד להציף!' : 'עומס';
      }
      for (const [port, t] of Object.entries(lab.ports)) {
        const pw = v.ports[port].getWorldPosition(new THREE.Vector3());
        pw.y += 0.35;
        const ps = this.project(pw);
        t.style.display = show ? '' : 'none';
        t.style.left = `${ps.x}px`;
        t.style.top = `${ps.y}px`;
        const stuck = (n.outBuf[port]?.length ?? 0) >= 3 && !w.pipeFrom(id, port);
        t.textContent = (stuck ? '⚠ ' : '') + STATIONS[n.station!].outputs.find((o) => o.id === port)!.he;
      }
    }
    // bubbles
    const now = this.visualT;
    this.bubbles = this.bubbles.filter((b) => {
      if (now > b.until) {
        b.el.remove();
        return false;
      }
      const s = this.project(b.pos);
      b.el.style.left = `${s.x}px`;
      b.el.style.top = `${s.y}px`;
      return true;
    });
  }

  bubble(text: string, pos: THREE.Vector3, kind: 'bad' | 'good' | 'info' = 'info', secs = 2.6, cls = 'bubble'): void {
    // one bubble per anchor at a time
    for (const b of this.bubbles) if (b.pos.distanceTo(pos) < 0.5 && cls === 'bubble') b.until = 0;
    const e = el('div', { class: `${cls} ${kind}` }, text);
    this.wl.append(e);
    this.bubbles.push({ el: e, pos: pos.clone(), until: this.visualT + secs });
  }

  floater(text: string, pos: THREE.Vector3, color: string): void {
    const e = el('div', { class: 'floater', style: `color:${color}` }, text);
    this.wl.append(e);
    this.bubbles.push({ el: e, pos: pos.clone(), until: this.visualT + 1.1 });
  }

  // ======================= HUD =======================

  private cardHtml(t: StationType, interactive = true): string {
    const def = STATIONS[t];
    const n = this.world.inventory[t] ?? 0;
    const icon = this.icons[t] ? `<img class="icon" alt="" src="${this.icons[t]}">` : stationIconFallback(t);
    const isNew = this.world.level.newMachines.includes(t);
    return `<button class="card ${n <= 0 && interactive ? 'empty' : ''}" data-st="${t}" aria-label="${def.he}, נותרו ${n}" title="${def.blurb}">
      ${icon}<span>${def.he}</span><span class="prop">${def.propertyHe}</span>
      <span class="count">x${n}</span>${isNew && interactive ? '<span class="new">חדש</span>' : ''}</button>`;
  }

  buildHud(): void {
    const L = this.world.level;
    const types = (Object.keys(STATIONS) as StationType[]).filter((t) => (L.inventory[t] ?? 0) > 0);
    this.ui.innerHTML = `
      <div id="hud-top-right" class="panel"><div class="titles"><div class="week">${L.he}</div><div class="sub">${L.subtitle}</div></div><span id="dial">${sundialSvg(0)}</span></div>
      <div id="hud-top-left">
        <button class="iconbtn" id="b-menu" aria-label="תפריט">${ICONS.menu}</button>
        <button class="iconbtn pulse" id="playbtn" aria-label="הפעלה">${ICONS.play}<span>פתחו ברזים</span></button>
        <button class="iconbtn" id="b-fast" aria-label="מהירות כפולה">${ICONS.fast}</button>
        <button class="iconbtn" id="b-mute" aria-label="צליל">${audio.muted ? ICONS.mute : ICONS.sound}</button>
      </div>
      <div id="status-banner" class="panel hidden" aria-live="polite"></div>
      <div id="tray" role="toolbar" aria-label="מכונות">${types.map((t) => this.cardHtml(t)).join('')}</div>
      <div id="pipe-meter" class="panel">${ICONS.pipe}<div>תקציב צנרת</div><div class="bar"><i></i><span></span></div></div>
      <div id="side-buttons">
        ${L.noHints ? '' : `<button class="iconbtn" id="hintbtn" aria-label="רמז">💡 <span>רמז</span></button>`}
        <button class="iconbtn" id="b-restart" aria-label="הרצה מחדש (הרשת נשמרת)" title="הרצה מחדש — הרשת נשמרת">${ICONS.restart}</button>
      </div>
      <div id="coach" class="panel hidden"></div>
      <div id="toast" class="panel dark hidden"></div>`;
    $('#playbtn').addEventListener('click', () => this.togglePlay());
    $('#b-fast').addEventListener('click', () => this.toggleFast());
    $('#b-mute').addEventListener('click', () => {
      audio.unlock();
      audio.setMuted(!audio.muted);
      $('#b-mute').innerHTML = audio.muted ? ICONS.mute : ICONS.sound;
    });
    $('#b-menu').addEventListener('click', () => this.openMenu());
    $('#b-restart').addEventListener('click', () => this.restartRun());
    document.getElementById('hintbtn')?.addEventListener('click', () => this.showHint());
    this.ui.querySelectorAll<HTMLElement>('#tray .card').forEach((c) => {
      c.addEventListener('pointerdown', (e) => {
        audio.unlock();
        const t = c.dataset.st as StationType;
        if ((this.world.inventory[t] ?? 0) <= 0) {
          this.toast('אין עוד מכונות מהסוג הזה השבוע. אפשר לפרק מכונה ולהחזיר אותה למגש.');
          return;
        }
        e.preventDefault();
        this.setMode({ kind: 'place', type: t });
        c.setPointerCapture(e.pointerId);
        const up = (ev: PointerEvent) => {
          c.releasePointerCapture(ev.pointerId);
          c.removeEventListener('pointerup', up);
          c.removeEventListener('pointermove', mv);
          // dropped onto the board?
          const r = this.canvas.getBoundingClientRect();
          const trayR = $('#tray').getBoundingClientRect();
          if (ev.clientY < trayR.top - 10 && ev.clientX >= r.left && ev.clientX <= r.right) {
            this.setPointer(ev.clientX, ev.clientY);
            const h = this.pickHex();
            if (h) this.tryPlace(h);
          }
        };
        const mv = (ev: PointerEvent) => {
          this.setPointer(ev.clientX, ev.clientY);
          this.updateGhost();
        };
        c.addEventListener('pointerup', up);
        c.addEventListener('pointermove', mv);
      });
    });
    this.refreshHud();
  }

  refreshHud(): void {
    if (!document.getElementById('tray')) return;
    const w = this.world;
    this.ui.querySelectorAll<HTMLElement>('#tray .card').forEach((c) => {
      const t = c.dataset.st as StationType;
      const n = w.inventory[t] ?? 0;
      c.querySelector('.count')!.textContent = `x${n}`;
      c.classList.toggle('empty', n <= 0);
      c.classList.toggle('selected', this.mode.kind === 'place' && this.mode.type === t);
    });
    const left = w.pipeLeft();
    const pm = $('#pipe-meter');
    (pm.querySelector('.bar > i') as HTMLElement).style.width = `${(left / w.level.pipeBudget) * 100}%`;
    pm.querySelector('.bar > span')!.textContent = `${left} / ${w.level.pipeBudget}`;
    const pb = $('#playbtn');
    const running = w.state === 'running';
    pb.classList.toggle('running', running);
    pb.classList.toggle('pulse', w.state === 'planning' && this.readyHint());
    pb.innerHTML = running ? `${ICONS.pause}<span>עצירה</span>` : `${ICONS.play}<span>${w.state === 'planning' ? 'פתחו ברזים' : 'המשך'}</span>`;
    $('#b-fast').classList.toggle('on', w.speed > 1);
    const hb = document.getElementById('hintbtn');
    if (hb) hb.querySelector('span')!.textContent = `רמז ${Math.min(this.hintIdx, 3)}/3`;
    const banner = $('#status-banner');
    let msg = '';
    if (w.state === 'planning') msg = 'הזמן עצור: תכננו את הרשת, ואז ▶ פתחו את הברזים.';
    else if (w.state === 'paused' && w.pauseReason === 'user') msg = '⏸ עצרתם — אפשר לשנות את הרשת.';
    if (this.mode.kind === 'place') msg = `הניחו ${STATIONS[this.mode.type].he} על משושה פנוי (Esc לביטול)`;
    if (this.mode.kind === 'connect') msg = 'גררו/הקישו על היעד: מכונה, לקוח או בריכת שפכים (Esc לביטול)';
    if (this.mode.kind === 'move') msg = 'הקישו על משושה פנוי כדי להזיז את המכונה';
    banner.classList.toggle('hidden', !msg || !!$('#coach:not(.hidden)'));
    banner.textContent = msg;
  }

  readyHint(): boolean {
    // pulse the play button once every source has a pipe
    return [...this.world.nodes.values()].filter((n) => n.kind === 'source' && n.visible).every((n) => this.world.pipeFrom(n.id, 'out'));
  }

  toast(msg: string, ms = 2600): void {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout((t as unknown as { _h: number })._h);
    (t as unknown as { _h: number })._h = window.setTimeout(() => t.classList.add('hidden'), ms);
  }

  modal(html: string, wire?: (m: HTMLElement) => void): void {
    this.closeModal();
    const wrap = el('div', { class: 'modal-wrap', id: 'modal' });
    const m = el('div', { class: 'modal panel', role: 'dialog' }, html);
    wrap.append(m);
    this.ui.append(wrap);
    wire?.(m);
    (m.querySelector('button') as HTMLButtonElement | null)?.focus();
  }

  closeModal(): void {
    document.getElementById('modal')?.remove();
  }

  // ======================= coach (week 1 tutorial) =======================

  updateCoach(): void {
    const c = document.getElementById('coach');
    if (!c) return;
    document.querySelectorAll('.ping').forEach((p) => p.remove());
    if (!this.world.level.tutorial || this.tutorialStep === 0 || this.screen !== 'play') {
      c.classList.add('hidden');
      return;
    }
    const w = this.world;
    const mine = w.nodes.get('mine')!;
    const magnet = [...w.nodes.values()].find((n) => n.station === 'magnet');
    // advance automatically from state
    if (this.tutorialStep === 1 && this.lensTarget?.id === 'mine') this.tutorialStep = 2;
    if (this.tutorialStep === 2 && magnet) this.tutorialStep = 3;
    if (this.tutorialStep === 3 && w.pipeFrom('mine', 'out')) this.tutorialStep = 4;
    if (this.tutorialStep === 4 && magnet && w.pipeFrom(magnet.id, 'magnetic') && w.pipeFrom(magnet.id, 'rest')) this.tutorialStep = 5;
    if (this.tutorialStep === 5 && w.pipeFrom('spring', 'out')) this.tutorialStep = 6;
    if (this.tutorialStep === 6 && w.state !== 'planning') this.tutorialStep = 7;
    const steps: Record<number, [string, (() => THREE.Vector3 | null) | null]> = {
      1: ['הקישו על <b>מכרה הברזל</b> כדי להציץ לתוך הזרם בעדשת החלקיקים.', () => this.nodePos(mine).add(new THREE.Vector3(0, 0.8, 0))],
      2: ['יש שם שני סוגי מוצקים. גררו את <b>התוף המגנטי</b> מהמגש לטרסה פנויה.', null],
      3: ['גררו צינור מ<b>פיית המכרה</b> (הטבעת הצהובה) אל התוף המגנטי.', () => this.nodeViews.get('mine')!.ports.out.getWorldPosition(new THREE.Vector3())],
      4: ['לתוף שתי יציאות: גררו את <b>"נמשך למגנט"</b> לבית היציקה ואת <b>"השאר"</b> לקבלן.', () => (magnet ? this.nodePos(magnet).add(new THREE.Vector3(0, 0.6, 0)) : null)],
      5: ['והמעיין? הציצו בו: חומר אחד בלבד. צינור ישר <b>מהמעיין לכפר</b> — בלי מכונה.', () => this.nodeViews.get('spring')!.ports.out.getWorldPosition(new THREE.Vector3())],
      6: ['הכול מחובר. <b>▶ פתחו את הברזים</b> וצפו בחלקיקים!', null],
    };
    const s = steps[this.tutorialStep];
    if (!s) {
      c.classList.add('hidden');
      return;
    }
    c.classList.remove('hidden');
    c.innerHTML = `<span class="n">${this.tutorialStep}</span><span>${s[0]}</span><button class="btn ghost" style="padding:4px 10px;font-size:13px;color:var(--brown);border-color:var(--brass-edge)" data-skip>דלגו</button>`;
    c.querySelector('[data-skip]')!.addEventListener('click', () => {
      this.tutorialStep = 0;
      this.updateCoach();
      this.refreshHud();
    });
    const anchor = s[1]?.();
    if (anchor) {
      const ping = el('div', { class: 'ping' });
      this.wl.append(ping);
      this.bubbles.push({ el: ping, pos: anchor, until: this.visualT + 1e6 });
    }
  }

  // ======================= input =======================

  private bindInput(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this.onDown(e), { capture: true });
    c.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  private setPointer(cx: number, cy: number): void {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private pick(): Hit | null {
    const objs: THREE.Object3D[] = [];
    for (const [id, v] of this.nodeViews) {
      const n = this.world.nodes.get(id);
      if (!n?.visible) continue;
      objs.push(...Object.values(v.portHits), v.hit);
    }
    for (const p of this.pipeViews.values()) objs.push(p.mesh);
    const hits = this.raycaster.intersectObjects(objs, false);
    // ports first (they are small)
    const portHit = hits.find((h) => h.object.userData.port);
    if (portHit) return { kind: 'port', id: portHit.object.userData.nodeId, port: portHit.object.userData.port };
    const h = hits[0];
    if (!h) return null;
    if (h.object.userData.pipeId) return { kind: 'pipe', id: h.object.userData.pipeId };
    if (h.object.userData.nodeId) return { kind: 'node', id: h.object.userData.nodeId };
    return null;
  }

  private pickHex(): Hex | null {
    // intersect the terrace planes: try each level height, keep the hex whose top matches
    const ray = this.raycaster.ray;
    let best: Hex | null = null;
    let bestT = Infinity;
    for (let lvl = 3; lvl >= -1; lvl--) {
      const y = lvl < 0 ? -0.18 : 0.25 + lvl * 0.45;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
      const p = ray.intersectPlane(plane, new THREE.Vector3());
      if (!p) continue;
      const h = worldToHex(p.x, p.z);
      const t = this.world.tileAt(h);
      if (!t) continue;
      if (Math.abs(tileTop(t) - y) < 0.01) {
        const d = ray.origin.distanceTo(p);
        if (d < bestT) {
          bestT = d;
          best = h;
        }
      }
    }
    return best;
  }

  private onDown(e: PointerEvent): void {
    audio.unlock();
    if (this.screen !== 'play') return;
    this.setPointer(e.clientX, e.clientY);
    const hit = this.pick();
    this.down = { x: e.clientX, y: e.clientY, t: performance.now(), hit, moved: false, button: e.button };
    const interactive = e.button === 0 && (this.mode.kind === 'place' || this.mode.kind === 'move' || (this.mode.kind === 'connect' && this.mode.armed) || (hit && (hit.kind === 'port' || hit.kind === 'node')));
    this.controls.enabled = !interactive;
    if (e.button === 0 && hit?.kind === 'port' && this.mode.kind !== 'connect') {
      const n = this.world.nodes.get(hit.id)!;
      if (!this.world.pipeFrom(n.id, hit.port!)) this.setMode({ kind: 'connect', from: hit.id, port: hit.port!, armed: false });
    } else if (e.button === 0 && hit?.kind === 'node' && this.mode.kind === 'idle') {
      const n = this.world.nodes.get(hit.id)!;
      // dragging from a source starts a pipe from its outlet
      if (n.kind === 'source' && !this.world.pipeFrom(n.id, 'out')) this.setMode({ kind: 'connect', from: n.id, port: 'out', armed: false });
    }
  }

  private onMove(e: PointerEvent): void {
    this.setPointer(e.clientX, e.clientY);
    if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 7) this.down.moved = true;
    this.hover = this.pick();
    this.updateGhost();
    this.canvas.style.cursor = this.hover ? 'pointer' : this.mode.kind === 'place' ? 'crosshair' : 'grab';
  }

  private onUp(e: PointerEvent): void {
    const d = this.down;
    this.down = null;
    this.controls.enabled = true;
    if (!d || this.screen !== 'play') return;
    if (e.target !== this.canvas && !(this.mode.kind === 'connect' && !this.mode.armed)) return;
    this.setPointer(e.clientX, e.clientY);
    const hit = this.pick();
    const click = !d.moved;
    if (d.button !== 0) return;
    switch (this.mode.kind) {
      case 'place': {
        const h = this.pickHex();
        if (h) this.tryPlace(h);
        return;
      }
      case 'move': {
        const h = this.pickHex();
        if (h) {
          const r = this.world.moveStation(this.mode.id, h);
          if (r.ok) {
            this.syncViews();
            audio.play('place');
            this.log('place', { moved: this.mode.id, q: h.q, r: h.r });
          } else this.toast(r.he);
        }
        this.setMode({ kind: 'idle' });
        return;
      }
      case 'connect': {
        const m = this.mode;
        const targetId = hit && hit.kind !== 'pipe' ? hit.id : null;
        if (targetId && targetId !== m.from) {
          this.tryConnect(m.from, m.port, targetId);
          return;
        }
        if (click && !m.armed && hit && hit.id === m.from) {
          // tap on an outlet: arm and wait for a tap on the target
          this.setMode({ ...m, armed: true });
          if (this.world.nodes.get(m.from)?.kind === 'source' && hit.kind === 'node') {
            // tapping a source also opens its lens
            this.openLens({ kind: 'node', id: m.from });
          }
          return;
        }
        this.setMode({ kind: 'idle' });
        return;
      }
      case 'idle': {
        if (!click) return;
        if (!hit) {
          this.select(null);
          return;
        }
        if (hit.kind === 'pipe') this.select({ kind: 'pipe', id: hit.id });
        else this.select({ kind: 'node', id: hit.id });
      }
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (this.screen !== 'play') return;
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    const k = e.key;
    if (k === ' ') {
      e.preventDefault();
      this.togglePlay();
    } else if (k === 'Escape') {
      if (this.mode.kind !== 'idle') this.setMode({ kind: 'idle' });
      else if (this.lensEl) this.closeLens();
      else this.select(null);
    } else if (k === 'f' || k === 'F') this.toggleFast();
    else if (k === 'r' || k === 'R') this.restartRun();
    else if (k === 'h' || k === 'H') this.showHint();
    else if (k === 'Delete' || k === 'Backspace') this.deleteSelected();
    else if (/^[1-8]$/.test(k)) {
      const cards = [...this.ui.querySelectorAll<HTMLElement>('#tray .card')];
      const c = cards[Number(k) - 1];
      if (c) {
        const t = c.dataset.st as StationType;
        if ((this.world.inventory[t] ?? 0) > 0) this.setMode({ kind: 'place', type: t });
      }
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(k)) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      dir.y = 0;
      dir.normalize();
      const right = new THREE.Vector3(-dir.z, 0, dir.x);
      const step = 1.2;
      const mv = k === 'ArrowUp' || k === 'w' ? dir.multiplyScalar(step) : k === 'ArrowDown' || k === 's' ? dir.multiplyScalar(-step) : k === 'ArrowLeft' || k === 'a' ? right.multiplyScalar(-step) : right.multiplyScalar(step);
      this.controls.target.add(mv);
      this.camera.position.add(mv);
    }
  }

  setMode(m: Mode): void {
    this.mode = m;
    if (m.kind !== 'place' && this.ghost) {
      this.scene.remove(this.ghost.group);
      this.ghost = null;
    }
    if (m.kind === 'place' && (!this.ghost || this.ghost.type !== m.type)) {
      if (this.ghost) this.scene.remove(this.ghost.group);
      const v = buildStation(m.type, STATIONS[m.type].outputs.map((o) => o.id));
      const mm = STATION_MODEL[m.type];
      const inst = mm ? instance(mm[0], mm[1]) : null;
      if (inst) {
        v.body.visible = false;
        v.group.add(inst);
      }
      v.group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const mat = (mesh.material as THREE.Material).clone();
          mat.transparent = true;
          mat.opacity = 0.55;
          mat.depthWrite = false;
          mesh.material = mat;
          mesh.castShadow = false;
        }
      });
      v.group.visible = false;
      v.group.scale.setScalar(NODE_SCALE);
      this.scene.add(v.group);
      this.ghost = { group: v.group, type: m.type };
    }
    if (m.kind === 'connect') this.showTargets(m.from, m.port);
    else this.clearTargets();
    if (m.kind !== 'connect' && this.previewPipe) {
      this.scene.remove(this.previewPipe);
      this.previewPipe.geometry.dispose();
      this.previewPipe = null;
    }
    this.hexMarker.visible = false;
    this.refreshHud();
  }

  private updateGhost(): void {
    if (this.mode.kind === 'place' || this.mode.kind === 'move') {
      const h = this.pickHex();
      if (h) {
        const ok = this.world.canBuildAt(h);
        const p = this.nodePos(h);
        this.hexMarker.position.set(p.x, p.y + 0.02, p.z);
        (this.hexMarker.material as THREE.MeshBasicMaterial).color.set(ok ? '#6fd3cf' : '#ff5d4a');
        this.hexMarker.visible = true;
        if (this.ghost) {
          this.ghost.group.visible = true;
          this.ghost.group.position.copy(p);
        }
      } else {
        this.hexMarker.visible = false;
        if (this.ghost) this.ghost.group.visible = false;
      }
    }
    if (this.mode.kind === 'connect') {
      const fromV = this.nodeViews.get(this.mode.from)!;
      const a = fromV.ports[this.mode.port].getWorldPosition(new THREE.Vector3());
      const dir = a.clone().sub(fromV.group.position).setY(0).normalize();
      let b: THREE.Vector3 | null = null;
      const hov = this.hover;
      if (hov && hov.kind !== 'pipe' && hov.id !== this.mode.from) b = this.nodeViews.get(hov.id)!.inlet.getWorldPosition(new THREE.Vector3());
      else {
        const h = this.pickHex();
        if (h) b = this.nodePos(h).add(new THREE.Vector3(0, 0.5, 0));
      }
      if (this.previewPipe) {
        this.scene.remove(this.previewPipe);
        this.previewPipe.geometry.dispose();
        this.previewPipe = null;
      }
      if (b) {
        const valid = hov && hov.kind !== 'pipe' && this.world.canConnect(this.mode.from, this.mode.port, hov.id).ok;
        const mat = new THREE.MeshBasicMaterial({ color: valid ? '#6fd3cf' : '#ffffff', transparent: true, opacity: valid ? 0.6 : 0.35, depthWrite: false });
        this.previewPipe = buildPipeMesh(pipeCurve(a, dir, b), mat, 0.09);
        this.scene.add(this.previewPipe);
      }
    }
  }

  private showTargets(from: string, port: string): void {
    this.clearTargets();
    for (const n of this.world.nodes.values()) {
      if (!n.visible || n.id === from) continue;
      const ok = this.world.canConnect(from, port, n.id);
      if (!ok.ok) continue;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#6fd3cf', transparent: true, opacity: 0.8, depthWrite: false }));
      ring.position.copy(this.nodePos(n)).add(new THREE.Vector3(0, 0.04, 0));
      this.levelRoot.add(ring);
      this.targetRings.set(n.id, ring);
    }
  }

  private clearTargets(): void {
    for (const r of this.targetRings.values()) this.levelRoot.remove(r);
    this.targetRings.clear();
  }

  // ======================= actions =======================

  log(action: Parameters<typeof logEvent>[0]['action'], values?: Record<string, unknown>, outcome?: string): void {
    const key = action + (action === 'tag' ? String(values?.node) : '');
    const first = !this.firstDecision.has(key);
    this.firstDecision.add(key);
    logEvent({ level: this.world.level.id, action, values, outcome, hintsUsed: this.hintsUsed, run: this.world.runs, firstUnaided: first && this.hintsUsed === 0 ? true : undefined });
  }

  tryPlace(h: Hex): void {
    if (this.mode.kind !== 'place') return;
    const type = this.mode.type;
    const r = this.world.placeStation(type, h);
    if (!r.ok) {
      this.toast(r.he);
      audio.play('wrongstamp');
      return;
    }
    audio.play('place');
    this.log('place', { type, q: h.q, r: h.r });
    this.syncViews();
    const v = this.nodeViews.get(r.id!)!;
    v.group.scale.setScalar(0.01);
    this.fx.dust(v.group.position.clone().add(new THREE.Vector3(0, 0.2, 0)), '#e0c08a', 12);
    this.shake = Math.max(this.shake, 0.12);
    this.setMode((this.world.inventory[type] ?? 0) > 0 && false ? this.mode : { kind: 'idle' });
    this.updateCoach();
  }

  tryConnect(from: string, port: string, to: string): void {
    const r = this.world.connect(from, port, to);
    if (!r.ok) {
      this.toast(r.he);
      audio.play('wrongstamp');
      this.setMode({ kind: 'idle' });
      return;
    }
    audio.play('connect');
    this.log('connect', { from, port, to });
    this.syncViews();
    this.setMode({ kind: 'idle' });
    this.updateCoach();
  }

  deleteSelected(): void {
    if (!this.sel) return;
    if (this.sel.kind === 'pipe') {
      const p = this.world.pipes.get(this.sel.id);
      this.world.disconnect(this.sel.id);
      this.log('disconnect', { from: p?.from, port: p?.fromPort, to: p?.to });
    } else {
      const n = this.world.nodes.get(this.sel.id);
      if (n?.kind !== 'station') return;
      this.world.removeStation(n.id);
      this.log('remove', { type: n.station });
      this.fx.dust(this.nodePos(n).add(new THREE.Vector3(0, 0.3, 0)), '#d6a84c', 10);
    }
    audio.play('whoosh');
    this.select(null);
    this.syncViews();
    this.refreshHud();
    this.updateCoach();
  }

  togglePlay(): void {
    audio.unlock();
    const w = this.world;
    if (this.screen !== 'play') return;
    if (w.state === 'running') {
      w.pause('user');
      audio.play('click');
    } else if (w.state === 'planning' || w.state === 'paused') {
      if (w.state === 'planning') this.log('run', { stations: w.stationsUsed(), pipe: w.pipeUsed() });
      w.start();
      audio.play('whoosh');
      this.closeModal();
    } else if (w.state === 'failed') this.restartRun();
    this.refreshHud();
    this.updateCoach();
  }

  toggleFast(): void {
    this.world.speed = this.world.speed > 1 ? 1 : 2;
    this.refreshHud();
  }

  restartRun(): void {
    if (this.screen === 'result') this.screen = 'play';
    this.closeModal();
    this.world.resetRun();
    this.noteShown.clear();
    this.stallShown.clear();
    this.env.setDayFraction(0);
    this.syncViews();
    this.refreshHud();
    audio.play('whoosh');
  }

  autoPause(): void {
    if (this.world?.state === 'running' && !this.testMode) {
      this.world.pause('user');
      this.refreshHud();
    }
  }

  showHint(): void {
    const L = this.world.level;
    if (L.noHints || this.screen !== 'play') return;
    if (this.hintIdx < L.hints.length) this.hintIdx++;
    this.hintsUsed = this.hintIdx;
    this.log('hint', { index: this.hintIdx });
    const html = L.hints
      .slice(0, this.hintIdx)
      .map((h) => `<p>${h}</p>`)
      .join('');
    this.modal(`<h2>💡 רמז ${this.hintIdx}/3</h2>${html}<div class="actions"><button class="btn" data-x>הבנתי</button>${this.hintIdx < 3 ? '<button class="btn secondary" data-more>עוד רמז</button>' : ''}</div>`, (m) => {
      m.querySelector('[data-x]')!.addEventListener('click', () => this.closeModal());
      m.querySelector('[data-more]')?.addEventListener('click', () => this.showHint());
    });
    this.refreshHud();
  }

  openMenu(): void {
    const wasRunning = this.world.state === 'running';
    if (wasRunning) this.world.pause('user');
    this.modal(`<h2>תפריט</h2>
      <div class="actions" style="flex-direction:column">
        <button class="btn" data-a="resume">המשך</button>
        <button class="btn secondary" data-a="restart">הרצה מחדש (הרשת נשמרת)</button>
        <button class="btn secondary" data-a="clear">פירוק כל הרשת</button>
        <button class="btn secondary" data-a="title">בחירת שבוע</button>
        <button class="btn ghost" style="color:var(--brown);border-color:var(--brass-edge)" data-a="motion">${this.reduced ? 'תנועה מלאה' : 'הפחתת תנועה'}</button>
      </div>
      <p style="font-size:13px">גרירה על הקרקע: הזזת מצלמה · קליק ימני/שתי אצבעות: סיבוב · גלגלת: זום · רווח: הפעלה/עצירה · F: מהירות · R: הרצה מחדש · Delete: פירוק הנבחר · 1–8: מכונה מהמגש</p>`, (m) => {
      m.querySelectorAll<HTMLButtonElement>('[data-a]').forEach((b) =>
        b.addEventListener('click', () => {
          const a = b.dataset.a;
          this.closeModal();
          if (a === 'restart') this.restartRun();
          if (a === 'clear') {
            for (const id of [...this.world.pipes.keys()]) this.world.disconnect(id);
            for (const n of [...this.world.nodes.values()]) if (n.kind === 'station') this.world.removeStation(n.id);
            this.world.resetRun();
            this.syncViews();
            this.refreshHud();
          }
          if (a === 'title') this.showTitle();
          if (a === 'motion') this.setReduced(!this.reduced);
          if (a === 'resume' && wasRunning) this.world.start();
          this.refreshHud();
        }),
      );
    });
    this.refreshHud();
  }

  // ======================= selection / lens / inspector =======================

  select(s: Sel): void {
    this.sel = s;
    this.closeInspector();
    for (const p of this.pipeViews.values()) p.mat.emissiveIntensity = 0;
    if (!s) {
      this.closeLens();
      return;
    }
    audio.play('click');
    if (s.kind === 'pipe') {
      const pv = this.pipeViews.get(s.id);
      if (pv) pv.mat.emissiveIntensity = 0.5;
      this.openLens(s);
      this.openInspector(s);
      return;
    }
    const n = this.world.nodes.get(s.id)!;
    if (n.kind === 'source' || n.kind === 'lens') this.openLens(s);
    else if (n.kind === 'station') {
      this.openInspector(s);
      if (this.lensEl) this.openLens(s);
    } else this.openInspector(s);
  }

  lensComp(s: NonNullable<Sel>): Comp | null {
    if (s.kind === 'pipe') {
      const p = this.world.pipes.get(s.id);
      if (!p) return null;
      if (p.packets[0]) return p.packets[0].comp;
      if (p.lastComp) return p.lastComp;
      const from = this.world.nodes.get(p.from)!;
      return from.kind === 'source' ? from.spec!.packet! : null;
    }
    const n = this.world.nodes.get(s.id)!;
    if (n.kind === 'source' || n.kind === 'lens') return n.spec!.packet!;
    if (n.kind === 'station') return n.proc?.packet.comp ?? n.inQueue[0]?.comp ?? (total(n.vat) > 0 ? n.vat : null);
    return null;
  }

  openLens(s: NonNullable<Sel>): void {
    const comp = this.lensComp(s);
    this.closeLens(false);
    if (!comp || units(comp).length === 0) {
      if (s.kind === 'pipe') this.toast('הצינור ריק כרגע — הפעילו את הזרימה ונסו שוב.');
      return;
    }
    this.lensTarget = s;
    const n = s.kind === 'node' ? this.world.nodes.get(s.id)! : null;
    const p = s.kind === 'pipe' ? this.world.pipes.get(s.id)! : null;
    const title = n ? n.he : `צינור ${this.world.nodes.get(p!.from)!.he} ← ${this.world.nodes.get(p!.to)!.he}`;
    const taggable = !!n && (n.kind === 'source' || n.kind === 'lens');
    const kindHe = n?.kind === 'lens' ? 'רק להצצה — לא זרם בעמק' : n?.kind === 'station' ? 'מה שבתוך המכונה עכשיו' : 'זרם';
    this.lens.show(comp);
    this.lensEl = lensPanel({
      title,
      kindHe,
      comp,
      taggable,
      tagged: n?.tag,
      onClose: () => this.closeLens(),
      onTag: (c) => this.tag(n!.id, c, comp),
    });
    this.ui.append(this.lensEl);
    audio.play('whoosh');
    this.log('lens', { target: s.id, kind: s.kind });
    // camera dives toward the stream
    const focus = n ? this.nodePos(n) : this.pipeViews.get(s.id)?.curve.getPointAt(0.5) ?? null;
    if (focus && !this.reduced) {
      if (!this.preDive) this.preDive = { target: this.controls.target.clone(), pos: this.camera.position.clone() };
      this.flyTo(focus.clone().lerp(this.preDive.target, 0.7), Math.max(15, this.preDive.pos.distanceTo(this.preDive.target) * 0.92), 0.5);
    }
    this.updateCoach();
  }

  closeLens(sound = true): void {
    if (this.preDive && sound) {
      const d = this.preDive;
      this.camTween = { from: this.controls.target.clone(), to: d.target, fromPos: this.camera.position.clone(), toPos: d.pos, t: 0, dur: 0.45 };
      this.preDive = null;
    }
    if (this.lensEl) {
      this.lensEl.remove();
      this.lensEl = null;
      if (sound) audio.play('click');
    }
    this.lensTarget = null;
  }

  tag(id: string, c: MatterClass, comp: Comp): void {
    const n = this.world.nodes.get(id)!;
    if (n.tag) return;
    const res = this.world.tagNode(id, c);
    this.log('tag', { node: id, tag: c, truth: res.truth, attempt: n.tagAttempts }, res.correct ? 'correct' : 'wrong');
    if (this.lensEl) stampFeedback(this.lensEl, c, res.correct, comp);
    const pos = this.nodePos(n).add(new THREE.Vector3(0, 1.6, 0));
    if (res.correct) {
      audio.play('stamp');
      this.fx.sparks(pos, '#ffd166', 18);
      this.floater(n.tagFirstCorrect ? `+⭐ ${CLASS_HE[c]}` : `✓ ${CLASS_HE[c]}`, pos, '#ffd166');
    } else {
      audio.play('wrongstamp');
    }
  }

  openInspector(s: NonNullable<Sel>): void {
    this.closeInspector();
    const w = this.world;
    const box = el('div', { id: 'inspector', class: 'panel', role: 'dialog' });
    if (s.kind === 'pipe') {
      const p = w.pipes.get(s.id)!;
      const a = w.nodes.get(p.from)!;
      const b = w.nodes.get(p.to)!;
      const portHe = a.station ? STATIONS[a.station].outputs.find((o) => o.id === p.fromPort)!.he : 'יציאה';
      box.innerHTML = `<h3>צינור זכוכית</h3><p>${a.he} (${portHe}) ← ${b.he}<br>אורך: ${f(p.length)}</p><div class="row"><button class="btn secondary" data-del>פירוק הצינור</button><button class="btn ghost" style="color:var(--brown);border-color:var(--brass-edge)" data-x>סגירה</button></div>`;
    } else {
      const n = w.nodes.get(s.id)!;
      if (n.kind === 'station') {
        const def = STATIONS[n.station!];
        const ports = def.outputs.map((o) => {
          const pp = w.pipeFrom(n.id, o.id);
          return `<div>• ${o.he}: ${pp ? '→ ' + w.nodes.get(pp.to)!.he : '<b style="color:#c0392b">לא מחובר</b>'}</div>`;
        });
        box.innerHTML = `<h3>${def.he}</h3><p><b>התכונה:</b> ${def.propertyHe}</p><p>${def.blurb}</p>
          ${n.station === 'still' ? `<div><b>טמפרטורת הדוד:</b><div class="temp-dial">${([78, 100] as StillTemp[]).map((T) => `<button class="btn secondary ${n.cfg.stillTemp === T ? 'on' : ''}" data-temp="${T}">🌡 ${f(T + '°C')}</button>`).join('')}</div></div>` : ''}
          <div style="font-size:13px">${ports.join('')}</div>
          <div class="row"><button class="btn secondary" data-lens>${ICONS.lens.replace('<svg', '<svg width="18" height="18"')} עדשה</button><button class="btn secondary" data-move>הזזה</button><button class="btn secondary" data-del>פירוק</button><button class="btn ghost" style="color:var(--brown);border-color:var(--brass-edge)" data-x>✕</button></div>`;
      } else if (n.kind === 'customer') {
        const spec = n.spec!;
        const req = (spec.required ?? []).map((u) => `${sub(u).he} ${f(sub(u).formula)}`).join(' + ');
        const allow = (spec.allowed ?? []).map((u) => sub(u).he).join(', ');
        box.innerHTML = `<h3>${n.he}</h3><p><b>רוצה:</b> ${req}${allow ? ` (מותר גם: ${allow})` : ''}</p><p>מקבל רק משלוח נקי: לפחות ${f(Math.round((spec.purity ?? 0.95) * 100) + '%')} ממנו הוא מה שהוזמן.</p>
          <p>התקבל: ${f(+n.delivered.toFixed(1))} / ${f(spec.quota!)} · נדחו: ${f(n.rejected)}</p>
          ${n.lastReject ? `<p class="explain">דחייה אחרונה: ${rejectionHe(spec, n.lastReject)}</p>` : ''}
          <div class="row"><button class="btn ghost" style="color:var(--brown);border-color:var(--brass-edge)" data-x>סגירה</button></div>`;
      } else if (n.kind === 'waste') {
        box.innerHTML = `<h3>${n.he}</h3><p>מקבלת כל דבר — אבל מה שנשפך כאן לא מגיע לאף לקוח.</p><p>נשפכו: ${f(+n.delivered.toFixed(1))}</p><div class="row"><button class="btn ghost" style="color:var(--brown);border-color:var(--brass-edge)" data-x>סגירה</button></div>`;
      } else return;
    }
    this.ui.append(box);
    this.inspectorEl = box;
    box.querySelector('[data-x]')?.addEventListener('click', () => this.select(null));
    box.querySelector('[data-del]')?.addEventListener('click', () => this.deleteSelected());
    box.querySelector('[data-lens]')?.addEventListener('click', () => this.openLens(s));
    box.querySelector('[data-move]')?.addEventListener('click', () => {
      this.closeInspector();
      this.setMode({ kind: 'move', id: s.id });
    });
    box.querySelectorAll<HTMLButtonElement>('[data-temp]').forEach((b) =>
      b.addEventListener('click', () => {
        const T = Number(b.dataset.temp) as StillTemp;
        this.world.setStillTemp(s.id, T);
        this.log('still-temp', { node: s.id, T });
        audio.play('click');
        this.openInspector(s);
      }),
    );
  }

  closeInspector(): void {
    this.inspectorEl?.remove();
    this.inspectorEl = null;
  }

  // ======================= sim events → feedback =======================

  private handleEvents(evs: SimEvent[]): void {
    const w = this.world;
    for (const e of evs) {
      switch (e.type) {
        case 'deliver': {
          const n = w.nodes.get(e.node)!;
          const v = this.nodeViews.get(e.node)!;
          const door = v.group.position.clone().add(new THREE.Vector3(0, 0.6, 0.5));
          if (e.accepted) {
            audio.play('chime');
            const want = n.spec!.required![0];
            this.fx.sparks(door, sub(want).color, 10);
            this.lastAccepted.set(e.node, this.visualT);
            if (this.mascot && Math.random() < 0.15) this.mascotReact('cheer');
          } else {
            audio.play('ptui');
            this.fx.burst(e.comp, door, 16, 1);
            this.fx.dust(door, '#e9d3a8', 10);
            this.shake = Math.max(this.shake, 0.18);
            this.lastAccepted.set('rej:' + e.node, this.visualT);
            this.bubble(rejectionHe(n.spec!, n.lastReject!), v.group.position.clone().add(new THREE.Vector3(0, v.labelY * NODE_SCALE + 2.2, 0)), 'bad', 2.8);
            this.mascotReact('facepalm');
            this.log('reject', { node: e.node, comp: e.comp }, e.reason);
          }
          break;
        }
        case 'waste': {
          const v = this.nodeViews.get(e.node)!;
          this.fx.dust(v.group.position.clone().add(new THREE.Vector3(0, 0.3, 0)), '#8a8266', 4);
          audio.play('gurgle');
          break;
        }
        case 'processed': {
          const v = this.nodeViews.get(e.node);
          if (!v) break;
          const top = v.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
          audio.play('clank');
          if (e.station === 'magnet') {
            const iron = e.outputs.magnetic;
            if (iron && total(iron) > 0) {
              const to = v.ports.magnetic.getWorldPosition(new THREE.Vector3());
              for (let i = 0; i < 3; i++) this.fx.hop('iron', top.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, -0.3, 0)), to);
              this.fx.sparks(top, '#c9d1d9', 4);
            }
          }
          if (e.station === 'pan' || e.station === 'still') {
            if (total(e.vapor) > 0 || e.station === 'still') this.fx.steam(top.clone().add(new THREE.Vector3(0, e.station === 'still' ? 0.6 : -0.3, 0)), 4);
            audio.play('hiss');
          }
          if (e.station === 'tank' || e.station === 'filter' || e.station === 'funnel') this.fx.steam(top.clone().add(new THREE.Vector3(0, -0.2, 0)), 0);
          if (e.note && !this.noteShown.has(e.node + e.note)) {
            this.noteShown.add(e.node + e.note);
            this.bubble(NOTE_HE[e.note] ?? e.note, v.group.position.clone().add(new THREE.Vector3(0, v.labelY + 0.9, 0)), 'info', 3.2);
          }
          break;
        }
        case 'reveal': {
          audio.play('reveal');
          this.syncViews();
          for (const id of e.nodes) {
            const v = this.nodeViews.get(id);
            if (v) {
              v.group.scale.setScalar(0.01);
              this.fx.dust(v.group.position.clone().add(new THREE.Vector3(0, 0.3, 0)), '#e0c08a', 16);
            }
          }
          const first = w.nodes.get(e.nodes[0]);
          if (first && !this.reduced) this.flyTo(this.nodePos(first).lerp(new THREE.Vector3(), 0.3), 20, 0.9);
          this.modal(`<h2>📣 חדש בעמק!</h2><p>${e.he}</p><p style="font-size:14px">הזמן נעצר. בנו את מה שצריך ולחצו המשך.</p><div class="actions"><button class="btn" data-x>הבנתי — לבנות</button></div>`, (m) => m.querySelector('[data-x]')!.addEventListener('click', () => this.closeModal()));
          break;
        }
        case 'overflowWarn': {
          audio.play('siren');
          const v = this.nodeViews.get(e.node)!;
          this.bubble('הזרם נתקע! לאן כל זה הולך?', v.group.position.clone().add(new THREE.Vector3(0, v.labelY + 1.0, 0)), 'bad', 3);
          break;
        }
        case 'emit': {
          if (Math.random() < 0.3) audio.play('gurgle');
          break;
        }
        case 'win': {
          audio.play('win');
          this.mascotReact('cheer');
          for (const n of w.nodes.values()) if (n.kind === 'customer') this.fx.confetti(this.nodePos(n).add(new THREE.Vector3(0, 1.5, 0)), 40);
          this.log('win', { t: +w.t.toFixed(1), stations: w.stationsUsed(), pipe: w.pipeUsed(), stars: w.stars().count });
          window.setTimeout(() => this.showWin(), this.testMode ? 0 : 1300);
          break;
        }
        case 'fail': {
          audio.play('fail');
          this.mascotReact('facepalm');
          if (e.reason === 'flood' && e.node) {
            const p = this.nodePos(w.nodes.get(e.node)!);
            const n = w.nodes.get(e.node)!;
            for (let i = 0; i < 4; i++) this.fx.burst(n.spec!.packet!, p.clone().add(new THREE.Vector3(0, 0.6, 0)), 14, 1.4);
            this.shake = 0.5;
          }
          this.log('fail', { reason: e.reason, node: e.node, t: +w.t.toFixed(1) });
          window.setTimeout(() => this.showFail(), this.testMode ? 0 : 1300);
          break;
        }
      }
    }
    // stalled outlets: point at them once
    for (const n of w.nodes.values()) {
      if (n.kind !== 'station') continue;
      for (const [port, buf] of Object.entries(n.outBuf)) {
        if (buf.length >= 3 && !w.pipeFrom(n.id, port) && !this.stallShown.has(n.id + port)) {
          this.stallShown.add(n.id + port);
          const v = this.nodeViews.get(n.id)!;
          const label = STATIONS[n.station!].outputs.find((o) => o.id === port)!.he;
          this.bubble(`"${label}" לא מחובר — המכונה נתקעת!`, v.ports[port].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.1, 0)), 'bad', 3.5);
        }
      }
    }
  }

  // ======================= results =======================

  explainFailure(): string {
    const w = this.world;
    const L = w.level;
    const lines: string[] = [];
    if (w.failReason?.reason === 'flood') {
      const src = w.nodes.get(w.failReason.node!)!;
      const out = w.pipeFrom(src.id, 'out');
      if (!out) lines.push(`ל${src.he} לא היה צינור יציאה — הזרם הצטבר עד שהציף.`);
      else {
        // find the jam downstream
        const stuck = [...w.nodes.values()].find((n) => n.kind === 'station' && Object.entries(n.outBuf).some(([p, b]) => b.length >= 3 && !w.pipeFrom(n.id, p)));
        if (stuck) {
          const port = Object.entries(stuck.outBuf).find(([p, b]) => b.length >= 3 && !w.pipeFrom(stuck.id, p))![0];
          lines.push(`ב${stuck.he} היציאה "${STATIONS[stuck.station!].outputs.find((o) => o.id === port)!.he}" לא חוברה לשום מקום. המכונה התמלאה, נעצרה, והזרם חזר אחורה עד ש${src.he} הציף. כל רכיב צריך לאן ללכת — גם פסולת.`);
        } else lines.push(`הזרם מ${src.he} נתקע בדרך והציף. בדקו שכל המכונות בשרשרת מחוברות עד הסוף.`);
      }
    } else {
      const unmet = [...w.nodes.values()].filter((n) => n.kind === 'customer' && n.delivered < (n.spec?.quota ?? 0));
      for (const c of unmet) {
        if (c.lastReject) lines.push(`<b>${c.he}:</b> ${rejectionHe(c.spec!, c.lastReject)}${L.noHints ? '' : ' — ' + workedExplanation(c.spec!.required![0], c.lastReject.impurity, c.lastReject.reason)}`);
        else if (!w.pipesInto(c.id).length) lines.push(`<b>${c.he}:</b> אף צינור לא הגיע אליו.`);
        else lines.push(`<b>${c.he}:</b> לא הגיע מספיק בזמן.`);
      }
    }
    return lines.map((l) => `<p>${l}</p>`).join('');
  }

  showFail(): void {
    if (this.world.state !== 'failed') return;
    this.screen = 'result';
    const flood = this.world.failReason?.reason === 'flood';
    this.modal(`<h2>${flood ? '🌊 שיטפון!' : '🌇 ירד הערב'}</h2>
      <p>${flood ? 'אחד המקורות עלה על גדותיו.' : 'היום נגמר והלקוחות לא קיבלו את כל ההזמנות.'}</p>
      <div class="explain">${this.explainFailure()}</div>
      <p style="font-size:14px">הרשת שבניתם נשמרה. תקנו ונסו שוב.</p>
      <div class="actions"><button class="btn" data-retry>לתקן ולנסות שוב</button>${this.world.level.noHints ? '' : '<button class="btn secondary" data-hint>רמז</button>'}</div>`, (m) => {
      m.querySelector('[data-retry]')!.addEventListener('click', () => this.restartRun());
      m.querySelector('[data-hint]')?.addEventListener('click', () => {
        this.restartRun();
        this.showHint();
      });
    });
  }

  showWin(): void {
    if (this.world.state !== 'won') return;
    this.screen = 'result';
    const w = this.world;
    const st = w.stars();
    const L = w.level;
    const prev = this.progress[L.id] ?? 0;
    this.progress[L.id] = Math.max(prev, st.count);
    saveProgress(this.progress);
    let rejected = 0;
    for (const n of w.nodes.values()) rejected += n.rejected;
    const next = LEVELS[this.levelIdx + 1];
    const star = (on: boolean) => `<span class="${on ? '' : 'off'}">⭐</span>`;
    const isLast = !next;
    this.modal(`<h2>${isLast ? '🏆 העמק נקי!' : '🎉 השבוע הושלם!'}</h2>
      <div class="stars">${star(st.done)}${star(st.tags)}${star(st.tidy)}</div>
      <p>⭐ כל הלקוחות קיבלו את ההזמנה · ⭐ כל המקורות הוחתמו נכון בניסיון הראשון · ⭐ אפס דחיות ולא יותר מ-${f(L.par.stations)} מכונות</p>
      <p style="font-size:14px">זמן: ${f(w.t.toFixed(0) + 's')} · מכונות: ${f(w.stationsUsed())} · צנרת: ${f(w.pipeUsed())} · משלוחים שנדחו: ${f(rejected)} · רמזים: ${f(this.hintsUsed)}</p>
      ${isLast ? '<p>עברתם את יום השיטפון בלי רמזים: סיווגתם זרמים חדשים ובחרתם שיטות לפי התכונות. כל הכבוד, מהנדסי העמק!</p>' : `<h4>שדרוג לשבוע הבא — בחרו אחד:</h4><div class="perks"><button class="perk" data-perk="pipe"><b>+5 צינור</b>עוד מטרים של זכוכית לשבוע הבא.</button><button class="perk" data-perk="overflow"><b>מאגרים גדולים</b>המקורות מחזיקים 50% יותר זמן לפני שיטפון.</button></div>`}
      <div class="actions">${isLast ? '<button class="btn" data-title>למסך הפתיחה</button>' : '<button class="btn" data-next disabled>לשבוע הבא ▶</button>'}<button class="btn secondary" data-replay>לשחק שוב את השבוע</button></div>`, (m) => {
      m.querySelectorAll<HTMLButtonElement>('[data-perk]').forEach((b) =>
        b.addEventListener('click', () => {
          m.querySelectorAll('.perk').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          this.perk = b.dataset.perk === 'pipe' ? { pipe: 5, overflow: 1 } : { pipe: 0, overflow: 1.5 };
          (m.querySelector('[data-next]') as HTMLButtonElement).disabled = false;
          audio.play('click');
        }),
      );
      m.querySelector('[data-next]')?.addEventListener('click', () => this.startLevel(this.levelIdx + 1));
      m.querySelector('[data-title]')?.addEventListener('click', () => this.showTitle());
      m.querySelector('[data-replay]')!.addEventListener('click', () => {
        this.screen = 'play';
        this.closeModal();
        this.world.resetRun();
        this.syncViews();
        this.refreshHud();
      });
    });
  }

  // ======================= camera =======================

  homePose(): { dist: number; target: THREE.Vector3 } {
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    const dist = aspect < 0.8 ? 46 : aspect < 1.2 ? 29 : aspect < 1.6 ? 25 : 23;
    return { dist, target: new THREE.Vector3(0, 0, 0.8) };
  }

  cameraHome(instant = false, dur = 0.8): void {
    const { dist, target } = this.homePose();
    const pos = target.clone().add(new THREE.Vector3(0, dist * 0.74, dist * 0.68));
    if (instant) {
      this.controls.target.copy(target);
      this.camera.position.copy(pos);
      this.controls.update();
    } else this.camTween = { from: this.controls.target.clone(), to: target, fromPos: this.camera.position.clone(), toPos: pos, t: 0, dur };
  }

  flyTo(target: THREE.Vector3, dist: number, dur: number): void {
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.camTween = { from: this.controls.target.clone(), to: target.clone(), fromPos: this.camera.position.clone(), toPos: target.clone().addScaledVector(dir, dist), t: 0, dur };
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 55 : 42;
    this.camera.updateProjectionMatrix();
  }

  // ======================= mascot =======================

  addMascot(): void {
    const inst = instance('engineer', 1.25);
    if (!inst) return;
    const root = new THREE.Group();
    root.add(inst);
    const mixer = new THREE.AnimationMixer(inst);
    const clip = clips('engineer').find((c) => c.name === 'cheer');
    const cheer = clip ? mixer.clipAction(clip) : undefined;
    if (cheer) {
      cheer.setLoop(THREE.LoopOnce, 1);
      cheer.clampWhenFinished = false;
    }
    const bones: Record<string, THREE.Bone> = {};
    inst.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones[o.name.replace('mixamorig:', '').replace('mixamorig', '')] = o as THREE.Bone;
    });
    // a little brass platform with a lever
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.78, 0.18, 10), MAT.brass);
    plat.position.y = -0.09;
    plat.receiveShadow = true;
    root.add(plat);
    this.mascot = { root, mixer, cheer, bones, react: 0, mood: 'idle' };
    // keep rest rotations for the procedural idle pose
    for (const b of Object.values(bones)) b.userData.rest = b.quaternion.clone();
    this.scene.add(root);
    this.placeMascot();
  }

  placeMascot(): void {
    if (!this.mascot) return;
    // find a free land hex near the front-right of the board
    let best: Hex | null = null;
    let bestScore = -Infinity;
    for (const t of this.world.tiles.values()) {
      if (t.water || this.world.nodeAt(t)) continue;
      const { x, z } = hexToWorld(t.q, t.r);
      const score = z * 1.0 + x * 0.6 - Math.abs(Math.hypot(x, z) - BOARD_RADIUS * 1.3) * 0.8;
      if (score > bestScore && Math.hypot(x, z) < BOARD_RADIUS * 1.55) {
        bestScore = score;
        best = t;
      }
    }
    if (!best) return;
    this.mascot.root.position.copy(this.nodePos(best)).add(new THREE.Vector3(0, 0.18, 0));
    this.mascot.root.rotation.y = -0.5;
    this.mascot.root.userData.hex = hexKey(best.q, best.r);
  }

  mascotReact(mood: 'cheer' | 'facepalm'): void {
    const m = this.mascot;
    if (!m || (m.mood !== 'idle' && m.react > 0.5)) return;
    m.mood = mood;
    m.react = mood === 'cheer' ? 3.2 : 2.2;
    if (mood === 'cheer' && m.cheer) {
      m.cheer.reset();
      m.cheer.time = 1.0;
      m.cheer.timeScale = 1.3;
      m.cheer.play();
    } else m.cheer?.stop();
  }

  private animateMascot(dt: number): void {
    const m = this.mascot;
    if (!m) return;
    m.react = Math.max(0, m.react - dt);
    if (m.react <= 0 && m.mood !== 'idle') {
      m.mood = 'idle';
      m.cheer?.stop();
    }
    if (m.mood === 'cheer' && m.cheer?.isRunning()) {
      m.mixer.update(dt);
      return;
    }
    // procedural pose on top of the bind (T) pose: arms down, breathing, facepalm
    const t = this.visualT;
    const set = (name: string, x: number, y: number, z: number) => {
      const b = m.bones[name];
      if (!b) return;
      const rest = b.userData.rest as THREE.Quaternion;
      b.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
    };
    const fp = m.mood === 'facepalm' ? Math.min(1, (2.2 - m.react) * 4) * Math.min(1, m.react * 3) : 0;
    set('LeftArm', 0, 0, 1.2 + Math.sin(t * 1.6) * 0.03);
    set('RightArm', -fp * 0.9, fp * 0.2, -1.2 - Math.sin(t * 1.6) * 0.03 + fp * 0.55);
    set('RightForeArm', 0, -fp * 2.2, 0);
    set('Spine', 0.02 * Math.sin(t * 1.6) + fp * 0.25, 0, 0);
    set('Head', fp * 0.35, Math.sin(t * 0.5) * 0.15 * (1 - fp), 0);
  }

  // ======================= machine icons =======================

  makeIcons(): void {
    const W = 192;
    const H = 144;
    const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight('#fff6e0', '#8a6a4a', 1.6));
    const d = new THREE.DirectionalLight('#fff', 2.4);
    d.position.set(3, 5, 4);
    sc.add(d);
    const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
    const buf = new Uint8Array(W * H * 4);
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d')!;
    for (const t of Object.keys(STATIONS) as StationType[]) {
      const v = buildStation(t, STATIONS[t].outputs.map((o) => o.id));
      const mm = STATION_MODEL[t];
      const inst = mm ? instance(mm[0], mm[1]) : null;
      if (inst) {
        v.body.visible = false;
        v.group.add(inst);
      }
      for (const p of Object.values(v.ports)) p.visible = false;
      v.anim(0.016, 1.3, { busy: true, stalled: false, intensity: 0.8, stillTemp: 100 });
      sc.add(v.group);
      const box = new THREE.Box3().setFromObject(v.body.visible ? v.body : v.group);
      const c = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      cam.position.set(c.x + size * 0.62, c.y + size * 0.42, c.z + size * 0.95);
      cam.lookAt(c);
      this.renderer.setRenderTarget(rt);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear();
      this.renderer.render(sc, cam);
      this.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
      this.renderer.setRenderTarget(null);
      const img = ctx.createImageData(W, H);
      for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      ctx.clearRect(0, 0, W, H);
      ctx.putImageData(img, 0, 0);
      this.icons[t] = cv.toDataURL('image/png');
      sc.remove(v.group);
    }
    this.renderer.setClearColor(0x000000, 1);
    rt.dispose();
  }

  // ======================= frame =======================

  private frame(): void {
    requestAnimationFrame(() => this.frame());
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.fpsAcc.frames++;
    this.fpsAcc.time += dt;
    if (this.fpsAcc.time > 1) {
      this.fpsAcc.fps = this.fpsAcc.frames / this.fpsAcc.time;
      this.fpsAcc.frames = 0;
      this.fpsAcc.time = 0;
    }
    // under automation (advanceTime) the page only advances when told to
    if (this.testMode) return;
    if (this.screen === 'play') this.world.advance(dt);
    this.tick(dt);
  }

  /** visual update + render (sim already advanced) */
  tick(dt: number, render = true): void {
    this.visualT += dt;
    const w = this.world;
    if (!w) return;
    if (w.events.length) {
      const evs = w.events;
      w.events = [];
      this.handleEvents(evs);
      this.refreshHud();
    }
    if (this.screen === 'title') {
      // slow cinematic orbit
      const a = this.visualT * 0.05;
      const r = 24;
      this.camera.position.set(Math.sin(a) * r, 15, Math.cos(a) * r);
      this.controls.target.set(0, 0, 0);
    }
    if (this.camTween) {
      const tw = this.camTween;
      tw.t += dt;
      const k = THREE.MathUtils.smootherstep(Math.min(1, tw.t / tw.dur), 0, 1);
      this.controls.target.lerpVectors(tw.from, tw.to, k);
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      if (tw.t >= tw.dur) this.camTween = null;
    }
    // keep the camera over the valley
    const tg = this.controls.target;
    const lim = 12;
    if (tg.length() > lim) {
      const over = tg.clone().setLength(tg.length() - lim);
      tg.sub(over);
      this.camera.position.sub(over);
    }
    this.controls.update();
    const dayF = w.t / w.level.dayLength;
    this.env.setDayFraction(this.screen === 'title' ? 0.3 : dayF);
    const dial = document.getElementById('dial');
    if (dial && Math.floor(this.visualT * 4) !== Math.floor((this.visualT - dt) * 4)) dial.innerHTML = sundialSvg(dayF);
    this.terrain?.update(this.visualT);

    // node animations
    for (const [id, v] of this.nodeViews) {
      const n = w.nodes.get(id);
      if (!n) continue;
      if (v.group.scale.x < NODE_SCALE) v.group.scale.setScalar(Math.min(NODE_SCALE, v.group.scale.x + dt * 5 * (NODE_SCALE + 0.2 - v.group.scale.x) + 0.01));
      const busy = !!n.proc;
      const intensity = n.kind === 'station' ? Math.min(1, (n.inQueue.length + (n.proc ? 1 : 0) + total(n.vat) / 20) / 2) : n.buffer.length / 5;
      const fill = n.kind === 'customer' && n.spec?.quota ? Math.min(1, n.delivered / n.spec.quota) : 0;
      const stalled = Object.values(n.outBuf).some((b) => b.length >= 3);
      v.anim(dt * (w.state === 'running' ? 1 : 0.25), this.visualT, { busy: busy && w.state === 'running', stalled, intensity, stillTemp: n.cfg.stillTemp, fill });
      // waiting packets visible at sources (backlog piles up at the outlet)
      if (n.kind === 'station' && busy && w.state === 'running' && n.station === 'pan' && Math.random() < dt * 4) this.fx.steam(v.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 1);
      if (n.kind === 'station' && n.station === 'still' && busy && w.state === 'running' && Math.random() < dt * 3) this.fx.steam(v.group.position.clone().add(new THREE.Vector3(0.2, 1.9, 0)), 1);
      if (n.kind === 'customer' && n.spec?.look === 'foundry' && Math.random() < dt * 0.8) this.fx.steam(v.group.position.clone().add(new THREE.Vector3(0.4, 2.0, -0.25)), 1);
    }
    // valid targets pulse
    for (const r of this.targetRings.values()) r.scale.setScalar(1 + Math.sin(this.visualT * 6) * 0.06);

    // particles: pipes, source backlog, station queues
    this.field.begin();
    for (const p of w.pipes.values()) {
      const pv = this.pipeViews.get(p.id);
      if (pv) drawPipePackets(this.field, pv, p, this.visualT);
    }
    for (const n of w.nodes.values()) {
      const v = this.nodeViews.get(n.id);
      if (!v || !n.visible) continue;
      const base = n.kind === 'source' ? v.ports.out?.getWorldPosition(new THREE.Vector3()) : null;
      if (base) {
        n.buffer.forEach((pk, i) => {
          const pos = base.clone().add(new THREE.Vector3(-0.2 - (i % 3) * 0.25, 0.05 + Math.floor(i / 3) * 0.25, 0.2));
          for (const u of units(pk.comp).slice(0, 3)) this.field.put(u, pos.clone().add(new THREE.Vector3(Math.random() * 0.02, 0, 0)), pk.id + u.length, this.visualT, 1.1);
        });
      }
      if (n.kind === 'station') {
        // stuck outlets show their pile
        for (const [port, buf] of Object.entries(n.outBuf)) {
          if (!buf.length || w.pipeFrom(n.id, port)) continue;
          const pp = v.ports[port].getWorldPosition(new THREE.Vector3());
          buf.forEach((pk, i) => units(pk.comp).slice(0, 2).forEach((u, k) => this.field.put(u, pp.clone().add(new THREE.Vector3((i - 1) * 0.18, -0.25 + k * 0.15, 0.15)), pk.id + k, this.visualT, 1.1)));
        }
      }
    }
    this.fx.update(dt, this.visualT, this.field);
    this.field.end();
    audio.setFlow(w.state === 'running' ? Math.min(1, w.pipes.size / 8) : 0);

    this.animateMascot(dt);
    if (!render) return;
    this.updateLabels();

    // render
    const shakeOff = new THREE.Vector3();
    if (this.shake > 0 && !this.reduced) {
      shakeOff.set((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      this.camera.position.add(shakeOff);
    }
    this.shake = Math.max(0, this.shake - dt * 1.5);
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    this.renderer.setViewport(0, 0, cw, ch);
    this.renderer.render(this.scene, this.camera);
    this.camera.position.sub(shakeOff);
    if (this.lensEl) {
      const view = this.lensEl.querySelector('#lens-view');
      if (view) {
        this.lens.update(dt, this.visualT);
        this.lens.render(this.renderer, view.getBoundingClientRect(), ch);
        this.renderer.setViewport(0, 0, cw, ch);
      }
    }
  }

  // ======================= test API =======================

  private exposeTestApi(): void {
    const g = this;
    const win = window as unknown as Record<string, unknown>;
    win.render_game_to_text = () => JSON.stringify(g.textState());
    win.advanceTime = (ms: number) => {
      g.testMode = true;
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps; i++) {
        if (g.screen === 'play') g.world.advance(1 / 60);
        g.tick(1 / 60, i === steps - 1);
      }
      return g.world.t;
    };
    // locating helpers for automation (read-only: screen coordinates of things)
    win.cf = {
      screenOfNode: (id: string) => {
        const v = g.nodeViews.get(id);
        return v ? g.project(v.group.position.clone().add(new THREE.Vector3(0, 0.6, 0))) : null;
      },
      screenOfPort: (id: string, port: string) => {
        const v = g.nodeViews.get(id);
        return v?.ports[port] ? g.project(v.ports[port].getWorldPosition(new THREE.Vector3())) : null;
      },
      screenOfHex: (q: number, r: number) => g.project(g.nodePos({ q, r })),
      screenOfPipe: (id: string) => {
        const p = g.pipeViews.get(id);
        return p ? g.project(p.curve.getPointAt(0.5)) : null;
      },
      fps: () => g.fpsAcc.fps,
      pickAt: (x: number, y: number) => {
        g.setPointer(x, y);
        return { hit: g.pick(), hex: g.pickHex() };
      },
      log: () => sessionLog(),
    };
  }

  textState(): Record<string, unknown> {
    const w = this.world;
    if (!w) return { screen: this.screen };
    const comp = (c: Comp) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, +(v as number).toFixed(2)]));
    return {
      coords: 'axial hex (q,r); pointy-top; +r is toward the default camera (south)',
      screen: this.screen,
      level: { id: w.level.id, title: w.level.he, index: w.level.index, noHints: !!w.level.noHints },
      state: w.state,
      pauseReason: w.pauseReason,
      time: +w.t.toFixed(2),
      dayLength: w.level.dayLength,
      speed: w.speed,
      objective: 'Fill every customer quota with pure deliveries before dusk; do not let a source overflow.',
      inventory: Object.fromEntries(Object.entries(w.inventory).filter(([, v]) => v > 0)),
      pipe: { used: w.pipeUsed(), budget: w.level.pipeBudget },
      nodes: [...w.nodes.values()].filter((n) => n.visible).map((n) => {
        const base: Record<string, unknown> = { id: n.id, kind: n.kind, he: n.he, q: n.q, r: n.r };
        if (n.kind === 'source' || n.kind === 'lens') Object.assign(base, { stream: comp(n.spec!.packet!), tag: n.tag ?? null, tagAttempts: n.tagAttempts, backlog: n.buffer.length, overflow: +n.overflow.toFixed(2), connected: !!w.pipeFrom(n.id, 'out') });
        if (n.kind === 'station') Object.assign(base, { station: n.station, temp: n.cfg.stillTemp, queue: n.inQueue.length, processing: !!n.proc, outputs: Object.fromEntries(Object.entries(n.outBuf).map(([p, b]) => [p, { waiting: b.length, connected: !!w.pipeFrom(n.id, p) }])), lastNote: n.lastNote ?? null, vapor: +n.vapor.toFixed(2) });
        if (n.kind === 'customer') Object.assign(base, { wants: n.spec!.required, allowed: n.spec!.allowed ?? [], delivered: +n.delivered.toFixed(2), quota: n.spec!.quota, accepted: n.accepted, rejected: n.rejected, lastReject: n.lastReject ? rejectionHe(n.spec!, n.lastReject) : null });
        if (n.kind === 'waste') Object.assign(base, { received: +n.delivered.toFixed(2) });
        return base;
      }),
      pipes: [...w.pipes.values()].map((p) => ({ id: p.id, from: p.from, port: p.fromPort, to: p.to, length: p.length, packets: p.packets.length, head: p.packets[0] ? comp(p.packets[0].comp) : null })),
      ui: { mode: this.mode.kind, selected: this.sel, lens: this.lensTarget ? { target: this.lensTarget, classTruthHidden: true } : null, modal: !!document.getElementById('modal'), hintsUsed: this.hintsUsed, tutorialStep: this.tutorialStep },
      result: w.state === 'won' ? { won: true, stars: w.stars() } : w.state === 'failed' ? { won: false, reason: w.failReason } : null,
    };
  }
}

interface Hit {
  kind: 'port' | 'node' | 'pipe';
  id: string;
  port?: string;
}

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
    'ethanol<water': 'ב-100°C גם המים רותחים. כוונו את מתקן הזיקוק ל-78°C — רק הכוהל יתאדה.',
    'pigmentBlue<pigmentYellow': 'באידוי שני הצבענים נשארים יחד. בכרומטוגרפיה כל צבען זז במהירות אחרת על הנייר.',
    'sugar<water': 'הסוכר עדיין מומס במים. אידוי משאיר אותו יבש.',
  };
  return m[key] ?? `יש שם ${impurity ? sub(impurity).he : 'עוד משהו'}. איזו תכונה שונה בין ${sub(want).he} ל${impurity ? sub(impurity).he : 'שאר הרכיבים'}?`;
}

export function classIconFor(c: Comp): string {
  return CLASS_ICON[classify(c)];
}
