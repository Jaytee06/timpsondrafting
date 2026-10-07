import { Material, Mesh, Object3D } from 'three';
import { parseModelFinish } from './finishControls';

export function inheritedModelFinish(object: Object3D) {
  let current: Object3D | null = object;
  while (current) {
    const finish = parseModelFinish(current.name);
    if (finish) return finish;
    current = current.parent;
  }
  return null;
}

// Collision helpers can be rendered transparent while remaining raycastable.
// They participate in movement collision, but are not visible aim targets.
export function isVisibleModelHit(hit: { object: Object3D; face?: { materialIndex?: number } | null }) {
  let current: Object3D | null = hit.object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  if (hit.object instanceof Mesh) {
    const material: Material | undefined = Array.isArray(hit.object.material)
      ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
    if (!material || !material.visible || (material.transparent && material.opacity <= 0.001)) return false;
  }
  return true;
}
