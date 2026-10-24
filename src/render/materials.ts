import * as THREE from 'three';

export const MAT = {
  brass: new THREE.MeshStandardMaterial({ color: '#d6a84c', metalness: 0.85, roughness: 0.32 }),
  copper: new THREE.MeshStandardMaterial({ color: '#c8703f', metalness: 0.8, roughness: 0.34 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: '#41464d', metalness: 0.7, roughness: 0.45 }),
  steel: new THREE.MeshStandardMaterial({ color: '#b8c2c8', metalness: 0.8, roughness: 0.3 }),
  red: new THREE.MeshStandardMaterial({ color: '#d2402f', metalness: 0.3, roughness: 0.45 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#d9f4ff', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.32, depthWrite: false, clearcoat: 1, side: THREE.DoubleSide }),
  paper: new THREE.MeshStandardMaterial({ color: '#fbf6ea', roughness: 0.9, side: THREE.DoubleSide }),
  wood: new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 0.85, flatShading: true }),
  brick: new THREE.MeshStandardMaterial({ color: '#a4513a', roughness: 0.9, flatShading: true }),
  stone: new THREE.MeshStandardMaterial({ color: '#cfae80', roughness: 0.95, flatShading: true }),
  plaster: new THREE.MeshStandardMaterial({ color: '#f1e3c8', roughness: 0.9, flatShading: true }),
  dark: new THREE.MeshStandardMaterial({ color: '#20181a', roughness: 1 }),
  fire: new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff5a10', emissiveIntensity: 1.6, roughness: 1 }),
  green: new THREE.MeshStandardMaterial({ color: '#3f9a52', roughness: 0.7 }),
  white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }),
};

export function liquidMat(color: string, opacity = 0.85): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.12, metalness: 0.05, transparent: opacity < 1, opacity, emissive: color, emissiveIntensity: 0.12 });
}

export function solidMat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });
}

export function enableShadows(o: THREE.Object3D): void {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      const mat = m.material as THREE.Material;
      m.castShadow = !mat.transparent;
      m.receiveShadow = true;
    }
  });
}
