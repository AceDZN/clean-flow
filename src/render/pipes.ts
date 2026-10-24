// Glass pipes with instanced particles riding inside them. Reads sim state only.
import * as THREE from 'three';
import { units, mass, total, type Comp } from '../sim/mixture';
import { ALL_UNITS, SUBSTANCES, type UnitId } from '../sim/substances';
import type { PipeRT } from '../sim/world';
import { particleGeometry } from './particleGeo';

export const PARTICLES_PER_PACKET = 14;
const MAX_PER_UNIT = 2200;

export interface PipeView {
  id: string;
  curve: THREE.CatmullRomCurve3;
  mesh: THREE.Mesh;
  mat: THREE.MeshPhysicalMaterial;
  key: string; // geometry cache key
}

export function pipeCurve(a: THREE.Vector3, dirA: THREE.Vector3, b: THREE.Vector3): THREE.CatmullRomCurve3 {
  const out = a.clone().addScaledVector(dirA, 0.45);
  const d = a.distanceTo(b);
  const mid = a.clone().lerp(b, 0.5);
  mid.y = Math.max(a.y, b.y) + 0.3 + d * 0.035;
  const preB = b.clone();
  preB.y += 0.5;
  return new THREE.CatmullRomCurve3([a, out, mid, preB, b], false, 'centripetal');
}

/** Split a packet into a fixed number of visible particles, by mass (each component ≥ 1). */
export function particleUnits(c: Comp, n = PARTICLES_PER_PACKET): UnitId[] {
  const us = units(c);
  if (us.length === 0) return [];
  const tot = total(c);
  const slots: UnitId[] = [...us];
  const remaining = Math.max(0, n - us.length);
  const shares = us.map((u) => ({ u, s: (mass(c, u) / tot) * remaining }));
  for (const sh of shares) for (let i = 0; i < Math.floor(sh.s); i++) slots.push(sh.u);
  shares.sort((x, y) => (y.s % 1) - (x.s % 1));
  let k = 0;
  while (slots.length < n && shares.length) slots.push(shares[k++ % shares.length].u);
  return slots;
}

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class ParticleField {
  meshes = new Map<UnitId, THREE.InstancedMesh>();
  counts = new Map<UnitId, number>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3(1, 1, 1);

  constructor(scene: THREE.Object3D, scale = 1.2) {
    for (const u of ALL_UNITS) {
      const sub = SUBSTANCES[u];
      const mat = new THREE.MeshStandardMaterial({ color: sub.color, roughness: u === 'iron' ? 0.35 : 0.5, metalness: u === 'iron' ? 0.7 : 0.05, emissive: sub.color, emissiveIntensity: 0.18 });
      const im = new THREE.InstancedMesh(particleGeometry(sub.shape).scale(scale, scale, scale), mat, MAX_PER_UNIT);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.count = 0;
      im.frustumCulled = false;
      im.castShadow = false;
      scene.add(im);
      this.meshes.set(u, im);
    }
  }

  begin(): void {
    for (const u of ALL_UNITS) this.counts.set(u, 0);
  }

  put(u: UnitId, p: THREE.Vector3, seed: number, t: number, sizeMul = 1): void {
    const im = this.meshes.get(u)!;
    const i = this.counts.get(u)!;
    if (i >= MAX_PER_UNIT) return;
    this.e.set(t * (0.7 + hash01(seed) * 1.5) + seed, t * 1.1 + seed * 2, 0);
    this.q.setFromEuler(this.e);
    this.s.setScalar(sizeMul);
    this.m.compose(p, this.q, this.s);
    im.setMatrixAt(i, this.m);
    this.counts.set(u, i + 1);
  }

  end(): void {
    for (const [u, im] of this.meshes) {
      im.count = this.counts.get(u)!;
      im.instanceMatrix.needsUpdate = true;
    }
  }

  /** Draw a packet's particles at a point along a curve. */
  packetOnCurve(curve: THREE.CatmullRomCurve3, u0: number, comp: Comp, packetId: number, t: number, spread = 0.14, trailLen = 2.4): void {
    const list = particleUnits(comp);
    const tmp = new THREE.Vector3();
    const tan = new THREE.Vector3();
    list.forEach((unit, k) => {
      const seed = packetId * 13 + k;
      // particles trail behind the packet head so a running pipe looks full (head = sim position)
      const L = Math.max(1, curve.getLength());
      const trail = Math.min(trailLen, u0 * L);
      const u = THREE.MathUtils.clamp(u0 - (hash01(seed) * trail) / L, 0, 1);
      curve.getPointAt(u, tmp);
      curve.getTangentAt(u, tan);
      const a = hash01(seed + 5) * Math.PI * 2 + t * (0.8 + hash01(seed + 9));
      const r = spread * Math.sqrt(hash01(seed + 3)) * 0.8;
      // a perpendicular basis
      const n1 = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const n2 = new THREE.Vector3().crossVectors(tan, n1).normalize();
      tmp.addScaledVector(n1, Math.cos(a) * r).addScaledVector(n2, Math.sin(a) * r);
      this.put(unit, tmp, seed, t);
    });
  }
}

export function glassPipeMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color: '#dcf7ff', metalness: 0.1, roughness: 0.02, transparent: true, opacity: 0.3, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 2.2, emissive: '#7fe9ff', emissiveIntensity: 0.0, side: THREE.DoubleSide });
}

export function buildPipeMesh(curve: THREE.CatmullRomCurve3, mat: THREE.Material, radius = 0.21): THREE.Mesh {
  const geo = new THREE.TubeGeometry(curve, Math.max(24, Math.floor(curve.getLength() * 10)), radius, 12, false);
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 2;
  return m;
}

/** Draw every packet travelling in a pipe. */
export function drawPipePackets(field: ParticleField, view: PipeView, pipe: PipeRT, t: number): void {
  for (const pk of pipe.packets) {
    const u = pipe.length > 0 ? pk.pos / pipe.length : 0;
    field.packetOnCurve(view.curve, u, pk.comp, pk.id, t);
  }
}
