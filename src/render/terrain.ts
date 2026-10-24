// Terraced sandstone hex valley, lake, palms, rocks and distant mesas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HEX_SIZE, TERRACE_HEIGHT, hexToWorld, type Tile } from '../sim/hex';

const LEVEL_COLORS = ['#f0c890', '#e9ad6c', '#dc9152', '#cd7b40'];

export function tileTop(t: Tile | undefined): number {
  if (!t) return 0;
  if (t.water) return -0.18;
  return 0.25 + t.level * TERRACE_HEIGHT;
}

function rand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function palmGeometry(): { trunk: THREE.BufferGeometry; leaves: THREE.BufferGeometry } {
  const parts: THREE.BufferGeometry[] = [];
  let y = 0;
  let x = 0;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.CylinderGeometry(0.045 - i * 0.003, 0.055 - i * 0.003, 0.2, 6).translate(x, y + 0.1, 0);
    parts.push(seg.toNonIndexed());
    y += 0.19;
    x += 0.018 * i;
  }
  const trunk = mergeGeometries(parts)!;
  const leafParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = new THREE.ConeGeometry(0.09, 0.62, 4, 1).rotateX(Math.PI / 2).scale(1, 0.25, 1).translate(0, 0, 0.3);
    leaf.rotateX(0.45);
    leaf.rotateY(a);
    leaf.translate(x, y, 0);
    leafParts.push(leaf.toNonIndexed());
  }
  return { trunk, leaves: mergeGeometries(leafParts)! };
}

export interface TerrainView {
  group: THREE.Group;
  water: THREE.Mesh;
  tileMesh: THREE.InstancedMesh;
  tileIndex: Map<string, number>;
  update(t: number): void;
}

export function buildTerrainView(tiles: Map<string, Tile>, seed: number): TerrainView {
  const group = new THREE.Group();
  const list = [...tiles.values()];
  const rnd = rand(seed * 977 + 3);

  // hex prisms (pointy-top: Cylinder's first vertex points along +z)
  const hexGeo = new THREE.CylinderGeometry(HEX_SIZE * 0.985, HEX_SIZE * 1.0, 1, 6, 1);
  hexGeo.translate(0, -0.5, 0); // top at y = 0
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, flatShading: true });
  const mesh = new THREE.InstancedMesh(hexGeo, mat, list.length);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  const tileIndex = new Map<string, number>();
  list.forEach((t, i) => {
    const { x, z } = hexToWorld(t.q, t.r);
    const top = tileTop(t);
    const depth = top + 2.2;
    m.compose(new THREE.Vector3(x, top, z), new THREE.Quaternion(), new THREE.Vector3(1, depth, 1));
    mesh.setMatrixAt(i, m);
    if (t.water) col.set('#2a7f86');
    else {
      col.set(LEVEL_COLORS[t.level]);
      col.offsetHSL((rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.05);
      if (t.deco === 'salt') col.lerp(new THREE.Color('#fbf7ee'), 0.7);
    }
    mesh.setColorAt(i, col);
    tileIndex.set(`${t.q},${t.r}`, i);
  });
  group.add(mesh);

  // lake surface
  const waterTiles = list.filter((t) => t.water);
  const waterGeo = mergeGeometries(
    waterTiles.map((t) => {
      const { x, z } = hexToWorld(t.q, t.r);
      return new THREE.CylinderGeometry(HEX_SIZE * 1.02, HEX_SIZE * 1.02, 0.02, 6).translate(x, 0.02, z).toNonIndexed();
    }),
  );
  const waterMat = new THREE.MeshStandardMaterial({ color: '#2fc1c4', roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.82, emissive: '#0b5e66', emissiveIntensity: 0.25 });
  const water = new THREE.Mesh(waterGeo ?? new THREE.BufferGeometry(), waterMat);
  water.receiveShadow = true;
  group.add(water);

  // palms
  const palms = list.filter((t) => t.deco === 'palm');
  const pg = palmGeometry();
  const trunkMesh = new THREE.InstancedMesh(pg.trunk, new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: 0.9, flatShading: true }), Math.max(1, palms.length));
  const leafMesh = new THREE.InstancedMesh(pg.leaves, new THREE.MeshStandardMaterial({ color: '#3f8f45', roughness: 0.7, flatShading: true, side: THREE.DoubleSide }), Math.max(1, palms.length));
  trunkMesh.castShadow = leafMesh.castShadow = true;
  trunkMesh.count = leafMesh.count = palms.length;
  palms.forEach((t, i) => {
    const { x, z } = hexToWorld(t.q, t.r);
    const s = 0.9 + rnd() * 0.5;
    m.compose(new THREE.Vector3(x + (rnd() - 0.5) * 0.6, tileTop(t), z + (rnd() - 0.5) * 0.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0)), new THREE.Vector3(s, s, s));
    trunkMesh.setMatrixAt(i, m);
    leafMesh.setMatrixAt(i, m);
  });
  group.add(trunkMesh, leafMesh);

  // rocks
  const rocks = list.filter((t) => t.deco === 'rocks');
  const rockGeo = new THREE.DodecahedronGeometry(0.22, 0);
  const rockMesh = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: '#a7764f', roughness: 1, flatShading: true }), Math.max(1, rocks.length * 3));
  rockMesh.castShadow = true;
  let ri = 0;
  for (const t of rocks) {
    const { x, z } = hexToWorld(t.q, t.r);
    for (let k = 0; k < 3; k++) {
      const s = 0.5 + rnd() * 0.9;
      m.compose(new THREE.Vector3(x + (rnd() - 0.5) * 1.1, tileTop(t) + 0.05, z + (rnd() - 0.5) * 1.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(), rnd() * 6, rnd())), new THREE.Vector3(s, s * 0.7, s));
      rockMesh.setMatrixAt(ri++, m);
    }
  }
  rockMesh.count = ri;
  group.add(rockMesh);

  // canyon: a ring of tall sandstone hex columns around the valley, higher at the back
  const ring: { x: number; z: number; h: number; c: THREE.Color }[] = [];
  const strata = ['#c96f3a', '#d98a4e', '#b8602f', '#e29a5c'];
  for (let q = -15; q <= 15; q++) {
    for (let r = -15; r <= 15; r++) {
      const d = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
      if (d <= 7 || d > 14) continue;
      const { x, z } = hexToWorld(q, r);
      const back = THREE.MathUtils.clamp((-z + 6) / 16, 0, 1); // 1 = far side
      const n = rnd();
      const h = 0.4 + (d - 7) * (0.35 + back * 0.55) + n * 0.8 + (d === 8 ? 0 : back * 1.5);
      const c = new THREE.Color(strata[Math.floor((h * 1.7) % strata.length)]);
      c.offsetHSL((rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.06);
      ring.push({ x, z, h, c });
    }
  }
  const ringMesh = new THREE.InstancedMesh(hexGeo, mat, ring.length);
  ringMesh.receiveShadow = true;
  ringMesh.castShadow = true;
  ring.forEach((t, i) => {
    m.compose(new THREE.Vector3(t.x, t.h, t.z), new THREE.Quaternion(), new THREE.Vector3(1, t.h + 2.2, 1));
    ringMesh.setMatrixAt(i, m);
    ringMesh.setColorAt(i, t.c);
  });
  group.add(ringMesh);
  // a few palms on the canyon rim
  const rimPalms = ring.filter((t, i) => i % 11 === 3 && t.h < 3.2);
  const rimTrunk = new THREE.InstancedMesh(pg.trunk, trunkMesh.material, rimPalms.length || 1);
  const rimLeaf = new THREE.InstancedMesh(pg.leaves, leafMesh.material, rimPalms.length || 1);
  rimTrunk.count = rimLeaf.count = rimPalms.length;
  rimPalms.forEach((t, i) => {
    const s = 1 + rnd() * 0.5;
    m.compose(new THREE.Vector3(t.x, t.h, t.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6, 0)), new THREE.Vector3(s, s, s));
    rimTrunk.setMatrixAt(i, m);
    rimLeaf.setMatrixAt(i, m);
  });
  group.add(rimTrunk, rimLeaf);
  const floor = new THREE.Mesh(new THREE.RingGeometry(23.5, 140, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e2b47a', roughness: 1 }));
  floor.position.y = 1.0;
  group.add(floor);
  // distant mesas for the skyline
  const mesaMat = new THREE.MeshStandardMaterial({ color: '#d48a55', roughness: 1, flatShading: true });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rnd() * 0.3;
    const dd = 42 + rnd() * 20;
    const h = 3 + rnd() * 7;
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(3 + rnd() * 4, 5 + rnd() * 5, h, 7), mesaMat);
    mesa.position.set(Math.cos(a) * dd, 1.0 + h / 2, Math.sin(a) * dd);
    group.add(mesa);
  }

  return {
    group,
    water,
    tileMesh: mesh,
    tileIndex,
    update(t: number) {
      waterMat.emissiveIntensity = 0.22 + Math.sin(t * 1.3) * 0.05;
    },
  };
}

