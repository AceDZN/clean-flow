// Procedural 3D builds for sources, customers, waste and the separation machines.
// Tripo GLBs (when present) replace the static body; animated parts stay procedural.
import * as THREE from 'three';
import type { CustomerLook, SourceLook } from '../sim/levels';
import type { StationType } from '../sim/stations';
import { MAT, enableShadows, liquidMat, solidMat } from './materials';

export interface AnimInfo {
  busy: boolean; // processing a packet right now
  stalled: boolean; // output backed up
  intensity: number; // 0..1 activity
  stillTemp?: number;
  fill?: number; // customer fill 0..1
}

export interface NodeView {
  group: THREE.Group;
  body: THREE.Group; // replaceable by GLB
  ports: Record<string, THREE.Object3D>;
  portHits: Record<string, THREE.Mesh>;
  inlet: THREE.Object3D;
  hit: THREE.Mesh;
  anim(dt: number, t: number, info: AnimInfo): void;
  /** world-space height for labels */
  labelY: number;
}

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
}

function nozzle(color: string): { group: THREE.Group; hit: THREE.Mesh } {
  const group = new THREE.Group();
  const stub = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10).rotateZ(Math.PI / 2), MAT.copper);
  stub.position.x = -0.15;
  const ring = mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 16).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.4 }));
  group.add(stub, ring);
  const hit = mesh(new THREE.SphereGeometry(0.3, 8, 6), HIT_MAT);
  group.add(hit);
  return { group, hit };
}

function makeView(labelY: number): NodeView {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const inlet = new THREE.Object3D();
  inlet.position.set(0, 0.7, 0);
  group.add(inlet);
  const hit = mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.5, 8), HIT_MAT, 0, 0.75, 0);
  group.add(hit);
  return { group, body, ports: {}, portHits: {}, inlet, hit, anim: () => {}, labelY };
}

const PORT_COLORS = ['#ffd166', '#6fd3cf', '#ff8fa3'];

function addPorts(v: NodeView, ids: string[], y = 0.45): void {
  const layouts: [number, number][][] = [[[0.75, 0.2]], [[0.72, 0.35], [-0.72, 0.35]], [[0.72, 0.3], [-0.72, 0.3], [0, 0.78]]];
  const lay = layouts[ids.length - 1];
  ids.forEach((id, i) => {
    const n = nozzle(PORT_COLORS[i]);
    const [x, z] = lay[i];
    n.group.position.set(x, y, z);
    n.group.rotation.y = Math.atan2(-z, x) ;
    v.group.add(n.group);
    v.ports[id] = n.group;
    v.portHits[id] = n.hit;
    n.hit.userData.port = id;
  });
}

// ---------------- stations ----------------

