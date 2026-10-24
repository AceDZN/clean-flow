// The particle lens: a zoomed 3D view of a stream's particles (ball-and-stick), matching sim data.
import * as THREE from 'three';
import { dissolvedMass, immiscibleLiquids, isUniform, mass, total, undissolvedSolidMass, units, type Comp } from '../sim/mixture';
import { sub, type UnitId } from '../sim/substances';

const ATOM_COLORS: Record<string, string> = {
  H: '#f4f4f4', O: '#e5322d', Na: '#9b59d0', Cl: '#3fbf4a', Si: '#d9b07a', Fe: '#8a8f99', C: '#3a3a3a', N: '#3f6fe0', Ar: '#7fd8e8', S: '#f2d22e', Cu: '#c8703f', Ca: '#e8e8e8',
};
const ATOM_R: Record<string, number> = { H: 0.11, O: 0.17, Na: 0.2, Cl: 0.24, Si: 0.2, Fe: 0.2, C: 0.16, N: 0.16, Ar: 0.22, S: 0.21, Cu: 0.2, Ca: 0.22 };

const sphereGeo = new THREE.SphereGeometry(1, 14, 10);
const stickGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 6);
const atomMats = new Map<string, THREE.Material>();
const stickMat = new THREE.MeshStandardMaterial({ color: '#cfcfcf', roughness: 0.5 });

function atomMat(el: string, tint?: string): THREE.Material {
  const key = el + (tint ?? '');
  let m = atomMats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: tint ?? ATOM_COLORS[el] ?? '#ccc', roughness: el === 'Fe' || el === 'Cu' ? 0.3 : 0.45, metalness: el === 'Fe' || el === 'Cu' ? 0.6 : 0.05 });
    atomMats.set(key, m);
  }
  return m;
}

function atom(el: string, p: THREE.Vector3, scale = 1, tint?: string): THREE.Mesh {
  const m = new THREE.Mesh(sphereGeo, atomMat(el, tint));
  m.position.copy(p);
  m.scale.setScalar((ATOM_R[el] ?? 0.18) * scale);
  return m;
}

function stick(a: THREE.Vector3, b: THREE.Vector3): THREE.Mesh {
  const m = new THREE.Mesh(stickGeo, stickMat);
  const d = b.clone().sub(a);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.scale.set(1, d.length(), 1);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function molecule(atoms: [string, THREE.Vector3][], bonds: [number, number][], tint?: string): THREE.Group {
  const g = new THREE.Group();
  atoms.forEach(([el, p]) => g.add(atom(el, p, 1, el === 'C' || el === 'N' ? tint : undefined)));
  bonds.forEach(([a, b]) => g.add(stick(atoms[a][1], atoms[b][1])));
  return g;
}

function lattice(a: string, b: string, n: number, step = 0.34, scale = 0.9): THREE.Group {
  const g = new THREE.Group();
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
    const el = (x + y + z) % 2 === 0 ? a : b;
    g.add(atom(el, V((x - (n - 1) / 2) * step, (y - (n - 1) / 2) * step, (z - (n - 1) / 2) * step), scale));
  }
  return g;
}

function grain(color: string, size: number, detail = 0): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(size, detail).scale(1, 0.8, 0.9), new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }));
  g.add(m);
  return g;
}