export interface Environment {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  setDayFraction(f: number): void;
}

const SKY_DAY = new THREE.Color('#bfe3e6');
const SKY_DUSK = new THREE.Color('#f29a6b');
const SKY_NIGHT = new THREE.Color('#40375e');

export function buildEnvironment(scene: THREE.Scene): Environment {
  scene.background = SKY_DAY.clone();
  scene.fog = new THREE.Fog(SKY_DAY.clone(), 40, 95);
  const hemi = new THREE.HemisphereLight('#fff2dc', '#b06a3a', 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe8c4', 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -22;
  sc.right = 22;
  sc.top = 22;
  sc.bottom = -22;
  sc.near = 1;
  sc.far = 60;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const bg = scene.background as THREE.Color;
  const fog = scene.fog as THREE.Fog;
  const sunDay = new THREE.Color('#fff1d6');
  const sunDusk = new THREE.Color('#ff9a57');
  return {
    sun,
    hemi,
    setDayFraction(f: number) {
      // morning → noon → dusk across the week's day
      const a = THREE.MathUtils.lerp(-0.9, 1.15, f); // sun azimuth sweep
      const elev = Math.sin(THREE.MathUtils.lerp(0.35, 2.75, f)) * 0.9 + 0.12;
      sun.position.set(Math.cos(a) * 22, 6 + elev * 18, Math.sin(a) * 10 + 8);
      const dusk = THREE.MathUtils.smoothstep(f, 0.62, 1.0);
      sun.color.copy(sunDay).lerp(sunDusk, dusk);
      sun.intensity = 3.0 - dusk * 1.2;
      hemi.intensity = 1.05 - dusk * 0.35;
      bg.copy(SKY_DAY).lerp(SKY_DUSK, dusk);
      if (f > 1) bg.lerp(SKY_NIGHT, Math.min(1, (f - 1) * 4));
      fog.color.copy(bg);
    },
  };
}