export function buildStation(type: StationType, outputs: string[]): NodeView {
  const v = makeView(2.0);
  const b = v.body;
  const base = mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.18, 8), MAT.brass, 0, 0.09, 0);
  b.add(base);
  let animParts: (dt: number, t: number, info: AnimInfo) => void = () => {};
  switch (type) {
    case 'magnet': {
      const frame1 = mesh(new THREE.BoxGeometry(0.12, 0.8, 0.5), MAT.brass, 0.42, 0.55, 0);
      const frame2 = frame1.clone();
      frame2.position.x = -0.42;
      const drum = new THREE.Group();
      drum.position.set(0, 0.75, 0);
      const cyl = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.72, 20).rotateZ(Math.PI / 2), MAT.steel);
      drum.add(cyl);
      for (let i = 0; i < 6; i++) {
        const bar = mesh(new THREE.BoxGeometry(0.74, 0.08, 0.1), i % 2 ? MAT.red : MAT.darkMetal);
        const a = (i / 6) * Math.PI * 2;
        bar.position.set(0, Math.sin(a) * 0.33, Math.cos(a) * 0.33);
        bar.rotation.x = -a;
        drum.add(bar);
      }
      // horseshoe magnet on top
      const shoe = mesh(new THREE.TorusGeometry(0.2, 0.07, 8, 16, Math.PI), MAT.red, 0, 1.22, 0);
      const tip1 = mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), MAT.steel, 0.2, 1.17, 0);
      const tip2 = tip1.clone();
      tip2.position.x = -0.2;
      const hopper = mesh(new THREE.CylinderGeometry(0.3, 0.12, 0.3, 8, 1, true), MAT.glass, 0, 1.3, 0.25);
      b.add(frame1, frame2, drum, shoe, tip1, tip2, hopper);
      animParts = (dt, _t, info) => {
        drum.rotation.x -= dt * (info.busy ? 6 : 1.2);
      };
      break;
    }
    case 'filter': {
      const legs = [0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        const leg = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), MAT.brass, Math.cos(a) * 0.38, 0.75, Math.sin(a) * 0.38);
        leg.rotation.z = Math.cos(a) * 0.12;
        leg.rotation.x = -Math.sin(a) * 0.12;
        return leg;
      });
      const ring = mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 20).rotateX(Math.PI / 2), MAT.brass, 0, 1.3, 0);
      const cone = mesh(new THREE.ConeGeometry(0.45, 0.65, 20, 1, true).rotateX(Math.PI), MAT.glass, 0, 1.08, 0);
      const paper = mesh(new THREE.ConeGeometry(0.38, 0.52, 14, 1, true).rotateX(Math.PI), MAT.paper, 0, 1.14, 0);
      const flask = mesh(new THREE.SphereGeometry(0.28, 16, 12), MAT.glass, 0, 0.42, 0);
      const flaskLiquid = mesh(new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), liquidMat('#7fd6ff', 0.7), 0, 0.42, 0);
      const drip = mesh(new THREE.SphereGeometry(0.04, 8, 6), liquidMat('#9fe3ff'), 0, 0.75, 0);
      const pile = mesh(new THREE.ConeGeometry(0.2, 0.12, 10), solidMat('#c99a5c'), 0, 0.95, 0);
      b.add(...legs, ring, cone, paper, flask, flaskLiquid, drip, pile);
      animParts = (dt, t, info) => {
        const k = (t * (info.busy ? 2.2 : 0.6)) % 1;
        drip.position.y = 0.8 - k * 0.3;
        drip.visible = info.intensity > 0.05;
        pile.scale.setScalar(0.6 + info.intensity * 0.6);
        void dt;
      };
      break;
    }
    case 'sieve': {
      const frame = mesh(new THREE.BoxGeometry(1.0, 0.12, 0.8), MAT.wood, 0, 0.85, 0);
      const mesh1 = mesh(new THREE.PlaneGeometry(0.9, 0.7, 8, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#555', wireframe: true }), 0, 0.92, 0);
      const legs = [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]].map(([x, z]) => mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), MAT.wood, x, 0.45, z));
      const tray = mesh(new THREE.BoxGeometry(0.9, 0.08, 0.7), MAT.copper, 0, 0.35, 0);
      const pebbles = new THREE.Group();
      for (let i = 0; i < 6; i++) pebbles.add(mesh(new THREE.SphereGeometry(0.08, 6, 5).scale(1.2, 0.7, 1), solidMat('#c8c0b0'), (Math.random() - 0.5) * 0.6, 1.0, (Math.random() - 0.5) * 0.4));
      const shaker = new THREE.Group();
      shaker.add(frame, mesh1, pebbles);
      b.add(shaker, tray, ...legs);
      animParts = (_dt, t, info) => {
        shaker.position.x = info.busy ? Math.sin(t * 40) * 0.04 : 0;
      };
      break;
    }
    case 'funnel': {
      const stand = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 6), MAT.brass, -0.45, 1.05, 0);
      const arm = mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), MAT.brass, -0.22, 1.5, 0);
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 16; i++) {
        const y = i / 16;
        const r = Math.sin(Math.PI * Math.pow(y, 0.8)) * 0.36 * (1 - y * 0.35) + 0.03;
        pts.push(new THREE.Vector2(r, y * 1.0));
      }
      const pear = mesh(new THREE.LatheGeometry(pts, 20), MAT.glass, 0, 0.9, 0);
      const top = mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.22, 16), liquidMat('#f2b63a', 0.85), 0, 1.38, 0);
      const bottom = mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.3, 16), liquidMat('#5cc8ff', 0.75), 0, 1.12, 0);
      const stem = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), MAT.glass, 0, 0.65, 0);
      const tap = mesh(new THREE.BoxGeometry(0.22, 0.06, 0.06), MAT.red, 0, 0.6, 0);
      b.add(stand, arm, pear, top, bottom, stem, tap);
      animParts = (_dt, t, info) => {
        tap.rotation.y = info.busy ? Math.sin(t * 6) * 0.6 : 0;
        top.position.y = 1.38 + Math.sin(t * 1.5) * 0.01;
      };
      break;
    }
    case 'tank': {
      const tank = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 20, 1, true), MAT.copper, 0, 0.65, 0);
      const bottomCap = mesh(new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2), MAT.copper, 0, 0.21, 0);
      const liquid = mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.7, 20), liquidMat('#86d3e6', 0.9), 0, 0.56, 0);
      const rim = mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 24).rotateX(Math.PI / 2), MAT.brass, 0, 1.1, 0);
      const shaft = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), MAT.steel, 0, 1.15, 0);
      const motor = mesh(new THREE.BoxGeometry(0.26, 0.2, 0.26), MAT.darkMetal, 0, 1.58, 0);
      const bridge = mesh(new THREE.BoxGeometry(1.1, 0.06, 0.12), MAT.brass, 0, 1.46, 0);
      const paddle = new THREE.Group();
      paddle.position.y = 0.7;
      paddle.add(mesh(new THREE.BoxGeometry(0.7, 0.18, 0.03), MAT.steel));
      b.add(tank, bottomCap, liquid, rim, shaft, motor, bridge, paddle);
      v.inlet.position.set(0, 1.2, 0);
      animParts = (dt, _t, info) => {
        paddle.rotation.y += dt * (info.busy ? 9 : 2);
        liquid.scale.y = 0.5 + info.intensity * 0.5;
        liquid.position.y = 0.21 + 0.35 * liquid.scale.y;
      };
      break;
    }
    case 'pan': {
      const bricks = mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.42, 10), MAT.brick, 0, 0.35, 0);
      const fire = mesh(new THREE.BoxGeometry(0.4, 0.18, 0.2), MAT.fire, 0, 0.3, 0.62);
      const pan = mesh(new THREE.CylinderGeometry(0.78, 0.6, 0.16, 24, 1, true), MAT.copper, 0, 0.64, 0);
      const panBottom = mesh(new THREE.CircleGeometry(0.6, 24).rotateX(-Math.PI / 2), MAT.copper, 0, 0.57, 0);
      const brine = mesh(new THREE.CircleGeometry(0.66, 24).rotateX(-Math.PI / 2), liquidMat('#9fe3ff', 0.7), 0, 0.62, 0);
      const crust = new THREE.Group();
      for (let i = 0; i < 14; i++) {
        const c = mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), solidMat('#f6f6f2'), (Math.random() - 0.5) * 0.9, 0.64, (Math.random() - 0.5) * 0.9);
        c.rotation.set(Math.random(), Math.random(), Math.random());
        if (c.position.length() < 0.65) crust.add(c);
      }
      b.add(bricks, fire, pan, panBottom, brine, crust);
      animParts = (_dt, t, info) => {
        (fire.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(t * 13) * 0.3 + info.intensity;
        brine.scale.setScalar(0.4 + 0.6 * info.intensity);
        crust.visible = true;
      };
      break;
    }
    case 'still': {
      const burner = mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.25, 10), MAT.darkMetal, 0.15, 0.3, 0);
      const flame = mesh(new THREE.ConeGeometry(0.15, 0.25, 8), MAT.fire, 0.15, 0.5, 0);
      const boiler = mesh(new THREE.SphereGeometry(0.42, 20, 16), MAT.copper, 0.15, 0.95, 0);
      const neck = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.15, 1.3, 0), new THREE.Vector3(0.1, 1.65, 0), new THREE.Vector3(-0.25, 1.75, 0), new THREE.Vector3(-0.45, 1.45, 0)]), 20, 0.06, 8);
      const neckM = mesh(neck, MAT.copper);
      const coil = new THREE.Group();
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 60; i++) {
        const a = i * 0.42;
        pts.push(new THREE.Vector3(-0.5 + Math.cos(a) * 0.18, 1.4 - i * 0.013, Math.sin(a) * 0.18));
      }
      coil.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.03, 6), MAT.glass));
      const jacket = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.9, 16, 1, true), MAT.glass, -0.5, 1.0, 0);
      const thermo = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), MAT.glass, 0.35, 1.45, 0.15);
      const mercury = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), MAT.red, 0.35, 1.3, 0.15);
      const bubbles = new THREE.Group();
      for (let i = 0; i < 5; i++) bubbles.add(mesh(new THREE.SphereGeometry(0.04, 6, 5), liquidMat('#e8fbff', 0.7), 0.15, 1.35, 0));
      b.add(burner, flame, boiler, neckM, coil, jacket, thermo, mercury, bubbles);
      animParts = (_dt, t, info) => {
        const T = info.stillTemp ?? 100;
        mercury.scale.y = T >= 100 ? 1 : 0.62;
        mercury.position.y = 1.05 + 0.25 * mercury.scale.y;
        flame.scale.setScalar(0.8 + Math.sin(t * 17) * 0.1 + (T >= 100 ? 0.4 : 0));
        bubbles.children.forEach((bb, i) => {
          const k = (t * (info.busy ? 1.4 : 0.4) + i / 5) % 1;
          bb.position.set(0.15 + Math.sin(i * 2.3) * 0.12, 1.32 + k * 0.4, Math.cos(i * 1.7) * 0.1);
          bb.visible = info.intensity > 0.05;
        });
      };
      break;
    }
    case 'chroma': {
      const tower = mesh(new THREE.CylinderGeometry(0.38, 0.42, 1.8, 12, 1, true), MAT.glass, 0, 1.1, 0);
      const cap = mesh(new THREE.ConeGeometry(0.45, 0.3, 12), MAT.copper, 0, 2.15, 0);
      const tray = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 12), liquidMat('#9ad8ef'), 0, 0.26, 0);
      const strips = new THREE.Group();
      const bandMats = [solidMat('#ffd400'), solidMat('#2f6bff')];
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Group();
        s.add(mesh(new THREE.PlaneGeometry(0.16, 1.6), MAT.paper));
        const yb = mesh(new THREE.PlaneGeometry(0.16, 0.12), bandMats[0], 0, 0.45, 0.002);
        const bb = mesh(new THREE.PlaneGeometry(0.16, 0.12), bandMats[1], 0, -0.25, 0.002);
        s.add(yb, bb);
        s.position.set(Math.cos(i * 2.1) * 0.2, 1.1, Math.sin(i * 2.1) * 0.2);
        s.rotation.y = -i * 2.1 + Math.PI / 2;
        strips.add(s);
      }
      b.add(tower, cap, tray, strips);
      v.labelY = 2.6;
      animParts = (_dt, t, info) => {
        strips.children.forEach((s, i) => {
          const k = ((t * 0.15 + i * 0.33) % 1) * (0.5 + info.intensity * 0.5);
          s.children[1].position.y = -0.6 + k * 1.2;
          s.children[2].position.y = -0.6 + k * 0.5;
        });
      };
      break;
    }
  }
  addPorts(v, outputs);
  enableShadows(v.group);
  v.anim = animParts;
  return v;
}