/** One unit's lens model. `dissolved` decides ions vs crystal. */
export function unitModel(u: UnitId, dissolved: boolean): THREE.Group {
  switch (u) {
    case 'water': return molecule([['O', V(0, 0, 0)], ['H', V(0.26, 0.2, 0)], ['H', V(-0.26, 0.2, 0)]], [[0, 1], [0, 2]]);
    case 'salt': {
      if (dissolved) {
        const g = new THREE.Group();
        g.add(atom(Math.random() < 0.5 ? 'Na' : 'Cl', V(0, 0, 0), 1.1));
        return g;
      }
      return lattice('Na', 'Cl', 3);
    }
    case 'sand': return grain('#d9a55b', 0.85);
    case 'gravel': return grain('#c8c0b0', 1.2, 1);
    case 'iron': {
      const g = new THREE.Group();
      for (let i = 0; i < 9; i++) g.add(atom('Fe', V((i % 3) * 0.3 - 0.3 + (i > 5 ? 0.15 : 0), Math.floor(i / 3) * 0.3 - 0.3, (i % 2) * 0.15), 1.1));
      g.scale.set(1.6, 0.9, 0.9);
      return g;
    }
    case 'ironSulfide': return lattice('Fe', 'S', 3, 0.36, 0.95);
    case 'sulfur': {
      const g = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.add(atom('S', V(Math.cos(a) * 0.4, (i % 2) * 0.18, Math.sin(a) * 0.4), 0.9));
      }
      return g;
    }
    case 'oil': {
      const atoms: [string, THREE.Vector3][] = [];
      const bonds: [number, number][] = [];
      for (let i = 0; i < 7; i++) {
        atoms.push(['C', V(i * 0.26 - 0.8, (i % 2) * 0.16, 0)]);
        if (i) bonds.push([i - 1, i]);
      }
      atoms.push(['O', V(1.05, 0.1, 0)]);
      bonds.push([6, 7]);
      return molecule(atoms, bonds);
    }
    case 'sugar': {
      const atoms: [string, THREE.Vector3][] = [];
      const bonds: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        atoms.push([i === 0 ? 'O' : 'C', V(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0)]);
        bonds.push([i, (i + 1) % 6]);
      }
      for (let i = 1; i < 6; i += 2) {
        const a = (i / 6) * Math.PI * 2;
        atoms.push(['O', V(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.1)]);
        bonds.push([i, atoms.length - 1]);
      }
      const g = molecule(atoms, bonds);
      g.add(new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 6), new THREE.MeshStandardMaterial({ color: '#ff8fc8' })));
      return g;
    }
    case 'ethanol': return molecule([['C', V(-0.3, 0, 0)], ['C', V(0, 0.15, 0)], ['O', V(0.3, 0, 0)], ['H', V(0.5, 0.15, 0)], ['H', V(-0.45, 0.2, 0.1)], ['H', V(-0.4, -0.2, 0.1)]], [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5]]);
    case 'aceticAcid': return molecule([['C', V(-0.25, 0, 0)], ['C', V(0.05, 0.1, 0)], ['O', V(0.25, 0.32, 0)], ['O', V(0.28, -0.12, 0)], ['H', V(0.5, -0.05, 0)]], [[0, 1], [1, 2], [1, 3], [3, 4]]);
    case 'pigmentBlue':
    case 'pigmentYellow': {
      const tint = u === 'pigmentBlue' ? '#2f6bff' : '#ffd400';
      const atoms: [string, THREE.Vector3][] = [];
      const bonds: [number, number][] = [];
      for (let r = 0; r < 3; r++) {
        const cx = (r - 1) * 0.55;
        const base = atoms.length;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          atoms.push(['C', V(cx + Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0)]);
          bonds.push([base + i, base + ((i + 1) % 6)]);
        }
      }
      return molecule(atoms, bonds, tint);
    }
    case 'nitrogen': return molecule([['N', V(-0.17, 0, 0)], ['N', V(0.17, 0, 0)]], [[0, 1]]);
    case 'oxygen': return molecule([['O', V(-0.16, 0, 0)], ['O', V(0.16, 0, 0)]], [[0, 1]]);
    case 'argon': { const g = new THREE.Group(); g.add(atom('Ar', V(0, 0, 0))); return g; }
    case 'carbonDioxide': return molecule([['O', V(-0.3, 0, 0)], ['C', V(0, 0, 0)], ['O', V(0.3, 0, 0)]], [[0, 1], [1, 2]]);
    case 'copperSulfate': {
      if (!dissolved) return lattice('Cu', 'S', 3, 0.34, 0.9);
      if (Math.random() < 0.5) { const g = new THREE.Group(); g.add(atom('Cu', V(0, 0, 0), 1.2)); return g; }
      return molecule([['S', V(0, 0, 0)], ['O', V(0.28, 0.2, 0)], ['O', V(-0.28, 0.2, 0)], ['O', V(0, -0.2, 0.28)], ['O', V(0, -0.2, -0.28)]], [[0, 1], [0, 2], [0, 3], [0, 4]]);
    }
  }
}

interface Mover {
  obj: THREE.Object3D;
  home: THREE.Vector3;
  phase: number;
  spin: THREE.Vector3;
  amp: number;
  speed: number;
}

export class Lens {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  rt: THREE.WebGLRenderTarget;
  private movers: Mover[] = [];
  private content = new THREE.Group();
  private overlayScene = new THREE.Scene();
  private overlayCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quadMat: THREE.ShaderMaterial;
  comp: Comp | null = null;
  reduced = false;

