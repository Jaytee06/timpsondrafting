import { Mesh, Object3D } from 'three';

export function snapshotModel(scene: Object3D) {
  scene.updateMatrixWorld(true);
  const snapshot = scene.clone(true);
  snapshot.traverse((object) => {
    if (object instanceof Mesh) object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone()) : object.material.clone();
  });
  return snapshot;
}

export async function exportCustomizedGlb(scene: Object3D) {
  const snapshot = snapshotModel(scene);
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const bytes = await new GLTFExporter().parseAsync(snapshot, { binary: true, onlyVisible: true });
  if (!(bytes instanceof ArrayBuffer)) throw new Error('Model export did not produce a GLB.');
  return new Blob([bytes], { type: 'model/gltf-binary' });
}