// ---------------- sources ----------------

export function buildSource(look: SourceLook, tint: string): NodeView {
  const v = makeView(1.8);
  const b = v.body;
  switch (look) {
    case 'mine':
    case 'blackmine': {
      const rock = mesh(new THREE.DodecahedronGeometry(0.75, 1).scale(1.1, 0.75, 0.9), solidMat(look === 'blackmine' ? '#4a4044' : '#b2814f'), 0, 0.35, -0.1);
      const portal = mesh(new THREE.BoxGeometry(0.55, 0.6, 0.3), MAT.dark, 0, 0.35, 0.45);
      const beam1 = mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), MAT.wood, 0.32, 0.38, 0.6);
      const beam2 = beam1.clone();
      beam2.position.x = -0.32;
      const lintel = mesh(new THREE.BoxGeometry(0.75, 0.09, 0.1), MAT.wood, 0, 0.75, 0.6);
      const tower = new THREE.Group();
      tower.position.set(0.3, 0.9, -0.2);
      tower.add(mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.0, 4), MAT.wood, -0.18, 0.4, 0), mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.0, 4), MAT.wood, 0.18, 0.4, 0));
      const wheel = mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 16), MAT.darkMetal, 0, 0.92, 0);
      tower.add(wheel);
      const cart = mesh(new THREE.BoxGeometry(0.36, 0.2, 0.26), MAT.darkMetal, -0.55, 0.15, 0.55);
      const ore = mesh(new THREE.DodecahedronGeometry(0.16, 0).scale(1, 0.5, 0.8), solidMat(tint), -0.55, 0.3, 0.55);
      b.add(rock, portal, beam1, beam2, lintel, tower, cart, ore);
      v.anim = (dt) => {
        wheel.rotation.z += dt * 2;
      };
      break;
    }
    case 'spring':
    case 'pond':
    case 'well':
    case 'marsh':
    case 'creek': {
      const ring = new THREE.Group();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const s = mesh(new THREE.DodecahedronGeometry(0.16 + (i % 3) * 0.03, 0), MAT.stone, Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62);
        ring.add(s);
      }
      const pool = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 20), liquidMat(tint, 0.88), 0, 0.08, 0);
      b.add(ring, pool);
      if (look === 'well') {
        const w = mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.4, 12, 1, true), MAT.stone, 0, 0.3, 0);
        const roof = mesh(new THREE.ConeGeometry(0.42, 0.3, 4), MAT.wood, 0, 1.0, 0);
        const p1 = mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), MAT.wood, 0.3, 0.6, 0);
        const p2 = p1.clone();
        p2.position.x = -0.3;
        b.add(w, roof, p1, p2);
      }
      if (look === 'marsh') {
        for (let i = 0; i < 6; i++) b.add(mesh(new THREE.ConeGeometry(0.03, 0.5, 4), MAT.green, Math.cos(i) * 0.45, 0.3, Math.sin(i * 1.7) * 0.4));
        b.add(mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.05, 10), solidMat('#c9a26a'), 0.15, 0.12, 0.1));
      }
      if (look === 'creek') {
        b.add(mesh(new THREE.DodecahedronGeometry(0.2, 0), solidMat('#c8c0b0'), 0.2, 0.15, 0.1), mesh(new THREE.DodecahedronGeometry(0.15, 0), solidMat('#c8c0b0'), -0.2, 0.13, -0.15));
      }
      const jet = new THREE.Group();
      for (let i = 0; i < 6; i++) jet.add(mesh(new THREE.SphereGeometry(0.05, 6, 5), liquidMat(tint, 0.8)));
      b.add(jet);
      v.anim = (_dt, t) => {
        jet.children.forEach((d, i) => {
          const k = (t * 0.9 + i / 6) % 1;
          const a = i * 1.05;
          d.position.set(Math.cos(a) * k * 0.3, 0.12 + Math.sin(k * Math.PI) * 0.45, Math.sin(a) * k * 0.3);
        });
      };
      break;
    }
    case 'spill': {
      const tank = mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 16).rotateZ(Math.PI / 2 - 0.25), MAT.steel, 0, 0.45, -0.1);
      const band = mesh(new THREE.TorusGeometry(0.36, 0.04, 6, 16).rotateY(Math.PI / 2), MAT.red, 0, 0.45, -0.1);
      const puddle = mesh(new THREE.CircleGeometry(0.65, 20).rotateX(-Math.PI / 2), liquidMat(tint, 0.9), 0.1, 0.03, 0.3);
      const sheen = mesh(new THREE.CircleGeometry(0.35, 16).rotateX(-Math.PI / 2), liquidMat('#5cc8ff', 0.7), -0.2, 0.04, 0.35);
      b.add(tank, band, puddle, sheen);
      v.anim = (_dt, t) => {
        puddle.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
      };
      break;
    }
    case 'vat':
    case 'ink': {
      const barrel = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 16), MAT.wood, 0, 0.5, 0);
      const hoop1 = mesh(new THREE.TorusGeometry(0.43, 0.03, 6, 20).rotateX(Math.PI / 2), MAT.darkMetal, 0, 0.25, 0);
      const hoop2 = hoop1.clone();
      hoop2.position.y = 0.75;
      const top = mesh(new THREE.CircleGeometry(0.4, 16).rotateX(-Math.PI / 2), liquidMat(tint, 0.95), 0, 0.96, 0);
      b.add(barrel, hoop1, hoop2, top);
      const bub = mesh(new THREE.SphereGeometry(0.06, 8, 6), liquidMat(tint, 0.8), 0, 1.0, 0);
      b.add(bub);
      v.anim = (_dt, t) => {
        const k = (t * 0.7) % 1;
        bub.position.set(Math.sin(t) * 0.15, 0.97 + k * 0.2, Math.cos(t * 1.3) * 0.12);
        bub.scale.setScalar(1 - k);
      };
      break;
    }
    case 'intake': {
      const pipe = mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 12), MAT.steel, 0, 0.7, 0);
      const hood = mesh(new THREE.CylinderGeometry(0.42, 0.2, 0.3, 12), MAT.steel, 0, 1.5, 0);
      const fan = new THREE.Group();
      fan.position.y = 1.5;
      for (let i = 0; i < 4; i++) {
        const blade = mesh(new THREE.BoxGeometry(0.34, 0.02, 0.1), MAT.darkMetal);
        blade.rotation.y = (i / 4) * Math.PI;
        fan.add(blade);
      }
      b.add(pipe, hood, fan);
      v.anim = (dt) => {
        fan.rotation.y += dt * 5;
      };
      break;
    }
    case 'crate': {
      const mk = (x: number, y: number, z: number, s = 0.45) => mesh(new THREE.BoxGeometry(s, s, s), MAT.wood, x, y, z);
      b.add(mk(-0.25, 0.23, 0), mk(0.25, 0.23, 0.05), mk(0, 0.68, 0), mesh(new THREE.ConeGeometry(0.25, 0.2, 10), solidMat('#f5e23a'), 0.45, 0.1, 0.45), mesh(new THREE.ConeGeometry(0.22, 0.18, 10), solidMat('#59606b'), -0.4, 0.09, 0.5));
      break;
    }
  }
  addPorts(v, ['out'], 0.35);
  enableShadows(v.group);
  return v;
}

