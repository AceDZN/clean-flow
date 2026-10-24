// Small instanced particle geometries: every substance has its own SHAPE (never colour alone).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Shape } from '../sim/substances';

function sphere(r: number, x = 0, y = 0, z = 0, seg = 8): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)).translate(x, y, z);
}

function rod(len: number, r: number, axis: THREE.Vector3): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, 6);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
  g.applyQuaternion(q);
  return g;
}

function nonIndexed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute('uv');
  return n;
}

function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return mergeGeometries(gs.map(nonIndexed), false)!;
}

function star(points: number, rOut: number, rIn: number, depth: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? rOut : rIn;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
}

/** Unit size ≈ 0.1 world units. */
export function particleGeometry(shape: Shape): THREE.BufferGeometry {
  switch (shape) {
    case 'triad': // bent H₂O
      return merge([sphere(0.06), sphere(0.035, 0.06, 0.04, 0), sphere(0.035, -0.06, 0.04, 0)]);
    case 'cube':
      return new THREE.BoxGeometry(0.09, 0.09, 0.09);
    case 'rock':
      return new THREE.DodecahedronGeometry(0.075, 0).scale(1, 0.75, 0.9);
    case 'spiky':
      return merge([new THREE.OctahedronGeometry(0.07, 0), new THREE.OctahedronGeometry(0.07, 0).rotateY(Math.PI / 4).rotateX(Math.PI / 4)]);
    case 'droplet':
      return sphere(0.06, 0, 0, 0, 10).scale(1, 1.5, 1);
    case 'hexagon':
      return new THREE.CylinderGeometry(0.07, 0.07, 0.04, 6).rotateX(Math.PI / 2);
    case 'rod':
      return merge([rod(0.14, 0.03, new THREE.Vector3(1, 0.3, 0)), sphere(0.04, 0.07, 0.02, 0)]);
    case 'star':
      return star(5, 0.075, 0.035, 0.035);
    case 'diamond':
      return new THREE.OctahedronGeometry(0.075, 0).scale(0.75, 1.15, 0.75);
    case 'dumbbell':
      return merge([sphere(0.045, 0.045, 0, 0), sphere(0.045, -0.045, 0, 0)]);
    case 'sphere':
      return sphere(0.05);
    case 'linear':
      return merge([sphere(0.04), sphere(0.035, 0.07, 0, 0), sphere(0.035, -0.07, 0, 0)]);
    case 'crystal':
      return new THREE.OctahedronGeometry(0.07, 0).scale(1, 1.6, 1).rotateZ(0.4);
    case 'pebble':
      return sphere(0.09, 0, 0, 0, 7).scale(1.2, 0.7, 1);
    case 'flask':
      return merge([new THREE.ConeGeometry(0.06, 0.1, 6), sphere(0.03, 0, 0.07, 0)]);
    case 'puff':
      return merge([sphere(0.04, 0.03, 0, 0), sphere(0.04, -0.03, 0.01, 0), sphere(0.035, 0, 0.04, 0.01)]);
    case 'nugget':
      return new THREE.BoxGeometry(0.08, 0.06, 0.08).rotateY(0.6).rotateX(0.4);
  }
}

/** SVG for the same shape, used in legends and tray icons. */
export function shapeSvg(shape: Shape, color: string): string {
  const s = `stroke="#1b1b1f" stroke-width="1.4"`;
  const c = (cx: number, cy: number, r: number, fill = color) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${s}/>`;
  let body = '';
  switch (shape) {
    case 'triad': body = c(12, 14, 6) + c(5, 8, 3.5, '#fff') + c(19, 8, 3.5, '#fff'); break;
    case 'cube': body = `<rect x="5" y="5" width="14" height="14" fill="${color}" ${s}/>`; break;
    case 'rock': body = `<polygon points="4,15 8,6 16,4 21,11 17,19 8,20" fill="${color}" ${s}/>`; break;
    case 'spiky': body = `<polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9" fill="${color}" ${s}/>`; break;
    case 'droplet': body = `<path d="M12 3 C17 10 18 13 18 15 A6 6 0 0 1 6 15 C6 13 7 10 12 3Z" fill="${color}" ${s}/>`; break;
    case 'hexagon': body = `<polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" fill="${color}" ${s}/>`; break;
    case 'rod': body = `<rect x="3" y="10" width="15" height="5" rx="2" fill="${color}" ${s}/>` + c(19, 12, 3.5); break;
    case 'star': body = `<polygon points="12,2 14.6,9 22,9.3 16.2,13.9 18.2,21 12,17 5.8,21 7.8,13.9 2,9.3 9.4,9" fill="${color}" ${s}/>`; break;
    case 'diamond': body = `<polygon points="12,2 19,12 12,22 5,12" fill="${color}" ${s}/>`; break;
    case 'dumbbell': body = c(8, 12, 5) + c(16, 12, 5); break;
    case 'sphere': body = c(12, 12, 6.5); break;
    case 'linear': body = c(5, 12, 3.6) + c(12, 12, 4.2) + c(19, 12, 3.6); break;
    case 'crystal': body = `<polygon points="12,1 18,12 12,23 6,12" fill="${color}" ${s} transform="rotate(20 12 12)"/>`; break;
    case 'pebble': body = `<ellipse cx="12" cy="13" rx="9" ry="6" fill="${color}" ${s}/>`; break;
    case 'flask': body = `<polygon points="12,8 19,20 5,20" fill="${color}" ${s}/>` + c(12, 6, 3); break;
    case 'puff': body = c(9, 13, 4.5) + c(15, 13, 4.5) + c(12, 8, 4); break;
    case 'nugget': body = `<polygon points="5,8 13,4 20,8 19,17 11,20 4,16" fill="${color}" ${s}/>`; break;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}
