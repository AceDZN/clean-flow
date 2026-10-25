// Tripo GLB models (bundled in public/models). Decoration only: never colliders or science state.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export type ModelName =
  | 'magnet-drum' | 'filter-press' | 'still' | 'evap-pan' | 'customer-house' | 'engineer'
  | 'tank' | 'funnel' | 'chroma-tower' | 'sieve' | 'mine' | 'reservoir' | 'foundry' | 'bakery' | 'engineer-anim';
const NAMES: ModelName[] = ['magnet-drum', 'filter-press', 'still', 'evap-pan', 'customer-house', 'tank', 'funnel', 'chroma-tower', 'sieve', 'mine', 'reservoir', 'foundry', 'bakery', 'engineer-anim'];

export const models = new Map<ModelName, GLTF>();

export async function loadModels(onProgress?: (done: number, total: number) => void): Promise<void> {
  const loader = new GLTFLoader();
  let done = 0;
  await Promise.all(
    NAMES.map(async (n) => {
      try {
        const g = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${n}.glb`);
        g.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        models.set(n, g);
      } catch (e) {
        console.warn(`model ${n} missing, using procedural fallback`, e);
      }
      onProgress?.(++done, NAMES.length);
    }),
  );
}

/** Clone a model scaled so its largest horizontal size is `width`, base on y = 0. */
export function instance(name: ModelName, width: number): THREE.Object3D | null {
  const g = models.get(name);
  if (!g) return null;
  const o = name.startsWith('engineer') ? SkeletonUtils.clone(g.scene) : g.scene.clone(true);
  const box = new THREE.Box3().setFromObject(o);
  const size = box.getSize(new THREE.Vector3());
  const s = width / Math.max(size.x, size.z, 0.001);
  o.scale.setScalar(s);
  o.position.y = -box.min.y * s;
  const wrap = new THREE.Group();
  wrap.add(o);
  return wrap;
}

export function clips(name: ModelName): THREE.AnimationClip[] {
  return models.get(name)?.animations ?? [];
}
