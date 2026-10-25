// Clean Flow v2 — pipe puzzles. Rules live in src/puzzle/engine.ts (pure); this file renders and plays them.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { outletPorts, runPuzzle, shapeFor, type PCustomer, type PNode, type PSocket, type PSource, type Placement, type Puzzle, type RunResult, type SocketShape } from '../puzzle/engine';
import { PUZZLES } from '../puzzle/levels';
import { CLASS_HE, classify, total, units, type Comp, type MatterClass } from '../sim/mixture';
import { STATIONS, type StationType, type StillTemp } from '../sim/stations';
import { sub } from '../sim/substances';
import { rejectionHe } from '../sim/world';
import { Fx } from '../render/fx';
import { Lens } from '../render/lens';
import { buildCustomer, buildSource, buildStation, buildWaste } from '../render/machines';
import { MAT } from '../render/materials';
import { clips, instance, loadModels, type ModelName } from '../render/models';
import { shapeSvg } from '../render/particleGeo';
import { ParticleField, particleUnits } from '../render/pipes';
import { CLASS_ICON, ICONS, distributionHe, el, f, legendHtml } from '../ui/hud';
import { audio } from '../game/audio';
import { NOTE_HE, workedExplanation } from '../game/explain';
import { logEvent, sessionLog } from '../game/log';
import { BX, BZ, PIPE_R, PIPE_Y, buildIsland, palms, pipeRoute, toWorld } from './board';
import { MapScene } from './map';

const MACHINE_MODEL: Record<StationType, ModelName> = {
  magnet: 'magnet-drum', filter: 'filter-press', still: 'still', pan: 'evap-pan', tank: 'tank', funnel: 'funnel', chroma: 'chroma-tower', sieve: 'sieve',
};
const MACHINE_WIDTH: Record<StationType, number> = { magnet: 1.75, filter: 1.25, still: 1.9, pan: 1.75, tank: 1.6, funnel: 1.0, chroma: 1.0, sieve: 1.4 };
const SOURCE_TINT: Record<string, string> = { spring: '#4fc3e8', pond: '#9fe3ff', marsh: '#a59a72', well: '#ffc1dc', creek: '#3aa7e0', spill: '#f2b63a', ink: '#3f9a52', vat: '#c9b6ff', mine: '#59606b', blackmine: '#2b2a33', crate: '#d6a84c' };

const GLASS = new THREE.MeshPhysicalMaterial({ color: '#f2fdff', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.2, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.6, side: THREE.DoubleSide });
const HOUSE_TINT: Partial<Record<string, string>> = { clinic: '#e6fff0', soap: '#dcefff', candy: '#ffe1ef', print: '#e3e9ff', perfume: '#eee2ff', dye: '#d6f0ff', pickle: '#efffd2', fertilizer: '#fff3c6', lab: '#e9eef2', village: '#fff6ea' };
const STEP = 1.6; // seconds per stage of the flow show (speed ×1)
const TRAVEL = 1.45; // seconds for a packet to cross a pipe
const SPAWN = 0.24; // seconds between packets in a stream
const PKEY = 'cleanflow.v2.progress';

type Screen = 'loading' | 'map' | 'level';
type Phase = 'build' | 'run' | 'done';

interface SocketView {
  node: PSocket;
  group: THREE.Group;
  ring: THREE.Mesh;
  plus: THREE.Group;
  machine: THREE.Object3D | null;
  spin: number; // flip animation
  hit: THREE.Mesh;
}

interface NodeViewV2 {
  node: PNode;
  group: THREE.Group;
  hit: THREE.Mesh;
  /** world point where pipes leave / enter */
  outAt: (outlet: 'out' | 'a' | 'b') => THREE.Vector3;
  inAt: THREE.Vector3;
  labelY: number;
}

interface PipeViewV2 {
  idx: number;
  curve: THREE.CatmullRomCurve3;
  mesh: THREE.Mesh;
  length: number;
}

interface RunState {
  result: RunResult;
  t: number;
  speed: number;
  pipeStart: number[];
  socketStart: Record<string, number>;
  arrival: Record<string, number>;
  end: number;
  fired: Set<string>;
}

interface Bubble {
  el: HTMLElement;
  pos: THREE.Vector3;
  until: number;
}

