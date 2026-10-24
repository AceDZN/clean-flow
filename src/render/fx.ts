// Juice: steam, sparks, rejection bursts made of the real particle shapes, confetti.
import * as THREE from 'three';
import type { Comp } from '../sim/mixture';
import type { UnitId } from '../sim/substances';
import { particleUnits, type ParticleField } from './pipes';

interface Debris {
  u: UnitId;
  p: THREE.Vector3;
  v: THREE.Vector3;
  life: number;
  max: number;
  seed: number;
  size: number;
}

interface Puff {
  p: THREE.Vector3;
  v: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  kind: 'steam' | 'spark' | 'confetti' | 'dust';
  color: THREE.Color;
}

const MAX_PUFFS = 900;

export class Fx {
  debris: Debris[] = [];
  puffs: Puff[] = [];
  private steamMesh: THREE.InstancedMesh;
  private sparkMesh: THREE.InstancedMesh;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private col = new THREE.Color();
  reduced = false;

  constructor(scene: THREE.Scene) {
    this.steamMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false, roughness: 1 }), MAX_PUFFS);
    this.sparkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: '#ffffff' }), MAX_PUFFS);
    for (const im of [this.steamMesh, this.sparkMesh]) {
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      im.count = 0;
      scene.add(im);
    }
    this.sparkMesh.setColorAt(0, new THREE.Color('#fff'));
  }

  burst(comp: Comp, at: THREE.Vector3, n = 14, power = 1): void {
    const us = particleUnits(comp, n);
    us.forEach((u, i) => {
      const a = Math.random() * Math.PI * 2;
      const sp = (1.2 + Math.random() * 1.8) * power;
      this.debris.push({ u, p: at.clone(), v: new THREE.Vector3(Math.cos(a) * sp, 2.2 + Math.random() * 2.5 * power, Math.sin(a) * sp), life: 0, max: 1.4 + Math.random() * 0.6, seed: i * 7 + Math.random() * 100, size: 1.6 });
    });
  }

  /** a single particle hopping (e.g. iron jumping to the magnet) */
  hop(u: UnitId, from: THREE.Vector3, to: THREE.Vector3): void {
    const v = to.clone().sub(from).multiplyScalar(1 / 0.6);
    v.y += 2.9;
    this.debris.push({ u, p: from.clone(), v, life: 0, max: 0.6, seed: Math.random() * 100, size: 1.3 });
  }

  steam(at: THREE.Vector3, n = 3): void {
    if (this.reduced) n = 1;
    for (let i = 0; i < n; i++) {
      this.add({ p: at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6)), v: new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.7 + Math.random() * 0.5, (Math.random() - 0.5) * 0.2), life: 0, max: 1.6 + Math.random(), size: 0.6 + Math.random() * 0.6, kind: 'steam', color: new THREE.Color('#fff') });
    }
  }

  dust(at: THREE.Vector3, color: string, n = 8): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.add({ p: at.clone(), v: new THREE.Vector3(Math.cos(a) * 1.2, 0.6 + Math.random(), Math.sin(a) * 1.2), life: 0, max: 0.9 + Math.random() * 0.5, size: 0.6 + Math.random() * 0.5, kind: 'dust', color: new THREE.Color(color) });
    }
  }

  sparks(at: THREE.Vector3, color = '#ffd166', n = 14): void {
    if (this.reduced) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 2.5;
      this.add({ p: at.clone(), v: new THREE.Vector3(Math.cos(a) * sp, 2 + Math.random() * 3, Math.sin(a) * sp), life: 0, max: 0.5 + Math.random() * 0.5, size: 1, kind: 'spark', color: new THREE.Color(color) });
    }
  }

  confetti(at: THREE.Vector3, n = 80): void {
    if (this.reduced) n = 20;
    const cols = ['#ffd166', '#6fd3cf', '#ff7f6b', '#b69cff', '#4fd38b', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      this.add({ p: at.clone(), v: new THREE.Vector3(Math.cos(a) * sp, 4 + Math.random() * 5, Math.sin(a) * sp), life: 0, max: 2.2 + Math.random(), size: 1.2, kind: 'confetti', color: new THREE.Color(cols[i % cols.length]) });
    }
  }

  private add(p: Puff): void {
    if (this.puffs.length >= MAX_PUFFS) this.puffs.shift();
    this.puffs.push(p);
  }

  update(dt: number, t: number, field: ParticleField): void {
    // debris (drawn as real particle shapes)
    for (const d of this.debris) {
      d.life += dt;
      d.v.y -= 9 * dt;
      d.p.addScaledVector(d.v, dt);
      if (d.p.y < 0.3 && d.v.y < 0) {
        d.p.y = 0.3;
        d.v.multiplyScalar(0.3);
        d.v.y = Math.abs(d.v.y);
      }
      field.put(d.u, d.p, d.seed, t * 3, d.size * (1 - Math.max(0, d.life / d.max - 0.7) * 3));
    }
    this.debris = this.debris.filter((d) => d.life < d.max);

    let si = 0;
    let ki = 0;
    for (const p of this.puffs) {
      p.life += dt;
      const k = p.life / p.max;
      if (p.kind === 'steam' || p.kind === 'dust') {
        p.v.multiplyScalar(1 - dt * 0.4);
        p.p.addScaledVector(p.v, dt);
        const sc = p.size * (0.5 + k * 1.4) * (1 - k * k);
        this.m.compose(p.p, this.q.identity(), this.s.setScalar(Math.max(0.01, sc)));
        this.steamMesh.setMatrixAt(si, this.m);
        this.steamMesh.setColorAt(si, this.col.copy(p.color));
        si++;
      } else {
        p.v.y -= (p.kind === 'confetti' ? 5 : 9) * dt;
        if (p.kind === 'confetti') p.v.multiplyScalar(1 - dt * 1.2);
        p.p.addScaledVector(p.v, dt);
        this.q.setFromEuler(new THREE.Euler(t * 7 + p.size, t * 5, 0));
        this.m.compose(p.p, this.q, this.s.set(p.kind === 'confetti' ? 1.6 : 0.8, p.kind === 'confetti' ? 0.25 : 0.8, 1).multiplyScalar(p.size * (1 - k)));
        this.sparkMesh.setMatrixAt(ki, this.m);
        this.sparkMesh.setColorAt(ki, p.color);
        ki++;
      }
    }
    this.puffs = this.puffs.filter((p) => p.life < p.max);
    this.steamMesh.count = si;
    this.sparkMesh.count = ki;
    this.steamMesh.instanceMatrix.needsUpdate = true;
    this.sparkMesh.instanceMatrix.needsUpdate = true;
    if (this.steamMesh.instanceColor) this.steamMesh.instanceColor.needsUpdate = true;
    if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;
  }
}
