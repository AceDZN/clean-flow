// v2 board geometry: the floating sandstone island, board→world mapping and pipe routes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { palmGeometry } from '../render/terrain';

export const BX = 1.5; // world units per board x
export const BZ = 1.6; // world units per board z
export const PIPE_Y = 0.62;
export const PIPE_R = 0.27;

export function toWorld(x: number, z: number, y = 0): THREE.Vector3 {
  return new THREE.Vector3((x - 6) * BX, y, (z - 3) * BZ);
}

function rand(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A soft, slightly irregular rounded-rectangle outline. */
function outline(hw: number, hd: number, r: () => number, wobble: number, n = 72): THREE.Shape {
  const pts: THREE.Vector2[] = [];
  const phase = r() * 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // superellipse
    const p = 4.5;
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / p) * hw;
    const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / p) * hd;
    const k = 1 + (Math.sin(a * 5 + phase) * 0.5 + Math.sin(a * 11 + phase * 2) * 0.3 + (r() - 0.5) * 0.4) * wobble;
    pts.push(new THREE.Vector2(x * k, y * k));
  }
  return new THREE.Shape(pts);
}

export interface Island {
  group: THREE.Group;
  top: number; // y of the walking surface
}

/** Layered floating plateau sized to the given world-space rectangle. */
export function buildIsland(minX: number, maxX: number, minZ: number, maxZ: number, seed: number, decorate = true): Island {
  const r = rand(seed * 9973 + 17);
  const group = new THREE.Group();
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const hw = (maxX - minX) / 2;
  const hd = (maxZ - minZ) / 2;
  const topColor = new THREE.Color('#e39a58');
  const layerColors = ['#cf7a3e', '#c06a35', '#ae5b2d', '#9a4d27', '#843f20'];
  const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.95, flatShading: true });
  const layers = 5;
  for (let k = 0; k < layers; k++) {
    const shrink = 1 - k * 0.07 - (k > 2 ? (k - 2) * 0.06 : 0);
    const shape = outline(hw * shrink, hd * shrink, r, 0.035 + k * 0.012);
    const depth = 0.55 + r() * 0.15;
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.14, bevelSegments: 1, curveSegments: 1 });
    geo.rotateX(Math.PI / 2); // extrude downwards
    const sideMat = new THREE.MeshStandardMaterial({ color: layerColors[k], roughness: 1, flatShading: true });
    const m = new THREE.Mesh(geo, k === 0 ? [topMat, sideMat] : [sideMat, sideMat]);
    m.position.set(cx + (r() - 0.5) * 0.3 * k, -k * 0.62, cz + (r() - 0.5) * 0.3 * k);
    m.castShadow = k === 0;
    m.receiveShadow = true;
    group.add(m);
  }
  // hanging rock tip below
  const tip = new THREE.Mesh(new THREE.ConeGeometry(Math.min(hw, hd) * 0.55, 2.4, 7), new THREE.MeshStandardMaterial({ color: '#8a4626', roughness: 1, flatShading: true }));
  tip.rotation.x = Math.PI;
  tip.position.set(cx, -layers * 0.62 - 0.9, cz);
  group.add(tip);

  if (decorate) {
    // rocks along the rim
    const rockGeo = new THREE.DodecahedronGeometry(0.32, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: '#c46f38', roughness: 1, flatShading: true });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 40);
    const mtx = new THREE.Matrix4();
    let ri = 0;
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2;
      const rx = cx + Math.cos(a) * hw * (0.86 + r() * 0.08);
      const rz = cz + Math.sin(a) * hd * (0.82 + r() * 0.1);
      const s = 0.5 + r() * 1.3;
      mtx.compose(new THREE.Vector3(rx, 0.05, rz), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r() * 6, r())), new THREE.Vector3(s, s * 0.7, s));
      rocks.setMatrixAt(ri++, mtx);
    }
    rocks.count = ri;
    rocks.castShadow = true;
    group.add(rocks);
    // grass tufts
    const tuftGeo = mergeGeometries([0, 1, 2].map((i) => new THREE.ConeGeometry(0.05, 0.38, 3).rotateZ((i - 1) * 0.35).translate((i - 1) * 0.06, 0.17, 0).toNonIndexed()))!;
    const tufts = new THREE.InstancedMesh(tuftGeo, new THREE.MeshStandardMaterial({ color: '#7fa64a', roughness: 0.8, flatShading: true }), 30);
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.55 + r() * 0.4;
      mtx.compose(new THREE.Vector3(cx + Math.cos(a) * hw * d, 0, cz + Math.sin(a) * hd * d), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, 0)), new THREE.Vector3(1, 0.7 + r() * 0.8, 1));
      tufts.setMatrixAt(i, mtx);
    }
    group.add(tufts);
  }
  return { group, top: 0 };
}

/** Palms at given world positions. */
export function palms(points: THREE.Vector3[], seed: number): THREE.Group {
  const g = new THREE.Group();
  const r = rand(seed + 3);
  const pg = palmGeometry();
  const trunk = new THREE.InstancedMesh(pg.trunk, new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: 0.9, flatShading: true }), Math.max(1, points.length));
  const leaves = new THREE.InstancedMesh(pg.leaves, new THREE.MeshStandardMaterial({ color: '#4f9a3f', roughness: 0.7, flatShading: true, side: THREE.DoubleSide }), Math.max(1, points.length));
  trunk.castShadow = leaves.castShadow = true;
  const m = new THREE.Matrix4();
  points.forEach((p, i) => {
    const s = 1.5 + r() * 0.7;
    m.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6.28, 0)), new THREE.Vector3(s, s, s));
    trunk.setMatrixAt(i, m);
    leaves.setMatrixAt(i, m);
  });
  trunk.count = leaves.count = points.length;
  g.add(trunk, leaves);
  return g;
}

/** Straight runs with a smooth S-bend, like the mockups (flow runs right → left). */
export function pipeRoute(a: THREE.Vector3, b: THREE.Vector3): THREE.CatmullRomCurve3 {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (Math.abs(dz) < 0.05) return new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.5), b]);
  const bend = Math.min(Math.abs(dx) * 0.5, Math.max(1.0, Math.abs(dz) * 0.9));
  const sx = Math.sign(dx) || -1;
  const p1 = new THREE.Vector3(a.x + sx * 0.35, a.y, a.z);
  const p2 = new THREE.Vector3(a.x + sx * Math.max(0.5, Math.abs(dx) - bend - 0.4) * 0.5, a.y, a.z);
  const p3 = new THREE.Vector3(p2.x + sx * bend, a.y, b.z);
  const p4 = new THREE.Vector3(b.x - sx * 0.35, b.y, b.z);
  return new THREE.CatmullRomCurve3([a, p1, p2, p3, p4, b], false, 'centripetal', 0.5);
}