// ---------------- customers ----------------

const AWNING: Record<CustomerLook, string> = {
  foundry: '#c44b2f', builder: '#e0a43a', village: '#2f9a8e', bakery: '#e38d3a', clinic: '#2f8f56', soap: '#7fc6e8', candy: '#ff7fb6', print: '#3f62c4', perfume: '#9a7fe0', dye: '#1e9bd7', pickle: '#9bbf3a', fertilizer: '#c9b23a', lab: '#7a8a96',
};

export function buildCustomer(look: CustomerLook): NodeView {
  const v = makeView(2.1);
  const b = v.body;
  const house = new THREE.Group();
  house.add(mesh(new THREE.BoxGeometry(1.1, 0.8, 0.9), MAT.plaster, 0, 0.4, 0));
  house.add(mesh(new THREE.BoxGeometry(1.2, 0.08, 1.0), MAT.stone, 0, 0.84, 0));
  const door = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), MAT.dark, 0, 0.42, 0.46);
  door.rotation.z = Math.PI / 2;
  house.add(door, mesh(new THREE.BoxGeometry(0.34, 0.36, 0.04), MAT.dark, 0, 0.22, 0.46));
  const awn = mesh(new THREE.BoxGeometry(0.9, 0.04, 0.32), new THREE.MeshStandardMaterial({ color: AWNING[look], roughness: 0.7 }), 0, 0.68, 0.6);
  awn.rotation.x = 0.35;
  house.add(awn);
  house.userData.isHouse = true;
  b.add(house);
  // signboard (product colour) on the roof
  const sign = mesh(new THREE.BoxGeometry(0.7, 0.3, 0.05), new THREE.MeshStandardMaterial({ color: AWNING[look], roughness: 0.6 }), 0, 1.05, 0.3);
  b.add(sign);
  let anim: NodeView['anim'] = () => {};
  const extra = new THREE.Group();
  b.add(extra);
  switch (look) {
    case 'foundry': {
      const chim = mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.1, 10), MAT.brick, 0.4, 1.3, -0.25);
      const glow = mesh(new THREE.BoxGeometry(0.3, 0.2, 0.05), MAT.fire, -0.32, 0.35, 0.47);
      const smoke = new THREE.Group();
      for (let i = 0; i < 5; i++) smoke.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: '#777', transparent: true, opacity: 0.5, depthWrite: false })));
      extra.add(chim, glow, smoke);
      anim = (_dt, t, info) => {
        smoke.children.forEach((s, i) => {
          const k = (t * 0.4 + i / 5) % 1;
          s.position.set(0.4 + k * 0.3, 1.9 + k * 1.2, -0.25);
          s.scale.setScalar(0.6 + k * 1.4);
          ((s as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - k);
        });
        (glow.material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + (info.fill ?? 0) * 2;
      };
      break;
    }
    case 'builder': {
      const pile = mesh(new THREE.ConeGeometry(0.42, 0.4, 12), solidMat('#d9a55b'), 0.65, 0.2, 0.45);
      const scaffold = new THREE.Group();
      for (const x of [-0.6, -0.15]) scaffold.add(mesh(new THREE.BoxGeometry(0.04, 1.3, 0.04), MAT.wood, x, 0.65, -0.6));
      scaffold.add(mesh(new THREE.BoxGeometry(0.55, 0.04, 0.2), MAT.wood, -0.38, 1.0, -0.6));
      extra.add(pile, scaffold);
      anim = (_dt, _t, info) => {
        pile.scale.setScalar(0.4 + (info.fill ?? 0) * 0.9);
      };
      break;
    }
    case 'village': {
      extra.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), MAT.plaster, -0.75, 0.25, -0.45), mesh(new THREE.BoxGeometry(0.4, 0.62, 0.4), MAT.plaster, 0.75, 0.31, -0.5));
      extra.add(mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.plaster, 0.75, 0.62, -0.5));
      const tank = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12), MAT.steel, -0.3, 1.05, -0.2);
      const waterLvl = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 12), liquidMat('#5cc8ff', 0.9), -0.3, 1.05, -0.2);
      extra.add(tank, waterLvl);
      anim = (_dt, _t, info) => {
        waterLvl.scale.y = 0.1 + (info.fill ?? 0) * 0.9;
      };
      break;
    }
    case 'bakery': {
      const dome = mesh(new THREE.SphereGeometry(0.35, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.brick, 0.7, 0.0, 0.3);
      const mouth = mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), MAT.fire, 0.7, 0.08, 0.64);
      const chim = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), MAT.brick, 0.3, 1.1, -0.2);
      const sack = mesh(new THREE.SphereGeometry(0.17, 10, 8).scale(1, 1.2, 1), MAT.paper, -0.7, 0.2, 0.45);
      extra.add(dome, mouth, chim, sack);
      anim = (_dt, _t, info) => {
        sack.scale.setScalar(0.5 + (info.fill ?? 0) * 0.8);
      };
      break;
    }
    case 'clinic': {
      const plus1 = mesh(new THREE.BoxGeometry(0.34, 0.1, 0.03), MAT.green, 0, 1.05, 0.34);
      const plus2 = mesh(new THREE.BoxGeometry(0.1, 0.34, 0.03), MAT.green, 0, 1.05, 0.34);
      extra.add(plus1, plus2);
      sign.visible = false;
      const tank = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 12), MAT.glass, 0.7, 0.2, 0.4);
      const lvl = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 12), liquidMat('#bfefff', 0.9), 0.7, 0.2, 0.4);
      extra.add(tank, lvl);
      anim = (_dt, _t, info) => {
        lvl.scale.y = 0.1 + (info.fill ?? 0) * 0.9;
      };
      break;
    }
    default: {
      // workshops: jars / vats / sacks in their colour
      const c = AWNING[look];
      for (let i = 0; i < 3; i++) {
        const jar = mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.3, 10), liquidMat(c, 0.95), -0.65 + i * 0.22, 0.15, 0.6);
        extra.add(jar);
      }
      if (look === 'lab') extra.add(mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.glass, 0, 0.88, 0));
      if (look === 'fertilizer') extra.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.4, 12), MAT.steel, 0.75, 0.7, -0.35), mesh(new THREE.ConeGeometry(0.3, 0.3, 12), MAT.steel, 0.75, 1.55, -0.35));
      if (look === 'soap') {
        const bubbles = new THREE.Group();
        for (let i = 0; i < 5; i++) bubbles.add(mesh(new THREE.SphereGeometry(0.07 + i * 0.01, 10, 8), new THREE.MeshPhysicalMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.45, roughness: 0, iridescence: 1 })));
        extra.add(bubbles);
        anim = (_dt, t) => {
          bubbles.children.forEach((bb, i) => {
            const k = (t * 0.3 + i / 5) % 1;
            bb.position.set(Math.sin(i * 3 + t) * 0.4, 1.0 + k * 1.2, Math.cos(i * 2) * 0.3);
          });
        };
      }
      if (look === 'print') {
        const roll = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 14).rotateZ(Math.PI / 2), MAT.paper, 0.1, 0.18, 0.75);
        extra.add(roll);
        anim = (dt) => {
          roll.rotation.x += dt * 2;
        };
      }
      if (look === 'perfume') extra.add(mesh(new THREE.ConeGeometry(0.12, 0.3, 8), liquidMat('#b69cff', 0.8), 0.7, 0.15, 0.5));
      if (look === 'dye') extra.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 14), liquidMat('#1e9bd7', 0.9), 0.75, 0.15, 0.4));
      if (look === 'candy') extra.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), MAT.white, 0.75, 0.3, 0.45), mesh(new THREE.TorusGeometry(0.14, 0.06, 8, 16), solidMat('#ff7fb6'), 0.75, 0.7, 0.45));
      if (look === 'pickle') extra.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 12), MAT.glass, 0.75, 0.22, 0.4), mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.4, 12), liquidMat('#d6e07a', 0.7), 0.75, 0.21, 0.4));
    }
  }
  v.anim = anim;
  enableShadows(v.group);
  return v;
}

export function buildWaste(): NodeView {
  const v = makeView(1.4);
  const b = v.body;
  const rim = mesh(new THREE.CylinderGeometry(0.8, 0.86, 0.22, 16, 1, true), MAT.stone, 0, 0.11, 0);
  const sludge = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.05, 16), new THREE.MeshStandardMaterial({ color: '#6d6650', roughness: 0.4 }), 0, 0.12, 0);
  const sign = mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), MAT.wood, 0.7, 0.4, 0.4);
  const board = mesh(new THREE.BoxGeometry(0.4, 0.22, 0.04), new THREE.MeshStandardMaterial({ color: '#e0c044' }), 0.7, 0.68, 0.42);
  b.add(rim, sludge, sign, board);
  const bub = mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: '#8a8266' }), 0, 0.14, 0);
  b.add(bub);
  v.anim = (_dt, t) => {
    const k = (t * 0.5) % 1;
    bub.position.set(Math.sin(t * 0.7) * 0.4, 0.14 + k * 0.05, Math.cos(t * 0.9) * 0.3);
    bub.scale.setScalar(Math.sin(k * Math.PI));
  };
  v.inlet.position.set(0, 0.4, 0);
  enableShadows(v.group);
  return v;
}