  constructor() {
    this.rt = new THREE.WebGLRenderTarget(640, 640, { samples: 4 });
    this.camera.position.set(0, 0, 8.2);
    this.scene.background = new THREE.Color('#cfe9ec');
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#8aa', 2.0));
    const d = new THREE.DirectionalLight('#fff', 2.2);
    d.position.set(3, 5, 6);
    this.scene.add(d);
    // glass-tube walls around the view
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 30, 32, 1, true).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#9ed6dc', side: THREE.BackSide, roughness: 0.3 }));
    this.scene.add(tube, this.content);
    this.quadMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.rt.texture }, time: { value: 0 } },
      transparent: true,
      depthTest: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform float time; varying vec2 vUv;
        void main(){ vec2 c = vUv - 0.5; float r = length(c); if (r > 0.5) discard;
          vec4 col = texture2D(map, vUv);
          float vig = smoothstep(0.5, 0.28, r);
          col.rgb *= 0.78 + 0.22 * vig;
          float hl = smoothstep(0.18, 0.0, length(c - vec2(-0.17, 0.2))) * 0.35;
          col.rgb += hl;
          gl_FragColor = vec4(col.rgb, smoothstep(0.5, 0.49, r)); }`,
    });
    this.overlayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.quadMat));
  }

  show(comp: Comp): void {
    this.comp = comp;
    this.content.clear();
    this.movers = [];
    const us = units(comp);
    if (us.length === 0) return;
    const uniform = isUniform(comp);
    const tot = total(comp);
    const oils = immiscibleLiquids(comp);
    const budget = 46;
    // distribute counts by mass share, min 3 per unit type; big grains are fewer
    for (const u of us) {
      const s = sub(u);
      const dis = dissolvedMass(comp, u);
      const solidPart = undissolvedSolidMass(comp, u);
      const share = mass(comp, u) / tot;
      let n = Math.max(3, Math.round(share * budget));
      if (u === 'sand' || u === 'gravel') n = Math.min(n, 4);
      if (u === 'iron' || u === 'ironSulfide' || u === 'sulfur' || (s.phase === 'solid' && solidPart > 0 && dis === 0)) n = Math.min(n, 7);
      for (let i = 0; i < n; i++) {
        const dissolvedNow = dis > 0 && (solidPart <= 0 || i < n * (dis / mass(comp, u)));
        const obj = unitModel(u, dissolvedNow);
        // home position: uniform → anywhere; regions → per-component clumps / layers
        const home = new THREE.Vector3();
        if (uniform) {
          home.set((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3);
        } else if (s.phase === 'liquid' && oils.includes(u)) {
          home.set((Math.random() - 0.5) * 7, 1.2 + Math.random() * 1.8, (Math.random() - 0.5) * 3);
        } else if (s.phase === 'solid' && !dissolvedNow) {
          const idx = us.filter((x) => sub(x).phase === 'solid').indexOf(u);
          const cx = (idx % 2 === 0 ? -1 : 1) * (1.4 + (idx >> 1) * 0.9);
          home.set(cx + (Math.random() - 0.5) * 1.8, -1.6 + (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 2);
        } else {
          home.set((Math.random() - 0.5) * 7, (oils.length ? -1.2 : 0) + (Math.random() - 0.5) * (oils.length ? 2.2 : 5.5), (Math.random() - 0.5) * 3);
        }
        obj.position.copy(home);
        obj.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        const gas = s.phase === 'gas';
        const solid = s.phase === 'solid' && !dissolvedNow;
        this.content.add(obj);
        this.movers.push({ obj, home, phase: Math.random() * 100, spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(solid ? 0.3 : 1.5), amp: gas ? 1.2 : solid ? 0.12 : 0.45, speed: gas ? 2.2 : solid ? 0.4 : 1 });
      }
    }
  }

  update(dt: number, t: number): void {
    const k = this.reduced ? 0.25 : 1;
    for (const m of this.movers) {
      const p = m.phase + t * m.speed * k;
      m.obj.position.set(m.home.x + Math.sin(p * 1.3) * m.amp, m.home.y + Math.sin(p * 0.9 + 1) * m.amp * 0.7, m.home.z + Math.cos(p * 1.1) * m.amp * 0.6);
      m.obj.rotation.x += m.spin.x * dt * k;
      m.obj.rotation.y += m.spin.y * dt * k;
    }
    this.camera.position.x = Math.sin(t * 0.2) * 0.6 * k;
    this.camera.lookAt(0, 0, 0);
    this.quadMat.uniforms.time.value = t;
  }

  /** Render the lens into its circular screen rect (CSS px, origin top-left). */
  render(renderer: THREE.WebGLRenderer, rect: DOMRect, canvasH: number): void {
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
    const y = canvasH - rect.bottom;
    renderer.setViewport(rect.left, y, rect.width, rect.height);
    renderer.setScissor(rect.left, y, rect.width, rect.height);
    renderer.setScissorTest(true);
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(this.overlayScene, this.overlayCam);
    renderer.autoClear = ac;
    renderer.setScissorTest(false);
  }
}
