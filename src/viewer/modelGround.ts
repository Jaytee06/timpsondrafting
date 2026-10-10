import { Object3D, Vector3 } from 'three';

/** Site grade is independent of the deepest mesh (pools, foundations, buried tanks). */
export function sceneGroundHeight(scene: Object3D, fallback: number): number {
  scene.updateMatrixWorld(true);
  let datum: Object3D | undefined;
  let spawn: Object3D | undefined;
  scene.traverse(node => {
    if (!datum && node.name.trim().toUpperCase() === 'GROUND_DATUM') datum = node;
    if (!spawn && node.name.trim().toUpperCase() === 'SPAWN_FRONT') spawn = node;
  });
  if (datum) {
    const height = datum.getWorldPosition(new Vector3()).y;
    if (Number.isFinite(height)) return height;
  }
  // Legacy authored metadata is in exported glTF/scene Y-up coordinates, meters.
  const declared = spawn?.userData.viewerGroundHeightMeters;
  if (typeof declared === 'number' && Number.isFinite(declared)) return declared;
  return fallback;
}