function loadProgress(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(PKEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}
function saveProgress(p: Record<string, number>): void {
  try {
    localStorage.setItem(PKEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export class PuzzleGame {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
  field: ParticleField;
  fx: Fx;
  lens = new Lens();
  sun: THREE.DirectionalLight;
  levelRoot = new THREE.Group();
  map: MapScene;
  screen: Screen = 'loading';
  phase: Phase = 'build';
  pz: Puzzle = PUZZLES[0];
  levelIdx = 0;
  placements: Record<string, Placement & { card: number }> = {};
  nodeViews = new Map<string, NodeViewV2>();
  socketViews = new Map<string, SocketView>();
  pipeViews: PipeViewV2[] = [];
  run: RunState | null = null;
  lastResult: RunResult | null = null;
  failedRuns = 0;
  hintsUsed = 0;
  hintIdx = 0;
  scans: Record<string, { first?: boolean; tag?: MatterClass }> = {};
  progress = loadProgress();
  selectedCard: number | null = null;
  drag: { card: number; fromSocket?: string; ghost: THREE.Object3D; moved: boolean; x: number; y: number } | null = null;
  popSocket: string | null = null;
  scanSource: string | null = null;
  visualT = 0;
  testMode = false;
  reduced = false;
  bubbles: Bubble[] = [];
  icons: Partial<Record<StationType, string>> = {};
  mascot: { root: THREE.Object3D; mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction>; current: string } | null = null;
  camBase = { pos: new THREE.Vector3(0, 14, 13), target: new THREE.Vector3() };
  private parallax = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private lastFrame = performance.now();
  private fpsAcc = { frames: 0, time: 0, fps: 0 };
  private ui = document.getElementById('ui')!;
  private wl = document.getElementById('world-labels')!;
  private labels = new Map<string, HTMLElement>();
  private branchTags: HTMLElement[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.22;
    this.scene.add(new THREE.HemisphereLight('#ffe9cf', '#b0603a', 0.85));
    this.sun = new THREE.DirectionalLight('#ffe2bb', 2.5);
    this.sun.position.set(8, 16, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(this.levelRoot);
    this.field = new ParticleField(this.scene, 4.3);
    this.fx = new Fx(this.scene);
    this.map = new MapScene(this);
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    canvas.addEventListener('webglcontextrestored', () => location.reload());
    this.exposeTestApi();
    requestAnimationFrame(() => this.frame());
  }

  async boot(): Promise<void> {
    this.ui.innerHTML = `<div id="loading"><h1>זרם נקי</h1><div class="bar"><i id="loadp"></i></div></div>`;
    await loadModels((d, t) => {
      const p = document.getElementById('loadp');
      if (p) p.style.width = `${(d / t) * 100}%`;
    });
    this.makeIcons();
    this.addMascot();
    this.showMap();
  }

  // ======================= screens =======================

  unlocked(i: number): boolean {
    return i === 0 || (this.progress[PUZZLES[i - 1].id] ?? 0) > 0;
  }

  showMap(): void {
    this.screen = 'map';
    this.closeScan();
    this.clearLevel();
    this.levelRoot.visible = false;
    if (this.mascot) this.mascot.root.visible = false;
    this.map.show();
    const stars = PUZZLES.reduce((a, p) => a + (this.progress[p.id] ?? 0), 0);
    this.ui.innerHTML = `
      <div id="tl"><button class="rbtn" id="b-sound" aria-label="צליל">${audio.muted ? ICONS.mute : ICONS.sound}</button><button class="rbtn" id="b-motion" aria-label="הפחתת תנועה">${ICONS.motion}</button></div>
      <div id="plaque" class="plaque map"><div class="name">זרם נקי</div><div class="sum">⭐ <bdi>${stars}/${PUZZLES.length * 3}</bdi></div></div>
      <div id="map-hint" class="pill">בחרו שלב · גררו מכונות לשקעים הזוהרים · ▶ הפעילו זרימה</div>`;
    document.getElementById('b-sound')!.addEventListener('click', () => {
      audio.unlock();
      audio.setMuted(!audio.muted);
      this.showMap();
    });
    document.getElementById('b-motion')!.addEventListener('click', () => {
      this.reduced = !this.reduced;
      this.fx.reduced = this.reduced;
      this.lens.reduced = this.reduced;
      document.body.classList.toggle('reduced', this.reduced);
      document.getElementById('b-motion')!.classList.toggle('on', this.reduced);
    });
    this.map.buildLabels();
  }

  startLevel(i: number): void {
    audio.unlock();
    this.levelIdx = i;
    this.pz = PUZZLES[i];
    this.screen = 'level';
    this.map.hide();
    this.levelRoot.visible = true;
    this.placements = {};
    this.failedRuns = 0;
    this.hintsUsed = 0;
    this.hintIdx = 0;
    this.scans = {};
    this.selectedCard = null;
    this.run = null;
    this.lastResult = null;
    this.phase = 'build';
    this.buildLevel();
    this.buildHud();
    this.say(this.pz.intro, 6);
    logEvent({ level: this.pz.id, action: 'run', values: { start: true }, hintsUsed: 0, run: 0 });
    if (this.pz.tutorial) window.setTimeout(() => this.tutorialHand(), 900);
  }

  // ======================= level build =======================

  clearLevel(): void {
    this.levelRoot.clear();
    this.nodeViews.clear();
    this.socketViews.clear();
    this.pipeViews = [];
    this.wl.innerHTML = '';
    this.labels.clear();
    this.branchTags = [];
    this.bubbles = [];
  }

  buildLevel(): void {
    this.clearLevel();
    const pz = this.pz;
    // island bounds from the nodes
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const n of pz.nodes) {
      const p = toWorld(n.x, n.z);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    const island = buildIsland(minX - 2.4, maxX + 2.6, minZ - 2.0, maxZ + 2.0, pz.index * 13 + 5);
    this.levelRoot.add(island.group);
    // a couple of palms in empty spots
    const palmPts = [new THREE.Vector3(maxX + 1.3, 0.1, minZ - 1.0), new THREE.Vector3((minX + maxX) / 2 + 1.2, 0.1, minZ - 1.3), new THREE.Vector3(minX - 1.2, 0.1, maxZ + 0.6)];
    this.levelRoot.add(palms(palmPts, pz.index));
    // nodes
    for (const n of pz.nodes) {
      if (n.kind === 'socket') this.makeSocket(n);
      else this.makeNode(n);
    }
    // pipes
    pz.pipes.forEach((p, idx) => {
      const a = this.outPoint(p.from, p.outlet);
      const b = this.inPoint(p.to);
      const curve = pipeRoute(a, b);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(40, Math.floor(curve.getLength() * 14)), PIPE_R, 16, false), GLASS);
      mesh.renderOrder = 2;
      const g = new THREE.Group();
      g.add(mesh);
      // brass couplers at both ends and along long runs
      const len = curve.getLength();
      const n = Math.max(1, Math.round(len / 2.4));
      for (let i = 0; i <= n; i++) {
        const u = i === 0 ? 0.02 : i === n ? 0.98 : i / n;
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_R + 0.07, PIPE_R + 0.07, 0.22, 20, 1, true), MAT.brass);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(PIPE_R + 0.07, 0.04, 8, 20), MAT.brass);
        const holder = new THREE.Group();
        holder.add(ring);
        lip.rotation.x = Math.PI / 2;
        holder.add(lip);
        holder.position.copy(curve.getPointAt(u));
        holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangentAt(u));
        g.add(holder);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, PIPE_Y, 0.1), MAT.wood);
        post.position.copy(curve.getPointAt(u)).setY(PIPE_Y / 2);
        post.castShadow = true;
        if (i > 0 && i < n) g.add(post);
      }
      this.levelRoot.add(g);
      this.pipeViews.push({ idx, curve, mesh, length: len });
    });
    this.makeLabels();
    this.placeMascot(maxX + 1.6, maxZ + 1.0);
    this.frameCamera(minX - 2.6, maxX + 2.8, minZ - 2.2, maxZ + 2.2);
  }

  outPoint(id: string, outlet: 'out' | 'a' | 'b'): THREE.Vector3 {
    const s = this.socketViews.get(id);
    if (s) {
      const c = toWorld(s.node.x, s.node.z, PIPE_Y);
      if (s.node.shape === 'inline') return c.add(new THREE.Vector3(-0.85, 0, 0));
      return c.add(new THREE.Vector3(-0.85, 0, outlet === 'a' ? -0.32 : 0.32));
    }
    return this.nodeViews.get(id)!.outAt(outlet);
  }

  inPoint(id: string): THREE.Vector3 {
    const s = this.socketViews.get(id);
    if (s) return toWorld(s.node.x, s.node.z, PIPE_Y).add(new THREE.Vector3(0.85, 0, 0));
    return this.nodeViews.get(id)!.inAt.clone();
  }

  makeNode(n: PNode): void {
    const g = new THREE.Group();
    const p = toWorld(n.x, n.z, 0.1);
    g.position.copy(p);
    let labelY = 2.3;
    if (n.kind === 'source') {
      const model = n.look === 'mine' || n.look === 'blackmine' ? instance('mine', 2.4) : n.look === 'spring' ? instance('reservoir', 1.9) : null;
      if (model) {
        model.rotation.y = n.look === 'mine' || n.look === 'blackmine' ? -Math.PI / 2 : 0;
        if (n.look === 'blackmine') model.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.material = (m.material as THREE.MeshStandardMaterial).clone();
            (m.material as THREE.MeshStandardMaterial).color.set('#5a5058');
          }
        });
        g.add(model);
      } else {
        const v = buildSource(n.look, SOURCE_TINT[n.look] ?? '#888');
        v.group.scale.setScalar(1.6);
        g.add(v.group);
        const anim = v.anim;
        g.userData.anim = anim;
      }
    } else if (n.kind === 'customer') {
      const m: ModelName | null = n.look === 'foundry' ? 'foundry' : n.look === 'bakery' ? 'bakery' : 'customer-house';
      const crowded = this.pz.nodes.filter((x) => x.kind === 'customer').length > 3;
      const model = instance(m, (m === 'customer-house' ? 2.3 : 2.6) * (crowded ? 0.85 : 1));
      if (model) {
        model.rotation.y = Math.PI / 2; // door faces the incoming pipe (east)
        const tint = HOUSE_TINT[n.look];
        if (m === 'customer-house' && tint) {
          model.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.material = (mesh.material as THREE.MeshStandardMaterial).clone();
              (mesh.material as THREE.MeshStandardMaterial).color.set(tint);
            }
          });
        }
        g.add(model);
        if (m === 'customer-house') {
          // a little prop in the customer's colour so houses read differently
          const v = buildCustomer(n.look);
          const house = v.body.children.find((c) => c.userData.isHouse);
          if (house) house.visible = false;
          v.body.children.forEach((c) => {
            if (c !== house && c.type === 'Mesh' && (c as THREE.Mesh).geometry.type === 'BoxGeometry') c.visible = false;
          });
          v.group.scale.setScalar(1.3);
          v.group.position.set(0, 0, 0.9);
          g.add(v.group);
          g.userData.anim = v.anim;
        }
      } else {
        const v = buildCustomer(n.look);
        v.group.scale.setScalar(1.5);
        g.add(v.group);
      }
      labelY = 2.4;
    } else if (n.kind === 'drain') {
      const v = buildWaste();
      v.group.scale.setScalar(1.5);
      g.add(v.group);
      g.userData.anim = v.anim;
      labelY = 1.4;
    }
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.4, 10), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 1.2;
    hit.userData.nodeId = n.id;
    g.add(hit);
    this.levelRoot.add(g);
    const view: NodeViewV2 = {
      node: n,
      group: g,
      hit,
      labelY,
      outAt: () => toWorld(n.x, n.z, PIPE_Y).add(new THREE.Vector3(-1.15, 0, 0)),
      inAt: toWorld(n.x, n.z, PIPE_Y).add(new THREE.Vector3(1.05, 0, 0)),
    };
    this.nodeViews.set(n.id, view);
  }

  makeSocket(n: PSocket): void {
    const g = new THREE.Group();
    g.position.copy(toWorld(n.x, n.z, 0.1));
    const fork = n.shape === 'fork';
    const base = new THREE.Mesh(fork ? new THREE.CylinderGeometry(0.95, 1.02, 0.26, 6) : new THREE.CylinderGeometry(0.85, 0.92, 0.26, 32), MAT.brass);
    if (fork) base.rotation.y = Math.PI / 6;
    base.position.y = 0.13;
    base.receiveShadow = true;
    const top = new THREE.Mesh(fork ? new THREE.CylinderGeometry(0.78, 0.78, 0.04, 6) : new THREE.CylinderGeometry(0.7, 0.7, 0.04, 32), new THREE.MeshStandardMaterial({ color: '#1f6f6a', emissive: '#2fd1c4', emissiveIntensity: 0.55, roughness: 0.4 }));
    if (fork) top.rotation.y = Math.PI / 6;
    top.position.y = 0.28;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(fork ? 1.05 : 0.95, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: '#7ff5e8', transparent: true, opacity: 0.8 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    const plus = new THREE.Group();
    const barMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    plus.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.15), barMat), new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.62), barMat));
    plus.position.y = 0.33;
    // a small "Y" emblem on fork sockets, a dot on inline ones: the shape tells which cards fit
    const emblem = new THREE.Group();
    if (fork) {
      const em = new THREE.MeshBasicMaterial({ color: '#ffe6a8' });
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.07), em);
      s1.position.set(0.55, 0.31, 0);
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.07), em);
      s2.position.set(-0.5, 0.31, -0.18);
      s2.rotation.y = 0.6;
      const s3 = s2.clone();
      s3.position.z = 0.18;
      s3.rotation.y = -0.6;
      emblem.add(s1, s2, s3);
    }
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 12), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 1.0;
    hit.userData.socketId = n.id;
    g.add(base, top, ring, plus, emblem, hit);
    this.levelRoot.add(g);
    this.socketViews.set(n.id, { node: n, group: g, ring, plus, machine: null, spin: 0, hit });
  }

  machineObject(type: StationType): THREE.Object3D {
    const inst = instance(MACHINE_MODEL[type], MACHINE_WIDTH[type]);
    if (inst) return inst;
    const v = buildStation(type, STATIONS[type].outputs.map((o) => o.id));
    for (const p of Object.values(v.ports)) p.visible = false;
    v.group.scale.setScalar(1.3);
    return v.group;
  }

  // ======================= placement =======================

  cardFree(i: number): boolean {
    return !Object.values(this.placements).some((p) => p.card === i);
  }

  place(socketId: string, card: number): boolean {
    if (this.phase === 'run') return false;
    const type = this.pz.tray[card];
    const sv = this.socketViews.get(socketId)!;
    if (shapeFor(type) !== sv.node.shape) {
      this.toast(sv.node.shape === 'fork' ? 'השקע הזה מתפצל לשניים — הוא צריך מכונה עם שתי יציאות' : 'השקע הזה עגול — הוא צריך מכונה עם יציאה אחת (אגן אידוי / מיכל המסה)');
      audio.play('wrongstamp');
      this.shakeSocket(socketId);
      return false;
    }
    // move away from a previous socket; swap out whatever was here
    for (const [sid, p] of Object.entries(this.placements)) if (p.card === card) this.unplace(sid, false);
    if (this.placements[socketId]) this.unplace(socketId, false);
    this.placements[socketId] = { type, flipped: false, temp: type === 'still' ? 100 : undefined, card };
    const obj = this.machineObject(type);
    obj.scale.multiplyScalar(0.01);
    obj.userData.grow = 1;
    obj.position.y = 0.3;
    sv.group.add(obj);
    sv.machine = obj;
    sv.plus.visible = false;
    this.fx.dust(sv.group.position.clone().add(new THREE.Vector3(0, 0.4, 0)), '#f2d3a0', 10);
    audio.play('place');
    this.afterBuildChange();
    logEvent({ level: this.pz.id, action: 'place', values: { socket: socketId, type }, hintsUsed: this.hintsUsed, run: this.failedRuns });
    return true;
  }

  unplace(socketId: string, sound = true): void {
    const sv = this.socketViews.get(socketId)!;
    if (sv.machine) sv.group.remove(sv.machine);
    sv.machine = null;
    sv.plus.visible = true;
    delete this.placements[socketId];
    if (sound) {
      audio.play('whoosh');
      logEvent({ level: this.pz.id, action: 'remove', values: { socket: socketId }, hintsUsed: this.hintsUsed, run: this.failedRuns });
    }
    this.afterBuildChange();
  }

  flip(socketId: string): void {
    const p = this.placements[socketId];
    const sv = this.socketViews.get(socketId)!;
    if (!p || sv.node.shape !== 'fork' || this.phase === 'run') return;
    p.flipped = !p.flipped;
    sv.spin = 1;
    audio.play('connect');
    logEvent({ level: this.pz.id, action: 'connect', values: { flip: socketId, flipped: p.flipped }, hintsUsed: this.hintsUsed, run: this.failedRuns });
    this.afterBuildChange();
  }

  setTemp(socketId: string, T: StillTemp): void {
    const p = this.placements[socketId];
    if (!p || p.type !== 'still') return;
    p.temp = T;
    audio.play('click');
    logEvent({ level: this.pz.id, action: 'still-temp', values: { socket: socketId, T }, hintsUsed: this.hintsUsed, run: this.failedRuns });
    this.afterBuildChange();
  }

  afterBuildChange(): void {
    if (this.phase === 'done') this.backToBuild();
    this.refreshTray();
    this.refreshBranchTags();
    this.openPopover(this.popSocket);
  }

  // ======================= HUD =======================

  buildHud(): void {
    const pz = this.pz;
    const stars = this.progress[pz.id] ?? 0;
    this.ui.innerHTML = `
      <div id="tl">
        <button class="rbtn" id="b-map" aria-label="מפה">${ICONS.menu}</button>
        ${pz.noHints ? '' : `<button class="rbtn" id="b-hint" aria-label="רמז">${ICONS.bulb}</button>`}
        <button class="rbtn" id="b-reset" aria-label="להתחיל מחדש">${ICONS.restart}</button>
      </div>
      <div id="plaque" class="plaque"><div class="name">${pz.subtitle.split('·')[0].trim()} · שלב ${f(pz.index)}</div><div class="title">${pz.he}</div><div class="stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}">★</span>`).join('')}</div></div>
      <div id="tray" role="toolbar" aria-label="מכונות"></div>
      <button id="play" aria-label="הפעל זרימה"><span class="ico">▶</span><span class="txt">הפעל זרימה</span></button>
      <div id="say" class="hidden"></div>
      <div id="toast" class="hidden"></div>`;
    document.getElementById('b-map')!.addEventListener('click', () => this.showMap());
    document.getElementById('b-hint')?.addEventListener('click', () => this.showHint());
    document.getElementById('b-reset')!.addEventListener('click', () => this.resetLevel());
    document.getElementById('play')!.addEventListener('click', () => this.onPlay());
    this.refreshTray();
  }

  refreshTray(): void {
    const tray = document.getElementById('tray');
    if (!tray) return;
    tray.innerHTML = this.pz.tray
      .map((t, i) => {
        const def = STATIONS[t];
        const free = this.cardFree(i);
        const shape = shapeFor(t);
        return `<button class="mcard ${free ? '' : 'used'} ${this.selectedCard === i ? 'sel' : ''} ${this.pz.newMachines.includes(t) ? 'new' : ''}" data-card="${i}" aria-label="${def.he}">
          ${this.icons[t] ? `<img alt="" src="${this.icons[t]}">` : ''}
          <span class="nm">${def.he}</span>
          <span class="shape ${shape}" title="${shape === 'fork' ? 'לשקע מתפצל' : 'לשקע עגול'}">${shape === 'fork' ? 'Y' : '●'}</span>
          ${this.pz.newMachines.includes(t) ? '<span class="newb">חדש</span>' : ''}</button>`;
      })
      .join('');
    tray.querySelectorAll<HTMLElement>('.mcard').forEach((c) => {
      c.addEventListener('pointerdown', (e) => this.cardDown(e, Number(c.dataset.card)));
    });
    const play = document.getElementById('play');
    if (play) play.classList.toggle('ready', this.phase === 'build' && Object.keys(this.placements).length > 0);
  }

  makeLabels(): void {
    for (const n of this.pz.nodes) {
      if (n.kind === 'customer') {
        const s = sub(n.required[0]);
        const card = el('div', { class: 'order' }, `<div class="ico">${shapeSvg(s.shape, s.color)}</div><div class="txt">רוצה: ${n.wantHe}</div><div class="bar"><i></i></div><div class="who">${n.he}</div>`);
        this.wl.append(card);
        this.labels.set(n.id, card);
      } else if (n.kind === 'source') {
        const sign = el('button', { class: 'src-sign', 'data-src': n.id }, `<span>${n.he}</span><b class="scan">🔍</b>`);
        sign.addEventListener('click', () => this.openScan(n.id));
        this.wl.append(sign);
        this.labels.set(n.id, sign);
      } else if (n.kind === 'drain') {
        const sign = el('div', { class: 'drain-sign' }, `🗑 ${n.he}`);
        this.wl.append(sign);
        this.labels.set(n.id, sign);
      }
    }
  }

  refreshBranchTags(): void {
    for (const t of this.branchTags) t.remove();
    this.branchTags = [];
    for (const [sid, pl] of Object.entries(this.placements)) {
      const sv = this.socketViews.get(sid)!;
      const outs = sv.node.shape === 'fork' ? (['a', 'b'] as const) : (['out'] as const);
      const ports = sv.node.shape === 'fork' ? outletPorts(pl) : { out: STATIONS[pl.type].outputs[0].id };
      for (const o of outs) {
        const pi = this.pz.pipes.findIndex((p) => p.from === sid && p.outlet === o);
        if (pi < 0) continue;
        const portId = (ports as Record<string, string>)[o];
        const label = STATIONS[pl.type].outputs.find((x) => x.id === portId)!.he;
        const tag = el('div', { class: 'btag' }, label);
        tag.dataset.pipe = String(pi);
        this.wl.append(tag);
        this.branchTags.push(tag);
      }
    }
  }

  toast(msg: string, ms = 2600): void {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout((t as unknown as { _h: number })._h);
    (t as unknown as { _h: number })._h = window.setTimeout(() => t.classList.add('hidden'), ms);
  }

  /** the engineer's speech bubble (level intro, nudges) */
  say(msg: string, secs = 4): void {
    const s = document.getElementById('say');
    if (!s) return;
    s.innerHTML = msg;
    s.classList.remove('hidden');
    clearTimeout((s as unknown as { _h: number })._h);
    (s as unknown as { _h: number })._h = window.setTimeout(() => s.classList.add('hidden'), secs * 1000);
  }

  showHint(): void {
    if (this.pz.noHints) return;
    this.hintIdx = Math.min(this.pz.hints.length, this.hintIdx + 1);
    this.hintsUsed = Math.max(this.hintsUsed, this.hintIdx);
    logEvent({ level: this.pz.id, action: 'hint', values: { index: this.hintIdx }, hintsUsed: this.hintsUsed, run: this.failedRuns });
    audio.play('click');
    this.card(`<div class="hint"><b>💡 רמז ${f(this.hintIdx)}/${f(3)}</b>${this.pz.hints
      .slice(0, this.hintIdx)
      .map((h) => `<p>${h}</p>`)
      .join('')}<div class="row">${this.hintIdx < 3 ? '<button class="btn2 teal" data-more>עוד רמז</button>' : ''}<button class="btn2" data-x>הבנתי</button></div></div>`, (c) => {
      c.querySelector('[data-x]')!.addEventListener('click', () => this.closeCard());
      c.querySelector('[data-more]')?.addEventListener('click', () => this.showHint());
    });
  }

  card(html: string, wire?: (c: HTMLElement) => void, cls = ''): void {
    this.closeCard();
    const c = el('div', { id: 'card', class: `rcard ${cls}`, role: 'dialog' }, html);
    this.ui.append(c);
    wire?.(c);
    (c.querySelector('button') as HTMLButtonElement | null)?.focus();
  }

  closeCard(): void {
    document.getElementById('card')?.remove();
  }

  resetLevel(): void {
    for (const sid of Object.keys(this.placements)) this.unplace(sid, false);
    this.backToBuild();
    audio.play('whoosh');
  }

  // ======================= popover on a placed machine =======================

  openPopover(socketId: string | null): void {
    document.getElementById('pop')?.remove();
    this.popSocket = socketId;
    if (!socketId || !this.placements[socketId] || this.phase === 'run') {
      this.popSocket = null;
      return;
    }
    const pl = this.placements[socketId];
    const sv = this.socketViews.get(socketId)!;
    const def = STATIONS[pl.type];
    const pop = el('div', { id: 'pop', class: 'pop' }, `
      <div class="t">${def.he} <small>· ${def.propertyHe}</small></div>
      <div class="row">
        ${sv.node.shape === 'fork' ? `<button class="btn2 teal" data-flip>⇅ הפוך יציאות</button>` : ''}
        ${pl.type === 'still' ? ([78, 100] as StillTemp[]).map((T) => `<button class="btn2 ${pl.temp === T ? 'hot' : ''}" data-temp="${T}">🌡 ${f(T + '°C')}</button>`).join('') : ''}
        <button class="btn2" data-rm>✕ להחזיר</button>
      </div>`);
    this.wl.append(pop);
    pop.style.pointerEvents = 'auto';
    pop.querySelector('[data-flip]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.flip(socketId);
    });
    pop.querySelectorAll<HTMLButtonElement>('[data-temp]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setTemp(socketId, Number(b.dataset.temp) as StillTemp);
      }),
    );
    pop.querySelector('[data-rm]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.unplace(socketId);
      this.openPopover(null);
    });
  }

  // ======================= input =======================

  private bindInput(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this.canvasDown(e));
    window.addEventListener('pointermove', (e) => this.pointerMove(e));
    window.addEventListener('pointerup', (e) => this.pointerUp(e));
    window.addEventListener('keydown', (e) => this.onKey(e));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setNdc(x: number, y: number): void {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
  }

  private pickAt(x: number, y: number): { socket?: string; node?: string; mapLevel?: number } {
    this.setNdc(x, y);
    if (this.screen === 'map') return { mapLevel: this.map.pick(this.raycaster) };
    const hits = this.raycaster.intersectObjects([...[...this.socketViews.values()].map((s) => s.hit), ...[...this.nodeViews.values()].map((n) => n.hit)], false);
    const h = hits[0];
    if (!h) return {};
    if (h.object.userData.socketId) return { socket: h.object.userData.socketId };
    return { node: h.object.userData.nodeId };
  }

  /** the socket nearest a screen point (for drag-and-drop snapping) */
  nearestSocket(x: number, y: number, type?: StationType): { id: string; d: number } | null {
    let best: { id: string; d: number } | null = null;
    for (const [id, sv] of this.socketViews) {
      if (type && shapeFor(type) !== sv.node.shape) continue;
      const p = this.project(sv.group.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
      const d = Math.hypot(p.x - x, p.y - y);
      if (!best || d < best.d) best = { id, d };
    }
    return best;
  }

  private cardDown(e: PointerEvent, card: number): void {
    audio.unlock();
    if (this.screen !== 'level' || this.phase === 'run') return;
    e.preventDefault();
    if (!this.cardFree(card)) {
      // tapping a used card picks it back up from its socket
      const sid = Object.entries(this.placements).find(([, p]) => p.card === card)?.[0];
      if (sid) this.startDrag(card, e.clientX, e.clientY, sid);
      return;
    }
    this.startDrag(card, e.clientX, e.clientY);
  }

  private startDrag(card: number, x: number, y: number, fromSocket?: string): void {
    const type = this.pz.tray[card];
    const ghost = this.machineObject(type);
    ghost.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        m.material = mats.map((mm) => {
          const c = (mm as THREE.Material).clone();
          c.transparent = true;
          c.opacity = 0.7;
          c.depthWrite = false;
          return c;
        });
        m.castShadow = false;
      }
    });
    ghost.visible = false;
    this.scene.add(ghost);
    this.drag = { card, fromSocket, ghost, moved: false, x, y };
    this.openPopover(null);
    this.highlightSockets(type);
  }

  highlightSockets(type: StationType | null): void {
    for (const sv of this.socketViews.values()) {
      const ok = !type || shapeFor(type) === sv.node.shape;
      (sv.ring.material as THREE.MeshBasicMaterial).color.set(!type ? '#7ff5e8' : ok ? '#a8fff4' : '#ff8a7a');
      sv.ring.userData.boost = type && ok ? 1 : 0;
      sv.ring.userData.dim = type && !ok ? 1 : 0;
    }
  }

  private canvasDown(e: PointerEvent): void {
    audio.unlock();
    if (this.screen === 'map') {
      const { mapLevel } = this.pickAt(e.clientX, e.clientY);
      if (mapLevel !== undefined && mapLevel >= 0 && this.unlocked(mapLevel)) this.startLevel(mapLevel);
      return;
    }
    if (this.screen !== 'level') return;
    if (this.scanSource) return;
    const hit = this.pickAt(e.clientX, e.clientY);
    if (hit.socket) {
      if (this.selectedCard !== null && this.phase !== 'run') {
        const c = this.selectedCard;
        this.selectedCard = null;
        this.highlightSockets(null);
        if (this.place(hit.socket, c)) this.openPopover(null);
        return;
      }
      const pl = this.placements[hit.socket];
      if (pl && this.phase !== 'run') {
        // press on a placed machine: tap = popover, drag = move it
        this.drag = { card: pl.card, fromSocket: hit.socket, ghost: new THREE.Group(), moved: false, x: e.clientX, y: e.clientY };
        return;
      }
      this.say(this.socketViews.get(hit.socket)!.node.shape === 'fork' ? 'שקע מתפצל: גררו לכאן מכונה עם שתי יציאות (Y).' : 'שקע עגול: גררו לכאן מכונה עם יציאה אחת (●) — או השאירו אותו ריק.', 3);
      return;
    }
    if (hit.node) {
      const n = this.pz.nodes.find((x) => x.id === hit.node)!;
      if (n.kind === 'source') this.openScan(n.id);
      else if (n.kind === 'customer') this.say(`${n.he} רוצה ${n.wantHe} — ורק את זה. כל משלוח עם עוד משהו יחזור בפרצוף.`, 3.5);
      return;
    }
    this.openPopover(null);
    if (this.selectedCard !== null) {
      this.selectedCard = null;
      this.highlightSockets(null);
      this.refreshTray();
    }
  }

  private pointerMove(e: PointerEvent): void {
    const r = this.canvas.getBoundingClientRect();
    this.parallax.set(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2);
    const d = this.drag;
    if (!d) {
      if (this.screen === 'map') this.canvas.style.cursor = this.pickAt(e.clientX, e.clientY).mapLevel !== undefined ? 'pointer' : 'default';
      else if (this.screen === 'level') {
        const h = this.pickAt(e.clientX, e.clientY);
        this.canvas.style.cursor = h.socket || h.node ? 'pointer' : 'default';
      }
      return;
    }
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) {
      d.moved = true;
      if (d.ghost.children.length === 0 && d.ghost.type === 'Group' && !(d.ghost as THREE.Group).userData.real) {
        // dragging a placed machine: lift it out of its socket
        const from = d.fromSocket!;
        this.scene.remove(d.ghost);
        this.unplace(from, false);
        this.startDrag(d.card, e.clientX, e.clientY);
        this.drag!.moved = true;
        this.drag!.fromSocket = from;
      }
    }
    const dd = this.drag!;
    if (!dd.moved) return;
    // ghost follows the pointer on the board plane, snapping onto a fitting socket
    const type = this.pz.tray[dd.card];
    const near = this.nearestSocket(e.clientX, e.clientY, type);
    this.setNdc(e.clientX, e.clientY);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);
    const p = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    dd.ghost.visible = !!p;
    if (near && near.d < 90) dd.ghost.position.copy(this.socketViews.get(near.id)!.group.position).add(new THREE.Vector3(0, 0.45, 0));
    else if (p) dd.ghost.position.copy(p);
  }

  private pointerUp(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.scene.remove(d.ghost);
    this.highlightSockets(null);
    if (!d.moved) {
      if (d.fromSocket && this.placements[d.fromSocket]) {
        // tap on a placed machine
        this.openPopover(this.popSocket === d.fromSocket ? null : d.fromSocket);
        audio.play('click');
        return;
      }
      // tap on a free card: select it, then tap a socket
      this.selectedCard = this.selectedCard === d.card ? null : d.card;
      this.highlightSockets(this.selectedCard === null ? null : this.pz.tray[d.card]);
      this.refreshTray();
      if (this.selectedCard !== null) this.say('עכשיו הקישו על שקע זוהר.', 2.5);
      return;
    }
    const type = this.pz.tray[d.card];
    const trayR = document.getElementById('tray')?.getBoundingClientRect();
    if (trayR && e.clientY > trayR.top - 10) {
      // dropped back on the tray
      this.refreshTray();
      return;
    }
    const near = this.nearestSocket(e.clientX, e.clientY, type);
    const any = this.nearestSocket(e.clientX, e.clientY);
    if (near && near.d < 90) this.place(near.id, d.card);
    else if (any && any.d < 90) this.place(any.id, d.card); // explains why it doesn't fit
    this.refreshTray();
  }

  private onKey(e: KeyboardEvent): void {
    if (this.screen !== 'level') return;
    if (e.key === ' ' || e.key === 'Enter') {
      if ((e.target as HTMLElement)?.tagName === 'BUTTON') return;
      e.preventDefault();
      this.onPlay();
    } else if (e.key === 'Escape') {
      if (this.scanSource) this.closeScan();
      else this.openPopover(null);
    } else if (e.key === 'h' || e.key === 'H') this.showHint();
    else if (e.key === 'r' || e.key === 'R') this.resetLevel();
    else if (/^[1-6]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i < this.pz.tray.length && this.cardFree(i)) {
        this.selectedCard = i;
        this.highlightSockets(this.pz.tray[i]);
        this.refreshTray();
      }
    }
  }

  // ======================= scan (particle magnifier) =======================

  openScan(srcId: string): void {
    if (this.phase === 'run') return;
    const n = this.pz.nodes.find((x) => x.id === srcId) as PSource;
    this.scanSource = srcId;
    this.openPopover(null);
    this.lens.show(n.packet);
    const done = this.scans[srcId]?.tag;
    const order: MatterClass[] = ['element', 'compound', 'homogeneous', 'heterogeneous'];
    const ov = el('div', { id: 'scan' }, `
      <div class="dim"></div>
      <div class="mag">
        <div class="ribbon">מה זה?</div>
        <div id="scan-view"></div>
        <div class="handle"></div>
        <button class="close rbtn" aria-label="סגירה">✕</button>
      </div>
      <div class="scan-panel">
        <div class="legend">${legendHtml(n.packet)}</div>
        <div class="dist">${done ? distributionHe(n.packet) : 'כמה סוגי חלקיקים יש כאן? הם מפוזרים באחידות, או בגושים ושכבות?'}</div>
        <div class="seals">${order.map((c) => `<button class="seal ${c} ${done === c ? 'right' : ''}" data-tag="${c}">${CLASS_ICON[c]}<span>${CLASS_HE[c]}</span></button>`).join('')}</div>
        <div class="note" aria-live="polite">${done ? `✓ ${CLASS_HE[done]}` : ''}</div>
      </div>`);
    this.ui.append(ov);
    // the dim layer gets a hole where the magnifier is, so the 3D lens (drawn on the canvas below) stays bright
    const vr = ov.querySelector('#scan-view')!.getBoundingClientRect();
    const dim = ov.querySelector('.dim') as HTMLElement;
    const mask = `radial-gradient(circle at ${vr.left + vr.width / 2}px ${vr.top + vr.height / 2}px, transparent ${vr.width / 2}px, #000 ${vr.width / 2 + 1}px)`;
    dim.style.maskImage = mask;
    dim.style.webkitMaskImage = mask;
    document.querySelectorAll('.hand').forEach((h) => h.remove());
    ov.querySelector('.close')!.addEventListener('click', () => this.closeScan());
    ov.querySelector('.dim')!.addEventListener('click', () => this.closeScan());
    ov.querySelectorAll<HTMLButtonElement>('[data-tag]').forEach((b) => b.addEventListener('click', () => this.stamp(srcId, b.dataset.tag as MatterClass, ov)));
    audio.play('whoosh');
    logEvent({ level: this.pz.id, action: 'lens', values: { source: srcId }, hintsUsed: this.hintsUsed, run: this.failedRuns });
  }

  stamp(srcId: string, cls: MatterClass, ov: HTMLElement): void {
    const n = this.pz.nodes.find((x) => x.id === srcId) as PSource;
    const s = (this.scans[srcId] ??= {});
    if (s.tag) return;
    const truth = classify(n.packet);
    const correct = truth === cls;
    if (s.first === undefined) s.first = correct;
    logEvent({ level: this.pz.id, action: 'tag', values: { source: srcId, tag: cls, truth }, outcome: correct ? 'correct' : 'wrong', hintsUsed: this.hintsUsed, run: this.failedRuns, firstUnaided: s.first === correct && this.hintsUsed === 0 ? true : undefined });
    const note = ov.querySelector('.note')!;
    const btn = ov.querySelector(`[data-tag="${cls}"]`) as HTMLElement;
    if (correct) {
      s.tag = cls;
      btn.classList.add('right');
      note.innerHTML = `✓ ${CLASS_HE[cls]}!${s.first ? ' <b>+⭐</b>' : ''}`;
      ov.querySelector('.dist')!.textContent = distributionHe(n.packet);
      audio.play('stamp');
      const sign = this.labels.get(srcId);
      sign?.classList.add('scanned');
    } else {
      btn.classList.remove('wrong');
      void btn.offsetWidth;
      btn.classList.add('wrong');
      note.textContent = units(n.packet).length === 1 ? 'החותמת החליקה… כמה סוגי חלקיקים? ומכמה סוגי אטומים בנוי כל חלקיק?' : 'החותמת החליקה… החלקיקים מפוזרים באחידות, או בגושים ושכבות?';
      audio.play('wrongstamp');
    }
  }

  closeScan(): void {
    document.getElementById('scan')?.remove();
    this.scanSource = null;
  }

  // ======================= run (the flow show) =======================

  onPlay(): void {
    audio.unlock();
    if (this.screen !== 'level') return;
    if (this.phase === 'run') {
      this.run!.speed = this.run!.speed > 1 ? 1 : 2.5;
      document.getElementById('play')!.classList.toggle('fast', this.run!.speed > 1);
      return;
    }
    if (this.phase === 'done') this.backToBuild();
    this.closeScan();
    this.closeCard();
    this.openPopover(null);
    const placements: Record<string, Placement> = {};
    for (const [k, v] of Object.entries(this.placements)) placements[k] = { type: v.type, flipped: v.flipped, temp: v.temp };
    const result = runPuzzle(this.pz, placements);
    // schedule: each node starts when its slowest input arrives
    const depth = new Map<string, number>();
    const order = this.pz.nodes.map((n) => n.id);
    for (let k = 0; k < order.length + 2; k++) {
      for (const n of this.pz.nodes) {
        const ins = this.pz.pipes.filter((p) => p.to === n.id);
        depth.set(n.id, ins.length ? Math.max(...ins.map((p) => (depth.get(p.from) ?? 0) + 1)) : 0);
      }
    }
    const pipeStart = this.pz.pipes.map((p) => (depth.get(p.from) ?? 0) * STEP);
    const socketStart: Record<string, number> = {};
    const arrival: Record<string, number> = {};
    for (const n of this.pz.nodes) {
      const d = depth.get(n.id) ?? 0;
      if (n.kind === 'socket') socketStart[n.id] = (d - 1) * STEP + TRAVEL;
      if (n.kind === 'customer' || n.kind === 'drain') arrival[n.id] = (d - 1) * STEP + TRAVEL;
    }
    const end = Math.max(...Object.values(arrival)) + 2.8;
    this.run = { result, t: 0, speed: 1, pipeStart, socketStart, arrival, end, fired: new Set() };
    this.phase = 'run';
    const play = document.getElementById('play')!;
    play.classList.add('running');
    play.querySelector('.txt')!.textContent = '';
    play.querySelector('.ico')!.innerHTML = '<b>x2</b>';
    for (const lab of this.labels.values()) lab.classList.remove('happy', 'sad');
    audio.play('whoosh');
    logEvent({ level: this.pz.id, action: 'run', values: { placements }, outcome: result.solved ? 'solved' : 'failed', hintsUsed: this.hintsUsed, run: this.failedRuns });
  }

  private stepRun(dt: number): void {
    const r = this.run!;
    r.t += dt * r.speed;
    const res = r.result;
    // machines kick in
    for (const [sid, t0] of Object.entries(r.socketStart)) {
      const key = 'sock:' + sid;
      if (r.t >= t0 && !r.fired.has(key)) {
        r.fired.add(key);
        const sv = this.socketViews.get(sid)!;
        const pos = sv.group.position.clone().add(new THREE.Vector3(0, 1.6, 0));
        if (this.placements[sid]) audio.play('clank');
        const note = res.notes[sid];
        if (note) this.bubble(NOTE_HE[note] ?? note, pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 'info', 3.4);
        if (res.vapor[sid]) {
          audio.play('hiss');
          r.fired.add('steam:' + sid);
        }
      }
      if (r.fired.has('steam:' + sid) && Math.random() < dt * 6) this.fx.steam(this.socketViews.get(sid)!.group.position.clone().add(new THREE.Vector3(0, 1.3, 0)), 1);
      const pl = this.placements[sid];
      if (pl?.type === 'magnet' && r.t >= t0 && r.t < r.end - 2 && Math.random() < dt * 5) {
        const pi = this.pz.pipes.findIndex((p) => p.from === sid && p.outlet === (outletPorts(pl).a === 'magnetic' ? 'a' : 'b'));
        if (pi >= 0 && total(res.flows[pi]) > 0) {
          const sv = this.socketViews.get(sid)!;
          this.fx.hop('iron', sv.group.position.clone().add(new THREE.Vector3(0.2, 0.9, 0)), this.pipeViews[pi].curve.getPointAt(0.1));
        }
      }
    }
    // customers react when the stream arrives
    for (const c of res.customers) {
      const key = 'cust:' + c.id;
      const t0 = r.arrival[c.id];
      if (r.t >= t0 && !r.fired.has(key) && c.deliveries.length) {
        r.fired.add(key);
        this.customerReact(c.id, c.happy, c);
      }
      if (r.t >= r.end - 1.2 && !r.fired.has(key)) {
        r.fired.add(key);
        this.customerReact(c.id, false, c);
      }
      const lab = this.labels.get(c.id);
      if (lab && c.happy) {
        const fr = THREE.MathUtils.clamp((r.t - t0) / Math.max(0.5, r.end - 1 - t0), 0, 1);
        (lab.querySelector('.bar > i') as HTMLElement).style.width = `${fr * 100}%`;
      }
    }
    const play = document.getElementById('play');
    if (play) play.style.setProperty('--p', String(Math.min(1, r.t / r.end)));
    if (r.t >= r.end) this.finishRun();
  }

  customerReact(id: string, happy: boolean, c: RunResult['customers'][number]): void {
    const v = this.nodeViews.get(id)!;
    const n = v.node as PCustomer;
    const door = v.group.position.clone().add(new THREE.Vector3(0.9, 0.8, 0));
    const above = v.group.position.clone().add(new THREE.Vector3(0.6, v.labelY + 0.2, 0));
    const lab = this.labels.get(id)!;
    if (happy) {
      audio.play('chime');
      this.fx.sparks(door.clone().add(new THREE.Vector3(0, 0.6, 0)), sub(n.required[0]).color, 16);
      this.bubble(Math.random() < 0.5 ? '😄' : '❤️', above, 'emote', 2.2, 'bubble emote');
      lab.classList.add('happy');
      v.group.userData.bounce = 1;
    } else {
      audio.play('ptui');
      lab.classList.add('sad');
      const bad = c.deliveries.find((d) => !d.verdict.accepted);
      if (bad) {
        this.fx.burst(bad.comp, door, 18, 1.1, 0.8);
        this.fx.dust(door, '#f0dcb4', 8);
        this.bubble(rejectionHe(n as unknown as Parameters<typeof rejectionHe>[0], bad.verdict), above, 'bad', 3.4);
      } else this.bubble(`איפה ה${n.wantHe}?`, above, 'bad', 3.4);
      v.group.userData.shake = 1;
      this.mascotPlay('frustrated_01');
    }
  }

  finishRun(): void {
    const r = this.run!;
    this.run = null;
    this.phase = 'done';
    this.lastResult = r.result;
    const play = document.getElementById('play')!;
    play.classList.remove('running', 'fast');
    play.querySelector('.ico')!.textContent = '▶';
    play.querySelector('.txt')!.textContent = r.result.solved ? 'עוד פעם' : 'הפעל זרימה';
    if (r.result.solved) this.win();
    else this.lose(r.result);
  }

  backToBuild(): void {
    this.phase = 'build';
    this.run = null;
    this.closeCard();
    for (const lab of this.labels.values()) {
      lab.classList.remove('happy', 'sad');
      const bar = lab.querySelector('.bar > i') as HTMLElement | null;
      if (bar) bar.style.width = '0%';
    }
    const play = document.getElementById('play');
    if (play) {
      play.classList.remove('running', 'fast');
      play.querySelector('.ico')!.textContent = '▶';
      play.querySelector('.txt')!.textContent = 'הפעל זרימה';
    }
    this.refreshTray();
  }

  starsNow(): { solved: boolean; clean: boolean; scanned: boolean; count: number } {
    const sources = this.pz.nodes.filter((n) => n.kind === 'source');
    const scanned = sources.every((s) => this.scans[s.id]?.first === true);
    const clean = this.failedRuns === 0;
    return { solved: true, clean, scanned, count: 1 + (clean ? 1 : 0) + (scanned ? 1 : 0) };
  }

  win(): void {
    const st = this.starsNow();
    const prev = this.progress[this.pz.id] ?? 0;
    this.progress[this.pz.id] = Math.max(prev, st.count);
    saveProgress(this.progress);
    document.querySelectorAll('#plaque .stars span').forEach((s, i) => s.classList.toggle('on', i < this.progress[this.pz.id]));
    audio.play('win');
    this.mascotPlay('cheer');
    for (const n of this.pz.nodes) if (n.kind === 'customer') this.fx.confetti(toWorld(n.x, n.z, 2.4), 40);
    logEvent({ level: this.pz.id, action: 'win', values: { stars: st.count, failedRuns: this.failedRuns }, hintsUsed: this.hintsUsed, run: this.failedRuns, firstUnaided: this.failedRuns === 0 && this.hintsUsed === 0 ? true : undefined });
    const next = this.levelIdx + 1 < PUZZLES.length ? this.levelIdx + 1 : -1;
    const star = (on: boolean, i: number) => `<span class="${on ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.3}s">★</span>`;
    if (!this.testMode) [st.solved, st.clean, st.scanned].forEach((on, i) => on && window.setTimeout(() => audio.play('stamp'), 200 + i * 300));
    window.setTimeout(
      () =>
        this.card(`<div class="win"><h2>${next < 0 ? 'העמק נקי!' : 'מעולה!'}</h2>
          <div class="bigstars">${star(true, 0)}${star(st.clean, 1)}${star(st.scanned, 2)}</div>
          <ul class="why"><li class="on">★ כל הלקוחות קיבלו בדיוק מה שהזמינו</li><li class="${st.clean ? 'on' : ''}">★ בלי זרימה כושלת</li><li class="${st.scanned ? 'on' : ''}">★ סרקתם וזיהיתם את ${this.pz.nodes.filter((n) => n.kind === 'source').length > 1 ? 'המקורות' : 'המקור'} בניסיון הראשון</li></ul>
          <div class="row">${next >= 0 ? '<button class="btn2 go" data-next>השלב הבא ▶</button>' : '<button class="btn2 go" data-map>למפה</button>'}<button class="btn2" data-again>שוב</button></div></div>`, (c) => {
          c.querySelector('[data-next]')?.addEventListener('click', () => this.startLevel(next));
          c.querySelector('[data-map]')?.addEventListener('click', () => this.showMap());
          c.querySelector('[data-again]')!.addEventListener('click', () => {
            this.closeCard();
            this.backToBuild();
          });
        }, 'center'),
      this.testMode ? 0 : 900,
    );
  }

  lose(res: RunResult): void {
    this.failedRuns++;
    audio.play('fail');
    const bad = res.customers.find((c) => !c.happy)!;
    const n = this.pz.nodes.find((x) => x.id === bad.id) as PCustomer;
    let why = '';
    const want = n.required[0];
    if (bad.problem?.kind === 'nothing') {
      const pan = Object.entries(this.placements).find(([sid, p]) => p.type === 'pan' && res.vapor[sid] && total(res.flows[this.pz.pipes.findIndex((pp) => pp.from === sid)] ?? {}) < 1e-6);
      why = pan ? 'אגן האידוי שלח את כל הנוזל לאוויר כאדים — לא נשאר כלום ללקוח.' : `לא הגיע ל${n.he} שום ${n.wantHe}. בדקו לאן כל יציאה הולכת.`;
    } else if (bad.problem?.kind === 'missing') {
      why = `הגיע ${bad.problem.impurity ? sub(bad.problem.impurity).he : 'משהו אחר'} במקום ${n.wantHe}. אולי המכונה הפוכה? הקישו עליה ו"הפכו יציאות".`;
    } else if (bad.problem) {
      why = this.pz.noHints ? `ב${n.wantHe} הגיע גם ${sub(bad.problem.impurity!).he}. איזו תכונה שונה ביניהם?` : workedExplanation(want, bad.problem.impurity, bad.problem.reason);
    }
    const headline = bad.problem?.kind === 'impure' && bad.problem.impurity ? `פויה! יש ${sub(bad.problem.impurity).he} ב${n.wantHe}` : bad.problem?.kind === 'missing' ? `זה לא ${n.wantHe}!` : `${n.he} נשאר בלי ${n.wantHe}`;
    const others = res.customers.filter((c) => !c.happy).length - 1;
    logEvent({ level: this.pz.id, action: 'fail', values: { customer: bad.id, problem: bad.problem }, hintsUsed: this.hintsUsed, run: this.failedRuns });
    window.setTimeout(
      () =>
        this.card(`<div class="oops"><h2>כמעט!</h2><div class="headline">${n.he}: ${headline}</div><p>${why}</p>${others > 0 ? `<p class="more">ועוד ${f(others)} ${others === 1 ? 'לקוח לא מרוצה' : 'לקוחות לא מרוצים'}.</p>` : ''}
          <div class="row"><button class="btn2 teal" data-retry>נסו שוב ↻</button>${this.pz.noHints ? '' : '<button class="btn2" data-hint>💡 רמז</button>'}</div></div>`, (c) => {
          c.querySelector('[data-retry]')!.addEventListener('click', () => {
            this.closeCard();
            this.backToBuild();
          });
          c.querySelector('[data-hint]')?.addEventListener('click', () => this.showHint());
        }),
      this.testMode ? 0 : 700,
    );
  }

  // ======================= tutorial hand =======================

  tutorialHand(): void {
    if (this.screen !== 'level' || !this.pz.tutorial || Object.keys(this.placements).length) return;
    if (this.scanSource) {
      window.setTimeout(() => this.tutorialHand(), 1500);
      return;
    }
    const card = document.querySelector('#tray .mcard') as HTMLElement | null;
    const sv = [...this.socketViews.values()][0];
    if (!card || !sv) return;
    const cr = card.getBoundingClientRect();
    const to = this.project(sv.group.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
    const hand = el('div', { class: 'hand' }, '👆');
    hand.style.setProperty('--x0', `${cr.left + cr.width / 2}px`);
    hand.style.setProperty('--y0', `${cr.top + cr.height / 2}px`);
    hand.style.setProperty('--x1', `${to.x}px`);
    hand.style.setProperty('--y1', `${to.y}px`);
    this.ui.append(hand);
    this.say('גררו את התוף המגנטי לשקע הזוהר.', 5);
    window.setTimeout(() => {
      hand.remove();
      if (!Object.keys(this.placements).length && this.screen === 'level' && this.pz.tutorial) this.tutorialHand();
    }, 4200);
  }

  // ======================= bubbles =======================

  bubble(text: string, pos: THREE.Vector3, kind: 'bad' | 'good' | 'info' | 'emote' = 'info', secs = 2.6, cls = 'bubble'): void {
    for (const b of this.bubbles) if (b.pos.distanceTo(pos) < 0.6) b.until = 0;
    const e = el('div', { class: `${cls} ${kind}` }, text);
    this.wl.append(e);
    this.bubbles.push({ el: e, pos: pos.clone(), until: this.visualT + secs });
  }

  shakeSocket(id: string): void {
    const sv = this.socketViews.get(id);
    if (sv) sv.group.userData.shake = 1;
  }

  // ======================= camera =======================

  frameCamera(minX: number, maxX: number, minZ: number, maxZ: number): void {
    const h0 = this.canvas.clientHeight || 1;
    const w0 = this.canvas.clientWidth || 1;
    // portrait screens look along the board (sources at the bottom, customers at the top)
    const side = w0 / h0 < 0.9;
    const target = new THREE.Vector3((minX + maxX) / 2 + (side ? -0.6 : 0), 0, (minZ + maxZ) / 2 + (side ? 0 : 0.6));
    const dir = side ? new THREE.Vector3(Math.cos(0.95), Math.sin(0.95), 0).normalize() : new THREE.Vector3(0, Math.sin(0.72), Math.cos(0.72)).normalize();
    const corners = [new THREE.Vector3(minX, 0, minZ), new THREE.Vector3(maxX, 0, minZ), new THREE.Vector3(minX, 0, maxZ), new THREE.Vector3(maxX, 0, maxZ), new THREE.Vector3(minX, 3, minZ), new THREE.Vector3(maxX, 3, minZ)];
    const cam = this.camera.clone();
    const h = this.canvas.clientHeight || 1;
    const w = this.canvas.clientWidth || 1;
    const portrait = w / h < 0.9;
    const yTop = 1 - (2 * (portrait ? 110 : 90)) / h;
    const yBot = -1 + (2 * (portrait ? 250 : 150)) / h;
    // fit: the closest distance where every corner is inside the free band, then slide the target so the
    // board sits centred in that band, and fit again
    const ground = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    const fit = (): number => {
      for (let d = 8; d < 90; d += 0.25) {
        cam.position.copy(target).addScaledVector(dir, d);
        cam.up.set(0, 1, 0);
        cam.lookAt(target);
        cam.updateMatrixWorld(true);
        const ok = corners.every((c) => {
          const v = c.clone().project(cam);
          return Math.abs(v.x) < (portrait ? 0.9 : 0.97) && v.y < yTop && v.y > yBot;
        });
        if (ok) return d;
      }
      return 90;
    };
    for (let k = 0; k < 4; k++) {
      fit();
      let lo = Infinity;
      let hi = -Infinity;
      for (const c of corners) {
        const v = c.clone().project(cam);
        lo = Math.min(lo, v.y);
        hi = Math.max(hi, v.y);
      }
      const off = (yTop + yBot) / 2 - (lo + hi) / 2;
      if (Math.abs(off) < 0.01) break;
      // moving the target away from the camera raises the board on screen
      target.addScaledVector(ground, off * cam.position.distanceTo(target) * 0.35);
    }
    fit();
    this.camBase = { pos: cam.position.clone(), target };
    this.camera.position.copy(this.camBase.pos);
    this.camera.lookAt(target);
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.9 ? 50 : 36;
    this.camera.updateProjectionMatrix();
    if (this.screen === 'level') this.buildLevelCameraOnly();
    if (this.screen === 'map') this.map.frame();
  }

  buildLevelCameraOnly(): void {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const n of this.pz.nodes) {
      const p = toWorld(n.x, n.z);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    this.frameCamera(minX - 2.6, maxX + 2.8, minZ - 2.2, maxZ + 2.2);
  }

  project(p: THREE.Vector3): { x: number; y: number; vis: boolean } {
    const v = p.clone().project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height, vis: v.z < 1 };
  }

  // ======================= mascot =======================

  addMascot(): void {
    const inst = instance('engineer-anim', 1.9);
    if (!inst) return;
    const mixer = new THREE.AnimationMixer(inst);
    const actions: Record<string, THREE.AnimationAction> = {};
    for (const c of clips('engineer-anim')) {
      const a = mixer.clipAction(c);
      if (c.name !== 'idle') {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = false;
      }
      actions[c.name] = a;
    }
    const root = new THREE.Group();
    root.add(inst);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 0.16, 20), MAT.brass);
    plat.position.y = 0.04;
    root.add(plat);
    this.scene.add(root);
    this.mascot = { root, mixer, actions, current: '' };
    mixer.addEventListener('finished', () => this.mascotPlay('idle'));
    this.mascotPlay('idle');
  }

  placeMascot(x: number, z: number): void {
    if (!this.mascot) return;
    this.mascot.root.visible = true;
    this.mascot.root.position.set(x, 0.1, z);
    this.mascot.root.rotation.y = -0.6;
  }

  mascotPlay(name: string): void {
    const m = this.mascot;
    if (!m || !m.actions[name] || m.current === name) return;
    const next = m.actions[name];
    const prev = m.actions[m.current];
    next.reset();
    if (name === 'cheer') next.time = 0.8;
    next.play();
    if (prev) prev.crossFadeTo(next, 0.3, false);
    m.current = name;
  }

  // ======================= machine icons for the tray =======================

  makeIcons(): void {
    const W = 220;
    const H = 170;
    const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
    const sc = new THREE.Scene();
    sc.environment = this.scene.environment;
    sc.add(new THREE.HemisphereLight('#fff6e0', '#8a6a4a', 1.6));
    const d = new THREE.DirectionalLight('#fff', 2.4);
    d.position.set(3, 5, 4);
    sc.add(d);
    const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 50);
    const buf = new Uint8Array(W * H * 4);
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d')!;
    for (const t of Object.keys(STATIONS) as StationType[]) {
      const obj = this.machineObject(t);
      sc.add(obj);
      const box = new THREE.Box3().setFromObject(obj);
      const c = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      cam.position.set(c.x + size * 0.55, c.y + size * 0.35, c.z + size * 0.95);
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
      sc.remove(obj);
    }
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
    if (this.testMode) return;
    this.tick(dt);
  }

  tick(dt: number, render = true): void {
    this.visualT += dt;
    const t = this.visualT;
    if (this.screen === 'map') {
      this.map.update(dt, t);
    } else if (this.screen === 'level') {
      if (this.phase === 'run' && this.run) this.stepRun(dt);
      // gentle camera parallax
      const k = this.reduced ? 0 : 0.35;
      const tp = this.camBase.pos.clone().add(new THREE.Vector3(this.parallax.x * k, -this.parallax.y * k * 0.5, 0));
      this.camera.position.lerp(tp, Math.min(1, dt * 3));
      this.camera.lookAt(this.camBase.target);
      // sockets breathe; machines pop, flip, wobble
      for (const sv of this.socketViews.values()) {
        const boost = sv.ring.userData.boost ? 1 : 0;
        const pulse = 1 + Math.sin(t * (boost ? 9 : 3)) * (boost ? 0.09 : 0.04);
        sv.ring.scale.setScalar(sv.machine ? 1.05 : pulse);
        (sv.ring.material as THREE.MeshBasicMaterial).opacity = sv.machine ? 0.25 : sv.ring.userData.dim ? 0.3 : 0.85;
        sv.plus.position.y = 0.33 + Math.sin(t * 3) * 0.04;
        if (sv.machine) {
          const m = sv.machine;
          if (m.userData.grow) {
            const s = Math.min(1, m.scale.x / (m.userData.base ?? (m.userData.base = m.scale.x * 100)) + dt * 6);
            m.scale.setScalar(m.userData.base * easeOutBack(s));
            if (s >= 1) m.userData.grow = 0;
          }
          if (sv.spin > 0) {
            sv.spin = Math.max(0, sv.spin - dt * 2.5);
            m.rotation.y = (1 - sv.spin) * Math.PI * 2;
            if (sv.spin === 0) m.rotation.y = 0;
          }
          if (this.phase === 'run' && this.run && this.run.t >= (this.run.socketStart[sv.node.id] ?? 0)) m.position.y = 0.3 + Math.abs(Math.sin(t * 14)) * 0.04;
          else m.position.y = 0.3;
        }
        if (sv.group.userData.shake) {
          sv.group.userData.shake = Math.max(0, sv.group.userData.shake - dt * 3);
          sv.group.rotation.z = Math.sin(t * 50) * 0.06 * sv.group.userData.shake;
        }
      }
      for (const v of this.nodeViews.values()) {
        v.group.userData.anim?.(dt, t, { busy: true, stalled: false, intensity: 0.6, fill: 0.5 });
        if (v.group.userData.bounce) {
          v.group.userData.bounce = Math.max(0, v.group.userData.bounce - dt * 2);
          v.group.scale.setScalar(1 + Math.sin((1 - v.group.userData.bounce) * Math.PI * 3) * 0.06 * v.group.userData.bounce);
        }
        if (v.group.userData.shake) {
          v.group.userData.shake = Math.max(0, v.group.userData.shake - dt * 2);
          v.group.rotation.y = Math.sin(t * 40) * 0.05 * v.group.userData.shake;
        }
      }
      if (this.mascot) this.mascot.mixer.update(dt);
    }
    // particles
    this.field.begin();
    if (this.screen === 'level') this.drawStreams(t);
    this.fx.update(dt, t, this.field);
    this.field.end();
    if (!render) return;
    this.updateLabels();
    this.renderer.setViewport(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.render(this.scene, this.camera);
    if (this.scanSource) {
      const view = document.getElementById('scan-view');
      if (view) {
        this.lens.update(dt, t);
        this.lens.render(this.renderer, view.getBoundingClientRect(), this.canvas.clientHeight);
        this.renderer.setViewport(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
      }
    }
  }

  /** particles riding the pipes: idle preview from the sources while building, the full show while running */
  drawStreams(t: number): void {
    const r = this.run;
    this.pz.pipes.forEach((p, i) => {
      const pv = this.pipeViews[i];
      let comp: Comp | null = null;
      let tStart = 0;
      let now = t;
      let tEnd = Infinity;
      if (r) {
        comp = r.result.flows[i];
        tStart = r.pipeStart[i];
        now = r.t;
        tEnd = r.end - 0.6;
      } else if (this.phase !== 'done') {
        const from = this.pz.nodes.find((n) => n.id === p.from)!;
        if (from.kind !== 'source') return;
        comp = from.packet;
      } else if (this.lastResult) {
        comp = this.lastResult.flows[i];
      }
      if (!comp || total(comp) <= 1e-6) return;
      const slots = particleUnits(comp, 4);
      // packets spawned every SPAWN seconds between tStart and tEnd
      const kMax = Math.floor((Math.min(now, tEnd) - tStart) / SPAWN);
      const kMin = Math.max(0, Math.floor((now - tStart - TRAVEL) / SPAWN));
      for (let k = kMin; k <= kMax; k++) {
        const u = (now - tStart - k * SPAWN) / TRAVEL;
        if (u < 0 || u > 1) continue;
        const base = pv.curve.getPointAt(u);
        const tan = pv.curve.getTangentAt(u);
        const n1 = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
        slots.forEach((unit, j) => {
          const seed = i * 7919 + k * 31 + j;
          const a = hash(seed) * Math.PI * 2 + t * 0.8;
          const rad = PIPE_R * 0.45 * Math.sqrt(hash(seed + 1));
          const pos = base.clone().addScaledVector(n1, Math.cos(a) * rad).add(new THREE.Vector3(0, Math.sin(a) * rad, 0)).addScaledVector(tan, (hash(seed + 2) - 0.5) * 0.3);
          this.field.put(unit, pos, seed, t, 1);
        });
      }
    });
  }

  updateLabels(): void {
    for (const [id, lab] of this.labels) {
      const v = this.nodeViews.get(id);
      if (!v) continue;
      const portrait = window.innerWidth / Math.max(1, window.innerHeight) < 0.9;
      let pos: THREE.Vector3;
      if (v.node.kind === 'customer') pos = v.group.position.clone().add(portrait ? new THREE.Vector3(0, 3.0, 0) : new THREE.Vector3(-1.9, 1.6, 0));
      else pos = v.group.position.clone().add(new THREE.Vector3(0, v.labelY, 0));
      const s = this.project(pos);
      let x = s.x;
      const w = lab.offsetWidth;
      lab.classList.toggle('above', portrait && v.node.kind === 'customer');
      if (v.node.kind === 'customer' && !portrait) x = Math.max(w + 8, x); // the card hangs to the left of its anchor
      else x = Math.min(Math.max(w / 2 + 8, x), window.innerWidth - w / 2 - 8);
      lab.style.left = `${x}px`;
      lab.style.top = `${s.y}px`;
    }
    for (const tag of this.branchTags) {
      const pv = this.pipeViews[Number(tag.dataset.pipe)];
      const s = this.project(pv.curve.getPointAt(Math.min(0.62, 3.6 / pv.length)).add(new THREE.Vector3(0, 0.6, 0)));
      tag.style.left = `${s.x}px`;
      tag.style.top = `${s.y}px`;
    }
    const pop = document.getElementById('pop');
    if (pop && this.popSocket) {
      const s = this.project(this.socketViews.get(this.popSocket)!.group.position.clone().add(new THREE.Vector3(0, 2.6, 0)));
      pop.style.left = `${s.x}px`;
      pop.style.top = `${s.y}px`;
    }
    const sayEl = document.getElementById('say');
    if (sayEl && this.mascot) {
      const s = this.project(this.mascot.root.position.clone().add(new THREE.Vector3(0, 2.3, 0)));
      // keep the bubble (anchored ~90% to its right edge) on screen
      const w = sayEl.offsetWidth;
      s.x = Math.min(Math.max(s.x, w * 0.9 + 8), window.innerWidth - w * 0.1 - 8);
      sayEl.style.left = `${s.x}px`;
      sayEl.style.top = `${s.y}px`;
    }
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

  // ======================= test API =======================

  private exposeTestApi(): void {
    const g = this;
    const w = window as unknown as Record<string, unknown>;
    w.render_game_to_text = () => JSON.stringify(g.textState());
    w.advanceTime = (ms: number) => {
      g.testMode = true;
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps; i++) g.tick(1 / 60, i === steps - 1);
      return g.visualT;
    };
    w.cf = {
      screenOfSocket: (id: string) => {
        const s = g.socketViews.get(id);
        return s ? g.project(s.group.position.clone().add(new THREE.Vector3(0, 0.4, 0))) : null;
      },
      screenOfNode: (id: string) => {
        const v = g.nodeViews.get(id);
        return v ? g.project(v.group.position.clone().add(new THREE.Vector3(0, 0.9, 0))) : null;
      },
      screenOfMapLevel: (i: number) => g.map.screenOf(i),
      fps: () => g.fpsAcc.fps,
      log: () => sessionLog(),
    };
  }

  textState(): Record<string, unknown> {
    const pz = this.pz;
    return {
      screen: this.screen,
      level: this.screen === 'level' ? { id: pz.id, index: pz.index, title: pz.he, noHints: !!pz.noHints } : null,
      phase: this.phase,
      tray: pz.tray.map((t, i) => ({ card: i, type: t, shape: shapeFor(t), free: this.cardFree(i) })),
      sockets: pz.nodes.filter((n) => n.kind === 'socket').map((n) => ({ id: n.id, shape: (n as PSocket).shape, machine: this.placements[n.id] ? { type: this.placements[n.id].type, flipped: this.placements[n.id].flipped, temp: this.placements[n.id].temp } : null })),
      sources: pz.nodes.filter((n) => n.kind === 'source').map((n) => ({ id: n.id, he: n.he, stream: (n as PSource).packet, stamp: this.scans[n.id]?.tag ?? null })),
      customers: pz.nodes.filter((n) => n.kind === 'customer').map((n) => {
        const c = this.lastResult?.customers.find((x) => x.id === n.id);
        return { id: n.id, wants: (n as PCustomer).required, happy: c ? c.happy : null, problem: c?.problem ?? null };
      }),
      run: this.run ? { t: +this.run.t.toFixed(2), end: +this.run.end.toFixed(2), speed: this.run.speed } : null,
      result: this.lastResult ? { solved: this.lastResult.solved } : null,
      failedRuns: this.failedRuns,
      hintsUsed: this.hintsUsed,
      scanOpen: this.scanSource,
      card: document.getElementById('card')?.className ?? null,
      progress: this.progress,
    };
  }
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export type { SocketShape };
export { BX, BZ };
